# Phase 3 — Genspark Code Capability Discovery

## Purpose
Determine, with official evidence, whether the Execution Bridge can use Genspark Code as a remotely invokable execution provider.

This is a capability-discovery and proof phase. It must not assume that the existence of Genspark Code implies a public API for controlling it.

## Current official baseline
As of 2026-09-23, official Genspark documentation establishes:
- Genspark Code is an autonomous coding product for building applications, with planning, coding, testing, and deployment capabilities.
- Genspark Connectors support API Call and MCP connection types.
- Genspark can connect to custom/community MCP servers, subject to account and organization policy.
- GitHub is an available Genspark API Call connector.
- The official connector documentation does not by itself document a public API that lets an external application submit a task directly to Genspark Code.

Sources:
- https://www.genspark.ai/helpcenter/ai-developer
- https://www.genspark.ai/code/
- https://www.genspark.ai/helpcenter/connectors-and-integrations

## Capability classification
Use exactly one status for each capability:
- VERIFIED — official/public interface exists and a reproducible proof succeeds.
- PARTIALLY VERIFIED — official evidence exists, but the complete end-to-end contract is not proven.
- UNVERIFIED — plausible or mentioned indirectly, but no sufficient official interface/proof exists.
- NOT AVAILABLE — official documentation/product behavior indicates the capability is not exposed.

## Current capability matrix
| Capability | Current status | Required evidence |
|---|---|---|
| Code product exists | VERIFIED | Official Code/help page |
| External task submission | UNVERIFIED | Official API/SDK/automation contract plus reproducible test |
| Execution ID | UNVERIFIED | Documented submission response with stable identity |
| Status retrieval | UNVERIFIED | Documented status interface plus proof |
| Result/artifact retrieval | UNVERIFIED | Documented result interface plus proof |
| Cancel | UNVERIFIED | Documented operation plus proof |
| Retry | UNVERIFIED | Documented operation plus proof |
| Connector route to Code | UNVERIFIED | Official Code-specific connector/action plus proof |
| MCP route to Code | UNVERIFIED | Official documentation proving this direction |

## Proof experiment
### A — Official interface discovery
Search only official Genspark product, help, and developer material. Record the exact interface, authentication, request shape, response shape, execution identity, and reproducible result.

### B — Connector route
Inspect the actual Genspark Skills → Connectors surface for the current account.
Determine whether a Genspark Code-specific connector/action exists and whether it can start Code work, return an execution/project identifier, or expose status/result.
If no such action exists, record that as an observed current product-surface limitation without generalizing beyond the tested account.

### C — MCP route
The production MCP server is:
https://genspark-execution-bridge.pages.dev/mcp

Known safe proof direction:
Genspark → Execution Bridge MCP → get_project/get_task/get_status

Do not reinterpret this as:
External application → MCP → Genspark Code

The reverse direction requires a separately documented Genspark interface.

### D — Public API/SDK verification
Search official documentation for API references, SDKs, task submission, execution status, result/artifact retrieval, webhooks/events, authentication, permissions, and rate limits.
If no official interface is found, preserve the capability as UNVERIFIED. Never invent endpoints, headers, tokens, JSON contracts, or private routes.

## Evidence rules
A capability is proof only when the applicable elements are present:
1. Official source.
2. Exact interface or action.
3. Documented authentication.
4. Input contract.
5. Output contract and execution identity.
6. Reproducible test.
7. Relevant failure semantics.
8. Security boundary.

A screenshot is evidence of observed UI state, not proof of a public API.

## Architecture decision
Keep:
Control Plane → Executor Interface → Capability-Gated Genspark Executor

If external Code submission is verified, enable only the operations actually proven: submit, status, and result. Enable cancel/retry only after separate proof.

If external Code submission is not verified, keep submit/status/result/cancel/retry/code_mode disabled and fail closed.

## Acceptance gates
### G4 — Official Code interface
Pass only if an official/public interface for external Code execution is identified.

### G5 — Submission proof
Pass only if a real safe task is externally submitted through that documented interface and an execution identity is returned.

### G6 — Status/result proof
Pass only if status and result/artifact retrieval are independently reproducible.

### G7 — Security review
Pass only if authentication, authorization, secret handling, idempotency, failure semantics, and audit requirements are documented.

### G8 — Adapter enablement
Only after G5–G7 pass may Genspark executor capabilities be changed from false to true.

## Non-goals
- No private Genspark endpoint reverse engineering.
- No scraping or emulation of genspark.ai/code frontend calls.
- No browser automation as the primary integration.
- No extraction of session cookies or private tokens.
- No authentication bypass.
- No fabricated API contract.
- No autonomous production deployment.
- No treating MCP connectivity as proof of Code control.

## Relationship to Phase 2
Phase 2 established a production MCP server and safe read-only tool path.
Phase 2 proves: Genspark → Execution Bridge MCP → tool discovery/call.
Phase 3 asks a different question: External control plane → official Genspark Code execution interface.
These are separate evidence chains.

## Expected outcome
At the end of Phase 3, produce a proof report with one clear result:
- REMOTE_CODE_VERIFIED — only if the relevant gates pass; or
- REMOTE_CODE_NOT_VERIFIED — if no official external execution interface can be reproduced.

Either outcome is useful. The project must never treat an unverified interface as available merely because Genspark Code itself is available.