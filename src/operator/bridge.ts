import { Daytona, DaytonaNotFoundError } from "@daytona/sdk";
import { D1GatewayStore } from "../storage/gateway-store";
import { Auditor } from "../audit/audit";
import { createGateway, normalizeOperatorToken, PROOF_COMMAND, type GatewayBindings } from "../gateway/gateway";

// This bridge accepts ONLY an active Cloudflare token for this project's own account.
// It never accepts an operator gateway secret or arbitrary commands, URLs, or provider options.
const ACCOUNT_ID = "a167a50f1272635d3c1145aab3cd8f98";
const APPROVED_TOKEN_ID = "3b63f9c19cc76418b55ce5b2f81ad20d"; // identifier, never the credential
const gateway = createGateway();
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function authorize(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9_-]{32,512}$/.test(header)) return false;
  try {
    // Both calls use the official, fixed Cloudflare API endpoints. Never log the request.
    const headers = { authorization: header, accept: "application/json" };
    const verify = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers, signal: AbortSignal.timeout(10000) });
    if (!verify.ok) return false;
    const token = await verify.json() as { success?: boolean; result?: { id?: string; status?: string } };
    if (token.success !== true || token.result?.status !== "active" || token.result.id !== APPROVED_TOKEN_ID) return false;
    const account = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!account.ok) return false;
    const identity = await account.json() as { success?: boolean; result?: { id?: string } };
    return identity.success === true && identity.result?.id === ACCOUNT_ID;
  } catch { return false; }
}

export async function operatorBridge(request: Request, env: GatewayBindings): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (!await authorize(request)) return reply({ error: "UNAUTHORIZED" }, 401);
  const operatorToken = normalizeOperatorToken(env.GATEWAY_OPERATOR_TOKEN);
  if (!env.DB || !operatorToken) return reply({ error: "UNAVAILABLE" }, 503);

  try {
    if (path === "/operator/durability" && request.method === "POST") {
      if (await request.text() !== "") return reply({ error: "INVALID_REQUEST" }, 400);
      const id = crypto.randomUUID();
      const created = new Date().toISOString();
      await env.DB.prepare("INSERT INTO gateway_durability_proof (id,actor_id,created_at) VALUES (?,?,?)").bind(id,"operator",created).run();
      return reply({ id, created_at:created }, 201);
    }
    if (/^\/operator\/durability\/[0-9a-f-]{36}$/.test(path) && request.method === "GET") {
      const id = path.slice("/operator/durability/".length);
      const record = await env.DB.prepare("SELECT id,created_at FROM gateway_durability_proof WHERE id=? AND actor_id=?").bind(id,"operator").first<{id:string;created_at:string}>();
      return record ? reply(record) : reply({error:"NOT_FOUND"},404);
    }
    if (/^\/operator\/sandbox\/[0-9a-f-]{36}$/.test(path) && ["GET","POST"].includes(request.method)) {
      const taskId = path.slice("/operator/sandbox/".length);
      const store = new D1GatewayStore(env.DB);
      const task = await store.getTask(taskId);
      if (task?.actor_id !== "operator") return reply({error:"NOT_FOUND"},404);
      const execution = await store.getExecution(taskId);
      const match = /^daytona:([0-9a-f-]{36}):([0-9a-f-]{36})$/.exec(execution?.execution_id ?? "");
      if (!match || !env.DAYTONA_API_KEY) return reply({error:"UNAVAILABLE"},503);
      const client = new Daytona({apiKey:env.DAYTONA_API_KEY,requestTimeoutMs:15000});
      try {
        const sandbox = await client.get(match[1]);
        const labelsVerified = sandbox.labels?.bridge === "genspark-execution-bridge" && sandbox.labels?.task_id === taskId;
        if (request.method === "GET") return reply({task_id:taskId,sandbox_id:match[1],absent:false,state:sandbox.state,labels_verified:labelsVerified});
        if (await request.text() !== "" || task.state !== "unknown" || !labelsVerified) return reply({error:"POLICY_DENIED"},403);
        if (sandbox.state !== "stopped") await sandbox.stop(30);
        const stopped = (await client.get(match[1])).state === "stopped";
        if (!stopped) return reply({task_id:taskId,cleanup_verified:false},202);
        await sandbox.delete(30,false);
        let absent = false;
        for (let attempt=0;attempt<10;attempt++) {
          try { await client.get(match[1]); }
          catch (error) {
            if (error instanceof DaytonaNotFoundError && error.statusCode === 404) { absent = true; break; }
            throw error;
          }
          if (attempt<9) await new Promise(resolve=>setTimeout(resolve,2000));
        }
        if (!absent) return reply({task_id:taskId,cleanup_verified:false},202);
        await new Auditor(store).emit({event:"provider.cleanup_recovered",request_id:crypto.randomUUID(),actor:"operator",
          task_id:taskId,execution_id:execution?.execution_id ?? undefined,outcome:"verified",details:{sandbox_id:match[1],stopped:true,deleted:true,postDeleteVerified:true}});
        return reply({task_id:taskId,sandbox_id:match[1],cleanup_verified:true,post_delete_absent:true});
      } catch (error) {
        if (error instanceof DaytonaNotFoundError && error.statusCode === 404)
          return reply({task_id:taskId,sandbox_id:match[1],absent:true});
        return reply({error:"PROVIDER_UNCERTAIN"},503);
      }
    }
    if (/^\/operator\/executions\/[0-9a-f-]{36}$/.test(path) && request.method === "GET") {
      const id = path.slice("/operator/executions/".length);
      return gateway(new Request(new URL(`/executions/${id}`,request.url),{headers:{authorization:`Bearer ${operatorToken}`}}),env);
    }
    if (["/operator/proof","/operator/replay","/operator/conflict"].includes(path) && request.method === "POST") {
      if (Number(request.headers.get("content-length") ?? 0) > 256) return reply({error:"INVALID_REQUEST"},400);
      const raw = await request.text();
      if (raw.length > 256) return reply({error:"INVALID_REQUEST"},400);
      let value: unknown;
      try { value = JSON.parse(raw); } catch { return reply({error:"INVALID_REQUEST"},400); }
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1) return reply({error:"INVALID_REQUEST"},400);
      const key = (value as {idempotency_key?:unknown}).idempotency_key;
      if (typeof key !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(key)) return reply({error:"INVALID_REQUEST"},400);
      const body = {task:{type:"execution",input:{command:PROOF_COMMAND},risk_level:path === "/operator/conflict" ? "medium" : "low",requested_capabilities:["code_mode"]},idempotency_key:key};
      return gateway(new Request(new URL("/execute",request.url),{method:"POST",headers:{authorization:`Bearer ${operatorToken}`,"content-type":"application/json"},body:JSON.stringify(body)}),env);
    }
    return reply({error:"NOT_FOUND"},404);
  } catch { return reply({error:"UNAVAILABLE"},503); }
}
