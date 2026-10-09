# 46 — Mini Genspark Product Boundary, Provider Map, and Implementation Plan

**Updated:** 2026-10-09  
**Decision:** Keep this repository as the execution/control bridge. Build the end-user Mini Genspark workspace as a separate main application, reusing verified contracts and patterns rather than rewriting everything or pretending this bridge is already the full product.

## 1. Is this repository Mini Genspark?

**Not by itself.** This repo is a proof-first execution/control bridge. It implements a narrow execution lifecycle, policies, verification, audit, a proof-only operator console, read-only MCP tools, and a bounded Daytona executor. Several production integrations remain disabled or unverified.

It does not yet implement the full Mini Genspark user product: general workspace UX, multi-provider runtime model routing, general research workflow, document/data creation workspaces, user projects/memory, general file/artifact management, multi-user authentication, usage/budget UI, and independently verified external provider execution.

### Architecture decision

- **Keep** `genspark-execution-bridge` as the execution/control-plane and safety-reference project.
- **Do not restart its existing verified foundation.**
- **Create a separate main product repository** for Mini Genspark's user-facing workspace and orchestration.
- Reuse the bridge's task contracts, policy/verification ideas, redaction, idempotency principles, and provider-neutral executor boundary. Do not connect the main application to the current proof-only endpoints as if they were a production multi-user runtime.
- Do not deploy the main application or expose general execution until authentication, authorization, provider proofs, per-user budgets, and artifact access controls pass.

## 2. What provider/model choices does Genspark expose?

Use official product documentation as a capability map, not as proof that the same private infrastructure can be called directly.

### A. GenCode coding-agent catalog

Official documentation: https://www.genspark.ai/helpcenter/gencode

GenCode uses a Genspark-hosted model catalog spanning these nine model families:

| Model family | Original provider/lab |
|---|---|
| Claude | Anthropic |
| GPT | OpenAI |
| Gemini | Google |
| DeepSeek | DeepSeek |
| GLM | Z.ai |
| MiniMax | MiniMax |
| Kimi | Moonshot AI |
| Grok | xAI |
| Nemotron | NVIDIA |

The exact model names and variants are dynamic and account/organization-policy dependent. The live model picker or `gencode models` is the account-level source of truth. Do not hard-code an old catalog as current.

GenCode official CLI supports:
- `npm i -g @genspark/gencode`
- `gencode login`
- `gencode models`
- `gencode run --format json`
- `--dir`, `--session`, and `--model` flags.

GenCode runs on Genspark credits. It is suitable as the current **build-time coding environment** for the developer who has an authorized account. That does not, by itself, establish a stable public REST endpoint for an end-user Mini Genspark app.

### B. Genspark AI Chat model picker

Official documentation: https://www.genspark.ai/helpcenter/ai-chat

Genspark AI Chat documents a live picker with 40+ models and a Mixture-of-Agents option. The MoA mode synthesizes outputs from an ensemble of models into one response. Model availability changes, so a static list from a web page is not an authoritative account inventory.

This suggests reusable product patterns for Mini Genspark:
- Let users pick a model or select Auto/Best Fit.
- Allow a cost-conscious default and an optional stronger model for harder tasks.
- Offer MoA only for tasks where multi-model comparison adds enough value to justify extra cost.
- Show the actual selected provider/model and cost or credit estimate where available.

Do not copy proprietary internal MoA implementation. Design our own provider router and ensemble procedure using documented interfaces.

### C. Inference platforms for some open-weight models

Official help center: https://www.genspark.ai/helpcenter/troubleshooting-guide

Genspark says some open-weight model families, including DeepSeek, Kimi, GLM, MiniMax, and Qwen, run on US-based inference platforms including Fireworks AI and Baseten, with ZDR agreements.

These are reported **inference infrastructure providers for some Genspark-served models**, not proof that the customer can use Genspark's internal Fireworks/Baseten accounts or internal endpoints. Mini Genspark should connect directly only with our own authorized provider credentials and documented public APIs, if/when needed.

### D. Genspark product/orchestration features

Official sources:
- AI Chat: https://www.genspark.ai/helpcenter/ai-chat
- Credits: https://www.genspark.ai/helpcenter/credits-guide
- Connectors: https://www.genspark.ai/helpcenter/connectors-and-integrations
- CLI package: https://www.npmjs.com/package/@genspark/gencode
- Genspark CLI package: https://www.npmjs.com/package/@genspark/cli

Relevant patterns and distinctions:
- AI Chat is a multi-model chat surface and can use web search and uploaded files.
- Super Agent is the more task-execution-oriented surface.
- GenCode is a coding agent, distinct from the browser-based Genspark Code product.
- GenCode CLI is scriptable and returns machine-readable JSON when invoked with `gencode run --format json`.
- Genspark Connectors let Genspark consume connected APIs/MCP tools; inbound use of our tools is not the same as an external app controlling Genspark.
- The separate `gsk` CLI advertises a broad tool catalog. Its installed/versioned tool inventory and allowed account actions must be checked with that CLI; do not mix its capabilities with the GenCode CLI.
- The existing 2026-09-22 test of an older `@genspark/cli` task flow was rejected before task creation by an account-specific `free_plan_block`. That historical result does not establish whether current GenCode works; it also does not prove it will work. A new bounded live test is required before building an adapter.

## 3. Provider decision for Mini Genspark

### Build-time coding provider

**Selected:** Genspark GenCode/Genspark Code, through the user's own authorized workspace/account, for repository implementation, code review, and scripted developer tasks. Account-specific models and credit costs must be checked before expensive tasks.

### Application runtime providers

Implement a provider-neutral adapter. Recommended initial support order:

1. **One primary provider with a documented app-facing API** that the owner can configure securely and test end-to-end.
2. **One optional low-cost provider** for simple classification, extraction, and drafts.
3. **Optional stronger reasoning provider** for difficult tasks and final verification.
4. **Genspark-backed runtime adapter only after a documented interface, allowed use, auth, cost behavior, and a real task/result proof are established.**

Do not use undocumented Genspark web endpoints, reverse-engineered session calls, browser cookies, or private model-router endpoints.

This is not a rejection of Genspark. It uses the proven surface for building now and prevents the production application from depending on an unverified runtime interface.

## 4. Mini Genspark architecture

The main application should have these modules:

1. **Workspace UI:** task input, project navigation, execution plan, source panel, progress, result viewer, artifact downloads.
2. **Task router:** classifies Research, Create, Analyze, or Build and decides if fresh external evidence is required.
3. **Planner/orchestrator:** makes a bounded task plan, tracks dependencies, and asks for user approval before consequential actions.
4. **Model registry/router:** provider/model IDs, capability support, pricing metadata when available, context limits, timeouts, and availability.
5. **Tool registry:** web search, URL fetch, document readers, CSV analysis, filesystem/build runner, and exports; each tool has a typed schema, permissions, and safety limits.
6. **Research pipeline:** source discovery → page retrieval → claim/source mapping → contradiction check → synthesis → final citations.
7. **Artifact manager:** save and retrieve Markdown, CSV, JSON, and later DOCX/XLSX/PDF/HTML artifacts.
8. **Project memory:** explicit user-controlled project notes/preferences with inspect, edit, and delete.
9. **Usage and execution ledger:** selected provider/model, step duration, status, and cost/credit estimates when reported.
10. **Policy, verifier, and audit:** default-deny unknown actions, independently verify outputs, redact secrets, limit loops and spend.

Recommended MVP stack stays modular: TypeScript/React frontend, Cloudflare Workers API, D1 metadata, optional R2 artifacts, and provider adapters on the server. A local trusted runner can invoke GenCode during development; a Cloudflare Worker cannot directly spawn a local CLI binary.

## 5. Implementation phases

### Phase A — main-product boundary
- Create a dedicated Mini Genspark application repository.
- Carry over only the stable task schema, provider-neutral interfaces, policy concepts, and documentation links from this bridge.
- Write the source-of-truth product specification and acceptance criteria.

### Phase B — working single-provider task
- Workspace UI submits a task to the server.
- One documented runtime provider responds.
- Task status, error handling, rate limits, and cost controls work.
- One useful artifact can be generated, stored, downloaded, and reopened.

### Phase C — research workflow
- Connect a genuine search provider and page retrieval tool.
- Add citations and a claim/evidence table.
- Separate facts, allegations, inference, and unknowns.
- Test against a current political/legal research prompt (case below).

### Phase D — provider router and multi-step workflow
- Add a low-cost model and optional strong model.
- Route tasks by required capability/cost/risk.
- Add bounded retries, timeouts, step limits, and a model selector.
- Add MoA only behind an explicit option/budget check.

### Phase E — artifact and data workspaces
- CSV analysis and validation.
- Markdown and HTML exports first; add DOCX/XLSX/PDF only when reliable.
- Versioned artifacts and project history.

### Phase F — secure external beta
- Multi-user authentication and authorization.
- Per-user/provider budgets and rate limits.
- Tool permission controls and approval gates.
- Security, privacy, data deletion, and end-to-end tests.
- Do not claim parity with Genspark before each feature is independently implemented and tested.

## 6. Scripts: required, documented, no hidden execution

All scripts must be versioned in the repository and documented here/README. No credentials or secrets in code.

### Provider inventory script

File: `scripts/gencode-provider-inventory.sh`

Purpose:
- Check whether `gencode` is installed.
- Print its version.
- Run `gencode models` so the developer sees the model families/names available to the authenticated account.
- This is an account-specific catalog check, not a model generation test and not proof of app-runtime API support.

Run:
```bash
bash scripts/gencode-provider-inventory.sh
```

### Planned application scripts

| Script | Purpose | Gate |
|---|---|---|
| `scripts/dev.sh` | Start frontend/API locally | No credentials printed |
| `scripts/test-provider-config.mjs` | Check configured adapter names and required env variable presence (never print values) | No model calls |
| `scripts/smoke-model-provider.mjs` | Send one bounded harmless prompt to the configured runtime provider | Explicit confirmation; may incur provider cost |
| `scripts/test-research-pipeline.mjs` | Test retrieved URLs, timestamps, claim/source links, citation presence, and failure handling | Uses recorded fixtures by default |
| `scripts/qa-workspace.mjs` | Run task routing, permissions, artifact and regression checks | No production mutations |
| `scripts/cost-report.mjs` | Summarize known per-task usage/cost metadata | No external calls |

These are proposed for the separate main product repository, not falsely claimed to exist or run in this bridge repository. The inventory script is added here because it relates to the bridge's Genspark capability investigation.

## 7. Research test case: MK decision and the phrase "ijazah palsu"

This is a test of source-based research behavior, not an allegation that a person forged a document.

Official primary source:
https://www.mkri.id/berita/mk-tidak-menemukan-bukti-gibran-memiliki-ijazah-slta-atau-sederajat-25893

Reuters report:
https://www.reuters.com/world/asia-pacific/indonesias-constitutional-court-dismisses-challenge-to-vice-president-over-2026-10-07/

The MK publication dated 6 October 2026 reported that the Court did not find convincing evidence of a foreign diploma/certificate proving completion of senior-high-school-equivalent education in the case record; it also said the petition was inadmissible because the petitioners lacked legal standing and that this election-dispute route could not annul/disqualify Gibran after inauguration. The decision is **not accurately summarized as a judicial finding that an "ijazah palsu" was proven**.

A Mini Genspark research task on this topic must:
1. Retrieve the full official MK publication/decision and multiple independent reports.
2. Separate what the Court found in the case record, why the petition was inadmissible, what the Court did not decide, and claims made by each party.
3. Avoid treating the word "fake" as an established fact unless an authoritative finding establishes falsification.
4. Show timestamps, source links, claim/evidence matrix, limitations, and a neutral summary.
5. Preserve the distinction between lack of evidence of a qualifying diploma in that case and proof of document forgery.

## 8. Acceptance criteria

The Mini Genspark main product is ready for an early internal pilot only when:
- A user can submit an actual task through the workspace.
- A real, configured runtime provider completes it.
- Execution status and errors are observable.
- The output is saved as a usable artifact.
- Research outputs show real sources and identify unsupported claims.
- Scripts and setup instructions are checked into GitHub and their run status is reported honestly.
- Credentials are server-side and never committed.
- Usage/cost is observable where the provider reports it.
- The existing bridge remains a bounded supporting component until its own proof and security gates permit a broader role.

## Decision summary

The existing bridge is relevant and worth keeping, but it is **not the whole Mini Genspark application**. We should not rebuild the verified bridge from scratch. We should build a distinct Mini Genspark main app and reuse only components/contracts that match its needs, while allowing the bridge to remain the execution/safety service.

The first implementation milestone should be the user-facing workspace plus one documented runtime model provider and one evidence-based Research workflow. Use Genspark GenCode to build that repository, and document every script and provider decision.
