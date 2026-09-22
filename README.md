# Genspark Execution Bridge

Proof-first, executor-neutral control foundation for integrating safe task orchestration with MCP/API executors without assuming an undocumented Genspark remote execution API.

## Deployment status

- **Platform:** Cloudflare Pages (BYOK)
- **Production:** https://genspark-execution-bridge.pages.dev
- **Health:** https://genspark-execution-bridge.pages.dev/health
- **MCP:** https://genspark-execution-bridge.pages.dev/mcp
- **Status:** Active; health, MCP initialization, tool discovery, and `get_project` verified in production on 2026-09-22. Phase 4 produced `DAYTONA_EXECUTION_PROOF_PASS` and added a minimal provider-neutral Daytona adapter. The adapter is not exposed as a public execution route. Phase 3 Genspark Code and Phase 3B generic CLI execution remain unverified/disabled.
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
| `GET /health` | Service and Phase 1 capability status |
| `POST /mcp` | MCP Streamable HTTP endpoint |
| `GET /mcp` | MCP transport request handling where supported by the SDK |
| `GET /audit` | Runtime-local, already-redacted audit evidence |

The in-memory audit sink is intentionally replaceable through the `AuditSink` interface and is not durable across Worker restarts or isolates. Production MCP initialization, discovery, and `get_project` calls were verified, but a later `/audit` request can reach a different isolate and return no prior events. Durable cross-request audit evidence is therefore not yet claimed.

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
curl http://localhost:3000/audit
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
curl https://<project-name>.pages.dev/audit
```

Deployment publishes the bridge service and safe MCP tools; it does **not** enable production task execution or any unverified Genspark capability.

## Data architecture

- Canonical tasks, executor results, policy decisions, and verification outcomes are strongly typed TypeScript objects.
- `MockExecutor` state and audit events are runtime-local in-memory data for deterministic Phase 1 behavior.
- No persistent database, KV namespace, or R2 bucket is used. Daytona credentials are runtime secrets only and are never accepted in canonical task input.
- `DaytonaExecutor` stores terminal status/results in-memory and maps provider sandbox/command IDs into canonical correlation data.
- A durable audit backend can later implement `AuditSink` without changing domain logic.

## Security boundaries

- Default allow: low/medium-risk read operations and mock execution with proven capabilities.
- Default deny: arbitrary external writes, production deployment, high/critical risk, secrets in task input, unknown executor capabilities, and Genspark private/web endpoints.
- `.env.example` contains empty placeholders only; real `.env*` files are ignored.
- API keys, bearer tokens, passwords, cookies, authorization headers, secret-like fields, credential-bearing URLs, and `dtn_...` Daytona tokens are redacted from audit output.
- Daytona tasks are limited to low risk, use network-blocked TTL-bounded sandboxes, and require stop/delete cleanup.

## Not yet implemented

- Official external-to-Genspark Code submission, execution identity, status, result, cancel, retry, or Code-mode integration. Phase 3 recorded `REMOTE_CODE_NOT_VERIFIED`.
- A `GensparkCliExecutor`. Phase 3B recorded `CLI_EXECUTOR_NOT_VERIFIED` after the authorized account was blocked by the CLI's paid-plan/500-credit gate before task creation.
- Production mutations, deployments initiated as tasks, or write-capable MCP tools.
- Durable task/execution/audit persistence.
- Authentication, multi-tenancy, operator UI, and approval workflows.
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

Official sources used for Phase 3, Phase 3B, and Phase 4 are listed in their proof reports. The decisions are `REMOTE_CODE_NOT_VERIFIED` and `CLI_EXECUTOR_NOT_VERIFIED`. Genspark CLI executor proof does not prove remote Genspark Code control.
