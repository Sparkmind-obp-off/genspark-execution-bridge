# Genspark Execution Bridge

Proof-first control and orchestration layer for integrating Genspark with external MCP/API executors.

## Objective
Prove what Genspark officially exposes before building a controller. Keep the control plane independent from any single AI provider.

Architecture:

User -> Control API/UI -> Task Normalizer -> Policy/Planner -> Executor Router -> Genspark or alternate executor -> MCP/API tools -> Verification -> Audit.

## Current capability position

| Capability | Status |
|---|---|
| Genspark Connectors | Confirmed |
| Genspark MCP connections | Confirmed |
| Custom/community MCP servers | Confirmed |
| Genspark GitHub connector | Confirmed |
| External app -> Genspark task execution | Unverified |
| Remote Genspark Code execution API | Unverified |
| Public Genspark Code MCP tool | Unverified |
| Full control of genspark.ai/code UI | Not assumed |

Primary source: https://www.genspark.ai/helpcenter/connectors-and-integrations

## Rule
Do not treat a web UI URL as an API. Do not depend on undocumented/private endpoints.

## Project phases
1. Capability discovery
2. MCP proof
3. Executor abstraction
4. Genspark capability verification
5. Safe end-to-end execution
6. GitHub/Cloudflare tool execution
7. Operator product layer

## Non-goals
- Reverse engineering private Genspark APIs
- Browser automation as the primary integration
- Credential storage in source control
- Autonomous production deployment
- Making Genspark a permanent hard dependency
