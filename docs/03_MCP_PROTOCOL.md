# 03 — MCP Protocol

## Direction A: Genspark -> our MCP
Genspark can use tools exposed by an MCP server according to its Connector architecture. This is the first concrete integration path to prove.

Example safe tools:
- get_project
- get_task
- get_status
- get_repository_state

## Direction B: our app -> Genspark MCP
This is a verification target, not an assumption. Only enable it if Genspark officially exposes the required server/interface.

## Tool design
Every tool must declare:
- input schema
- output schema
- permission
- side effects
- idempotency
- timeout
- audit event
- failure modes

## Security
Never expose API keys, OAuth refresh tokens, access tokens, or credential-bearing MCP URLs through model-visible output or logs.

## Permission levels
READ, WRITE, DEPLOY, ADMIN.

A tool requiring DEPLOY must not silently perform ADMIN operations.

## Key distinction
MCP support does not prove that Genspark Code can be remotely controlled. MCP is the protocol; the provider must expose a capability through it.
