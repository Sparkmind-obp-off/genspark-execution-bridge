# Phase 5 — Secure Execution Gateway Implementation Prompt

## Role

Act as the implementation and verification engineer for the repository:

Sparkmind-obp-off/genspark-execution-bridge

Implement Phase 5 exactly against:

docs/25_PHASE_5_SECURE_EXECUTION_GATEWAY.md

This is a **security + gateway hardening phase**, not a platform-discovery phase.

Daytona has already passed the Phase 4 live execution proof. Do not repeat platform discovery unless implementation evidence reveals a concrete contradiction.

## Primary objective

Convert the existing internal, provider-neutral execution path into a secure, authenticated, durably persisted gateway while preserving fail-closed behavior.

Target architecture:

~~~text
Authenticated Client / AI
        |
        v
Authentication
        |
        v
Canonical Task + Policy
        |
        v
Durable Task / Idempotency State
        |
        v
Executor Interface
        |
        +--> DaytonaExecutor --> Daytona Sandbox
        +--> MockExecutor
        +--> future verified adapters
        |
        v
Independent Verification
        |
        v
Durable Audit
~~~

## Hard rules

1. **Credential hygiene is Gate 0.**
2. Never request, print, commit, or paste a new Daytona API key into repository files.
3. The Daytona credential used in Phase 4 was exposed through conversation and must be rotated/revoked by the operator outside this implementation prompt.
4. Never store provider credentials in canonical task input.
5. Never weaken policy to make a test pass.
6. Never claim cancellation or retry support unless it is actually verified.
7. Never expose arbitrary code execution as a public endpoint.
8. Never use undocumented/private Genspark endpoints.
9. Never use browser automation to bypass provider restrictions.
10. Preserve the existing executor interface.
11. Keep Genspark capabilities fail-closed.
12. Do not turn a provider timeout/ambiguity into a duplicate submission.
13. Do not report success without independent result verification.
14. Do not expose secrets in logs, audit, errors, fixtures, docs, or test output.
15. If a critical security gate cannot be proven, leave execution disabled and report the blocker.

## Phase A — Repository audit

Before changing code:

1. inspect repository structure;
2. inspect the canonical task model;
3. inspect policy implementation;
4. inspect executor interface;
5. inspect Daytona adapter;
6. inspect MockExecutor;
7. inspect GensparkExecutor;
8. inspect verification;
9. inspect audit/redaction;
10. inspect HTTP/MCP routes;
11. inspect environment/secret handling;
12. inspect all existing tests;
13. inspect package/build configuration.

Confirm the current Phase 4 baseline from:

- docs/22_DAYTONA_EXECUTION_PLATFORM_PROOF.md
- docs/24_PHASE_4_DAYTONA_PROOF_REPORT.md

Do not invent a new architecture if the existing code already provides the required abstraction.

## Phase B — Gate 0 credential hygiene

Implementation must not automate secret rotation through an unsafe channel.

The operator is responsible for:

- revoking/rotating the Phase 4 credential;
- providing the replacement only through the deployment/runtime secret mechanism.

The implementation must verify only that:

- the application reads the expected environment binding;
- no credential is hardcoded;
- no credential appears in logs;
- secret scanning remains clean.

If the runtime cannot authenticate after legitimate secret injection, record:

CREDENTIAL_HYGIENE_FAIL

and keep execution disabled.

## Phase C — Authentication

Implement the smallest safe authentication mechanism compatible with the current Cloudflare deployment.

Requirements:

- authenticated principal;
- stable actor ID;
- protected execution routes;
- safe unauthorized response;
- no secret value echoed;
- authentication occurs before task mutation or provider access.

If the repository already has an authentication abstraction, extend it rather than creating a parallel system.

For an initial single-operator deployment, a deployment secret/token may be sufficient. Do not pretend this is multi-tenant identity.

Public health/read-only endpoints may remain public only when they reveal no sensitive task/execution state.

Add tests for:

- missing credential;
- malformed credential;
- invalid credential;
- valid credential;
- authenticated actor propagation.

## Phase D — Authorization

Extend the existing independent policy layer.

Authorization must evaluate:

~~~text
actor + action + resource + environment + task
~~~

Initial allowed envelope:

- authenticated actor;
- low-risk execution;
- task type execution;
- non-empty input.command;
- verified Daytona capability only;
- bounded runtime;
- network blocked;
- no production deployment;
- no arbitrary external writes;
- no task-embedded secrets.

Explicitly deny:

- high/critical risk;
- unknown capabilities;
- unsupported executor operations;
- secrets in task input;
- production targets;
- unrestricted network;
- Genspark private endpoints;
- cancel/retry while unverified.

Persist the policy decision with a policy version and reason code.

## Phase E — Durable persistence

Implement storage interfaces for:

- TaskStore
- ExecutionStore
- AuditSink
- IdempotencyStore

Use the existing domain types where possible.

For the current Cloudflare architecture, evaluate D1 as the first durable SQL backend.

Requirements:

- schema/migrations are versioned;
- writes are validated;
- sensitive fields are minimized/redacted;
- task and execution records are correlated;
- audit events survive separate Worker requests/isolates;
- storage errors are explicit.

Do not silently fall back to in-memory persistence for production execution.

A local/in-memory implementation may remain for deterministic unit tests.

## Phase F — Idempotency

Implement idempotency before enabling public execution.

Required contract:

- idempotency key is mandatory for mutation requests;
- bind key to actor and operation;
- store a normalized request fingerprint;
- same actor + same key + same fingerprint returns existing state;
- same actor + same key + different fingerprint is rejected;
- cross-actor reuse is rejected;
- provider uncertainty is not automatically retried.

Test the race-sensitive path as far as the selected storage system permits.

If exact atomic reservation cannot be proven, do not claim strong idempotency. Document the limitation and keep risky mutation disabled.

## Phase G — Gateway lifecycle

Implement the lifecycle around the existing executor:

~~~text
created
-> validated
-> authorized
-> queued
-> running
-> succeeded | failed | cancelled
~~~

Where provider ambiguity exists, use an explicit internal state such as unknown rather than falsely mapping it to failure/success.

Persist transitions.

Every transition must have a correlation trail.

Do not change the canonical interface merely to fit Daytona.

## Phase H — Daytona integration

Use the already-proven DaytonaExecutor.

Do not rediscover or replace it.

Preserve:

- network-blocked sandbox;
- bounded TTL;
- stop/delete cleanup;
- provider correlation IDs;
- token redaction;
- low-risk restrictions.

The public gateway must pass canonical tasks to the executor rather than calling the Daytona SDK directly from the route.

Verify:

~~~text
Gateway
-> policy
-> persisted execution
-> DaytonaExecutor
-> sandbox
-> command
-> result
-> verification
-> durable audit
~~~

Use only a harmless proof command for live verification.

Do not use real customer data, production credentials, destructive commands, or unrestricted network access.

## Phase I — Secret isolation

Do not implement a fake secret-vault proof.

Phase 4 marked Daytona vault-secret injection as documented but not live-tested.

For Phase 5:

- canonical task input must reject raw secrets;
- audit/log redaction must remain active;
- environment secrets must never be serialized into task records;
- provider secret injection remains disabled unless separately verified.

If a secret reference mechanism is implemented, store only an approved secret identifier and enforce policy around it.

## Phase J — Cancellation and retry

Keep:

~~~text
cancel = unsupported/fail-closed
retry = unsupported/fail-closed
~~~

unless a new, real proof establishes safe semantics.

Do not add fake asynchronous cancellation.

Do not automatically resubmit on timeout.

If the provider state is uncertain, preserve UNKNOWN and require explicit operator resolution.

## Phase K — Execution route

Only enable a mutation route after the preceding gates are implemented and tested.

A minimal authenticated route may be:

~~~text
POST /execute
~~~

Request:

~~~json
{
  "task": {
    "type": "execution",
    "input": {
      "command": "..."
    },
    "risk_level": "low",
    "requested_capabilities": ["daytona.execution"]
  },
  "idempotency_key": "..."
}
~~~

This is an illustrative contract, not permission to bypass the repository's canonical schema.

The route must:

1. authenticate;
2. normalize/validate;
3. authorize;
4. reserve idempotency;
5. persist task;
6. submit through the executor boundary;
7. persist execution identity/state;
8. independently verify result;
9. persist terminal result;
10. persist audit;
11. return only safe result data.

Never accept provider credentials from the client.

Never expose arbitrary Daytona SDK operations.

## Phase L — Audit and observability

Required event coverage should include the existing Phase 1 events plus gateway-specific events such as:

- auth.checked
- task.persisted
- idempotency.reserved
- idempotency.replayed
- execution.state_changed
- provider.requested
- provider.responded
- verification.completed
- verification.rejected
- audit.persisted

All audit payloads must pass the existing recursive redaction layer.

Never log:

- API keys;
- bearer tokens;
- passwords;
- cookies;
- raw authorization headers;
- credential-bearing URLs;
- raw secret values.

## Phase M — Tests

Target test categories:

### Authentication
- missing auth;
- invalid auth;
- valid auth;
- actor propagation.

### Authorization
- allowed low-risk execution;
- denied high-risk;
- denied unknown capability;
- denied secret input;
- denied production target.

### Persistence
- task create/read/update;
- execution create/update;
- durable audit;
- storage failure;
- cross-request read.

### Idempotency
- first request;
- same request replay;
- changed request conflict;
- different actor conflict;
- provider uncertainty.

### Daytona adapter
Retain the existing mocked adapter tests.

### Verification
- success with expected result;
- false-success rejection;
- identity mismatch;
- terminal-state mismatch.

### Security
- secret redaction;
- auth secret not logged;
- provider token not persisted;
- public routes reveal no task data.

### End-to-end
At least one harmless authenticated gateway execution must complete end-to-end if Gate 0 is operationally satisfied.

## Phase N — Production verification

After implementation:

1. run typecheck;
2. run full deterministic test suite;
3. run build;
4. run repository secret scan;
5. apply database migrations;
6. deploy;
7. verify health;
8. verify unauthenticated execution is rejected;
9. verify authenticated low-risk execution;
10. verify durable audit from a separate request;
11. verify idempotent replay;
12. verify cleanup;
13. verify logs contain no credentials;
14. verify no public route bypasses policy.

Do not call the phase PASS from unit tests alone.

## Required documentation

Create/update:

- docs/25_PHASE_5_SECURE_EXECUTION_GATEWAY.md — architecture/gates;
- docs/26_PHASE_5_IMPLEMENTATION_PROMPT.md — this implementation contract;
- docs/27_PHASE_5_IMPLEMENTATION_REPORT.md — actual implementation/proof evidence.

If a security or architectural decision changes an earlier document, update that document rather than leaving contradictory claims.

## Required implementation report

The final report must use this exact top-level schema:

~~~text
PHASE_5_RESULT:
CREDENTIAL_HYGIENE:
AUTHENTICATION:
AUTHORIZATION:
DURABLE_PERSISTENCE:
IDEMPOTENCY:
LIFECYCLE:
DAYTONA_GATEWAY_EXECUTION:
VERIFICATION:
SECRET_ISOLATION:
CANCELLATION:
RETRY:
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
~~~

Use explicit values such as:

- PASS
- PARTIAL
- FAIL
- NOT_VERIFIED
- DISABLED

Do not use optimistic language to conceal a missing proof.

## Commit discipline

Use a focused commit after implementation and verification.

Suggested message:

~~~text
feat: harden secure execution gateway
~~~

Do not bundle unrelated branding, UI, provider discovery, or speculative Genspark work.

## Stop conditions

Stop implementation and report a blocker if:

- credential rotation cannot be completed safely;
- authentication cannot be verified;
- authorization can be bypassed;
- durable persistence cannot be proven;
- idempotency cannot be proven for the chosen mutation model;
- secrets can enter logs/audit/task state;
- Daytona cleanup cannot be enforced;
- verification can be bypassed;
- a route exposes arbitrary execution without policy;
- the only way to proceed requires undocumented/private provider access.

The correct outcome is **disabled + documented blocker**, not a fabricated PASS.

## Definition of done

Phase 5 is complete only when the secure gateway is demonstrably capable of:

~~~text
Authenticated request
  -> authorized canonical task
  -> durable task state
  -> idempotent submission
  -> Daytona execution
  -> independent verification
  -> durable terminal state
  -> durable audit
  -> safe response
~~~

with all critical security gates passing and all unverified capabilities remaining fail-closed.

## Final instruction

Implement the smallest production-safe increment that satisfies the gates.

Prefer a narrow, verifiable gateway over a feature-rich execution API.

The architecture is already proven.

**Now harden it.**
