# Phase 5B — Production Proof Closure

## Purpose

Phase 5B closes the gap between a deterministic secure gateway implementation and a real production execution path.

This is not a new platform-discovery cycle. Daytona is already qualified by Phase 4. The objective is to prove that the existing gateway can safely execute one tightly constrained production task and retain durable evidence across real requests and Cloudflare Worker isolates.

## Product direction

The bridge is evolving into an Execution Factory: a provider-neutral execution control plane that accepts authenticated, policy-approved tasks, dispatches them to verified execution infrastructure, independently verifies the result, persists the lifecycle, and produces durable audit evidence.

The product must not become an arbitrary remote shell, credential relay, or unsafe agent endpoint.

## Phase 5B gates

### Gate 0 — Credential hygiene
Operator must revoke/rotate the Phase 4 Daytona credential that was exposed during development.
Requirements: revoke the old credential; create a replacement; inject it through Cloudflare runtime secret management; never place the value in source, docs, logs, screenshots, commits, or chat; run repository/production secret scans.
Block: execution stays disabled if Gate 0 is not verified.

### Gate 1 — Production authentication
Verify the configured operator bearer secret without revealing its value.
Evidence: missing token -> 401; invalid token -> 401; valid token -> authenticated actor; actor is persisted/correlated; no token appears in logs or audit records.

### Gate 2 — Production D1 durability
Use the real production D1 binding.
Verify from separate authenticated requests that request A creates task/execution/idempotency/audit records, request B retrieves the same state, a separate Worker isolate can read the records, and terminal state survives request boundaries.

### Gate 3 — Production idempotency
Use a unique idempotency key.
Verify: first request reserves the key and may contact Daytona; exact replay returns the existing execution/result and does not create a second provider execution; same key with a different normalized request is rejected; same key with a different actor is rejected; stranded reservation becomes UNKNOWN; UNKNOWN is never blindly resubmitted.
Do not claim mathematical exactly-once delivery to Daytona. The guarantee is no blind duplicate submission after the bridge has durable evidence of a prior reservation.

### Gate 4 — Live gateway execution
Only after Gates 0–3 pass, enable the existing runtime flag and submit exactly the locked harmless proof task.
Keep authentication, low risk, code_mode, network blocking, bounded TTL, disposable sandbox, exact proof marker, independent verification, stop, and delete.
No arbitrary command or user-supplied shell execution is introduced in Phase 5B.

### Gate 5 — Durable audit
Verify the production chain: request_id -> task_id -> execution_id -> provider sandbox/session/command -> verification -> cleanup -> audit.
Audit contains safe metadata and redacted outcomes only.
Never persist API keys, bearer tokens, Authorization headers, raw secrets, credential-bearing URLs, unnecessary stdout/stderr, or raw task commands when avoidable.

### Gate 6 — Cleanup and failure evidence
Verify success reaches succeeded; provider sandbox is stopped; provider sandbox is deleted; post-delete lookup confirms removal; provider failure becomes failed; ambiguous provider state becomes unknown; unknown is visible and not silently retried.

### Gate 7 — Production security review
Confirm POST /execute requires authentication; execution is disabled unless explicitly enabled; policy remains independent from model output; only the locked proof operation is authorized; no arbitrary shell endpoint exists; no public audit endpoint exposes task data; secrets are redacted; provider credentials remain server-side; transport does not broaden mutation access.

## Definition of done
Phase 5B is PASS only when all Gates 0–7 have actual production evidence.
The report must include deployment version/commit, production timestamp, request/task/execution correlation IDs, idempotency replay evidence, D1 cross-request evidence, Daytona sandbox/session/command correlation, verification result, cleanup result, secret/log review, tests/typecheck/build, and remaining disabled capabilities.
If any production gate is missing, status remains PARTIAL and execution remains disabled.

## Transition to Execution Factory
After Phase 5B PASS, the system enters Phase 6: Controlled Execution Factory Productization.

Target architecture:
Client / AI
  -> Authenticated Execution API / MCP
  -> Task Normalizer
  -> Policy + Authorization
  -> Durable Task / Idempotency / Audit
  -> Executor Router
       -> DaytonaExecutor
       -> MockExecutor
       -> future verified E2B / Modal adapters
  -> Sandboxed Runtime
  -> Independent Verification
  -> Durable Result + Audit

Phase 6 may expand task classes only through explicit capability proofs, authorization policies, verification contracts, and production gates.
GensparkExecutor remains disabled unless an official, reproducible execution contract is established.

## Explicit non-goals
- arbitrary shell execution
- browser automation against private Genspark interfaces
- credential bypass
- reverse engineering undocumented APIs
- automatic deployment to production
- blind retry
- fake cancellation
- multi-tenant access before isolation is proven