# 02 — Integration Architecture

## Control plane
Owns task lifecycle, authorization, policy, executor routing, retries, verification, audit, and user-facing status.

## Integration plane
Owns MCP clients/servers, API adapters, authentication, and protocol translation.

## Execution plane
Owns AI execution such as coding, research, transformation, or agent workflows.

## Tool plane
Owns GitHub, Cloudflare, databases, payment APIs, and other external systems.

## Flow
Request -> normalize -> authorize -> route -> execute -> verify -> audit.

## Executor-neutral design
The bridge must support:

- Genspark adapter
- OpenAI adapter
- Local/cloud executor
- Human/manual fallback

The control layer must remain usable when Genspark is unavailable.

## Canonical task
The Phase 1 task schema contains:
- `task_id`
- `type`
- `input`
- `requested_capabilities`
- `risk_level`
- `created_at`
- `metadata`

## Lifecycle
`created -> validated -> authorized -> queued -> running -> succeeded | failed | cancelled`

Every transition is explicit. Invalid transitions are rejected by the domain state machine.

## Principle
Provider-specific behavior belongs inside adapters. Core domain logic must not depend on Genspark-specific fields.
