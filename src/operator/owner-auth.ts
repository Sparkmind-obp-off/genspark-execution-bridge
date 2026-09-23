import type { GatewayBindings } from "../gateway/gateway";

const COOKIE = "owner_session";
const TTL = 60 * 60 * 24 * 7;
const reply = (body: object, status = 200, cookie?: string) => Response.json(body, {status, headers:{"cache-control":"no-store", ...(cookie ? {"set-cookie":cookie} : {})}});
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))), b=>b.toString(16).padStart(2,"0")).join("");
const encode = (bytes: Uint8Array) => Array.from(bytes, b=>b.toString(16).padStart(2,"0")).join("");
const cookie = (value: string, maxAge: number) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
function credential(env: GatewayBindings) {
  return typeof env.OWNER_LOGIN_CREDENTIAL === "string" && env.OWNER_LOGIN_CREDENTIAL.length >= 32 ? env.OWNER_LOGIN_CREDENTIAL : null;
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  return origin === url.origin && url.protocol === "https:";
}
function sessionToken(request: Request): string | null {
  const raw = request.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)owner_session=([a-f0-9]{64})(?:;|$)/.exec(raw);
  return match?.[1] ?? null;
}
export async function ownerSession(request: Request, env: GatewayBindings): Promise<boolean> {
  const token = sessionToken(request), secret = credential(env);
  if (!token || !secret || !env.DB) return false;
  try {
    const record = await env.DB.prepare("SELECT credential_version,expires_at FROM owner_sessions WHERE token_hash=?")
      .bind(await digest(token)).first<{credential_version:string;expires_at:number}>();
    return !!record && record.expires_at > Math.floor(Date.now()/1000) && record.credential_version === await digest(secret);
  } catch { return false; }
}
export async function ownerAuth(request: Request, env: GatewayBindings): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (!env.DB || !credential(env)) return reply({error:"OWNER_AUTH_UNAVAILABLE"},503);
  if (path === "/owner/session" && request.method === "GET")
    return await ownerSession(request,env) ? reply({authenticated:true,identifier:"owner"}) : reply({error:"UNAUTHORIZED"},401);
  if (!sameOrigin(request)) return reply({error:"FORBIDDEN"},403);
  if (path === "/owner/logout" && request.method === "POST") {
    const token = sessionToken(request);
    if (token) await env.DB.prepare("DELETE FROM owner_sessions WHERE token_hash=?").bind(await digest(token)).run();
    return reply({authenticated:false},200,cookie("",0));
  }
  if (path !== "/owner/login" || request.method !== "POST") return reply({error:"NOT_FOUND"},404);
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length") ?? 0) > 512)
    return reply({error:"INVALID_REQUEST"},400);
  const raw = await request.text();
  if (raw.length > 512) return reply({error:"INVALID_REQUEST"},400);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply({error:"INVALID_REQUEST"},400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).sort().join(",") !== "identifier,password")
    return reply({error:"INVALID_REQUEST"},400);
  const {identifier,password} = body as {identifier:unknown;password:unknown};
  if (typeof identifier !== "string" || typeof password !== "string" || password.length > 256) return reply({error:"INVALID_REQUEST"},400);
  const now = Math.floor(Date.now()/1000);
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await digest(ip);
  try {
    const attempts = await env.DB.prepare("SELECT failures,window_start FROM owner_login_attempts WHERE ip_hash=?")
      .bind(ipHash).first<{failures:number;window_start:number}>();
    if (attempts && now - attempts.window_start < 900 && attempts.failures >= 5) return reply({error:"TOO_MANY_ATTEMPTS"},429);
    const expected = await digest(credential(env)!);
    const received = await digest(password);
    let diff = 0;
    for (let i=0;i<expected.length;i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
    if (identifier !== "owner" || diff !== 0) {
      const windowStart = attempts && now-attempts.window_start < 900 ? attempts.window_start : now;
      const failures = attempts && windowStart === attempts.window_start ? attempts.failures+1 : 1;
      await env.DB.prepare("INSERT INTO owner_login_attempts(ip_hash,failures,window_start) VALUES(?,?,?) ON CONFLICT(ip_hash) DO UPDATE SET failures=excluded.failures,window_start=excluded.window_start")
        .bind(ipHash,failures,windowStart).run();
      return reply({error:"INVALID_CREDENTIALS"},401);
    }
    await env.DB.prepare("DELETE FROM owner_login_attempts WHERE ip_hash=?").bind(ipHash).run();
    const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
    const token = encode(bytes);
    await env.DB.prepare("INSERT INTO owner_sessions(token_hash,credential_version,expires_at) VALUES(?,?,?)")
      .bind(await digest(token),expected,now+TTL).run();
    return reply({authenticated:true,identifier:"owner"},200,cookie(token,TTL));
  } catch { return reply({error:"OWNER_AUTH_UNAVAILABLE"},503); }
}
