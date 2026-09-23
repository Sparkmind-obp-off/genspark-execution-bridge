# Phase 5B — Production Proof Implementation Prompt

## Role
Act as the production verification engineer for genspark-execution-bridge.
The objective is to close Phase 5 safely and prove the existing gateway against real Cloudflare Pages + D1 + Daytona infrastructure.
Do not redesign the architecture unless a concrete production blocker requires it. Do not broaden execution scope.

## Mandatory sequence

### 1. Audit current implementation
Read Phase 4 proof/report; Phase 5 gateway design; Phase 5 implementation report; gateway/store/policy/executor/verification code; migrations; tests.
Confirm the endpoint remains default-disabled.

### 2. Gate 0 — credential hygiene
STOP if the old Phase 4 Daytona key has not been revoked/rotated by the operator.
Do not ask the operator to paste any secret into chat, source, logs, or this report.
After legitimate runtime secret injection, verify only presence/configuration state; never print the secret; run secret scanning.

### 3. Production auth
Using a safe test token configured through runtime secret management, prove missing/invalid/valid behavior, actor propagation, and log cleanliness. Never output the token.

### 4. Production D1
Using separate real HTTP requests, create/read a task, inspect execution state, inspect durable audit, and prove data survives request/isolate boundaries.
Do not expose an unauthenticated audit route.

### 5. Production idempotency
Run first request with key K; exact replay with K; same K with changed request; same K under a different actor if actor simulation is supported.
Record only safe identifiers and outcomes.
The exact replay must not submit a second Daytona execution.

### 6. Enablement
Only after Gates 0–5 pass, set GATEWAY_EXECUTION_ENABLED=true, deploy, verify health, and confirm no arbitrary execution path was enabled.
If any prerequisite fails, leave execution disabled.

### 7. One live proof
Submit only the existing locked harmless proof operation:
printf '%s\\n' 'PHASE_5_EXECUTION_PROOF_OK'
Do not accept arbitrary commands, scripts, URLs, file paths, deployment targets, secrets, or user-defined provider parameters.
Require authenticated actor, low risk, code_mode, Daytona capability, bounded TTL, network blocked, and disposable sandbox.

### 8. Independent verification
Require exact proof marker, exit code 0, task/execution/provider correlation, expected terminal state, provider logs consistent with result, and verification independent of provider completion claims.

### 9. Cleanup
Verify stop, delete, post-delete absence, and no orphan sandbox.

### 10. Durable audit
From a separate authenticated request, retrieve safe execution state/audit and prove the full correlation chain.
No secret or raw sensitive payload may be stored.

### 11. Tests and build
Run npm test; npm run typecheck; npm run build.
Add focused tests only where a production defect is discovered.

### 12. Security review
Check auth, authorization, idempotency, secret isolation, redaction, network restrictions, TTL, no public audit, no arbitrary shell, no undocumented Genspark API, no blind retry, and no fake cancellation.

### 13. Documentation
Update docs/27_PHASE_5_IMPLEMENTATION_REPORT.md; create/update a Phase 5B proof report if useful; update README status only after actual proof.
Never change PARTIAL to PASS without evidence.

## Required final report

PHASE_5B_RESULT:
CREDENTIAL_HYGIENE:
AUTHENTICATION:
D1_DURABILITY:
IDEMPOTENCY:
ENABLEMENT:
DAYTONA_LIVE_GATEWAY:
VERIFICATION:
CLEANUP:
AUDIT:
SECURITY:
TESTS:
TYPECHECK:
BUILD:
DEPLOYMENT:
PRODUCTION_PROOF:
COMMIT:
BLOCKERS:
NEXT_ACTION:

## Stop conditions
Stop immediately and keep execution disabled if the old credential remains active; replacement secret is not securely injected; authentication cannot be proven; D1 durability is not proven; idempotency is ambiguous; arbitrary command execution becomes possible; secrets appear in logs/audit; sandbox cleanup fails; independent verification fails; or provider state is ambiguous and the implementation proposes blind retry.

## Phase 5B success condition
PHASE_5B_RESULT: PASS requires actual production evidence for every mandatory gate.
After PASS, the repository is ready to define Phase 6 as an Execution Factory productization phase. Phase 6 may introduce additional task types only one capability class at a time, each with its own policy, verification, audit, and production proof.
The system is never considered a generic remote shell.