# Phase 5B — Production Execution Proof Run

## Purpose

Close Phase 5B after Gate 0 credential rotation and prove the authenticated Daytona gateway can execute the single locked proof command in production.

## Preconditions

- Gate 0 has been completed by the operator.
- Replacement `DAYTONA_API_KEY` is installed as a Cloudflare runtime secret.
- Replacement `GATEWAY_OPERATOR_TOKEN` is installed as a Cloudflare runtime secret.
- Secret values MUST NOT be printed, pasted into chat, committed, logged, or included in the report.
- Gateway remains disabled until all prerequisite checks pass.

## Required implementation state

The latest repository changes address the Phase 5B blockers:

1. Idempotency reservation is checked before policy evaluation, so replay/conflict semantics are deterministic.
2. Daytona cleanup performs a post-delete lookup using the official SDK `daytona.get(id)`; successful cleanup requires the resource to be absent.
3. Daytona execution output carries `session_id`.
4. Independent verification requires `session_id` and `postDeleteVerified`.
5. Durable audit records retain verification details containing the session correlation.

## Production proof sequence

### Gate A — deterministic validation

Run:

```bash
npm run typecheck
npm test
npm run build
```

Do not enable production execution if any command fails.

### Gate B — deploy disabled build

Deploy the validated commit to the existing Cloudflare Pages project.

Verify:

```GET /health
```

Before enablement, `production_execution` must remain false.

### Gate C — authenticated gateway prerequisites

Using only the installed runtime secret, make an authenticated request to `POST /execute` with the exact locked payload:

```json
{
  "task": {
    "type": "execution",
    "input": {
      "command": "printf '%s\\n' 'PHASE_5_EXECUTION_PROOF_OK'"
    },
    "risk_level": "low",
    "requested_capabilities": ["code_mode"]
  },
  "idempotency_key": "<unique 16-128 character key>"
}
```

Do not substitute another command.

### Gate D — production execution

Only if Gates A-C pass, enable the gateway using the existing Cloudflare runtime configuration.

Execute exactly one fresh proof request.

Required result:

- HTTP 200
- terminal state `succeeded`
- verification `accepted`
- result code `PROOF_VERIFIED`
- Daytona execution ID present
- sandbox ID, session ID and command ID correlated
- stdout exactly `PHASE_5_EXECUTION_PROOF_OK\\n`

### Gate E — independent verification and cleanup

Confirm from the gateway result/audit and provider evidence:

- command result independently verified
- network restriction remains active
- sandbox stopped
- sandbox deleted
- post-delete lookup confirms the sandbox is gone
- no provider uncertainty
- no credential appears in response, logs, audit, or build output

### Gate F — idempotency

Replay the exact same payload with the exact same idempotency key.

Required:

- no second Daytona sandbox
- same original task ID
- same execution ID
- replay response indicates `replayed:true`

Then submit the same key with a different command or task fingerprint.

Required:

- HTTP 409
- `IDEMPOTENCY_CONFLICT`
- no Daytona execution

Do not use a different actor because the current production model is single-operator.

### Gate G — durable audit

Fetch the authenticated execution record through `GET /executions/:task_id`.

Confirm that a later request/Worker isolate can read the D1-backed task, execution and audit records.

Audit must include correlation for:

- request_id
- task_id
- execution_id
- session_id
- provider result
- verification
- cleanup
- replay/conflict where applicable

### Gate H — disable after proof

After successful proof, leave the gateway in the documented safe operational state. Do not expand the API into arbitrary shell execution.

Cancellation and retry remain disabled.

## Security stop conditions

Immediately stop and leave execution disabled if:

- any secret is exposed
- authentication fails open
- D1 persistence is not durable across requests
- idempotency permits duplicate execution
- post-delete verification is missing
- audit loses required correlation
- arbitrary commands can bypass policy
- verification accepts a false result
- cleanup cannot be confirmed

## Required final report

```text
PHASE_5B_RESULT:
CREDENTIAL_HYGIENE:
AUTHENTICATION:
D1_DURABILITY:
IDEMPOTENCY:
ENABLEMENT:
DAYTONA_LIVE_GATEWAY:
VERIFICATION:
CLEANUP:
POST_DELETE_VERIFICATION:
AUDIT:
SESSION_CORRELATION:
SECURITY:
TESTS:
TYPECHECK:
BUILD:
DEPLOYMENT:
PRODUCTION_PROOF:
COMMIT:
BLOCKERS:
NEXT_ACTION:
```

Only report PASS when every required production gate has actual evidence. Never report or echo secret values.
