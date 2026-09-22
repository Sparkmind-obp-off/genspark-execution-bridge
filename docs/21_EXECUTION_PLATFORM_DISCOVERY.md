# Execution Platform Discovery

## Status

Phase 4 discovery policy.

## Objective

Identify a real execution platform that can serve as a programmatic execution layer behind the executor-neutral control plane.

The project must not depend on Genspark. Genspark remains an optional provider whose remote Code and CLI execution capabilities are independently verified only when official interfaces are available.

## Requirement #1 — Free-Tier Gate

**Free-tier access is a mandatory Gate 0 requirement.**

A candidate execution platform is not eligible for the first live proof unless the project can obtain and use a legitimate free tier, free trial, or free credits sufficient to perform the minimum proof without requiring paid usage.

Preferred characteristics:

- No credit card required to start.
- No paid-plan-only API requirement for the proof.
- No hidden prerequisite that defeats the free proof path.
- Terms permit the intended evaluation/proof activity.
- The free allocation is sufficient for at least one disposable end-to-end execution.

### Gate 0 decision

- FREE_TIER_PASS: legitimate free access is available and sufficient for the planned proof.
- FREE_TIER_PARTIAL: free access exists but a required capability is paywalled or insufficient for the proof.
- FREE_TIER_FAIL: no legitimate free execution path is available.
- FREE_TIER_UNVERIFIED: evidence is insufficient.

A candidate with FREE_TIER_FAIL is excluded from the initial live proof. A candidate with FREE_TIER_PARTIAL cannot be selected as the primary proof platform until the blocked capability is resolved legitimately.

## Mandatory technical requirements

After Gate 0 passes, the candidate must be evaluated for:

1. Programmatic API or SDK.
2. Isolated execution environment / sandbox.
3. Code and process execution.
4. Filesystem/workspace access.
5. Execution status and observable result.
6. Logs or equivalent execution evidence.
7. Lifecycle controls such as create, stop, and delete.
8. Secure environment/secret handling.
9. Network controls appropriate to the execution model.
10. A viable adapter boundary for the existing Executor interface.

## Important distinction

This discovery is looking for **execution infrastructure**, not necessarily another AI coding website.

Target model:

Our Control Plane → Executor Adapter → Execution Platform → Agent/Code Runtime

Examples of candidate categories:

- Sandbox infrastructure: Daytona, E2B, Modal.
- Agent runtimes that expose a legitimate programmatic execution contract.
- Other execution platforms discovered through official documentation.

An AI product is only a candidate if it exposes a supported programmatic execution interface that satisfies the same lifecycle requirements.

## Proof sequence

For each candidate:

Free access → credential/setup → create runtime → execute harmless task → capture identity → capture status → capture result → inspect logs/artifacts → stop/delete → verify correlation

The disposable proof should be deterministic and harmless, for example producing:

PHASE_4_EXECUTION_PROOF_OK

No production credentials, destructive operations, or real customer data may be used.

## Evidence rules

Use official documentation and actual API/SDK behavior.

Do not:

- reverse engineer private endpoints;
- automate private web UI as the primary integration;
- bypass plan, credit, authentication, or usage restrictions;
- fabricate undocumented lifecycle semantics;
- claim a capability from marketing language alone.

## Architecture decision

The control plane remains provider-neutral.

The first successfully proven platform becomes an executor adapter; it does not replace the canonical task model, policy engine, verification layer, or audit layer.

Genspark Code remains a separate capability track:

Genspark Code ≠ execution-platform requirement

A successful Daytona/E2B/Modal/etc. proof also does not retroactively prove Genspark remote Code control.

## Initial candidates

| Candidate | Gate 0 | API/SDK | Sandbox | Execution lifecycle | Status |
|---|---|---|---|---|---|
| Daytona | Verify with current official pricing/account | Verify | Expected; prove | Verify live | Discovery |
| E2B | Verify with current official pricing/account | Verify | Expected; prove | Verify live | Discovery |
| Modal | Verify with current official pricing/account | Verify | Expected; prove | Verify live | Discovery |
| Other candidates | Must pass Gate 0 first | Verify | Verify | Verify live | Discovery |

This table is deliberately not a ranking. It is a qualification matrix.

## Exit conditions

Phase 4 discovery can advance to live proof when at least one candidate has:

- FREE_TIER_PASS;
- documented programmatic access;
- a safe proof path;
- no requirement to bypass restrictions.

The project then runs the live proof and only implements the corresponding executor adapter after lifecycle evidence is captured.

## Relationship to existing phases

- Phase 1: control foundation — proven.
- Phase 2: MCP endpoint/tool proof — proven at the endpoint level.
- Phase 3: Genspark Code remote execution — REMOTE_CODE_NOT_VERIFIED.
- Phase 3B: Genspark CLI executor — CLI_EXECUTOR_NOT_VERIFIED because the proof account hit free_plan_block.
- Phase 4: execution-platform discovery, with **Free-Tier Gate as Requirement #1**.

## Decision

**Do not spend money merely to discover whether the architecture works.**

The first execution-platform proof must use a legitimate free access path. Paid plans may be evaluated later for production capacity, but they are not required for initial architectural proof.
