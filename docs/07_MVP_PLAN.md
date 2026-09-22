# 07 — MVP Plan

## Phase 0: Discovery
Produce capability matrix, official evidence, verification tests, and security assumptions.

## Phase 1: Control core
Build task schema, state machine, executor interface, policy engine, and audit model.

## Phase 2: MCP proof
Build a minimal MCP server with safe read tools and verify that Genspark can connect and use them.

This proves Genspark -> our MCP. It does not prove our app -> Genspark Code.

## Phase 3: Genspark adapter
Create an adapter shell. All capabilities start disabled.

## Phase 4: Safe end-to-end task
Use a harmless task such as structured planning or JSON generation.

## Phase 5: GitHub
Use a test branch. Validate diff, tests, and repository state.

## Phase 6: Cloudflare/preview
Only after repository verification: build -> preview deployment -> health check.

## MVP UI
Task input, executor selector, environment selector, Validate button, Run button, execution status, result, and audit timeline.

## Non-goals
- voice UI
- autonomous production deployment
- browser automation of Genspark
- private API reverse engineering
- billing/multi-tenancy

## Success criteria
- canonical task works
- independent authorization works
- executor can be swapped
- at least one MCP flow is proven
- execution is auditable
- verification can reject false completion
- Genspark outage does not break the control plane
