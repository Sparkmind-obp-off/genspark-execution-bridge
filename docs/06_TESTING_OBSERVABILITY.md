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

## Audit events
task.created
task.authorized
task.dispatched
execution.started
execution.completed
execution.failed
verification.started
verification.passed
verification.failed
policy.blocked
