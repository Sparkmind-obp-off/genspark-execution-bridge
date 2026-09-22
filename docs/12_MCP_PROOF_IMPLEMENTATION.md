# 12 — MCP Proof Implementation

## Status

Implementation complete for the first executable MCP proof server.

### P0 — Server

Endpoint:
- `GET /health`
- MCP endpoint: `POST /mcp`
- Audit evidence: `GET /audit`

Phase 1 tools:
- `get_project({ "project_id": "proof-project" })`
- `get_task({ "task_id": "proof-task" })`
- `get_status({ "execution_id": "proof-execution" })`

The original proof payload remains:

```json
{"project_id":"proof-project","name":"Genspark Execution Bridge Proof","status":"ok","proof":true}
```

All tools have explicit input/output schemas, deterministic validation, and audit events. They are intentionally read-only and have no credentials, deployment actions, shell execution, or external writes.

## P1 — Genspark connection

Deploy the Worker and copy the public `/mcp` URL into Genspark Skills → Connectors → custom/community MCP.

Do not expose or commit credential-bearing connection URLs.

## P2 — Genspark invocation

After connection, ask Genspark to:
1. discover the `get_project` tool;
2. invoke it with `project_id=proof-project`;
3. return the exact proof payload.

The Genspark response is not enough by itself.

## P3 — Independent verification

Open `/audit` after the invocation and verify these server-side events exist:

- `mcp.connection.checked`
- `mcp.tool.discovered`
- `mcp.tool.invoked`
- `mcp.tool.result_returned`

The server logs contain no credentials or tokens.

## Important limitation

This implementation proves the **Genspark → our MCP server** direction once the deployed endpoint is actually connected and invoked.

It does **not** prove that an external application can remotely submit or control Genspark Code.

That is a separate capability gate.

## Verification command

```bash
npm install
npm run typecheck
npm test
npm run dev
```

Then use a public deployment for the Genspark connection step.
