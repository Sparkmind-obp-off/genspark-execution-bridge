# 08 — Roadmap & Verification Gates

## Gate P1 — Documentation
Official behavior and assumptions are separated.

## Gate P2 — MCP
Genspark connects to a controlled MCP server and safely calls a tool.

## Gate P3 — Executor abstraction
Mock executor passes lifecycle, failure, and verification tests.

## Gate G1 — External -> Genspark
Official interface for external Code task submission is verified.

**Phase 3 status (2026-09-22): NOT PASSED.** A generic official Genspark CLI agent-task interface was observed, but its task types did not include Genspark Code and no Code-specific submission contract was found.

## Gate G2 — Remote Code
Official remote Code execution is verified, if available.

**Phase 3 status (2026-09-22): NOT PASSED.** No safe proof was run because no official external Code execution interface was identified.

## Gate G3 — Status/result
Official Code status and artifact retrieval are verified.

**Phase 3 status (2026-09-22): NOT PASSED.** Generic CLI status/artifact commands do not prove Code lifecycle operations without a documented Code task route and Code execution identity.

If G1/G2/G3 fail, keep Genspark as a non-remote integration and use alternative executors. Phase 3 therefore records `REMOTE_CODE_NOT_VERIFIED` and keeps all Genspark executor capabilities disabled.

## Gate T1 — Tool execution
GitHub test branch, build verification, and preview deployment work.

## Gate O1 — Operator layer
Only after the proof: task queue, voice request, live status, approval gates, artifact viewer, and audit timeline.

## Strategic ownership
Own:
- task model
- orchestration
- policy
- verification
- audit
- provider abstraction

Do not need to own:
- foundation model training
- every external tool
- every execution runtime

## Current decision
Build an executor-neutral control layer. Do not lock the architecture to direct control of genspark.ai/code. Reconsider only after a Code-specific official/public interface is documented and safely reproduced.
