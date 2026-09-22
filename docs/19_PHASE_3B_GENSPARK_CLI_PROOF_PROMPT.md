# Phase 3B — Genspark CLI Proof Prompt

## Mission

Perform **Phase 3B — Official Genspark CLI Executor Proof** for the repository:

`https://github.com/Sparkmind-obp-off/genspark-execution-bridge`

The goal is to determine whether the **official Genspark CLI** can safely and legitimately serve as an executor for the bridge.

This is a proof task, not a speculative implementation task.

### Critical distinction

Phase 3 already concluded:

`REMOTE_CODE_NOT_VERIFIED`

Do **not** attempt to turn the generic CLI into a Genspark Code API by inference.

The exact question is:

> Can the official Genspark CLI execute at least one supported generic Genspark task with a reproducible lifecycle that the bridge can wrap?

A positive result may establish a **Genspark CLI executor** while Genspark Code remains unverified.

---

# 1. Read the repository first

Inspect:

- `README.md`
- `docs/07_MVP_PLAN.md`
- `docs/08_ROADMAP_AND_GATES.md`
- `docs/10_DECISION_LOG.md`
- `docs/16_PHASE_3_GENSPARK_CODE_CAPABILITY_DISCOVERY.md`
- `docs/17_PHASE_3_GENSPARK_CODE_PROOF_REPORT.md`
- existing executor interfaces
- existing capability flags
- existing tests
- existing security/redaction code

Do not overwrite prior evidence.

Preserve the existing fail-closed behavior.

---

# 2. Official-source-only rule

Use official sources only for capability claims.

Allowed:

- Genspark Help Center
- official Genspark documentation
- official Genspark blog
- official `@genspark/cli` package/documentation linked by Genspark
- local official CLI help output

Not allowed:

- reverse engineering private APIs
- browser automation of `genspark.ai/code`
- session-cookie reuse
- undocumented private endpoints
- intercepted hidden headers
- fabricated SDK methods
- third-party claims presented as official proof

If a source is not official, mark it as a lead only.

---

# 3. Discover the installed CLI

Safely inspect the CLI.

Start with read-only discovery commands such as:

```bash
gsk --help
gsk --version
gsk task --help
gsk task create --help
gsk task status --help
gsk task info --help
gsk task output --help
gsk task artifacts --help
gsk task artifact --help
gsk task stop --help
```

Only run commands that actually exist according to the CLI's help output.

Do not invent flags.

Record:

- CLI version
- command names
- supported task types
- input parameters
- output/identity fields
- lifecycle commands
- authentication requirements

Redact credentials.

---

# 4. Determine the cheapest supported proof task

Choose exactly one supported generic task type that is:

- documented by the CLI;
- disposable;
- low cost;
- deterministic;
- free of production side effects;
- capable of returning a small result if possible.

Prefer a generic/super-agent style task if it is officially supported.

Do not choose Genspark Code unless the current official CLI explicitly documents it as a supported task type.

If no safe supported task can be run, stop and classify:

`CLI_EXECUTOR_NOT_VERIFIED`

with the precise blocker.

---

# 5. Execute one real disposable task

Run a real task only after confirming the exact command syntax from official CLI help.

The task must request a harmless deterministic result, for example a short fixed confirmation string.

Do not:

- modify GitHub;
- deploy to Cloudflare;
- send messages;
- send email;
- call paid external services;
- write to production;
- execute arbitrary shell commands;
- create real customer/business actions.

Capture:

- task type
- submission timestamp
- project ID
- run ID, if returned
- initial status
- final status
- result/output
- artifact metadata if any

Never include API keys or credentials in the report.

---

# 6. Prove lifecycle correlation

For the created task:

1. obtain status using the documented command;
2. confirm the returned project/run identity matches the submitted task;
3. wait/poll only as needed;
4. obtain the result/output;
5. retrieve artifact metadata/content if the task produces artifacts;
6. confirm the terminal state is consistent with the result.

Do not claim success merely because the CLI command returned HTTP/CLI success.

The bridge needs evidence that:

`submitted task -> same execution identity -> terminal state -> corresponding result`

---

# 7. Prove stop only if safe

If the official CLI documents stop/cancel:

- create a second disposable task only if necessary;
- stop it using the documented command;
- verify its terminal state.

If performing this test would consume unreasonable credits or is otherwise unsafe:

- do not run it;
- classify stop as `UNVERIFIED`;
- explain why.

Never infer cancel semantics from the existence of a command alone.

---

# 8. Retry rules

Do not assume that creating a second task is a retry.

Only mark retry as VERIFIED if official documentation establishes retry semantics for the relevant task type.

Otherwise:

`retry = false`

This is intentional fail-closed behavior.

---

# 9. Account/plan blocker handling

The previous Phase 3 test observed:

`free_plan_block`

with a free account and insufficient credit balance for some CLI capability/inventory operations.

If the current environment hits the same or another plan/credit restriction:

- record the exact error code/message;
- do not attempt to bypass it;
- do not use another person's credentials;
- do not fabricate a successful run;
- classify the affected capability as `UNVERIFIED`.

A plan restriction is an environment limitation, not proof that the feature universally does not exist.

---

# 10. Implementation decision

Do **not** implement a `GensparkCliExecutor` merely because the CLI has commands.

Implement it only if the live proof establishes the minimum lifecycle:

```
validate
   ↓
submit
   ↓
project_id / run_id
   ↓
status
   ↓
result/output
   ↓
verify
```

Stop/cancel and retry remain independently gated.

If verified, implement the smallest adapter possible.

It must use the existing executor interface.

Do not redesign the control plane.

Do not expose arbitrary shell execution.

Do not make the bridge depend on a Genspark CLI installation unless the repository's deployment model explicitly supports that dependency.

If the production Cloudflare runtime cannot directly execute the CLI, document the architecture boundary instead of pretending the CLI adapter works inside Cloudflare Workers.

A possible architecture, only if the evidence supports it, is:

```
Bridge Control Plane
        |
        v
CLI Executor Adapter
        |
        v
Official Genspark CLI
        |
        v
Genspark task service
```

The CLI runner may need to be a separate trusted worker/runner rather than the Cloudflare Worker itself.

---

# 11. Security requirements

Do not:

- log API keys;
- commit credentials;
- persist raw authentication headers;
- expose arbitrary shell commands through HTTP;
- accept arbitrary CLI flags from untrusted users;
- allow arbitrary task types without an allowlist;
- bypass Genspark plan restrictions;
- use private Genspark routes;
- use browser automation as the executor transport.

Use:

- explicit task-type allowlists;
- existing redaction utilities;
- existing policy engine;
- existing audit model;
- capability flags;
- fail-closed defaults.

---

# 12. Tests required if runtime code changes

If code changes are made, run:

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

Also add focused tests for:

- CLI executor validation;
- supported task-type allowlist;
- submission identity mapping;
- status mapping;
- result verification;
- stop capability when implemented;
- redaction;
- unsupported capability behavior.

Do not modify unrelated tests just to force a pass.

---

# 13. Required documentation

Create or update:

`docs/18_GENSPARK_OFFICIAL_CLI_EXECUTOR_DISCOVERY.md`

This document should contain:

- purpose;
- evidence baseline;
- official-source boundary;
- hypothesis;
- capability matrix;
- proof task design;
- required evidence;
- executor mapping;
- fail-closed rules;
- account/plan limitations;
- success criteria;
- relationship to Genspark Code;
- next gate;
- non-goals;
- final classifications.

Then create:

`docs/20_PHASE_3B_GENSPARK_CLI_PROOF_REPORT.md`

The report must record what actually happened.

Do not fabricate evidence.

---

# 14. Required final decision

At the top and bottom of the proof report, use exactly one:

`CLI_EXECUTOR_VERIFIED`

or

`CLI_EXECUTOR_NOT_VERIFIED`

Use:

`CLI_EXECUTOR_VERIFIED`

only when a real supported disposable task was executed and the required lifecycle/result evidence was obtained.

Otherwise use:

`CLI_EXECUTOR_NOT_VERIFIED`

---

# 15. README / roadmap / decision log

If Phase 3B produces a verified capability, update:

- `README.md`
- `docs/08_ROADMAP_AND_GATES.md`
- `docs/10_DECISION_LOG.md`

If it does not produce a verified capability, update those documents only with the factual proof outcome and limitations.

Do not mark Genspark Code as verified.

Do not remove the existing:

`REMOTE_CODE_NOT_VERIFIED`

boundary unless new official evidence independently proves Genspark Code.

---

# 16. Git discipline

Use the existing `main` branch unless repository policy requires otherwise.

Before commit:

```bash
git status --short
git diff --check
```

Commit only relevant Phase 3B changes.

Suggested commit message:

`docs: record Phase 3B Genspark CLI executor proof`

If runtime code is implemented, use a separate focused commit before or alongside the documentation commit.

Push to:

`origin/main`

Then report:

- commit SHA;
- changed files;
- tests;
- build;
- final classification;
- production impact;
- remaining unknowns.

---

# 17. Hard boundaries

STOP and report instead of improvising if:

- the CLI requires an unavailable paid plan;
- no supported disposable task can be identified;
- the CLI behavior conflicts with official documentation;
- an operation requires private endpoints;
- browser automation becomes necessary;
- credentials would need to be exposed;
- the only available path is speculative.

The correct answer can be:

`CLI_EXECUTOR_NOT_VERIFIED`

A precise negative result is better than a fabricated integration.

---

# 18. Final output format

At completion, report:

### Phase 3B Decision

`CLI_EXECUTOR_VERIFIED`

or

`CLI_EXECUTOR_NOT_VERIFIED`

### Verified

- exact capabilities proven

### Not verified

- exact capabilities still unknown

### Evidence

- official sources
- CLI commands
- task identity
- lifecycle observations
- result/artifact evidence

### Code changes

- files changed
- executor capabilities enabled/disabled

### Quality

- typecheck
- tests
- build
- git diff check

### Git

- commit SHA
- push result

### Production

- whether deployment was required
- deployment result if applicable

### Boundary

Explicitly state:

`Genspark CLI executor proof does not prove remote Genspark Code control.`

Proceed now. Do not ask for confirmation if the required information is available in the repository and official CLI.
