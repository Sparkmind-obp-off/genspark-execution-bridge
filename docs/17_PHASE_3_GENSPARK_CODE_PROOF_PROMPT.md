# Phase 3 — Genspark Code Capability Discovery & Proof Prompt

## Role
You are the proof executor for:
https://github.com/Sparkmind-obp-off/genspark-execution-bridge

Your job is not to build a large Genspark adapter yet. Determine whether Genspark Code can be used as an external execution provider through an official/public interface, and return reproducible evidence.

## Mission
Answer:
1. Can an external application officially submit a task to Genspark Code?
2. Can it obtain an execution ID?
3. Can it query execution status?
4. Can it retrieve the result/artifact?
5. Can it cancel or retry an execution?
6. Can any documented Genspark Connector or MCP route invoke Genspark Code itself?

## Mandatory evidence
For every claimed capability provide:
- official source URL;
- exact product/API/connector name;
- exact interface or action;
- authentication method, if applicable;
- request/input shape;
- response/output shape;
- execution identity, if applicable;
- reproducible proof steps;
- observed result;
- limitations.

Classify every capability as exactly one of: VERIFIED, PARTIALLY VERIFIED, UNVERIFIED, NOT AVAILABLE.
Do not upgrade a capability based on inference.

## Official-source boundary
Use official Genspark sources first:
- https://www.genspark.ai/code/
- https://www.genspark.ai/helpcenter/ai-developer
- https://www.genspark.ai/helpcenter/connectors-and-integrations

You may inspect other official Genspark pages linked from these sources.
Do not use third-party claims as proof of a public Genspark API.

## Connector investigation
Inspect the actual Genspark Connectors surface for the current account.
Determine whether there is a specific official capability that accepts an external task, starts Genspark Code, returns an execution/project identifier, exposes status/result, or otherwise documents Code execution as an externally callable operation.

GitHub integration or a custom MCP connection does not automatically mean Genspark Code can be remotely invoked.

## MCP investigation
The repository already has this production MCP endpoint:
https://genspark-execution-bridge.pages.dev/mcp

Known safe proof direction:
Genspark → MCP server → get_project/get_task/get_status

Do not reinterpret this as External app → MCP → Genspark Code unless an official Genspark interface explicitly supports that direction.

## Direct API investigation
Search official documentation for public API, developer API, SDK, task submission, execution creation, status, result/artifact retrieval, webhooks/events, authentication, permissions, and rate limits.
If none exists, say so explicitly.
Never invent endpoints, HTTP methods, JSON schemas, API keys, OAuth scopes, project IDs, execution IDs, private headers, or hidden routes.

## Safe proof task
If and only if an official external Code execution interface exists, use the smallest safe proof task available.
The task must have no production side effects, no real secrets, no destructive actions, and only a disposable/test artifact if execution requires one.
Do not deploy to a real production environment.

## Repository work
Before changing code, inspect the current repository and docs and preserve the executor-neutral architecture.
Do not enable Genspark capabilities prematurely.

Update/create:
- docs/16_PHASE_3_GENSPARK_CODE_CAPABILITY_DISCOVERY.md
- docs/17_PHASE_3_GENSPARK_CODE_PROOF_REPORT.md

If implementation changes are genuinely required by a verified interface, make the smallest focused change and add tests. Otherwise do not modify runtime code.
Update README.md, docs/08_ROADMAP_AND_GATES.md, and docs/10_DECISION_LOG.md only when justified by actual evidence.

## Required proof report
docs/17_PHASE_3_GENSPARK_CODE_PROOF_REPORT.md must contain:

### 1. Date and environment
- date/time;
- Genspark product/account surface tested;
- repository commit tested.

### 2. Official sources
List every official source used.

### 3. Capability matrix
| Capability | Status | Evidence | Reproduction | Limitations |
|---|---|---|---|---|
| Code product | | | | |
| External submit | | | | |
| Execution ID | | | | |
| Status | | | | |
| Result/artifact | | | | |
| Cancel | | | | |
| Retry | | | | |
| Connector route | | | | |
| MCP route to Code | | | | |

### 4. Reproduction log
For each successful proof record action, exact interface, input, output, execution ID, status, artifact/result, and independent verification. Redact all secrets.

### 5. Negative findings
Explicitly record capabilities that could not be verified. A negative finding is valuable; do not turn it into a fabricated implementation.

### 6. Final decision
Choose exactly one:
- REMOTE_CODE_VERIFIED
- REMOTE_CODE_NOT_VERIFIED

Do not use a stronger conclusion than the evidence supports.

## Security constraints
Never reverse-engineer private endpoints, scrape genspark.ai/code, extract session cookies, reuse browser auth tokens as an API, bypass authentication, create undocumented proxy endpoints, store credentials in source, or commit secrets.

## Git discipline
Run actual checks for any code changes: typecheck, tests, and production build.
Do not claim a check passed unless actually run.
Use focused commits.

At the end report:
1. files changed;
2. tests actually run;
3. official capabilities proven;
4. capabilities still unverified;
5. final decision;
6. commit SHA(s).

## Critical rule
Do not build the adapter first. Prove the interface first.
If official remote Code execution cannot be demonstrated, leave the Genspark executor fail-closed and report REMOTE_CODE_NOT_VERIFIED.