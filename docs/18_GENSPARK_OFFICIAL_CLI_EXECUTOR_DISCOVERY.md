# Phase 3B — Genspark Official CLI Executor Discovery

## 1. Purpose

Phase 3B determines whether the **official Genspark CLI** can provide a legitimate executor interface for the bridge without requiring direct control of the Genspark Code web UI.

This phase exists because Phase 3 established:

- Genspark Code is a real official product.
- A generic official Genspark CLI task interface exists.
- The observed CLI exposes project/run lifecycle concepts.
- The observed CLI task types did **not** include Genspark Code, `code`, or `code_sandbox`.
- Therefore remote Genspark Code execution remains `REMOTE_CODE_NOT_VERIFIED`.

Phase 3B does **not** attempt to prove Genspark Code again by inference. It tests the narrower and potentially useful proposition:

> Can the official Genspark CLI itself act as a supported executor for generic agent tasks, with a lifecycle that can be safely wrapped by the bridge?

If yes, the bridge may gain a real Genspark executor without pretending that the CLI is a Genspark Code API.

---

## 2. Current evidence baseline

The Phase 3 proof report recorded the following official CLI concepts:

- `gsk login`
- `gsk task create`
- `gsk task status`
- `gsk task info`
- `gsk task events`
- `gsk task artifacts`
- `gsk task artifact`
- `gsk task stop`
- `project_id`
- asynchronous `run_id` values
- task output/artifact retrieval

The observed task-type inventory included generic/specialized agents such as:

- `super_agent`
- `docs`
- `slides`
- `deep_research`
- `website`
- media-oriented agents
- custom agents

The observed inventory did **not** include:

- `Genspark Code`
- `code`
- `code_sandbox`

Therefore:

**CLI generic-agent capability != Genspark Code capability.**

That distinction is mandatory throughout this phase.

---

## 3. Official-source boundary

Use only official or officially linked material for capability claims.

Primary sources:

1. Genspark Help Center
2. Genspark official product documentation
3. Genspark official blog posts
4. Official `@genspark/cli` package/documentation linked by Genspark
5. The locally installed/authenticated CLI's own `--help` and command output

Do not use:

- reverse-engineered private endpoints
- browser automation of Genspark
- session cookies
- undocumented private API routes
- hidden headers discovered by traffic interception
- fabricated SDK methods
- third-party claims as proof of an official contract

Third-party information may be recorded as a lead only, never as proof.

---

## 4. Hypothesis

### H1 — CLI executor viable

The official CLI exposes enough stable lifecycle semantics to implement a bridge executor for one or more **supported generic task types**:

`create -> project_id/run_id -> status -> result/artifact -> stop`

The bridge must be able to:

1. validate a canonical task;
2. select an explicitly supported CLI task type;
3. submit it through the documented CLI;
4. capture project/run identity;
5. observe status;
6. retrieve a result or artifact;
7. verify task identity and terminal state;
8. stop a running task when officially supported;
9. redact credentials and sensitive output;
10. emit an auditable lifecycle.

### H2 — CLI is not a Code adapter

Even if H1 passes, the result must **not** be described as remote Genspark Code control unless an official Code-specific interface is separately verified.

---

## 5. Capability matrix

| Capability | Initial status | Phase 3B target |
|---|---|---|
| Official CLI exists | VERIFIED | Preserve |
| Generic task creation | VERIFIED from Phase 3 | Reproduce safely |
| Supported task type discovery | PARTIALLY VERIFIED | Capture exact eligible type |
| Project ID | VERIFIED conceptually | Capture from a real run |
| Run ID | VERIFIED conceptually | Capture from a real run |
| Status | VERIFIED as CLI command | Reproduce against own run |
| Result/output | PARTIALLY VERIFIED | Retrieve from own run |
| Artifact listing | PARTIALLY VERIFIED | Retrieve when task produces one |
| Artifact resolution | PARTIALLY VERIFIED | Verify if applicable |
| Stop | PARTIALLY VERIFIED | Verify against own disposable run |
| Retry | UNVERIFIED | Do not assume; document semantics |
| Idempotency | UNVERIFIED | Do not assume |
| Webhook/event push | UNVERIFIED | Optional discovery only |
| Code task submission | UNVERIFIED | Must remain separate |
| Bridge executor implementation | NOT STARTED | Only after proof |

---

## 6. Proof task design

The proof must use the smallest, cheapest, disposable supported task.

Preferred order:

1. a minimal `super_agent` task with no external side effects;
2. another generic task only if the CLI requires it;
3. avoid coding/deployment tasks unless the CLI explicitly documents them as supported and the proof needs them.

The proof task should:

- perform a deterministic, harmless operation;
- create no production deployment;
- modify no external repository;
- send no email/message;
- spend the minimum practical credits;
- produce a small textual result if possible;
- produce an artifact only if the selected task naturally supports one.

Example conceptual request:

> Return exactly a short fixed confirmation string and do not access external services or modify files.

The exact task syntax must come from the installed official CLI help. Do not invent flags.

---

## 7. Required evidence

A successful Phase 3B proof must capture:

### A. CLI discovery

- CLI version
- relevant `gsk task --help`
- relevant `gsk task create --help`
- relevant status/info/output/artifact/stop help
- supported task type actually selected

### B. Submission

- exact documented command shape, with credentials redacted
- returned `project_id`
- returned `run_id`, if asynchronous
- timestamp
- task type

### C. Lifecycle

- at least one status observation
- terminal status
- project/run identity consistency

### D. Result

At least one of:

- structured output
- task result
- artifact metadata
- artifact content

The result must be independently matched to the submitted task.

### E. Stop

If safe and practical:

- start a second disposable task
- invoke documented stop
- verify terminal stopped/cancelled state

If stop cannot be safely tested, classify it as UNVERIFIED rather than inferring support from help text alone.

### F. Security

Verify:

- credentials are never written to Git;
- command output is redacted before logs;
- project/run identifiers are treated as non-secret identifiers unless official documentation says otherwise;
- arbitrary user-provided shell commands are not executed by the bridge;
- no private Genspark endpoint is used.

---

## 8. Executor mapping

If the proof passes, the canonical bridge executor can map:

| Bridge operation | CLI operation |
|---|---|
| `capabilities()` | static capability declaration from verified proof |
| `validate(task)` | task-type/payload validation |
| `submit(task)` | documented `gsk task create` |
| `status(execution_id)` | documented status/info operation |
| `result(execution_id)` | documented output/artifact operation |
| `cancel(execution_id)` | documented stop operation, only if verified |
| `retry(execution_id)` | disabled unless explicit retry semantics are verified |

The bridge's `execution_id` should be an internal stable identifier that references the provider's project/run identity rather than exposing provider-specific IDs throughout the control plane.

---

## 9. Fail-closed rules

The bridge must keep a capability disabled when any of the following is true:

- command syntax is undocumented;
- task type is unsupported;
- authentication requirements are unclear;
- returned identity cannot be correlated;
- result retrieval cannot be independently verified;
- stop behavior is assumed rather than observed/documented;
- retry semantics are inferred;
- an operation requires private Genspark endpoints;
- browser automation is required;
- the CLI route creates uncontrolled production side effects.

Unknown capabilities remain `false`.

---

## 10. Account and plan limitations

The Phase 3 proof observed a free-plan/credit limitation:

`free_plan_block`

The CLI reported that the tested account required a paid plan or a higher credit balance for certain capability/inventory operations.

This must be treated as an environment limitation, not as universal evidence that the CLI lacks a capability.

If the proof cannot be executed because of plan/credit limits:

- document the exact blocker;
- do not spend credits on speculative tasks;
- do not fabricate execution evidence;
- leave the relevant capability `UNVERIFIED`.

---

## 11. Success criteria

Phase 3B is **CLI_EXECUTOR_VERIFIED** only if all required gates pass for at least one supported generic task type:

- official CLI interface identified;
- real disposable task submitted;
- project/run identity captured;
- status observed;
- result/output or artifact retrieved;
- identity and terminal state independently verified;
- security checks pass;
- no private endpoint or browser automation used;
- implementation, if added, passes typecheck/tests/build;
- documentation records exact evidence and limitations.

Otherwise:

**CLI_EXECUTOR_NOT_VERIFIED**

The latter is a valid result.

---

## 12. Relationship to Genspark Code

This phase intentionally creates two separate capabilities:

`GensparkCLIExecutor`

and

`GensparkCodeExecutor`

They must never be conflated.

Possible final state:

- CLI executor = VERIFIED
- Genspark Code executor = NOT VERIFIED

That is architecturally acceptable.

The bridge remains executor-neutral:

```
Control Plane
     |
     v
Executor Interface
     |
     +-- Mock Executor
     +-- Genspark CLI Executor (if verified)
     +-- Genspark Code Executor (only if separately verified)
     +-- Other Executor
```

---

## 13. Next gate

If Phase 3B passes:

**Gate G9 — Official CLI Executor**

Then the project may implement a narrow `GensparkCliExecutor` adapter behind capability flags.

If Phase 3B fails:

- keep the control plane;
- keep MCP;
- keep the mock executor;
- do not build a speculative Genspark adapter;
- evaluate another officially supported executor.

---

## 14. Non-goals

Phase 3B does not:

- prove remote Genspark Code control;
- reverse engineer Genspark;
- automate the Genspark Code web UI;
- scrape private network traffic;
- obtain private cookies/tokens;
- bypass plan or credit restrictions;
- deploy production applications;
- create a billing system;
- expose a public arbitrary-command execution endpoint.

---

## 15. Expected final classifications

Use exactly one primary classification:

### CLI_EXECUTOR_VERIFIED

The official CLI provides a reproducible, safe, auditable executor path for at least one supported generic task type.

### CLI_EXECUTOR_NOT_VERIFIED

The evidence is insufficient to establish a safe official executor path.

Do not use stronger language than the evidence supports.
