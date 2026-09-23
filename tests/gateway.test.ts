import assert from "node:assert/strict";
import test from "node:test";
import { createGateway, authenticate, normalizeOperatorToken, PROOF_COMMAND, authorizeProof, type GatewayBindings } from "../src/gateway/gateway";
import { DaytonaExecutor, type DaytonaProvider } from "../src/executors/daytona";
import type { AuditEvent } from "../src/audit/audit";
import type { Task } from "../src/domain/task";
import type { GatewayStore, Reservation, TaskRecord, ExecutionRecord } from "../src/storage/gateway-store";
import app from "../src/index";

const TOKEN = "test-only-operator-token-with-at-least-thirty-two-characters";
const env = {GATEWAY_EXECUTION_ENABLED:"true",GATEWAY_OPERATOR_TOKEN:TOKEN,DAYTONA_API_KEY:"not-a-real-provider-token",DB:{} as D1Database};
const payload = (key = "test-idempotency-key-12345", command = PROOF_COMMAND) => ({task:{type:"execution",input:{command},risk_level:"low",requested_capabilities:["code_mode"]},idempotency_key:key});
const request = (body: unknown, token = TOKEN) => new Request("https://localhost/execute", {method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(body)});
class TestStore implements GatewayStore {
  reservations = new Map<string,Reservation>(); tasks = new Map<string,TaskRecord>(); executions = new Map<string,ExecutionRecord>(); events: AuditEvent[] = [];
  async reserve(r:Reservation) { const prior=this.reservations.get(r.key); if (!prior) {this.reservations.set(r.key,r);return "created" as const;} return prior.actor_id===r.actor_id && prior.fingerprint===r.fingerprint && prior.operation===r.operation ? "replayed" as const : "conflict" as const; }
  async getReservedTaskId(key:string) { return this.reservations.get(key)?.task_id ?? null; }
  async createTask(t:TaskRecord) {this.tasks.set(t.task_id,t);}
  async getTask(id:string) {return this.tasks.get(id) ?? null;}
  async listTasks(actorId:string) {return [...this.tasks.values()].filter(t=>t.actor_id===actorId);}
  async changeState(id:string,from:string,to:string) {const t=this.tasks.get(id);if (!t || t.state!==from) throw Error("storage failure");t.state=to;}
  async createExecution(e:ExecutionRecord) {this.executions.set(e.task_id,e);}
  async getExecution(id:string) {return this.executions.get(id) ?? null;}
  async changeExecution(id:string,from:string,update:Partial<ExecutionRecord>) {const e=this.executions.get(id);if (!e || e.state!==from) throw Error("storage failure");this.executions.set(id,{...e,...update});}
  async write(e:AuditEvent) {this.events.push(e);}
  async auditForTask(actor:string,id:string) {return this.events.filter(e=>e.actor===actor && e.task_id===id);}
}
function fakeExecutor(options: {stdout?:string; executeError?:boolean; cleanupError?:boolean} = {}) {
  const calls={created:0,stopped:0,deleted:0};
  const provider:DaytonaProvider={async create(){calls.created++;return {
    id:"sandbox-proof",state:"started",async createSession(){},async execute(){if(options.executeError) throw Error("uncertain provider result");return {commandId:"command-proof",exitCode:0,stdout:options.stdout ?? "PHASE_5_EXECUTION_PROOF_OK\n",stderr:""};},
    async logs(){return {stdout:options.stdout ?? "PHASE_5_EXECUTION_PROOF_OK\n",stderr:""};},
    async stop(){calls.stopped++;},async verifyStopped(){return true;},async delete(){calls.deleted++;}, async verifyDeleted(){if(options.cleanupError) throw Error("cleanup error - verify unavailable"); return true;}
  };}};
  return {executor:new DaytonaExecutor(provider),calls};
}
function setup(options:Parameters<typeof fakeExecutor>[0]={}) {const store=new TestStore();const {executor,calls}=fakeExecutor(options);return {store,calls,handle:createGateway({store,executor})};}

test("auth rejects missing, malformed, invalid and accepts operator without reflection",async()=>{
  assert.equal(await authenticate(new Request("https://localhost/execute"),TOKEN),null);
  assert.equal(await authenticate(new Request("https://localhost/execute",{headers:{authorization:"Basic wrong"}}),TOKEN),null);
  assert.equal(await authenticate(new Request("https://localhost/execute",{headers:{authorization:"Bearer another-token-with-at-least-thirty-two-chars"}}),TOKEN),null);
  assert.deepEqual(await authenticate(request(payload()),TOKEN),{actor_id:"operator"});
  const {handle,store}=setup();
  const denied=await handle(request(payload(),"another-token-with-at-least-thirty-two-chars"),env);
  assert.equal(denied.status,401);assert.equal(store.reservations.size,0);assert.equal(store.events.length,0);
  assert.equal((await denied.text()).includes(TOKEN),false);
});

test("runtime token normalization accepts raw and a single Bearer prefix without weakening request auth",async()=>{
  for (const configured of [TOKEN,`  ${TOKEN}  `,`Bearer ${TOKEN}`,` \n bearer\t${TOKEN} \n`]) {
    assert.equal(normalizeOperatorToken(configured),TOKEN);
    assert.deepEqual(await authenticate(request(payload()),configured),{actor_id:"operator"});
    const {handle,calls}=setup();
    assert.equal((await handle(request(payload()),{...env,GATEWAY_OPERATOR_TOKEN:configured})).status,200);
    assert.equal(calls.created,1);
    assert.equal((await handle(request(payload(),"another-token-with-at-least-thirty-two-chars"),{...env,GATEWAY_OPERATOR_TOKEN:configured})).status,401);
  }
  for(const malformed of ["Bearer Bearer "+TOKEN,"short","  ",`${TOKEN} suffix`]) assert.equal(normalizeOperatorToken(malformed),null);
  assert.equal(await authenticate(new Request("https://localhost/execute",{headers:{authorization:TOKEN}}),`Bearer ${TOKEN}`),null);
});

test("route disabled without explicit runtime gate; public routes reveal no task/audit",async()=>{
  const {handle,store}=setup();
  const disabled=await handle(request(payload()),{...env,GATEWAY_EXECUTION_ENABLED:undefined});
  assert.equal(disabled.status,503);assert.equal(store.tasks.size,0);
  assert.equal((await app.fetch(new Request("https://localhost/audit"))).status,404);
  assert.equal((await app.fetch(new Request("https://localhost/health"))).status,200);
  assert.equal((await app.fetch(new Request("https://localhost/executions/00000000-0000-0000-0000-000000000000"))).status,401);
});

test("proof policy excludes arbitrary shell, risk, capabilities, secret, production and retry",async()=>{
  const {executor}=fakeExecutor();
  const base:Task={task_id:"test",type:"execution",input:{command:PROOF_COMMAND},risk_level:"low",requested_capabilities:["code_mode"],created_at:new Date().toISOString(),metadata:{}};
  const can=(task:Task)=>authorizeProof({actor_id:"operator"},"execute","daytona.proof","isolated",task,executor).allowed;
  assert.equal(can(base),true);
  for(const changed of [{input:{command:"cat /etc/passwd"}},{risk_level:"high" as const},{requested_capabilities:["retry"]},{input:{command:PROOF_COMMAND,password:"secret"}},{type:"production_deployment" as const}]) assert.equal(can({...base,...changed}),false);
  const {handle,store,calls}=setup();
  for(const [index,command] of ["echo arbitrary",`${PROOF_COMMAND}; echo extra`].entries()) assert.equal((await handle(request(payload(`test-policy-denial-key-${index}`,command)),env)).status,403);
  assert.equal(store.tasks.size,0);assert.equal(calls.created,0);
});

test("authenticated proof persists verified terminal state, audit, replay, and cross-request read",async()=>{
  const {handle,store,calls}=setup();
  const first=await handle(request(payload()),env);assert.equal(first.status,200);
  const response=await first.json() as {task_id:string;execution_id:string;state:string;result_code:string};
  assert.equal(response.state,"succeeded");assert.equal(response.result_code,"PROOF_VERIFIED");
  assert.equal(store.tasks.get(response.task_id)?.actor_id,"operator");
  assert.equal(store.reservations.has("test-idempotency-key-12345"),false);
  assert.match([...store.reservations.keys()][0],/^[0-9a-f]{64}$/);
  assert.equal(store.tasks.get(response.task_id)?.policy_version,"phase5-proof-v1");
  assert.equal(store.executions.get(response.task_id)?.verification,"accepted");
  assert.equal(store.events.some(e=>e.event==="provider.requested"),true);
  assert.equal(store.events.some(e=>e.event==="verification.completed"),true);
  assert.equal(store.events.some(e=>e.event==="audit.persisted"),true);
  const replay=await handle(request(payload()),env);assert.equal(replay.status,200);
  assert.deepEqual((await replay.json() as {task_id:string}).task_id,response.task_id);
  assert.deepEqual(calls,{created:1,stopped:1,deleted:1});
  const wrongCommand=await handle(request(payload("test-idempotency-key-12345","echo wrong")),env);
  assert.equal(wrongCommand.status,409);
  assert.equal((await wrongCommand.json() as {error:string}).error,"IDEMPOTENCY_CONFLICT");
  const conflict=await handle(request({...payload(),task:{...payload().task,risk_level:"medium"}}),env);
  assert.equal(conflict.status,409);
  assert.equal((await conflict.json() as {error:string}).error,"IDEMPOTENCY_CONFLICT");
  const read=await handle(new Request(`https://localhost/executions/${response.task_id}`,{headers:{authorization:`Bearer ${TOKEN}`}}),env);
  assert.equal(read.status,200);const data=await read.json() as {audit:AuditEvent[]};assert.ok(data.audit.length>5);
  assert.equal(JSON.stringify(data).includes(TOKEN),false);
  assert.equal(JSON.stringify(data).includes(env.DAYTONA_API_KEY),false);
  assert.equal(data.audit.some(e=>e.event==="idempotency.replayed" && e.task_id===response.task_id),true);
  assert.equal(data.audit.filter(e=>e.event==="idempotency.conflicted" && e.task_id===response.task_id).length,2);
  const verification=data.audit.find(e=>e.event==="verification.completed")?.details as {session_id:string;sandbox_id:string;command_id:string;cleanup:{stopped:boolean;deleted:boolean;postDeleteVerified:boolean};output_exact:boolean;logs_exact:boolean};
  assert.equal(verification.session_id,`bridge-${response.task_id}`);
  assert.equal(verification.sandbox_id,"sandbox-proof");
  assert.equal(verification.command_id,"command-proof");
  assert.deepEqual(verification.cleanup,{stopped:true,deleted:true,postDeleteVerified:true});
  assert.equal(verification.output_exact,true);
  assert.equal(verification.logs_exact,true);
});

test("reservation conflicts across actor and fingerprint; concurrent reservation chooses one",async()=>{
  const store=new TestStore();const initial:Reservation={key:"key",actor_id:"operator",operation:"execute",fingerprint:"fingerprint-a",task_id:"one",created_at:"now"};
  assert.deepEqual(await Promise.all([store.reserve(initial),store.reserve({...initial,task_id:"two"})]),["created","replayed"]);
  assert.equal(await store.reserve({...initial,fingerprint:"fingerprint-b"}),"conflict");
  assert.equal(await store.reserve({...initial,actor_id:"other"}),"conflict");
});

test("provider ambiguity and cleanup uncertainty never resubmit; false-success rejected",async()=>{
  for(const options of [{executeError:true},{cleanupError:true},{stdout:"WRONG\n"}]){
    const {handle,calls,store}=setup(options);
    const first=await handle(request(payload()),env);const result=await first.json() as {task_id:string;state:string};
    assert.equal(result.state,options.stdout ? "failed" : "unknown");
    assert.equal(store.tasks.get(result.task_id)?.state,result.state);
    const replay=await handle(request(payload()),env);assert.equal((await replay.json() as {state:string}).state,result.state);
    assert.equal(calls.created,1);assert.equal(calls.deleted,1);
  }
});

test("storage failure returns generic unavailable without submitting",async()=>{
  const {handle,store,calls}=setup();store.reserve=async()=>{throw Error("SQL secret-bearing error");};
  const response=await handle(request(payload()),env);
  assert.equal(response.status,503);assert.equal((await response.text()).includes("secret-bearing"),false);assert.equal(calls.created,0);
});
