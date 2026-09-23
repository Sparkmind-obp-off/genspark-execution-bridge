import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import app from "../src/index";

const password = "owner-only-test-credential-not-an-infrastructure-secret-123";
const origin = "https://localhost";

test("owner console never embeds infrastructure secrets or Cloudflare token form", async () => {
  const response = await app.fetch(new Request(origin+"/"), {GATEWAY_OPERATOR_TOKEN:"fixture-operator-token",DAYTONA_API_KEY:"fixture-provider-token",OWNER_LOGIN_CREDENTIAL:password});
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-security-policy") ?? "",/script-src 'nonce-/);
  const html = await response.text();
  assert.match(html,/Owner sign in/);
  assert.match(html,/Recent executions/);
  assert.doesNotMatch(html,/APPROVED OPERATOR TOKEN|Token not approved|Cloudflare operator token/);
  for (const secret of ["fixture-operator-token","fixture-provider-token",password]) assert.equal(html.includes(secret),false);
});

test("owner session is D1-backed, authorizes console, rejects unauthenticated access and revokes on logout", async () => {
  const mf = new Miniflare({modules:true,script:"export default {fetch(){return new Response('ok')}}",d1Databases:{DB:"operator-test"}});
  const env = {DB:await mf.getD1Database("DB"),GATEWAY_OPERATOR_TOKEN:"test-only-operator-token-with-at-least-thirty-two-characters",OWNER_LOGIN_CREDENTIAL:password};
  const send = (path:string, method="GET", body?:string, session?:string, requestOrigin=origin) => app.fetch(new Request(origin+path,{method,headers:{...(body?{"content-type":"application/json"}:{}),...(session?{cookie:session}:{}),...(method!=="GET"?{origin:requestOrigin}:{})},body}),env);
  try {
    for (const migration of ["0001_gateway.sql","0002_operator_durability.sql","0003_owner_sessions.sql"]) {
      const schema = readFileSync(new URL(`../migrations/${migration}`,import.meta.url),"utf8");
      for (const statement of schema.split("\n").filter(line=>!line.startsWith("--")).join("\n").split(";").map(s=>s.trim()).filter(Boolean)) await env.DB.prepare(statement).run();
    }
    assert.equal((await send("/owner/session")).status,401);
    assert.equal((await send("/operator/executions")).status,401);
    assert.equal((await send("/operator/proof","POST",JSON.stringify({idempotency_key:"a".repeat(32)}))).status,401);
    assert.equal((await send("/execute","POST","{}")).status,401);
    assert.equal((await send("/owner/login","POST",JSON.stringify({identifier:"owner",password}),undefined,"https://attacker.example")).status,403);
    assert.equal((await send("/owner/login","POST",JSON.stringify({identifier:"owner",password:"wrong"}))).status,401);
    const login = await send("/owner/login","POST",JSON.stringify({identifier:"owner",password}));
    assert.equal(login.status,200);
    const setCookie = login.headers.get("set-cookie") ?? "";
    assert.match(setCookie,/HttpOnly; Secure; SameSite=Strict/);
    const session = setCookie.split(";")[0];
    assert.equal((await send("/owner/session","GET",undefined,session)).status,200);
    assert.deepEqual(await (await send("/operator/executions","GET",undefined,session)).json(),{items:[]});
    assert.equal((await send("/operator/durability","POST","",session,"https://attacker.example")).status,403);
    const created = await send("/operator/durability","POST","",session);
    assert.equal(created.status,201);
    const id = (await created.json() as {id:string}).id;
    assert.equal((await send(`/operator/durability/${id}`,"GET",undefined,session)).status,200);
    assert.equal((await send(`/operator/durability/${id}`)).status,401);
    assert.equal((await send("/operator/executions/00000000-0000-0000-0000-000000000000","GET",undefined,session)).status,503);
    assert.equal((await send("/owner/logout","POST",undefined,session)).status,200);
    assert.equal((await send("/owner/session","GET",undefined,session)).status,401);
    assert.equal((await send("/operator/executions","GET",undefined,session)).status,401);
    const rotated = {...env,OWNER_LOGIN_CREDENTIAL:"new-owner-credential-rotated-long-enough-987654321"};
    const relogin = await send("/owner/login","POST",JSON.stringify({identifier:"owner",password}));
    const previous = relogin.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await app.fetch(new Request(origin+"/owner/session",{headers:{cookie:previous}}),rotated)).status,401);
  } finally {await mf.dispose();}
});
