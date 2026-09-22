# 23 — Phase 4 Daytona Proof Prompt

## Role

You are the implementation and verification agent for the repository `Sparkmind-obp-off/genspark-execution-bridge`.

Your job is to perform a **proof-first Daytona execution-platform evaluation** and, only after the proof succeeds, implement the Daytona executor adapter.

Do not turn this into a new AI coding application. Daytona is being evaluated strictly as an execution infrastructure provider behind our existing control plane.

## Mission

Prove this architecture:

```
Our Control Plane
      ↓
DaytonaExecutor
      ↓
Daytona Execution Platform
      ↓
Isolated Sandbox
      ↓
Code / Shell / Filesystem
      ↓
Result / Logs / Lifecycle
```

## Non-negotiable Gate 0

Before writing the Daytona adapter or spending money:

### FREE-TIER GATE

Verify from current official Daytona sources and, where possible, the actual account:

- legitimate free access exists for the proof;
- the proof can be performed without purchasing a paid plan;
- any no-credit-card condition is verified rather than assumed;
- the free allocation is enough for one disposable E2E proof;
- current terms permit this evaluation.

Use exactly one of:

- `FREE_TIER_PASS`
- `FREE_TIER_PARTIAL`
- `FREE_TIER_FAIL`
- `FREE_TIER_UNVERIFIED`

If the result is not `FREE_TIER_PASS`, STOP the live proof and report the blocker. Do not pay to force the gate. Do not bypass restrictions.

## Official Sources First

Use current official Daytona documentation/pricing as the authority:

- https://www.daytona.io/docs/
- https://www.daytona.io/pricing
- https://www.daytona.io/docs/sandboxes
- https://www.daytona.io/docs/process-code-execution
- https://www.daytona.io/docs/mcp

Third-party material may help discover terminology, but it cannot by itself establish a pass.

## Phase A — Repository Audit

Before changing code:

1. Inspect the existing executor interface.
2. Inspect current MockExecutor.
3. Inspect current GensparkExecutor and its fail-closed behavior.
4. Inspect tests.
5. Inspect security/redaction code.
6. Inspect existing Phase 1–3B decisions.
7. Confirm the correct branch and working tree.
8. Do not rewrite stable control-plane contracts.

Report what you found before making architectural changes.

## Phase B — Capability Discovery

Verify Daytona capabilities against the required gates:

1. API/SDK.
2. Sandbox creation.
3. Code/process execution.
4. Filesystem.
5. Status/result.
6. Logs/evidence.
7. Stop/delete lifecycle.
8. Secret handling.
9. Network behavior/controls.
10. Identity/correlation.

For every capability, record:

```
STATUS = VERIFIED | PARTIAL | FAILED | UNVERIFIED
EVIDENCE = exact official source or live observation
LIMITATION = if applicable
```

Do not claim live verification from documentation alone.

## Phase C — Live Harmless Proof

If and only if Gate 0 passes and credentials are legitimately available:

1. Authenticate using environment/secret configuration.
2. Create a disposable Daytona sandbox.
3. Capture its identity.
4. Run a harmless deterministic task.
5. The task MUST emit:

```
PHASE_4_EXECUTION_PROOF_OK
```

6. Capture:
   - sandbox ID;
   - execution/process identity when available;
   - status;
   - exit code;
   - stdout/result;
   - logs;
   - timestamp;
   - bridge correlation ID if available.
7. Optionally create/read a tiny temporary file.
8. Stop/delete the sandbox.
9. Verify cleanup.
10. Preserve evidence without exposing credentials.

Do not run destructive commands.
Do not access unrelated data.
Do not perform browser/UI automation against private Daytona interfaces.
Do not reverse engineer undocumented APIs.
Do not bypass plan, authentication, quota, or safety controls.

## Phase D — Adapter Decision

Only after the live proof succeeds, decide whether the verified Daytona API/SDK can cleanly implement the existing executor interface.

If yes:

```
Executor Interface
       ↓
DaytonaExecutor
       ↓
Daytona SDK/API
```

Implement the smallest adapter needed for the verified capabilities.

If no, do not force an abstraction. Document the mismatch and stop.

## Phase E — Adapter Requirements

The adapter MUST:

- use the existing canonical task model;
- validate before execution;
- preserve fail-closed policy;
- never expose secrets;
- return canonical status/result data;
- retain provider identity for correlation;
- support verified lifecycle operations only;
- surface provider errors without inventing semantics;
- remain replaceable by another executor.

Do not add Daytona-specific assumptions to the control plane.

## Phase F — Tests

Add deterministic tests for:

1. successful execution mapping;
2. missing credentials;
3. provider rejection;
4. sandbox creation failure;
5. execution failure;
6. missing proof/result;
7. timeout where supported;
8. cancellation/cleanup where supported;
9. secret redaction;
10. provider identity/correlation.

Mock provider responses in unit tests. Do not make normal CI depend on a live Daytona account.

If a live integration test is added, make it explicitly opt-in and secret-gated.

## Phase G — Documentation

Update only what is justified by evidence.

Create/update:

- `docs/22_DAYTONA_EXECUTION_PLATFORM_PROOF.md`
- `docs/23_PHASE_4_DAYTONA_PROOF_PROMPT.md`
- a Phase 4 proof report only after execution evidence exists.

The proof report must distinguish:

- documented capability;
- live verified capability;
- partial capability;
- unverified capability;
- blockers.

Never manufacture evidence.

## Phase H — Security Review

Before committing:

- search for accidentally hardcoded Daytona credentials;
- inspect diffs for secrets;
- verify logs redact secret-like values;
- confirm no private endpoint scraping;
- confirm no credential bypass;
- confirm no unsafe default capability flags;
- confirm unverified Daytona operations fail closed.

## Phase I — Validation

Run the repository's existing validation commands.

At minimum, where applicable:

- tests;
- typecheck;
- build;
- lint.

Report exact results.

A passing build is not equivalent to a passing Daytona proof.

## Phase J — Git Commit

If and only if the work is valid:

Use a focused commit message such as:

```
feat: prove Daytona execution platform
```

or, if only documentation was changed:

```
docs: add Daytona execution proof plan
```

Never commit credentials or local secret files.

## Final Report Format

Return a concise report with:

```
PHASE_4_DAYTONA_RESULT:
FREE_TIER_GATE:
PROGRAMMATIC_ACCESS:
SANDBOX:
EXECUTION:
FILESYSTEM:
STATUS_RESULT:
LOGS:
LIFECYCLE:
SECURITY:
CORRELATION:
ADAPTER:
TESTS:
TYPECHECK:
BUILD:
COMMIT:
BLOCKERS:
NEXT_ACTION:
```

The overall result must be one of:

- `DAYTONA_EXECUTION_PROOF_PASS`
- `DAYTONA_EXECUTION_PROOF_PARTIAL`
- `DAYTONA_EXECUTION_PROOF_FAIL`
- `DAYTONA_EXECUTION_PROOF_UNVERIFIED`

## Critical Principle

**Proof before implementation.**

Do not implement a large Daytona integration merely because Daytona documentation says a feature exists. First prove the exact execution path required by this repository. Then build the smallest adapter around what was actually verified.

The goal is a durable provider-neutral execution bridge, not Daytona lock-in.

## Execution record

This prompt was executed on 2026-09-22. Gate 0 passed before live usage, the disposable proof completed, and the smallest justified adapter was implemented. See `docs/24_PHASE_4_DAYTONA_PROOF_REPORT.md` for evidence, limitations, and validation results. No credential value is recorded in the repository.
