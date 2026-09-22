# 04 — Executor Interface

## Goal
Make Genspark interchangeable with other execution engines.

## Canonical operations
capabilities()
validate(task)
submit(task)
status(execution_id)
result(execution_id)
cancel(execution_id)
retry(execution_id)

Optional operations must return unsupported explicitly.

## Capability model
Unknown capabilities default to false.

Example:
executor = genspark
submit = false
status = false
result = false
cancel = false
code_mode = false

Enable a capability only after a verification test passes.

## Genspark adapter
The adapter must translate canonical tasks into an officially supported Genspark interface.

It must not:
- scrape undocumented endpoints
- emulate hidden frontend APIs
- bypass authentication
- rely on private browser internals

## Idempotency
Never blindly resubmit a side-effecting task after a timeout. Determine whether the original execution may have succeeded.

## Definition of done
Submission, status, result retrieval, authentication, failure semantics, security review, and integration tests must all be verified before production use.
