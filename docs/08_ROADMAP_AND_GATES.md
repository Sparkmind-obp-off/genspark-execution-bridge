# 08 — Roadmap & Verification Gates

## Gate P1 — Documentation
Official behavior and assumptions are separated.

## Gate P2 — MCP
Genspark connects to a controlled MCP server and safely calls a tool.

## Gate P3 — Executor abstraction
Mock executor passes lifecycle, failure, and verification tests.

## Gate G1 — External -> Genspark
Official interface for external task submission is verified.

## Gate G2 — Remote Code
Official remote Code execution is verified, if available.

## Gate G3 — Status/result
Official status and artifact retrieval are verified.

If G1/G2/G3 fail, keep Genspark as a non-remote integration and use alternative executors.

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
Build an executor-neutral control layer. Do not lock the architecture to direct control of genspark.ai/code.
