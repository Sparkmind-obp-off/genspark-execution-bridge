CLI_EXECUTOR_NOT_VERIFIED

# Phase 3B — Official Genspark CLI Executor Proof Report

## 1. Purpose and evidence baseline

This proof tested whether the official Genspark CLI can execute one supported generic task with a reproducible lifecycle that the bridge can safely wrap. It did not test or infer remote Genspark Code control.

- **Proof timestamp:** 2026-09-22T18:54:55Z
- **Repository:** `https://github.com/Sparkmind-obp-off/genspark-execution-bridge`
- **Baseline:** Phase 3 remains `REMOTE_CODE_NOT_VERIFIED`.
- **Installed CLI:** `gsk` 1.13.0.
- **Published package observation:** `npm view @genspark/cli version dist-tags --json` reported 1.13.1 as `latest` at proof time. The installed CLI, not the package registry result, was used for command discovery and the proof attempt.
- **Account boundary:** authenticated free plan with a 100-credit balance. Account identifiers and credentials are intentionally omitted.

## 2. Official-source boundary

Capability claims use only:

1. local help and responses from the installed official `gsk` CLI;
2. Genspark's official Gen-1 Slides article, which documents installing the CLI and using `gsk task create slides`: https://www.genspark.ai/blog/gen-1-slides;
3. the officially linked package page: https://www.npmjs.com/package/@genspark/cli;
4. the Phase 3 official-source record in `docs/16_PHASE_3_GENSPARK_CODE_CAPABILITY_DISCOVERY.md` and `docs/17_PHASE_3_GENSPARK_CODE_PROOF_REPORT.md`.

No browser automation, session-cookie reuse, private route, intercepted header, reverse engineering, or undocumented API was used.

## 3. Hypothesis and success criterion

The hypothesis was that one supported generic CLI task could establish:

```text
validate -> submit -> project_id/run_id -> status -> result/output -> verify
```

`CLI_EXECUTOR_VERIFIED` requires a real disposable task to be accepted and correlated through terminal status and corresponding output or artifact. Command existence alone is insufficient.

## 4. CLI discovery

Read-only commands executed successfully:

```bash
gsk --version
gsk --help
gsk task --help
gsk task create --help
gsk task status --help
gsk task info --help
gsk task artifacts --help
gsk task artifact --help
gsk task stop --help
gsk login-info --output json
```

The installed CLI documents these supported `task create` types:

- `super_agent`
- `podcasts`
- `docs`
- `slides`
- `deep_research`
- `website`
- `video_generation`
- `audio_generation`
- `meeting_notes`
- `cross_check`
- `media_agent`
- `custom_super_agent`

The help output does not list Genspark Code, `code`, or `code_sandbox` as a task type.

Documented input fields include `task_type`, `--task_name`, `--query`, and `--instructions`. Async creation is the default; help states that it returns a `run_id`, while `--wait true` blocks for the full result. Documented lifecycle operations include status, info, artifacts, artifact resolution, events, follow-up, and stop. Authentication is supplied by the saved CLI login or `GSK_API_KEY`/`--api-key`; no credential was printed or persisted in the repository.

`gsk task output --help` was not run because `task --help` does not list an `output` subcommand. The documented content-reading operation is `task info`.

## 5. Proof task design

Exactly one cheapest practical task type was selected: `super_agent`.

The request was intentionally harmless and deterministic:

```text
Return exactly PHASE_3B_CLI_PROOF_OK and do not access external services,
modify files, send messages, or perform any side effect.
```

The command used only flags shown by CLI help:

```bash
gsk --no-input --output json task create super_agent \
  --task_name "Phase 3B CLI lifecycle proof" \
  --query "Return exactly PHASE_3B_CLI_PROOF_OK and do not access external services, modify files, send messages, or perform any side effect." \
  --instructions "Produce only the exact text PHASE_3B_CLI_PROOF_OK. Do not use tools or external services."
```

## 6. What actually happened

The create command exited with status 1 before task creation and returned:

```json
{
  "version": 1,
  "status": "error",
  "message": "The Genspark CLI requires a paid plan or a credit balance of at least 500. Please upgrade or purchase credits at https://www.genspark.ai/pricing?fromurl=credit_exhausted&entry=gsk to use the Genspark CLI.",
  "data": {
    "code": "free_plan_block",
    "upgrade_url": "https://www.genspark.ai/pricing?fromurl=credit_exhausted&entry=gsk"
  }
}
```

Consequences:

- no task was accepted;
- no `project_id` was returned;
- no `run_id` was returned;
- no initial or terminal task status existed to poll;
- no result or artifact existed to retrieve;
- lifecycle identity correlation could not be performed;
- no second task was created for stop testing;
- no retry was attempted.

The restriction was not bypassed and no other person's credentials were used. This is an environment/account limitation, not proof that generic CLI execution is universally unavailable.

## 7. Capability matrix

| Capability | Classification | Actual evidence |
|---|---|---|
| Official CLI identity | VERIFIED | Installed `gsk` reported version 1.13.0; official article/package identify the CLI. |
| Supported generic task-type discovery | VERIFIED | Local `task create --help` enumerated supported types. |
| Generic task submission | UNVERIFIED | One valid `super_agent` attempt was rejected by `free_plan_block` before creation. |
| Project ID mapping | UNVERIFIED | No task identity was returned. |
| Run ID mapping | UNVERIFIED | No async run identity was returned. |
| Status mapping | UNVERIFIED | Command is documented, but no owned proof identity existed. |
| Result verification | UNVERIFIED | `task info` is documented, but no proof result existed. |
| Artifact listing/resolution | UNVERIFIED | Commands are documented, but the blocked task produced no artifacts. |
| Stop/cancel | UNVERIFIED | Help documents stop; behavior was not tested because creating another billed task was neither possible nor justified. |
| Retry | UNVERIFIED / disabled | CLI help explicitly says a new create makes and bills a new task; no retry operation or semantics were verified. |
| Idempotency | UNVERIFIED | No official idempotency contract was observed. |
| Code mode | UNVERIFIED / disabled | Code is not a documented task type and Phase 3 remains unchanged. |

## 8. Executor mapping decision

No `GensparkCliExecutor` was implemented. The minimum lifecycle gate did not pass, so enabling `submit`, `status`, or `result` would overstate the evidence. `cancel`, `retry`, and `code_mode` also remain disabled.

Even if a later eligible-account proof succeeds, a CLI adapter cannot run inside the Cloudflare Worker runtime because Workers cannot spawn a local process. The production architecture would require a separate trusted runner with the official CLI installed:

```text
Bridge Control Plane -> trusted CLI runner -> official Genspark CLI -> Genspark task service
```

That architecture boundary is documented only; it is not implemented or exposed through HTTP.

## 9. Fail-closed and security result

- Existing `GensparkExecutor` behavior remains unchanged and fail-closed.
- No arbitrary shell or CLI flags were exposed to users.
- No task-type allowlist was added because no runtime CLI adapter was justified.
- Existing policy, redaction, audit, and verification code was preserved.
- No API key, cookie, authorization header, or account identifier is included in this report.
- No private Genspark route or browser transport was used.
- `retry` remains false; a second create is not treated as retry.

## 10. Relationship to Genspark Code

This negative generic CLI proof does not alter Phase 3. The existence of official generic CLI commands still does not establish remote Genspark Code submission, identity, status, output, cancellation, or retry.

`REMOTE_CODE_NOT_VERIFIED` remains in force.

Genspark CLI executor proof does not prove remote Genspark Code control.

## 11. Next gate

Re-run the same single `super_agent` proof only in an authorized account/environment that satisfies the official CLI plan or credit requirement. A future proof must capture the returned run/project identity, poll that same identity to a terminal state, retrieve matching output, and independently verify terminal/result consistency before any adapter is implemented.

Stop and retry remain separate gates.

## 12. Non-goals

This phase did not deploy applications, modify GitHub through a task, invoke external services, send communications, reverse engineer private interfaces, automate a browser, or convert the generic CLI into a Genspark Code API by inference.

## 13. Final classification

The official CLI command surface and supported generic task types were discovered, but the environment rejected the only proof submission with `free_plan_block`. The required real-task lifecycle and result evidence therefore do not exist.

CLI_EXECUTOR_NOT_VERIFIED
