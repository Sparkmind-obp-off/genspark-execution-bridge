# 01 — Capability Discovery

## Purpose
Determine exactly which Genspark capabilities can be used by our bridge.

## Confirmed by official documentation
Genspark Connectors can connect supported services. The documentation defines native API-call connections and MCP connections. MCP connections can use OAuth, API key, access token, or a dedicated MCP server URL. Custom/community MCP servers are supported subject to organization policy and server/operator behavior. GitHub is documented as a developer connector.

Source: https://www.genspark.ai/helpcenter/connectors-and-integrations

## Verification targets

| ID | Capability | Evidence required |
|---|---|---|
| U1 | External app can submit a Genspark task | Official endpoint/API/tool |
| U2 | External app can start Code-mode execution | Official documented interface |
| U3 | External app can read execution status | Stable status interface |
| U4 | External app can retrieve result/artifacts | Stable result interface |
| U5 | External app can retry/cancel | Official mutation/tool |
| U6 | Genspark exposes its own MCP server | Official documentation/endpoint |

## Discovery procedure
1. Check official Genspark documentation.
2. Inspect the Connector configuration.
3. Look for official API/SDK/MCP references.
4. Run a minimal read-only connection test.
5. Run a harmless execution test.
6. Capture evidence without credentials.
7. Update the capability matrix.
8. Implement an adapter only for verified capabilities.

## Important boundary
https://www.genspark.ai/code is a UI location. Its existence does not prove a public API.

## Current decision
Build the architecture now, but keep Genspark execution capabilities disabled until independently verified.
