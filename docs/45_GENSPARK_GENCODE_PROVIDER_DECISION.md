# 45 — Genspark Provider Discovery and Mini Workspace Decision

**Decision date:** 2026-10-09  
**Status:** GENSPARK_BUILD_TIME_SELECTED / RUNTIME_API_NOT_VERIFIED

## Executive decision

Use the user's existing Genspark workspace and its official GenCode/Genspark Code products as the **build-time AI workbench** for developing Mini Genspark. Do not yet wire Genspark into Mini Genspark as a generic runtime model API.

For the Mini Genspark application itself, keep a provider-neutral adapter boundary. A runtime provider can be enabled only after an official interface, valid credentials, allowed usage, cost behavior, and a reproducible test are confirmed.

This is a deliberate distinction:
- **Genspark as the environment used to build Mini Genspark:** selected.
- **Genspark GenCode as an automated executor invoked by our bridge:** not currently verified.
- **Genspark as a generic runtime LLM API for our app:** not currently verified.
- **Genspark as a tool consumer through Connectors/MCP:** supported in principle by official docs, but this is the opposite direction (Genspark calls our tools); the live connection must still be proven for our deployment.

## Current official product evidence

Official GenCode documentation describes:
- A GenCode workspace inside the Genspark Super App and a standalone GenCode CLI.
- gencode login for account sign-in.
- gencode models to list models available to the authenticated account.
- gencode run --format json for scripted/non-interactive runs.
- A Genspark-hosted catalog spanning nine model families: Claude (Anthropic), GPT (OpenAI), Gemini (Google), DeepSeek, GLM (Z.ai), MiniMax, Kimi (Moonshot AI), Grok (xAI), and Nemotron (NVIDIA).
- GenCode usage is billed to the authenticated Genspark account in credits. GSK_API_KEY or GSK_BASE_URL can change the account/endpoint configuration used by the GenCode CLI, but their presence alone is not evidence of a general public REST API that our application can call.

Official source: https://www.genspark.ai/helpcenter/gencode

The Genspark Credits Guide says exact model selection is available in AI Chat and GenCode; actual model lineups and costs change frequently, so use the live picker/catalog as the account-specific source of truth. Account billing settings cover plan/payment, while credit balances and history are shown in the credit-usage page.

Official source: https://www.genspark.ai/helpcenter/credits-guide

Official Connectors docs describe Genspark connecting to native APIs and MCP servers, including custom/community MCP subject to account and organization policy. This establishes a supported integration direction for Genspark to call external tools, not a generic API for an external application to operate Genspark Code.

Official source: https://www.genspark.ai/helpcenter/connectors-and-integrations

## Account-level verification steps

Account-specific model availability cannot be inferred from public documentation or inspected by this repository. Verify in the account without exposing secrets:

1. Open GenCode in the Genspark Super App, or install the official CLI from the documented package.
2. Sign in with the intended Genspark account.
3. Run gencode models and save a sanitized list of visible model names, if using the CLI; otherwise inspect the live model picker in GenCode/AI Chat.
4. Inspect account credit usage and plan before running larger tasks.
5. Run only a harmless, bounded task and capture model name, success/failure, usage/credit delta, execution identity, and result.
6. Never commit GSK_API_KEY, access tokens, cookies, or private URLs. Do not paste secrets into an issue or chat.

Do not assume a model appearing in the Genspark UI means it is callable by our application over a supported public API.

## Recommended Mini Genspark provider architecture

### Build-time
- **Selected:** Genspark GenCode/Genspark Code as the main environment for implementation and code iteration using the user's own authorized account.
- Select the lowest-cost model that passes the task's acceptance tests; use stronger models for harder reasoning/final review when justified.
- Keep the model inventory dynamic. Do not hard-code a model name as universally available.

### Application runtime
- Keep a typed ModelProvider/adapter interface.
- Do not add an active GensparkRuntimeProvider using undocumented endpoints, browser-session extraction, or guessed token formats.
- Activate a runtime adapter only when official provider API documentation, account credentials/terms, budget limits, and end-to-end tests are available.
- Until then, select a provider with a documented app-facing API for the first runtime integration; leave provider selection configurable and do not lock the domain model to one vendor.
- Treat provider outputs and retrieved web content as untrusted. Validate output, cap steps/costs, and retain clear user approval boundaries.

### Bridge/execution layer
- Keep the existing executor interface provider-neutral.
- Do not enable Genspark task submission/status/result/cancel/retry just because a CLI/model catalog exists.
- The earlier 2026-09-22 legacy CLI proof was blocked before task creation by free_plan_block on the then-authenticated free account. This was a historical account-specific result for that CLI/product surface; it is not evidence that the newer GenCode CLI will fail, nor proof that it works.
- Re-test GenCode as a separate candidate using current official documentation and an authorized environment. Require an actual task ID/session identity, terminal status, matching output, and observed usage before implementation.
- Cloudflare Workers cannot spawn an arbitrary local CLI directly. If a trusted runner is later considered, isolate it, scope credentials, set timeouts/cost limits, and keep production task submission disabled until the proof is complete.

## Verification gates before enabling Genspark runtime/executor

| Gate | Required evidence | Current status |
|---|---|---|
| Account sees model catalog | Sanitized live model list/picker | NOT CHECKED IN THIS SESSION |
| Account can run GenCode | Harmless successful CLI/workspace run | NOT CHECKED IN THIS SESSION |
| External app can call a documented Genspark LLM API | Official API contract and auth docs | NOT VERIFIED |
| Bridge can submit and track a Genspark task | Task identity, status, matching result, audit | NOT VERIFIED |
| Cost/credit behavior understood | Before/after credit record for bounded task | NOT VERIFIED |
| Allowed use / credential handling confirmed | Official terms and secure secret setup | NOT VERIFIED |

## Decision summary

**Choose Genspark for build-time work now. Keep application runtime and execution capabilities fail-closed until separately proven.** This uses the user's current Genspark access where it is documented to work, avoids inventing an API, and preserves the ability to swap providers without redesigning Mini Genspark.

## Official references

- GenCode: https://www.genspark.ai/helpcenter/gencode
- Credits Guide: https://www.genspark.ai/helpcenter/credits-guide
- Connectors & Integrations: https://www.genspark.ai/helpcenter/connectors-and-integrations
- Existing remote Code discovery: docs/16_PHASE_3_GENSPARK_CODE_CAPABILITY_DISCOVERY.md
- Existing CLI proof: docs/20_PHASE_3B_GENSPARK_CLI_PROOF_REPORT.md
