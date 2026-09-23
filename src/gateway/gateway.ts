import * as z from "zod/v4";
import { Auditor } from "../audit/audit";
import { validateTask, type Task } from "../domain/task";
import { TaskStateMachine, type TaskState } from "../domain/state-machine";
import { DaytonaExecutor, DaytonaSdkProvider } from "../executors/daytona";
import type { Executor } from "../executors/executor";
import { evaluatePolicy } from "../policy/policy";
import { verifyExecution } from "../verification/verification";
import { D1GatewayStore, StorageFailure, type GatewayStore, type ExecutionRecord } from "../storage/gateway-store";

export const PROOF_COMMAND = "printf '%s\\n' 'PHASE_5_EXECUTION_PROOF_OK'";
const PROOF_MARKER = "PHASE_5_EXECUTION_PROOF_OK";
export const POLICY_VERSION = "phase5-proof-v1";
const requestSchema = z.object({
  task: z.object({
    type: z.literal("execution"),
    input: z.object({ command: z.string().max(128) }).strict(),
    risk_level: z.enum(["low", "medium", "high", "critical"]),
    requested_capabilities: z.array(z.string().max(100)).max(10)
  }).strict(),
  idempotency_key: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/)
}).strict();

export interface GatewayBindings {
  DB?: D1Database;
  GATEWAY_OPERATOR_TOKEN?: string;
  DAYTONA_API_KEY?: string;
  GATEWAY_EXECUTION_ENABLED?: string;
}
export interface Principal { actor_id: "operator" }
const safe = (body: object, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function authenticate(request: Request, token?: string): Promise<Principal | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!token || token.length < 32 || token.length > 512 || !/^Bearer [^\s]{32,512}$/.test(header)) return null;
  const received = header.slice(7);
  // Hash both values and compare all bytes; never reflect supplied credential.
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
  const [a,b] = await Promise.all([digest(token),digest(received)]);
  let difference = 0;
  for (let i=0;i<a.length;i++) difference |= a[i] ^ b[i];
  return difference === 0 ? { actor_id: "operator" } : null;
}

export function authorizeProof(actor: Principal, action: string, resource: string, environment: string, task: Task, executor: Executor) {
  const base = evaluatePolicy(task, executor.name, executor.capabilities());
  const allowed = !!actor.actor_id && action === "execute" && resource === "daytona.proof" && environment === "isolated" &&
    executor.name === "daytona" && task.type === "execution" && task.risk_level === "low" &&
    task.input.command === PROOF_COMMAND && Object.keys(task.input).length === 1 &&
    task.requested_capabilities.length === 1 && task.requested_capabilities[0] === "code_mode" &&
    Object.keys(task.metadata).length === 0 && base.allowed && executor.capabilities().cancel === false && executor.capabilities().retry === false;
  return { allowed, policy_version: POLICY_VERSION, reason_code: allowed ? "PROOF_ALLOWED" : (base.allowed ? "PROOF_SCOPE_DENIED" : base.reasons[0]?.code ?? "DENIED") };
}

async function fingerprint(input: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(input)));
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2,"0")).join("");
}

// Factory allows deterministic tests; production always passes a D1-backed store and DaytonaExecutor.
export function createGateway(dependencies?: { store: GatewayStore; executor: Executor }) {
  return async function handleGateway(request: Request, env: GatewayBindings): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path !== "/execute" && !/^\/executions\/[0-9a-f-]{36}$/.test(path)) return safe({error:"NOT_FOUND"},404);
    if ((path === "/execute" && request.method !== "POST") || (path !== "/execute" && request.method !== "GET")) return safe({error:"METHOD_NOT_ALLOWED"},405);
    const principal = await authenticate(request,env.GATEWAY_OPERATOR_TOKEN);
    if (!principal) return safe({error:"UNAUTHORIZED"},401);
    if (env.GATEWAY_EXECUTION_ENABLED !== "true" || !env.DB || !env.DAYTONA_API_KEY || !env.GATEWAY_OPERATOR_TOKEN) return safe({error:"EXECUTION_DISABLED"},503);
    const requestId = crypto.randomUUID();
    const store = dependencies?.store ?? new D1GatewayStore(env.DB);
    const auditor = new Auditor(store);
    const event = async (name: Parameters<Auditor["emit"]>[0]["event"], taskId?: string, outcome?: string, executionId?: string, details?: unknown) => {
      await auditor.emit({event:name,request_id:requestId,actor:principal.actor_id,task_id:taskId,execution_id:executionId,outcome,details});
    };
    try {
      await event("auth.checked",undefined,"allowed");
      if (path !== "/execute") {
        const id = path.slice("/executions/".length);
        const task = await store.getTask(id);
        if (!task || task.actor_id !== principal.actor_id) return safe({error:"NOT_FOUND"},404);
        const execution = await store.getExecution(id);
        const events = await store.auditForTask(principal.actor_id,id);
        return safe({task_id:id,state:task.state,execution_id:execution?.execution_id ?? null,verification:execution?.verification ?? "pending",result_code:execution?.result_code ?? null,audit:events});
      }
      if (Number(request.headers.get("content-length") ?? 0) > 2048) return safe({error:"INVALID_REQUEST"},400);
      let body: unknown;
      try {
        const text = await request.text();
        if (text.length > 2048) return safe({error:"INVALID_REQUEST"},400);
        body = JSON.parse(text);
      } catch { return safe({error:"INVALID_REQUEST"},400); }
      const parsed = requestSchema.safeParse(body);
      if (!parsed.success) return safe({error:"INVALID_REQUEST"},400);
      const input = parsed.data;
      const executor = dependencies?.executor ?? new DaytonaExecutor(new DaytonaSdkProvider(env.DAYTONA_API_KEY));
      const taskId = crypto.randomUUID();
      const task: Task = { ...input.task,task_id:taskId,created_at:new Date().toISOString(),metadata:{} };
      if (!validateTask(task).valid) return safe({error:"INVALID_REQUEST"},400);
      const requestFingerprint = await fingerprint(input.task);
      const reserved = await store.reserve({key:input.idempotency_key,actor_id:principal.actor_id,operation:"execute",fingerprint:requestFingerprint,task_id:taskId,created_at:task.created_at});
      if (reserved === "conflict") return safe({error:"IDEMPOTENCY_CONFLICT"},409);
      if (reserved === "replayed") {
        await event("idempotency.replayed");
        // Look up the original ID via key, not the newly generated ID.
        const original = await store.getReservedTaskId(input.idempotency_key);
        if (!original) throw new StorageFailure();
        const prior = await store.getTask(original);
        const execution = prior ? await store.getExecution(original) : null;
        return safe({task_id:original,state:prior?.state ?? "unknown",execution_id:execution?.execution_id ?? null,verification:execution?.verification ?? "pending",result_code:execution?.result_code ?? null,replayed:true},prior ? 200 : 202);
      }
      const decision = authorizeProof(principal,"execute","daytona.proof","isolated",task,executor);
      if (!decision.allowed) return safe({error:"POLICY_DENIED",reason_code:decision.reason_code},403);
      const check = await executor.validate(task);
      if (!check.valid) return safe({error:"POLICY_DENIED"},403);
      await event("idempotency.reserved",taskId);
      const machine = new TaskStateMachine();
      await store.createTask({task_id:taskId,actor_id:principal.actor_id,request_id:requestId,state:machine.state,policy_version:decision.policy_version,policy_reason:decision.reason_code,command_digest:requestFingerprint,created_at:task.created_at});
      await event("task.created",taskId);
      await event("task.persisted",taskId);
      const transition = async (to: TaskState) => {
        const from = machine.state;
        machine.transition(to);
        await store.changeState(taskId,from,to);
        await event("execution.state_changed",taskId,to);
      };
      await transition("validated");
      await event("task.validated",taskId);
      await event("task.authorization.checked",taskId,decision.reason_code);
      await transition("authorized");
      await transition("queued");
      const pending: ExecutionRecord = {task_id:taskId,execution_id:null,state:"queued",verification:"pending",result_code:null,provider_id:null,updated_at:new Date().toISOString()};
      await store.createExecution(pending);
      await event("execution.submitted",taskId,"submission_reserved");
      await transition("running");
      await store.changeExecution(taskId,"queued",{...pending,state:"running"});
      await event("provider.requested",taskId);
      // After this point any uncertainty MUST remain unknown; never resubmit on replay.
      try {
        const submitted = await executor.submit(task);
        await event("provider.responded",taskId,"returned",submitted.execution_id);
        const status = await executor.status(submitted.execution_id);
        const result = await executor.result(submitted.execution_id);
        const verified = verifyExecution(taskId,submitted.execution_id,status,result,z.object({
          provider:z.literal("daytona"),sandbox_id:z.string().min(1),session_id:z.string().min(1),command_id:z.string().min(1),
          exit_code:z.literal(0),stdout:z.literal(PROOF_MARKER+"\n"),
          logs:z.object({stdout:z.literal(PROOF_MARKER+"\n"),stderr:z.literal("")}),
          cleanup:z.object({stopped:z.literal(true),deleted:z.literal(true),postDeleteVerified:z.literal(true)})
        }));
        const output = result.output as Record<string, unknown> | undefined;
        const correlated = /^daytona:[^:]+:[^:]+$/.test(submitted.execution_id) &&
          submitted.execution_id === `daytona:${output?.sandbox_id}:${output?.command_id}`;
        const ambiguous = result.error?.code === "DAYTONA_EXECUTION_FAILED" || result.error?.code === "DAYTONA_RESULT_MISSING" ||
          result.error?.code === "DAYTONA_IDENTITY_MISSING" || result.error?.code === "DAYTONA_CLEANUP_FAILED";
        const success = verified.accepted && correlated && submitted.task_id === taskId && submitted.state === "succeeded" && result.state === "succeeded";
        const state: TaskState = success ? "succeeded" : ambiguous ? "unknown" : "failed";
        const code = success ? "PROOF_VERIFIED" : ambiguous ? "PROVIDER_UNCERTAIN" : "VERIFICATION_REJECTED";
        await store.changeExecution(taskId,"running",{...pending,execution_id:submitted.execution_id,provider_id:submitted.execution_id,state,verification:verified.accepted ? "accepted" : "rejected",result_code:code});
        await event(success ? "verification.completed" : "verification.rejected",taskId,code,submitted.execution_id, { session_id: output?.session_id });
        await transition(state);
        await event(success ? "execution.completed" : "execution.failed",taskId,code,submitted.execution_id);
        await event("audit.persisted",taskId);
        return safe({task_id:taskId,execution_id:submitted.execution_id,state,verification:success ? "accepted" : "rejected",result_code:code},success ? 200 : state === "unknown" ? 202 : 502);
      } catch {
        await store.changeExecution(taskId,"running",{...pending,state:"unknown",verification:"unknown",result_code:"PROVIDER_UNCERTAIN"});
        await transition("unknown");
        await event("execution.failed",taskId,"PROVIDER_UNCERTAIN");
        return safe({task_id:taskId,state:"unknown",result_code:"PROVIDER_UNCERTAIN"},202);
      }
    } catch {
      // Never surface provider errors, SDK messages, SQL statements or credential values.
      return safe({error:"GATEWAY_UNAVAILABLE"},503);
    }
  };
}
