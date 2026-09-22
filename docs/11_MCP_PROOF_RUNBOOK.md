# 11 — MCP Proof Runbook

## Objective
Prove the first concrete integration path:

**Genspark → our MCP server → safe read-only tool → observable result**

This does NOT prove that our application can remotely control Genspark Code.

## Current Evidence
Official Genspark documentation confirms MCP connections and custom/community MCP servers, and Genspark Code is an official product. The public documentation checked does not establish an external-app API for controlling Genspark Code.

Sources:
- https://www.genspark.ai/helpcenter/connectors-and-integrations
- https://www.genspark.ai/helpcenter/ai-developer

## P0 — MCP Server
Expose one harmless read-only tool:

`get_project({ "project_id": "proof-project" })`

Expected result:
```json
{"project_id":"proof-project","name":"Genspark Execution Bridge Proof","status":"ok","proof":true}
```

No writes, deploys, shell execution, credential access, or production actions.

## P1 — Connect Genspark
1. Open Skills → Connectors.
2. Configure a custom/community MCP connection using the deployed MCP server URL.
3. Complete authentication.
4. Confirm Connected.

Never commit or expose credential-bearing MCP URLs.

## P2 — Invoke
Ask Genspark to discover and invoke `get_project`.

Capture:
- connection result
- tool discovery result
- invocation result
- returned payload
- timestamp/context useful for debugging

Redact credentials and tokens.

## P3 — Independent Verification
The MCP server must record:
- `mcp.connection.checked`
- `mcp.tool.discovered`
- `mcp.tool.invoked`
- `mcp.tool.result_returned`

Genspark's visible response alone is not sufficient; the server must observe the request.

## PASS Criteria
All must be true:
- Genspark accepts the MCP connection.
- Genspark discovers `get_project`.
- Genspark invokes `get_project`.
- Our server receives the request.
- Our server returns the expected schema.
- Audit records the invocation.
- No secret appears in logs/output.

## Failure Codes
- CONNECTION_FAILED
- AUTH_FAILED
- DISCOVERY_FAILED
- INVOCATION_FAILED
- SERVER_FAILED
- POLICY_BLOCKED
- UNKNOWN

Failure means the capability is **unverified**, not permanently impossible.

## After MCP Proof
Only after this proof passes:
1. Test whether an official interface lets an external app submit a Genspark task.
2. Test Code-mode execution separately.
3. Test status/result retrieval separately.
4. Update `docs/01_CAPABILITY_DISCOVERY.md`.
5. Implement only the executor capabilities that are directly verified.

## Explicit Non-Goals
Do not reverse engineer private endpoints, scrape `genspark.ai/code`, bypass authentication, or make browser automation the primary integration.

**Current gate: MCP Proof.**
