# Phase 3 — Genspark Code Proof Report

## 1. Date and environment

- **Proof timestamp:** 2026-09-22T18:34:49Z
- **Repository:** `https://github.com/Sparkmind-obp-off/genspark-execution-bridge`
- **Repository commit tested:** `96c128cd66ccc91228942c21e164f95569fe03bc`
- **Genspark product surface:** public Genspark Code page, Genspark Code Help Center article, Connectors & Integrations reference, officially linked `@genspark/cli` command surface, and the current authenticated CLI account boundary.
- **Account observation:** free plan, 100-credit balance at test time; identifying account values are intentionally omitted.
- **Security:** no session cookies, browser tokens, API keys, connector credentials, or private routes were inspected or recorded.

## 2. Official sources

1. **Genspark Code product page**  
   https://www.genspark.ai/code/
2. **Genspark Code Help Center**  
   https://www.genspark.ai/helpcenter/ai-developer
3. **Connectors & Integrations Help Center**  
   https://www.genspark.ai/helpcenter/connectors-and-integrations
4. **Official Genspark Gen-1 Slides blog**, which links the Genspark CLI and documents a CLI task example for Slides  
   https://www.genspark.ai/blog/gen-1-slides
5. **`@genspark/cli` package page**, linked from the official Genspark blog  
   https://www.npmjs.com/package/@genspark/cli

Official-site searches for a Genspark Code API, SDK, submission endpoint, execution lifecycle, result retrieval, webhooks, authentication scopes, permissions, and rate limits did not locate a Code-specific public contract.

## 3. Capability matrix

| Capability | Status | Evidence | Reproduction | Limitations |
|---|---|---|---|---|
| Code product | VERIFIED | Official Code product and Help Center pages describe Genspark Code as an autonomous coding agent and document its web project experience. | Open the first two official sources; observe Code categories and Projects behavior. | Verifies the interactive product only, not external invocation. |
| External submit | UNVERIFIED | No official source provides an external Genspark Code submission action, endpoint, SDK method, or request schema. The official CLI has generic `task create`, but its task-type list does not include Code or `code_sandbox`. | Inspect `gsk task create --help`; compare its task types with the Code product. | Generic Genspark agent submission cannot be inferred to submit Code tasks. No safe task was run. |
| Execution ID | UNVERIFIED | Generic CLI help documents `project_id` and `run_id` (`sb_task_run::…`) for supported agent tasks, but no Code submission response or Code identity is documented. | Inspect `gsk task --help` and `gsk task status --help`. | Generic task identity is not a Genspark Code execution ID. |
| Status | UNVERIFIED | Generic CLI `task status` exists, but no Code task type/execution was established. | Run `gsk task status <id>` only for a legitimately created supported task; no Code ID was available here. | Current account was also blocked by `free_plan_block` before status lookup. |
| Result/artifact | UNVERIFIED | Generic CLI exposes `task info`, `task artifacts`, and `task artifact`; no official Code route maps a Code execution to those actions. | Inspect `gsk task --help`. | No Code execution, artifact ID, response, or independent result verification exists. |
| Cancel | UNVERIFIED | Generic CLI exposes `task stop <run_id-or-project_id>` for supported tasks. No Code submit/identity contract was found. | Inspect `gsk task stop --help`. | A generic stop action cannot be upgraded to Code cancel without a Code task route and proof. |
| Retry | UNVERIFIED | No Code retry action or retry request/response contract was found. | Search the official sources and inspect CLI task actions. | Re-running create would make and bill a new generic task; that is not documented Code retry semantics. |
| Connector route | UNVERIFIED | Official connector catalog documents API Call/MCP provider connections, GitHub, and custom/community MCP. It contains no Code-specific connector/action. Current account inventory calls were plan-gated. | Read the connector reference; run `gsk capabilities --output json` on an eligible account. | Catalog absence is not proof that no future/private/allowlisted option exists. Current account inventory was not returned. |
| MCP route to Code | UNVERIFIED | Official docs define MCP as Genspark using tools exposed by a server. No official MCP action starts Genspark Code or returns a Code execution. | Read the MCP definition and catalog; compare with the bridge's safe inbound tools. | `Genspark → bridge MCP` does not imply `external app → MCP → Genspark Code`. |

## 4. Reproduction log

### 4.1 Code product proof — successful

- **Action:** fetch/open `https://www.genspark.ai/code/` and `https://www.genspark.ai/helpcenter/ai-developer`.
- **Exact interface:** Genspark Code web product.
- **Input:** interactive category selection and natural-language build request in the web product.
- **Observed output:** official pages describe complete application creation and a Projects tab for reopening Code projects. The public product page showed Web/Simple Website, FullStack, and related build categories.
- **Execution ID:** none documented by the official pages.
- **Independent verification:** the product and Help Center pages agree that Genspark Code is the coding product formerly named AI Developer.
- **Result:** product existence VERIFIED; external execution not established.

### 4.2 Connector documentation proof — successful, documentation only

- **Action:** fetch/open `https://www.genspark.ai/helpcenter/connectors-and-integrations`.
- **Exact interface:** Genspark Skills → Connectors; connection types `API Call` and `MCP`.
- **Input shape:** provider-specific OAuth, API key, access token, or MCP server URL, depending on the connector.
- **Output shape:** provider-specific tools/actions available to Genspark under granted permissions.
- **Observed result:** the documented standard and early-access catalogs list provider connections and custom/community MCP support, but no Genspark Code connector/action.
- **Execution ID:** not applicable; the catalog does not document Code execution.
- **Independent verification:** the Developer section lists GitHub, Jira, and Linear; GitHub is a repository connector, not a Code invocation route.
- **Result:** connector framework documented; route to Code UNVERIFIED.

### 4.3 Official CLI command discovery — successful, no task submitted

Commands:

```bash
gsk help
gsk task --help
gsk task create --help
gsk task status --help
gsk task output --help
gsk task stop --help
```

- **Exact product/interface:** `@genspark/cli`, `gsk task` command group.
- **Authentication:** `gsk login` or `--api-key` / `GSK_API_KEY`, as shown by CLI help. Credentials were not displayed.
- **Generic create input:** `task_type`, `task_name`, `query`, `instructions`, plus type-specific options.
- **Generic output/identity described by help:** task URL, `project_id`, and for asynchronous submission a `run_id` shaped like `sb_task_run::…`.
- **Generic lifecycle actions:** status, info, events, artifacts, artifact resolution, export, follow-up, and stop.
- **Observed result:** the create task-type list included specialized agents such as `super_agent`, `docs`, `slides`, `deep_research`, `website`, media agents, and custom agents. It did not include `Genspark Code`, `code`, or `code_sandbox`.
- **Execution ID:** none created; no official Code task type was available.
- **Artifact/result:** none created.
- **Independent verification:** the official Genspark Gen-1 Slides blog documents `gsk task create slides` and links the package, confirming the CLI as a real Genspark interface for Slides. The same source does not document Code submission.
- **Result:** generic agent task interface observed; remote Code execution remains UNVERIFIED.

### 4.4 Current account Connectors/MCP inventory — blocked

Commands:

```bash
gsk login-info --output json
gsk capabilities --output json
gsk mcp list --output json
```

Redacted account observation:

```json
{
  "plan": "free",
  "credit_balance": 100
}
```

Observed response from both inventory commands:

```json
{
  "status": "error",
  "data": {
    "code": "free_plan_block"
  }
}
```

The message stated that the CLI requires a paid plan or a credit balance of at least 500. No connector names, MCP server URLs, tokens, or tools were returned.

- **Execution ID:** none.
- **Status/result/artifact:** none.
- **Result:** current private connector inventory could not be inspected. This is recorded as a limitation, not converted into a positive or universal negative claim.

### 4.5 Safe Code proof task — correctly not executed

Precondition: an official external Genspark Code execution interface must exist.

Observed: the precondition was not met. Consequently:

- no external Code request was sent;
- no execution/project ID was created;
- no status polling occurred;
- no artifact was created;
- no cancel or retry action was attempted;
- no production side effect or credit-consuming fallback was used.

## 5. Negative findings

1. No official/public Genspark Code submission endpoint, HTTP method, SDK method, CLI task type, or Connector action was found.
2. No Code-specific authentication method, OAuth scope, permission model, request schema, response schema, idempotency behavior, rate limit, or error model was found.
3. No documented Code execution ID was found.
4. No Code-specific status, result/artifact, cancel, or retry contract was found.
5. The official Connector catalog did not list a Genspark Code connector.
6. Official MCP documentation establishes Genspark consuming MCP server tools; it does not establish an external caller using MCP to start Genspark Code.
7. GitHub integration provides repository operations and does not by itself invoke Genspark Code.
8. The official generic Genspark CLI task surface is not sufficient proof because Code is absent from its observed task-type list.
9. Current-account connector/MCP enumeration was blocked by a plan/credit gate, so no claim is made about undisclosed account-specific entries.
10. No private endpoint, browser session, cookie, hidden route, undocumented header, or reverse-engineered request was used.

## 6. Final decision

# REMOTE_CODE_NOT_VERIFIED

The only VERIFIED capability in this report is the existence of the interactive Genspark Code product. All remote Code lifecycle capabilities remain UNVERIFIED.

The Genspark executor must remain fail-closed with `submit`, `status`, `result`, `cancel`, `retry`, and `code_mode` disabled. No runtime adapter change is justified.
