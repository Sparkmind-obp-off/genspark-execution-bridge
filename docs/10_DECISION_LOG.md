# 10 — Decision Log

## D001 — Proof before product
Validate Genspark integration before building a large application.

## D002 — Executor abstraction
Genspark is an executor adapter, not the entire control plane.

## D003 — MCP is not proof of Code control
MCP support and remote Code execution are separate capabilities.

## D004 — No private API dependency
Do not rely on undocumented frontend endpoints or browser internals.

## D005 — Capability flags
Unknown capabilities default to false.

## D006 — Independent verification
Provider completion is not application completion.

## D007 — Production approval
Production side effects require explicit policy authorization.

## D008 — Current Genspark evidence
Official Genspark documentation establishes Connectors, MCP connections, custom/community MCP servers, MCP authentication options, and GitHub integration. It does not establish a public remote API for controlling genspark.ai/code.

Source: https://www.genspark.ai/helpcenter/connectors-and-integrations

## D009 — Phase 1 foundation and fail-closed boundary
Phase 1 implements the executor-neutral control foundation, deterministic mock execution, three read-only MCP tools, independent verification, and structured redacted audit. The Genspark adapter exposes canonical operations but keeps `submit`, `status`, `result`, `cancel`, `retry`, and `code_mode` disabled until each capability has official/public evidence. Production execution and write-capable MCP tools are explicitly outside Phase 1 acceptance.

## D010 — Phase 3 remote Code decision
On 2026-09-22, official Genspark Code, Connectors, and officially linked CLI surfaces were inspected. Genspark Code exists as an interactive product. The generic Genspark CLI documents task identity, status, artifacts, and stop for supported specialized-agent tasks, but its observed `task create` types do not include Genspark Code or `code_sandbox`. The official Connector catalog documents Genspark consuming provider APIs and MCP tools but no Code-specific invocation route. Current-account connector enumeration was blocked by a `free_plan_block` plan/credit gate.

Decision: `REMOTE_CODE_NOT_VERIFIED`. Do not infer remote Code control from generic agent tasks, GitHub integration, or inbound MCP support. Make no runtime adapter change and keep every Genspark executor capability disabled.

Evidence: `docs/16_PHASE_3_GENSPARK_CODE_CAPABILITY_DISCOVERY.md` and `docs/17_PHASE_3_GENSPARK_CODE_PROOF_REPORT.md`.

## D011 — Phase 3B official CLI executor decision
On 2026-09-22, installed official CLI version 1.13.0 was inspected using its local help. The CLI documented supported generic task types and project/run lifecycle commands. Exactly one harmless `super_agent` proof was attempted with documented flags and a fixed-text request. The service rejected it before task creation with `free_plan_block`, stating that the CLI requires a paid plan or at least 500 credits; the authenticated test account had 100 credits.

Decision: `CLI_EXECUTOR_NOT_VERIFIED`. No project ID, run ID, status, result, or artifact was produced, so the minimum executor lifecycle was not established. Do not implement `GensparkCliExecutor`; keep status/result/cancel/retry fail-closed. Retry remains false, and documented stop command existence is not treated as verified cancel behavior. The restriction is an account/environment blocker, not a universal product claim.

A later positive generic CLI proof would still require a separate trusted runner because Cloudflare Workers cannot spawn the CLI. It would not alter `REMOTE_CODE_NOT_VERIFIED` or prove remote Genspark Code control.

Evidence: `docs/18_GENSPARK_OFFICIAL_CLI_EXECUTOR_DISCOVERY.md` and `docs/20_PHASE_3B_GENSPARK_CLI_PROOF_REPORT.md`.

## D012 — Phase 4 Daytona execution platform decision

On 2026-09-22, current official pricing, billing, limits, SDK, sandbox, execution, filesystem, secret, and terms sources established `FREE_TIER_PASS`: $200 free compute is included, the free trial states no credit card is required, and Tier 1 requires email verification rather than a linked card/top-up. The supplied least-privilege API key authenticated with sandbox write/delete permissions. No payment was made.

A live network-blocked disposable sandbox was created through official TypeScript SDK 0.216.0. A named session command emitted `PHASE_4_EXECUTION_PROOF_OK`, returned exit code 0, exposed command logs, and created a tiny file that was read back through the filesystem API. Sandbox, session, command, and bridge correlation IDs were captured. Stop reached `stopped`, deletion completed, and subsequent lookup confirmed cleanup.

Decision: `DAYTONA_EXECUTION_PROOF_PASS`. Implement the smallest `DaytonaExecutor` behind a replaceable provider boundary. Preserve the canonical executor signatures and fail-closed policy. Enable only synchronous low-risk `execution` tasks with verified `submit`, local status/result mapping, code mode, read/filesystem evidence, and mandatory cleanup. Keep cancel and retry disabled because async cancellation and retry/idempotency were not proven. Do not expose a public Daytona submission endpoint in Phase 4.

Evidence: `docs/24_PHASE_4_DAYTONA_PROOF_REPORT.md`.
