# 10 — Decision Log

## D001 — Proof before product
Validate Genspark integration before building a large application.

## D002 — Executor abstraction
Genspark is an executor adapter, not the entire control plane.

## D003 — MCP is not proof of Code control
MCP support and remote Code execution are separate capabilities.

## D004 — No private API dependency
Do not rely on undocumented frontend endpoints or browser internals.

## D005 — Capability flags
Unknown capabilities default to false.

## D006 — Independent verification
Provider completion is not application completion.

## D007 — Production approval
Production side effects require explicit policy authorization.

## D008 — Current Genspark evidence
Official Genspark documentation establishes Connectors, MCP connections, custom/community MCP servers, MCP authentication options, and GitHub integration. It does not establish a public remote API for controlling genspark.ai/code.

Source: https://www.genspark.ai/helpcenter/connectors-and-integrations
