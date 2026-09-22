# Phase 2 MCP Endpoint Implementation Audit

## Audit date

2026-09-23

## Findings

### 1. MCP SDK

The repository uses:

- `@modelcontextprotocol/server` `2.0.0`
- `createMcpHandler()` as the HTTP entrypoint.

The current SDK documentation states that `createMcpHandler(factory)` is the web-standard HTTP entry for MCP v2. It serves the 2026-07-28 protocol per request and, by default, also serves 2025-era traffic statelessly. This matches a Cloudflare Worker/Pages fetch handler.

The existing implementation therefore did not need a replacement transport.

### 2. Regression coverage

The MCP test suite now exercises the actual `createMcpHandler().fetch()` path in-process.

Coverage added:

1. POST `initialize` using the 2025-11-25 handshake.
2. Validation of HTTP 200 response and server identity.
3. POST `tools/list`.
4. Verification that all three read-only proof tools are discoverable:
   - `get_project`
   - `get_status`
   - `get_task`
5. Verification that MCP audit events are produced.
6. OPTIONS/preflight behavior for the public HTTP endpoint.

This is intentionally an in-process transport test rather than a mocked function test.

### 3. HTTP hardening

The public `/mcp` route now:

- responds to OPTIONS with HTTP 204;
- advertises the MCP HTTP methods used by the endpoint;
- allows the MCP protocol headers required by Streamable HTTP clients;
- exposes the relevant MCP response headers;
- preserves the SDK-generated MCP response body/status.

The MCP handler itself remains the authoritative protocol implementation. No private Genspark endpoint, browser automation, scraping, or undocumented authentication was introduced.

## Important protocol boundary

A successful local MCP initialization/discovery test proves that this server implements the MCP HTTP contract expected by the SDK.

It does **not** prove that Genspark's current connector accepts this deployment, nor does it prove remote control of Genspark Code.

## Deployment gate

The code changes are committed to `main`.

Before retrying **Add MCP Server** in Genspark, the updated `main` deployment must be live at:

`https://genspark-execution-bridge.pages.dev/mcp`

The available GitHub connector can commit and inspect the repository, but it cannot directly invoke the Cloudflare Pages deployment command. Therefore the deployment must occur through the existing Cloudflare Pages integration/command path.

## Retry configuration

After the new deployment is confirmed live:

- Server Name: `Genspark Execution Bridge`
- Server Type: `Streamable HTTP`
- Server URL: `https://genspark-execution-bridge.pages.dev/mcp`
- Description: `Controlled MCP server for Genspark Execution Bridge Phase 2 live proof.`
- Request Headers: leave empty unless Genspark explicitly reports a required documented header.

Do not switch to SSE and do not add guessed authentication headers.

## Next acceptance gate

The next proof is:

`Genspark Connector -> /mcp -> tool discovery -> get_project -> audit evidence`

Only after that passes should the project proceed toward any executor-level Genspark integration.
