# Genspark Execution Bridge

Proof-first, executor-neutral control foundation for integrating safe task orchestration with MCP/API executors without assuming an undocumented Genspark remote execution API.

## Deployment status

- **Platform:** Cloudflare Pages (BYOK)
- **Production:** https://genspark-execution-bridge.pages.dev
- **Health:** https://genspark-execution-bridge.pages.dev/health
- **MCP:** https://genspark-execution-bridge.pages.dev/mcp
- **Status:** Proof-only operator console and Daytona gateway. On 2026-09-23, an authenticated production run created one Daytona sandbox, executed the exact marker, and initially returned `unknown`; a separate operator recovery request verified stopped, deleted, and post-delete absence, after which D1 showed `succeeded / PROOF_VERIFIED`. A later read, exact replay, and 409 conflict were observed. Initial same-request cleanup remains subject to provider eventual consistency. Genspark remote execution remains unverified/disabled. Health status alone is not execution proof. See `docs/43_CANONICAL_DOCUMENT_INDEX.md`.
- **GitHub:** https://github.com/Sparkmind-obp-off/genspark-execution-bridge

## Phase 1 scope

Phase 1 implements this runnable path:

`Control Plane → Task Model → Policy → Executor Interface → Mock Executor → MCP Safe Tools → Verification → Audit`

Included:

- Strict canonical task schema: `task_id`, `type`, `input`, `requested_capabilities`, `risk_level`, `created_at`, and `metadata`.
- State machine: `created → validated → authorized → queued → running → succeeded | failed | cancelled`.
- Independent, fail-closed policy checks with structured denial reasons.
- Executor-neutral contract and deterministic `MockExecutor` success, failure, retry, timeout, and error behavior.
- Capability-gated `GensparkExecutor`; remote capabilities default to `false` and return `UNSUPPORTED_CAPABILITY`.
- Read-only MCP tools with explicit input/output schemas: `get_project`, `get_task`, and `get_status`.
- Independent result verification for schema, task/execution identity, expected output shape, and terminal-state consistency.
- Structured audit interface, in-memory sink, required Phase 1 events, and recursive secret redaction.
- Deterministic tests that do not use Genspark credentials.

## Proven vs. unverified capabilities

| Capability | Phase 1 status |
|---|---|
| Canonical task validation and lifecycle enforcement | Proven by local tests |
| Independent policy allow/deny behavior | Proven by local tests |
| Deterministic mock execution | Proven by local tests |
| Verification can reject false completion | Proven by local tests |
| MCP server exposes only three read tools with schemas | Proven by code/tests |
| Audit events and sensitive-value redaction | Proven by local tests |
| Cloudflare Worker health/MCP serving | Proven in production on 2026-09-22 |
| Genspark Connectors and custom/community MCP support | Confirmed by official documentation |
| Genspark invoking this deployed MCP server | Requires an external connection proof; not claimed by unit tests |
| External application submitting Genspark tasks | Unverified/disabled |
| Remote Genspark Code execution | Unverified/disabled |
| Genspark status/result/cancel/retry API | Unverified/disabled |
| Official generic Genspark CLI agent tasks | Command surface and supported types observed; one `super_agent` proof submission was rejected before creation by `free_plan_block` |
| Phase 3B CLI executor decision | `CLI_EXECUTOR_NOT_VERIFIED`; no project/run identity, terminal state, or result was produced |
| Phase 3 remote Code decision | `REMOTE_CODE_NOT_VERIFIED`; executor remains fail-closed |
| Daytona free-tier gate | `FREE_TIER_PASS` from current official pricing/limits/billing plus authenticated account access |
| Daytona sandbox, execution, filesystem, logs, and cleanup | Live verified on 2026-09-22; `DAYTONA_EXECUTION_PROOF_PASS` |
| Daytona vault-secret injection | Documented, not live-tested; partial |
| Daytona cancel and retry semantics | Unverified/disabled; fail closed |
| Production task execution through the public bridge | Not exposed in Phase 4 |

A Genspark web UI URL is not treated as an API. No private endpoint, token format, or protocol is fabricated.

## Safe MCP resources

| Tool | Known identifier | Behavior |
|---|---|---|
| `get_project` | `proof-project` | Returns the harmless fixed proof project |
| `get_task` | `proof-task` | Returns a public-safe task summary; task input is not disclosed |
| `get_status` | `proof-execution` | Returns deterministic terminal status |

Unknown resources return `UNKNOWN_RESOURCE`; malformed inputs return `INVALID_INPUT`. There are no Phase 1 write tools.

## HTTP entry points

| Method/path | Purpose |
|---|---|
| `GET /` | Owner sign-in and responsive production console; no infrastructure credentials in browser |
| `POST /owner/login`, `GET /owner/session`, `POST /owner/logout` | Dedicated owner credential → D1-backed HttpOnly session → revocation |
| `GET /health` | Service and runtime capability status (not execution proof) |
| `GET /operator/executions` | Authenticated owner session; D1-backed recent task list |
| `GET /operator/executions/:task_id` | Authenticated owner session; correlated durable state and audit |
| `POST /operator/proof`, `/operator/replay`, `/operator/conflict` | Authenticated owner session; fixed proof with idempotency key |
| `POST /operator/durability`, `GET /operator/durability/:id` | Authenticated owner session; synthetic D1 cross-request check |
| `GET|POST /operator/sandbox/:task_id` | Authenticated owner session; provider cleanup inspection/recovery |
| `POST /mcp` | MCP Streamable HTTP endpoint |
| `GET /mcp` | MCP transport request handling where supported by the SDK |
| `POST /execute` | Single-operator authenticated proof-only execution, disabled by default; strict request + idempotency key |
| `GET /executions/:task_id` | Authenticated, actor-scoped durable state and redacted audit; disabled by default |
| `GET /audit` | Removed: returns 404; no public audit of task data |

Legacy public MCP proof tools remain in-memory and read-only. The Phase 5 gateway uses D1 for task, execution, idempotency and audit records, independent of Worker isolate; `GET /executions/:task_id` requires operator authentication and discloses only the operator's own safe state. Production cross-request gateway proof is not yet claimed.

## Install, test, and build

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run typecheck
npm test
npm run build
```

Expected acceptance checks:

- TypeScript typecheck exits successfully.
- All deterministic tests pass without external credentials.
- `dist/_worker.js` is produced for Cloudflare Pages advanced mode.

## Run the MCP server locally

```bash
npm run dev
```

Wrangler listens on port `3000`. Check:

```bash
curl http://localhost:3000/health
curl -i http://localhost:3000/execute  # 405, never executes
curl -i http://localhost:3000/audit    # 404
```

Use an MCP client against `http://localhost:3000/mcp`. See `docs/11_MCP_PROOF_RUNBOOK.md` for the external Genspark connection proof. A visible model response alone is not server-side proof; inspect redacted audit evidence as well.

## Deploy to Cloudflare Pages with BYOK

Use a Cloudflare API token supplied through secret/environment injection; never place it in the repository.

```bash
npm run typecheck
npm test
npm run build
npx wrangler pages project create <project-name> \
  --production-branch main \
  --compatibility-date 2026-09-22
npx wrangler pages deploy dist --project-name <project-name>
```

For a redeploy, skip project creation. Verify after deployment:

```bash
curl https://<project-name>.pages.dev/health
curl -i https://<project-name>.pages.dev/execute # 405
curl -i https://<project-name>.pages.dev/audit   # 404
```

Deployment publishes the bridge service and safe MCP tools; it does **not** enable production task execution or any unverified Genspark capability.

## Data architecture

- Canonical tasks, executor results, policy decisions, and verification outcomes are strongly typed TypeScript objects.
- `MockExecutor` state and audit events are runtime-local in-memory data for deterministic Phase 1 behavior.
- The Phase 5 BYOK Pages gateway uses Cloudflare D1 (`DB`, `genspark-execution-bridge-gateway`) with versioned SQL migrations for durable task/execution/idempotency/audit records and hashed owner sessions/login-attempt counters. The owner credential is a separate encrypted Pages secret; session tokens are stored only as SHA-256 digests. Raw commands, provider output and credentials are not persisted.
- `DaytonaExecutor` keeps in-flight result state only for the request; the gateway persists safe terminal state, verification and audit to D1. It never marks a cleanup timeout or TTL as deletion proof.
- `D1GatewayStore` implements `TaskStore`, `ExecutionStore`, `IdempotencyStore`, and `AuditSink` without changing the existing executor contract. The legacy proof MCP uses its in-memory sink only for harmless fixed resources.

## Security boundaries

- Default allow: low/medium-risk read operations and mock execution with proven capabilities.
- Default deny: arbitrary external writes, production deployment, high/critical risk, secrets in task input, unknown executor capabilities, and Genspark private/web endpoints.
- `.env.example` contains empty placeholders only; real `.env*` files are ignored.
- API keys, bearer tokens, passwords, cookies, authorization headers, secret-like fields, credential-bearing URLs, and `dtn_...` Daytona tokens are redacted from audit output.
- Daytona tasks are limited to low risk, use network-blocked TTL-bounded sandboxes, and require stop/delete cleanup.

## Not yet implemented

- Official external-to-Genspark Code submission, execution identity, status, result, cancel, retry, or Code-mode integration. Phase 3 recorded `REMOTE_CODE_NOT_VERIFIED`.
- A `GensparkCliExecutor`. Phase 3B recorded `CLI_EXECUTOR_NOT_VERIFIED` after the authorized account was blocked by the CLI's paid-plan/500-credit gate before task creation.
- General production mutations, deployments initiated as tasks, arbitrary shell execution, or write-capable MCP tools. The only implemented gateway mutation is an exact harmless proof command, default DISABLED.
- Independent post-deployment proof of Daytona execution, stop, delete and authoritative absence; this must be measured against the latest deployment. Never call unknown provider cleanup successful.
- Multi-tenancy, self-service user accounts, approval workflows and arbitrary commands are intentionally unsupported. Owner login uses a dedicated owner credential, D1-backed revocable sessions and server-side authorization; no gateway or Cloudflare credentials are submitted by the browser.
- A completed live Genspark-to-MCP connection proof for a deployed URL.
- Durable cross-request MCP audit evidence in production; the current in-memory sink is isolate-local.

## Phase 4 — Daytona execution proof

Phase 4 completed the proof-first qualification of Daytona as execution infrastructure behind the provider-neutral control plane.

- Free-tier gate: `FREE_TIER_PASS`
- Live result: `DAYTONA_EXECUTION_PROOF_PASS`
- Exact marker: `PHASE_4_EXECUTION_PROOF_OK`
- Verified live: authenticated SDK access, sandbox creation, synchronous session command, exit status/result, command logs, tiny filesystem round trip, network blocking, stop, delete, and cleanup verification.
- Partially verified: Daytona vault-secret mechanism is documented but was not needed or live-tested.
- Disabled: async cancellation and retry/idempotency semantics.

The adapter accepts canonical low-risk `execution` tasks with `input.command` and verified capabilities. It remains internal; no public task submission or write-capable MCP tool was added. See `docs/22_DAYTONA_EXECUTION_PLATFORM_PROOF.md` and `docs/24_PHASE_4_DAYTONA_PROOF_REPORT.md`.

## Operator guide

Open `https://genspark-execution-bridge.pages.dev/` over HTTPS; enter identifier `owner` and the separately delivered owner credential. The owner credential is not a Cloudflare, Daytona, database, or gateway secret. A secure HttpOnly SameSite cookie persists across refresh for seven days; Sign out revokes the session in D1 immediately. To rotate/reset, set a new cryptographically random 32+ character `OWNER_LOGIN_CREDENTIAL` in the Cloudflare Pages project's production secrets and deliver it to the owner through a private channel. Existing sessions are rejected on rotation (credential fingerprint check); no code redeploy is required. Rate limiting locks the requesting IP for 15 minutes after five incorrect attempts. View production executions and durable audit, or run the locked proof with a generated idempotency key. Replay does not submit a second sandbox; conflict returns HTTP 409. If an execution becomes `unknown`, do not rerun it; use the detail view’s bounded cleanup verification action, which inspects the correlated sandbox without submitting another command. Only an independent provider lookup confirming absence closes cleanup. Credentials must never be pasted into chat, URLs, or source code.

## Canonical contracts

The authoritative current scope, schema, API, UI, Daytona lifecycle and deploy gates are indexed in `docs/43_CANONICAL_DOCUMENT_INDEX.md`. Historical phase prompts are contextual, not proof of current production state.

## Recommended next steps

1. Add durable, correlation-aware task/result/audit storage before exposing any authenticated execution route.
2. Re-run the single harmless Phase 3B `super_agent` lifecycle proof only on an authorized account that satisfies the CLI plan/credit requirement; require identity, terminal state, and matching output before implementing an adapter.
3. Re-run current-account Connector/MCP inventory only on an eligible account; the Phase 3 account was blocked by the CLI plan/credit gate.
4. Execute the read-only MCP proof from Genspark Connectors without treating that direction as remote Code control.
5. Capture server-side audit evidence without credentials.
6. Re-open remote Code enablement only if an official Code-specific API/CLI/Connector contract is published and safely reproduced.
7. Add authentication before exposing user-specific task data.
8. Add write tools only after explicit authorization, idempotency, and production approval controls exist.

## Project references

- Capability discovery: `docs/01_CAPABILITY_DISCOVERY.md`
- Architecture and executor boundary: `docs/02_INTEGRATION_ARCHITECTURE.md`, `docs/04_EXECUTOR_INTERFACE.md`
- Security and verification: `docs/05_SECURITY_MODEL.md`, `docs/06_TESTING_OBSERVABILITY.md`
- Decision log: `docs/10_DECISION_LOG.md`
- MCP proof runbook: `docs/11_MCP_PROOF_RUNBOOK.md`
- Phase 3 discovery: `docs/16_PHASE_3_GENSPARK_CODE_CAPABILITY_DISCOVERY.md`
- Phase 3 proof report: `docs/17_PHASE_3_GENSPARK_CODE_PROOF_REPORT.md`
- Phase 3B CLI discovery: `docs/18_GENSPARK_OFFICIAL_CLI_EXECUTOR_DISCOVERY.md`
- Phase 3B CLI proof report: `docs/20_PHASE_3B_GENSPARK_CLI_PROOF_REPORT.md`
- Phase 4 Daytona proof plan: `docs/22_DAYTONA_EXECUTION_PLATFORM_PROOF.md`
- Phase 4 Daytona proof report: `docs/24_PHASE_4_DAYTONA_PROOF_REPORT.md`
- Phase 5 secure gateway: `docs/25_PHASE_5_SECURE_EXECUTION_GATEWAY.md`, `docs/26_PHASE_5_IMPLEMENTATION_PROMPT.md`
- Phase 5 implementation report: `docs/27_PHASE_5_IMPLEMENTATION_REPORT.md`
- Phase 5B production closure: `docs/28_PHASE_5B_PRODUCTION_PROOF_CLOSURE.md`, `docs/29_PHASE_5B_PRODUCTION_PROOF_PROMPT.md`, `docs/30_PHASE_5B_PRODUCTION_EXECUTION_PROOF_RUN.md`, `docs/32_PHASE_5B_PRODUCTION_PROOF_REPORT.md`

Official sources used for Phase 3, Phase 3B, and Phase 4 are listed in their proof reports. The decisions are `REMOTE_CODE_NOT_VERIFIED` and `CLI_EXECUTOR_NOT_VERIFIED`. Genspark CLI executor proof does not prove remote Genspark Code control.
