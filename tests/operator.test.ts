import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import app from "../src/index";

const token = "test-only-cloudflare-token-12345678901234567890";
const endpoint = "https://localhost/operator";
const approvedId = "3b63f9c19cc76418b55ce5b2f81ad20d";

test("operator dashboard has a restrictive CSP and never embeds runtime secrets", async () => {
  const response = await app.fetch(new Request("https://localhost/"), {GATEWAY_OPERATOR_TOKEN:"fixture-operator-token",DAYTONA_API_KEY:"fixture-provider-token"});
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-security-policy") ?? "",/script-src 'nonce-/);
  const html = await response.text();
  assert.match(html,/Operator sign in/);
  assert.match(html,/Recent executions/);
  assert.equal(html.includes("fixture-operator-token"),false);
  assert.equal(html.includes("fixture-provider-token"),false);
});

test("operator bridge authenticates exact approved Cloudflare identity; D1 diagnostic survives requests", async () => {
  const mf = new Miniflare({modules:true,script:"export default {fetch(){return new Response('ok')}}",d1Databases:{DB:"operator-test"}});
  const original = globalThis.fetch;
  const env = {DB:await mf.getD1Database("DB"),GATEWAY_OPERATOR_TOKEN:"test-only-operator-token-with-at-least-thirty-two-characters"};
  const send = (path:string, auth?:string, method="GET", body?:string) => app.fetch(new Request(endpoint+path,{method,headers:auth?{authorization:`Bearer ${auth}`}:undefined,body}),env);
  try {
    for (const migration of ["0001_gateway.sql","0002_operator_durability.sql"]) {
      const schema = readFileSync(new URL(`../migrations/${migration}`,import.meta.url),"utf8");
      for (const statement of schema.split("\n").filter(line=>!line.startsWith("--")).join("\n").split(";").map(s=>s.trim()).filter(Boolean)) {
        await env.DB.prepare(statement).run();
      }
    }
    globalThis.fetch = async (input,init) => {
      assert.match(String(input),/^https:\/\/api\.cloudflare\.com\/client\/v4\/(user\/tokens\/verify|accounts\/a167a50f1272635d3c1145aab3cd8f98)$/);
      assert.equal((init?.headers as Record<string,string>)?.authorization,`Bearer ${token}`);
      return Response.json(String(input).endsWith("verify") ? {success:true,result:{status:"active",id:approvedId}} : {success:true,result:{id:"a167a50f1272635d3c1145aab3cd8f98"}});
    };
    assert.equal((await send("/durability",undefined,"POST")).status,401);
    assert.equal((await send("/executions")).status,401);
    const list = await send("/executions",token);
    assert.equal(list.status,200);
    assert.deepEqual(await list.json(),{items:[]});
    assert.equal((await send("/durability","wrong-token-with-at-least-thirty-two-characters","POST")).status,401);
    const created = await send("/durability",token,"POST");
    assert.equal(created.status,201);
    const id = (await created.json() as {id:string}).id;
    assert.equal((await send(`/durability/${id}`,token)).status,200);
    assert.equal((await send(`/durability/${id}`)).status,401);
    assert.equal((await send("/proof",token,"POST",JSON.stringify({command:"echo something",idempotency_key:"x"}))).status,400);
    assert.equal((await send("/durability",token,"POST","{}")).status,400);
    env.GATEWAY_OPERATOR_TOKEN = `  Bearer ${env.GATEWAY_OPERATOR_TOKEN}  `;
    // Auth succeeds internally; the explicit execution flag is still disabled (503, not 401).
    assert.equal((await send("/executions/00000000-0000-0000-0000-000000000000",token)).status,503);
    globalThis.fetch = async () => Response.json({success:true,result:{status:"active",id:"different-token-identity"}});
    assert.equal((await send(`/durability/${id}`,token)).status,401);
  } finally { globalThis.fetch=original; await mf.dispose(); }
});
