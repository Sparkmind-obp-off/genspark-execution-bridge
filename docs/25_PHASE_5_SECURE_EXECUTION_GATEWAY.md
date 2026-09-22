# Phase 5 — Secure Execution Gateway

## Status

**Phase 5 planning document — READY FOR IMPLEMENTATION**

Phase 4 proved Daytona as a legitimate execution platform behind the provider-neutral executor boundary:

- FREE_TIER_PASS
- DAYTONA_EXECUTION_PROOF_PASS
- authenticated official SDK access
- disposable sandbox creation
- harmless command execution
- filesystem round trip
- observable status/result/logs
- network blocking
- stop/delete cleanup
- provider/correlation identity
- minimal DaytonaExecutor

Phase 4 deliberately did **not** expose public task execution. Phase 5 hardens the bridge before any authenticated execution route is opened.

## Objective

Turn the proven internal execution path into a secure gateway with explicit:

1. credential hygiene;
2. authentication;
3. authorization;
4. durable task/execution/audit persistence;
5. idempotency;
6. lifecycle handling;
7. secret isolation;
8. correlation and observability;
9. fail-closed behavior;
10. production verification.

The gateway must remain executor-neutral.

~~~text
User / AI Client
      |
      v
Authenticated Gateway
      |
      v
Canonical Task + Policy
      |
      v
Durable Task / Execution State
      |
      v
Executor Interface
      |
      +--> DaytonaExecutor --> Daytona Sandbox
      +--> MockExecutor
      +--> future E2B / Modal / other verified adapters
      |
      v
Independent Verification
      |
      v
Durable Audit
~~~

## Gate 0 — Credential hygiene

This is mandatory and blocks the rest of the phase.

The Daytona API credential used during Phase 4 was transmitted through the conversation. It must be rotated/revoked outside this repository before production use.

Requirements:

- revoke or rotate the exposed Daytona key;
- create a replacement credential through the provider's normal secure interface;
- store it only as a deployment/runtime secret;
- never put the new value in Git, docs, issues, logs, task input, or chat;
- run repository secret scanning after rotation;
- verify the running deployment can authenticate without exposing the value.

**No new credential value belongs in source control or this document.**

Gate result values:

- CREDENTIAL_HYGIENE_PASS
- CREDENTIAL_HYGIENE_FAIL

If Gate 0 fails, no execution endpoint may be enabled.

## Gate 1 — Authentication

Every non-public task/execution operation must require authenticated access.

Authentication must be implemented independently of the model or prompt.

Minimum requirements:

- explicit authenticated principal;
- stable actor identifier;
- credential/token verification;
- expiration/revocation semantics where applicable;
- no authentication secrets in task payloads;
- constant-time or provider-safe credential comparison where shared secrets are used;
- generic unauthorized responses that do not leak credential state;
- authentication failure is terminal for the request.

Recommended initial scope:

- one operator/service principal;
- one deployment-level secret or token;
- no multi-tenant claims until tenant isolation is designed.

Public endpoints such as health may remain public only when they disclose no sensitive state.

## Gate 2 — Authorization and policy

Authentication answers **who**. Authorization answers **what that principal may do**.

The policy engine remains independent from model output.

Canonical decision shape:

~~~text
can(actor, action, resource, environment, task)
~~~

Initial allowed execution envelope:

- authenticated operator/service principal;
- low-risk task only;
- canonical execution task type;
- non-empty command;
- only capabilities already verified for Daytona;
- bounded timeout/TTL;
- network blocked by default;
- no production deployment;
- no arbitrary external writes;
- no secrets embedded in task input;
- no unverified cancel/retry semantics;
- no private Genspark interfaces.

Authorization must produce an auditable decision:

~~~text
allow | deny
reason_code
policy_version
actor_id
task_id
timestamp
~~~

The model cannot grant itself permission.

## Gate 3 — Durable persistence

The current in-memory audit sink is isolate-local and is insufficient for a production gateway.

Introduce a durable persistence boundary without coupling domain logic to one storage vendor.

Required records:

### Task

- task_id
- actor_id
- task type
- normalized input metadata
- requested capabilities
- risk level
- created_at
- policy decision reference
- idempotency key
- current lifecycle state

Do not persist raw secrets or unnecessary sensitive command content.

### Execution

- execution_id
- task_id
- executor name/version
- provider resource IDs where safe
- started_at
- completed_at
- terminal state
- exit/result summary
- verification state
- failure class

### Audit event

- event_id
- timestamp
- request_id
- actor_id
- task_id
- execution_id when available
- event_type
- action
- resource
- authorization decision
- outcome
- error class
- metadata
- correlation IDs

Audit data must be redacted before persistence.

### Storage contract

Keep a storage interface such as:

~~~text
TaskStore
ExecutionStore
AuditSink
IdempotencyStore
~~~

The control plane should not know whether the implementation uses D1, another SQL database, KV, R2, or another durable store.

For the Cloudflare deployment, a transactional SQL-backed store such as D1 is a natural first implementation for task/execution/audit records, provided the schema and concurrency semantics are verified.

## Gate 4 — Idempotency

A timeout is not proof that an execution did not happen.

Never blindly submit the same side-effecting task twice.

Required behavior:

1. client supplies or gateway derives an idempotency key;
2. key is bound to authenticated actor + operation;
3. request hash is stored with the key;
4. same key + same request returns the existing task/execution outcome;
5. same key + different request is rejected;
6. provider submission is associated with durable state before/around the submission boundary;
7. uncertain submission states remain explicitly uncertain rather than being silently retried.

For Phase 5, retry of Daytona execution remains disabled unless a deterministic, safe retry contract is demonstrated.

Suggested states:

~~~text
NEW
ACCEPTED
SUBMISSION_PENDING
SUBMITTED
RUNNING
SUCCEEDED
FAILED
CANCELLED
UNKNOWN
~~~

UNKNOWN is important: the gateway must not convert provider ambiguity into a false failure or duplicate execution.

## Gate 5 — Cancellation

Phase 4 did not live-verify asynchronous cancellation.

Therefore:

- do not expose a public cancel operation as successful;
- cancel remains fail-closed until a real provider lifecycle test proves it;
- a cancellation request may be recorded as requested without claiming provider cancellation;
- only a verified provider acknowledgement can transition an execution to cancelled.

A future live cancellation proof must demonstrate:

~~~text
submit long-running harmless task
-> running
-> cancel request
-> provider cancellation acknowledgement
-> terminal cancelled state
-> cleanup
-> no false success
~~~

## Gate 6 — Secret isolation

Secrets must never be part of canonical task input.

Allowed pattern:

~~~text
Task
  |
  +-- references approved secret identity
  |
  v
Policy
  |
  v
Executor secret injection
  |
  v
isolated runtime
~~~

The secret value itself must not enter:

- GitHub;
- task JSON;
- audit events;
- stdout/stderr;
- logs;
- error messages;
- URLs;
- verification artifacts.

Daytona's documented secret mechanism may be integrated later, but the Phase 4 report explicitly marked vault-secret injection as not live-tested. It must remain disabled until independently verified.

## Gate 7 — Network and runtime restrictions

The default execution profile remains restrictive.

Initial Daytona profile:

- network egress blocked by default;
- bounded sandbox TTL;
- stop/delete cleanup;
- low-risk commands only;
- no production credentials;
- no customer data;
- no unrestricted filesystem access outside the sandbox;
- no deployment action;
- no arbitrary external writes.

Any future network allowlist must be explicit, policy-controlled, and separately tested.

## Gate 8 — Correlation and observability

Required trace:

~~~text
request_id
  -> task_id
  -> execution_id
  -> provider sandbox_id
  -> provider session_id
  -> provider command_id
  -> verification_id
  -> audit events
~~~

Every terminal execution must be reconstructable from durable records without exposing credentials.

Minimum metrics:

- accepted/denied requests;
- execution count;
- success/failure count;
- policy denials;
- provider errors;
- verification failures;
- latency;
- timeout count;
- cleanup failures;
- idempotency replays;
- unknown/uncertain executions.

## Gate 9 — Independent verification

Provider-reported completion is not sufficient.

For the Phase 5 low-risk command path, verification should check:

- task identity;
- execution identity;
- terminal state;
- exit code;
- expected output shape;
- required proof/result marker where applicable;
- correlation IDs;
- persisted state consistency.

Verification failure must produce a non-success terminal outcome even when the provider reports success.

## Gate 10 — API/MCP exposure

Only after Gates 0–9 pass should a write-capable execution route be considered.

The initial route should be deliberately narrow:

~~~text
POST /execute
~~~

or an equivalently authenticated MCP mutation.

Initial request envelope:

~~~text
task
idempotency_key
~~~

The gateway, not the client, owns:

- task ID generation/validation;
- actor identity;
- authorization;
- executor selection;
- lifecycle transitions;
- provider credential injection;
- verification;
- audit.

Do not expose a generic "run arbitrary code" endpoint.

## Failure model

Fail closed on:

- missing authentication;
- invalid authentication;
- failed authorization;
- unknown capability;
- malformed task;
- secret in task input;
- missing durable state;
- idempotency conflict;
- provider ambiguity;
- verification mismatch;
- unsupported cancel/retry;
- cleanup failure when cleanup is required;
- audit persistence failure if policy defines audit as mandatory for execution.

Never return success merely because a provider accepted a request.

## Backward compatibility

Phase 5 must preserve:

- canonical task model;
- existing Executor interface;
- MockExecutor;
- fail-closed GensparkExecutor;
- read-only MCP tools;
- independent verification;
- secret redaction;
- Daytona adapter boundary.

Do not add a Daytona-specific domain model that replaces the canonical executor contract.

## Test matrix

### Unit

- authentication;
- authorization;
- task normalization;
- policy denial;
- idempotency;
- state transitions;
- storage failure;
- secret redaction;
- verification;
- Daytona adapter mapping.

### Contract

Every executor must satisfy the canonical interface.

### Integration

- durable store reads/writes;
- authenticated gateway;
- policy + store interaction;
- idempotency replay;
- audit persistence;
- Daytona adapter with mocked provider.

### End-to-end

At minimum:

~~~text
authenticated request
-> task persisted
-> authorized
-> execution persisted
-> Daytona execution
-> result persisted
-> independently verified
-> audit persisted
-> terminal response
~~~

Also test:

- unauthorized request;
- denied task;
- duplicate idempotency key;
- changed request under same key;
- provider failure;
- verification failure;
- cleanup failure;
- storage failure;
- secret redaction.

## Production verification

Before opening execution:

- credential rotation verified;
- deployment secret injection verified;
- database migrations applied;
- authentication verified;
- authorization verified;
- durable audit verified across requests/isolates;
- idempotency verified across repeated requests;
- Daytona harmless execution verified through the gateway;
- result verification verified;
- cleanup verified;
- no credentials appear in logs/audit;
- health endpoint remains safe;
- no public route can bypass policy.

## Phase 5 exit criteria

Phase 5 is **PASS** only when all are true:

1. CREDENTIAL_HYGIENE_PASS;
2. authenticated execution route exists;
3. authorization is independent and fail-closed;
4. task/execution/audit persistence is durable;
5. idempotency is verified;
6. secret values never enter task/audit/log output;
7. Daytona execution succeeds through the gateway;
8. independent verification succeeds;
9. cleanup succeeds;
10. negative/security tests pass;
11. production verification proves cross-request persistence;
12. a focused commit records the implementation and proof report.

If any critical gate fails, the execution route remains disabled.

## Phase 5 non-goals

Do not expand this phase into:

- multi-tenant billing;
- public marketplace;
- arbitrary production deployment;
- unrestricted shell access;
- generic code hosting;
- Genspark private API integration;
- speculative Genspark Code control;
- provider fleet expansion.

Those can only be evaluated after the secure gateway is proven.

## Next phase

After Phase 5 PASS:

**Phase 6 — Controlled Execution Productization**

Potential scope:

- explicit task submission API/MCP mutation;
- execution history;
- operator approval;
- richer execution profiles;
- verified cancellation;
- verified retry policy;
- additional executor adapters;
- user-facing operator UI.

The order remains proof-first: secure the gateway before increasing capability.
