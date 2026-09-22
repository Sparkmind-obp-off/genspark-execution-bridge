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
A task contains:
- task_id
- intent
- workspace
- requirements
- constraints
- executor preference
- verification requirements
- environment

## Lifecycle
CREATED -> VALIDATING -> PLANNED -> AUTHORIZED -> DISPATCHED -> RUNNING -> VERIFYING -> COMPLETED

Failure states:
FAILED, BLOCKED, RETRYABLE.

## Principle
Provider-specific behavior belongs inside adapters. Core domain logic must not depend on Genspark-specific fields.
