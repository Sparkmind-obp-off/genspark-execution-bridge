# 06 — Testing, Observability & Audit

## Test layers
Unit:
- task normalization
- policy
- routing
- schema validation
- retry classification
- redaction

Contract:
- every executor follows the canonical interface.

Integration:
- MCP connection
- authentication
- tool discovery
- invocation
- result mapping

End-to-end:
request -> plan -> authorize -> execute -> verify -> audit.

## Capability tests
GENSPARK-U1-SUBMIT
GENSPARK-U2-CODE
GENSPARK-U3-STATUS
GENSPARK-U4-RESULT

A failed capability test means unverified, not available.

## Metrics
- task count
- success/failure count
- execution latency
- verification latency
- executor errors
- tool errors
- retries
- policy blocks

## Traceability
request_id -> task_id -> execution_id -> tool calls -> verification.

## Completion rule
Executor-reported completion is not enough. The bridge should independently verify observable outcomes where possible.

## Phase 1 audit events
- `task.created`
- `task.validated`
- `task.authorization.checked`
- `execution.submitted`
- `execution.completed`
- `execution.failed`
- `verification.completed`
- `verification.rejected`
- `mcp.connection.checked`
- `mcp.tool.discovered`
- `mcp.tool.invoked`
- `mcp.tool.result_returned`
- `policy.denied`

The Phase 1 sink is in-memory behind an `AuditSink` interface. Sensitive keys and credential-bearing values are redacted before storage.
