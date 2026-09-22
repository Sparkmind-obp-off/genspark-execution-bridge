# Phase 1 — Genspark Execution Bridge Implementation Prompt

## Role
You are the implementation executor for this repository.
Repository: https://github.com/Sparkmind-obp-off/genspark-execution-bridge
Implement Phase 1 directly in the repository. Do not redesign the project around undocumented Genspark APIs.

## Mission
Turn the existing proof-first architecture into a clean, runnable Phase 1 foundation:
Control Plane → Task Model → Policy → Executor Interface → Mock Executor → MCP Safe Tools → Verification → Audit
Genspark remains an executor candidate behind a capability-gated adapter. Do NOT assume Genspark Code has a public remote execution API.

## Phase 1 scope
1. Inspect existing README, docs/01 through docs/12, package.json, tsconfig.json, wrangler.toml, src/, and tests/. Preserve correct work and avoid duplication.
2. Create a strongly typed task model: task_id, type, input, requested_capabilities, risk_level, created_at, metadata.
3. Implement explicit states: created → validated → authorized → queued → running → succeeded | failed | cancelled. Reject invalid transitions.
4. Implement independent policy checks. Default: read operations and mock execution allowed; arbitrary external writes, production deployment, secrets in task input, unknown executor capabilities, and undocumented/private Genspark endpoints denied. Return structured denial reasons.
5. Implement executor interface: capabilities(), validate(task), submit(task), status(execution_id), result(execution_id), cancel(execution_id), retry(execution_id). Provide deterministic MockExecutor success, failure, and timeout/error behavior.
6. Create capability-gated Genspark adapter. Defaults must be false for submit, status, result, cancel, retry, and code_mode. Fail closed with structured UNSUPPORTED_CAPABILITY. Never fabricate an endpoint, token, or protocol.
7. Keep the existing safe MCP proof and expose only get_project, get_task, get_status. Each needs explicit input/output schemas, deterministic validation, no secret disclosure, and an audit event. No write tools in Phase 1.
8. Create independent verification for schema validity, execution identity, expected result shape, and terminal-state consistency. Verification failure must never become success.
9. Create structured audit events: task.created, task.validated, task.authorization.checked, execution.submitted, execution.completed, execution.failed, verification.completed, verification.rejected, mcp.connection.checked, mcp.tool.discovered, mcp.tool.invoked, mcp.tool.result_returned, policy.denied. Redact API keys, bearer tokens, passwords, cookies, authorization headers, and credential-bearing URLs. In-memory sink is acceptable for Phase 1 if an interface exists for a durable sink later.
10. Add deterministic tests for task validation, state transitions, policy allow/deny, MockExecutor success/failure, unsupported Genspark capability, verification success/rejection, audit redaction, MCP schemas, and unknown resources. Tests must not require real Genspark credentials.
11. Keep .env.example placeholders only. Never commit real credentials.
12. Update README with Phase 1 scope, proven vs unverified capabilities, test/local MCP/deploy instructions, and the fact that production execution is not part of Phase 1 acceptance. Add a Phase 1 decision-log entry.

## Acceptance gates
Phase 1 is complete only if typecheck passes; tests pass; MockExecutor has deterministic success/failure; policy denies unsupported/high-risk operations; Genspark adapter fails closed without evidence; MCP tools have explicit schemas; audit is structured/redacted; README is accurate; no secrets are committed; and no undocumented Genspark endpoint is introduced.

## Git discipline
Work only in this repository. Make focused commits. Do not rewrite unrelated history or add generated build artifacts. Do not claim tests or deployment passed unless actually run. At the end report files changed, tests actually run/results, proven capabilities, unverified capabilities, and commit SHAs.

## Critical boundary
The purpose of Phase 1 is to build the bridge foundation, not to pretend that an external application can remotely control Genspark Code. If a capability cannot be verified from an official/public interface, implement the abstraction and mark it unsupported/unverified.

Start implementation now.