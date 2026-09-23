import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import { D1GatewayStore } from "../src/storage/gateway-store";

const schema = readFileSync(new URL("../migrations/0001_gateway.sql",import.meta.url),"utf8");
test("D1 migration, unique atomic reservation, cross-isolate reads and durable audit",async()=>{
  const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('ok')}}",d1Databases:{DB:"gateway-test"}});
  try {
    const db=await mf.getD1Database("DB");
    for (const statement of schema.split("\n").filter(line=>!line.trim().startsWith("--")).join("\n").split(";").map(s=>s.trim()).filter(Boolean)) await db.prepare(statement).run();
    const a=new D1GatewayStore(db),b=new D1GatewayStore(db);
    const r={key:"proof-key",actor_id:"operator",operation:"execute",fingerprint:"digest",task_id:"task-a",created_at:new Date().toISOString()};
    const raced=await Promise.all([a.reserve(r),b.reserve({...r,task_id:"task-b"})]);
    assert.deepEqual(raced.sort(),["created","replayed"]);
    assert.equal(await b.getReservedTaskId(r.key),"task-a");
    assert.equal(await b.reserve({...r,actor_id:"other"}),"conflict");
    assert.equal(await b.reserve({...r,fingerprint:"changed"}),"conflict");
    await a.createTask({task_id:"task-a",actor_id:"operator",request_id:"req",state:"created",policy_version:"p5",policy_reason:"PROOF_ALLOWED",command_digest:"digest",created_at:r.created_at});
    assert.equal((await b.getTask("task-a"))?.policy_reason,"PROOF_ALLOWED");
    assert.equal((await b.listTasks("operator")).length,1);
    assert.equal((await b.listTasks("other")).length,0);
    await b.changeState("task-a","created","validated");
    assert.equal((await a.getTask("task-a"))?.state,"validated");
    await a.createExecution({task_id:"task-a",execution_id:null,state:"queued",verification:"pending",result_code:null,provider_id:null,updated_at:r.created_at});
    await b.changeExecution("task-a","queued",{state:"running",verification:"pending",execution_id:null,result_code:null,provider_id:null});
    assert.equal((await a.getExecution("task-a"))?.state,"running");
    await a.write({event:"audit.persisted",timestamp:r.created_at,request_id:"req",actor:"operator",task_id:"task-a",details:{password:"fixture-secret"}});
    const events=await b.auditForTask("operator","task-a");
    assert.equal(events.length,1);
    assert.equal(JSON.stringify(events).includes("fixture-secret"),false);
    assert.equal((await b.auditForTask("other","task-a")).length,0);
  } finally {await mf.dispose();}
});
