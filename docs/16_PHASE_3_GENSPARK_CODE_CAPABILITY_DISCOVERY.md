# Phase 3 — Genspark Code Capability Discovery

## Purpose
Determine, using only official/public evidence and safe observations, whether Genspark Code can be used as a remotely invokable execution provider by the Execution Bridge.

This phase separates three different capabilities:

1. the Genspark Code web product;
2. externally callable Genspark agent/task interfaces;
3. Genspark consuming third-party Connector or MCP tools.

The existence of one does not prove either of the others.

## Discovery date and baseline

Discovery was performed on 2026-09-22 UTC against repository commit `96c128cd66ccc91228942c21e164f95569fe03bc`.

Official sources inspected:

- https://www.genspark.ai/code/
- https://www.genspark.ai/helpcenter/ai-developer
- https://www.genspark.ai/helpcenter/connectors-and-integrations
- https://www.genspark.ai/blog/gen-1-slides
- https://www.npmjs.com/package/@genspark/cli (the CLI package linked by the official Genspark blog)

The official product/help pages establish that Genspark Code is an autonomous coding product with a web project experience. They do not publish an external Code execution API contract.

## Classification rules

Every capability uses exactly one status:

- **VERIFIED** — an official/public interface exists and a reproducible proof succeeded.
- **PARTIALLY VERIFIED** — relevant official evidence exists, but the complete end-to-end contract was not proven.
- **UNVERIFIED** — no sufficient official interface and successful proof were found.
- **NOT AVAILABLE** — official documentation or observed product behavior explicitly establishes that the capability is unavailable.

Absence from a page is not automatically classified as NOT AVAILABLE. It remains UNVERIFIED unless the official source explicitly states unavailability.

## Interfaces inspected

### Genspark Code web product

- **Product:** Genspark Code, formerly AI Developer.
- **Interface:** `https://www.genspark.ai/code/` web UI.
- **Documented input:** an interactive user request in one of the Web, Mobile Apps, Game, E-commerce, or Existing code categories.
- **Documented output:** a Genspark Code project/application that can be reopened from the Projects tab.
- **Authentication:** a Genspark account is required for account-owned projects; the inspected public pages do not document API authentication for Code.
- **Execution identity:** no public Code execution ID contract is documented.
- **Boundary:** this proves the product exists, not that an external application can invoke it.

### Officially linked Genspark CLI

The official Gen-1 Slides blog links the `@genspark/cli` package and documents `gsk task create slides` for AI Slides. Local CLI help was inspected without making a billed task.

Observed generic task interface:

```text
gsk task create <task_type> --task_name <value> --query <value> --instructions <value>
gsk task status <project_id-or-run_id>
gsk task info <project_id>
gsk task artifacts <project_id>
gsk task artifact <artifact_id>
gsk task stop <run_id-or-project_id>
```

The CLI help describes generic identities including `project_id` and async `run_id` values shaped like `sb_task_run::…`. It also documents status, artifact, and stop operations for supported specialized-agent tasks.

However, the installed official CLI's `task create` task-type list did **not** include `Genspark Code`, `code`, or `code_sandbox`. It listed agents such as `super_agent`, `docs`, `slides`, `deep_research`, and `website`. Therefore the generic task interface is adjacent evidence only; it is not evidence of remotely invoking Genspark Code.

CLI authentication is via `gsk login` or an API key (`--api-key` / `GSK_API_KEY`) according to `gsk help`. No secret was printed or recorded.

### Connectors and MCP

The official Connectors reference documents 37 standard connection options plus early-access entries. It defines:

- **API Call:** Genspark calls the provider's API.
- **MCP:** Genspark uses tools exposed by an MCP server.

The documented catalog includes GitHub and multiple provider MCP integrations, plus custom/community MCP servers. It does not list a Genspark Code connector or an MCP tool that starts Genspark Code.

The current account surface was probed through the installed official CLI:

```text
gsk capabilities --output json
gsk mcp list --output json
```

Both calls were blocked before returning connector inventory because the tested account was on the free plan with 100 credits and the CLI required a paid plan or at least 500 credits. The exact observed error code was `free_plan_block`. No account connector list or MCP server list was obtained, so the current account's private connector inventory is not claimed as inspected successfully.

The known bridge direction remains:

```text
Genspark → Execution Bridge MCP → get_project/get_task/get_status
```

That direction does not establish:

```text
External application → MCP → Genspark Code
```

## Direct API/SDK search result

Official product, help-center, and official-site searches were performed for:

- public API and developer API;
- SDK and CLI;
- task submission and execution creation;
- execution status;
- result or artifact retrieval;
- cancel and retry;
- webhooks or events;
- authentication, permissions, and rate limits;
- Connector or MCP actions targeting Genspark Code.

A public interface contract specifically for remote Genspark Code execution was not found. No endpoint, HTTP method, JSON schema, OAuth scope, rate limit, webhook, or Code execution identifier was documented in the inspected sources.

The generic Genspark CLI task surface does not change this result because its documented/observed task types did not include Genspark Code.

## Capability matrix

| Capability | Status | Discovery result |
|---|---|---|
| Code product exists | VERIFIED | Official Code and help pages describe the product and project UI. |
| External task submission to Code | UNVERIFIED | No official/public Code submission action or request contract found. |
| Code execution ID | UNVERIFIED | No documented Code submission response or execution identity found. |
| Code status retrieval | UNVERIFIED | Generic CLI task status exists, but no Code task type or Code execution was established. |
| Code result/artifact retrieval | UNVERIFIED | Generic CLI artifact operations exist, but no Code task route was established. |
| Code cancel | UNVERIFIED | Generic CLI stop exists, but no Code execution route was established. |
| Code retry | UNVERIFIED | No Code retry contract or proof found. |
| Connector route to Code | UNVERIFIED | Official catalog has no Code-specific connector; current account inventory was blocked by plan/credit gating. |
| MCP route to Code | UNVERIFIED | Official MCP direction is Genspark consuming server tools; no reverse Code invocation action was documented. |

## Safe proof decision

The required precondition for a safe Code execution proof was not met: no official external Genspark Code execution interface was identified. Therefore no task was submitted, no credits were intentionally consumed, and no disposable artifact was created.

## Architecture decision

Keep the executor-neutral architecture unchanged:

```text
Control Plane → Executor Interface → Capability-Gated Genspark Executor
```

Keep `submit`, `status`, `result`, `cancel`, `retry`, and `code_mode` disabled. The existing `GensparkExecutor` must continue to fail closed with `UNSUPPORTED_CAPABILITY`.

No runtime implementation change is justified by this discovery.

## Gate result

- **G4 — Official Code interface:** failed/not demonstrated.
- **G5 — Submission proof:** not run because G4 did not pass.
- **G6 — Status/result proof:** not run because no Code execution identity exists.
- **G7 — Security review:** incomplete because no Code API authentication/authorization contract exists.
- **G8 — Adapter enablement:** blocked.

## Final discovery outcome

**REMOTE_CODE_NOT_VERIFIED**

This is not a claim that Genspark Code can never expose such an interface. It is the bounded result for the official sources, CLI surface, account constraints, and date recorded above.
