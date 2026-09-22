# Phase 2 — Live MCP Proof / Genspark Connection

## Role

You are the implementation and verification executor for this repository.

Phase 1 is complete and deployed to Cloudflare Pages.

Production MCP endpoint:

`https://genspark-execution-bridge.pages.dev/mcp`

Production health:

`https://genspark-execution-bridge.pages.dev/health`

Your mission in Phase 2 is to prove the real integration path:

`Genspark Connector → our MCP endpoint → safe read-only tool → observable server result`

This phase does **not** attempt to control Genspark Code remotely.

---

## 1. Read before changing anything

Inspect:

- `README.md`
- `docs/01_CAPABILITY_DISCOVERY.md`
- `docs/02_INTEGRATION_ARCHITECTURE.md`
- `docs/03_MCP_PROTOCOL.md`
- `docs/05_SECURITY_MODEL.md`
- `docs/06_TESTING_OBSERVABILITY.md`
- `docs/08_ROADMAP_AND_GATES.md`
- `docs/10_DECISION_LOG.md`
- `docs/11_MCP_PROOF_RUNBOOK.md`
- `docs/12_MCP_PROOF_IMPLEMENTATION.md`
- Phase 1 implementation under `src/`
- existing tests

Do not redesign the Phase 1 control plane unless a concrete Phase 2 defect requires it.

---

## 2. Phase 2 objective

Execute and document an actual external MCP connection proof.

Required proof chain:

1. Production endpoint is reachable.
2. Genspark Connector accepts the MCP endpoint.
3. Genspark discovers the expected read-only tools.
4. Genspark invokes a safe tool.
5. The production server receives the MCP request.
6. The server returns the expected schema/result.
7. Server-side audit evidence confirms the request.
8. No credential or sensitive value appears in the audit evidence.

The target proof tool is:

`get_project({ "project_id": "proof-project" })`

Expected safe result:

```json
{
  "project_id": "proof-project",
  "name": "Genspark Execution Bridge Proof",
  "status": "ok",
  "proof": true
}
```

---

## 3. Genspark connector setup

Use only the documented Genspark Connector / MCP connection mechanism available in the current Genspark product.

Configure the deployed MCP URL:

`https://genspark-execution-bridge.pages.dev/mcp`

Use authentication only if the current Genspark connector requires it and only with legitimate credentials supplied through the supported configuration mechanism.

Never place credentials in:

- repository files
- source code
- prompts committed to Git
- README
- audit payloads
- screenshots that expose secrets

If Genspark asks for an unsupported or undocumented protocol, stop and report the exact requirement instead of reverse-engineering it.

---

## 4. Required observations

Capture evidence for these events where the implementation supports them:

- `mcp.connection.checked`
- `mcp.tool.discovered`
- `mcp.tool.invoked`
- `mcp.tool.result_returned`

Also verify:

- request reaches the production Worker
- tool name is exactly `get_project`
- project identifier is exactly `proof-project`
- result matches the Phase 2 expected schema
- unknown resource behavior remains safe
- no write-capable tool is exposed

A UI response from Genspark alone is not sufficient. The production server-side audit endpoint must be checked as independent evidence.

---

## 5. Security rules

Do NOT:

- discover or call private Genspark endpoints
- scrape `genspark.ai/code`
- automate the Genspark UI as the primary integration
- fabricate a Genspark Code API
- fabricate tokens or endpoint formats
- enable remote Genspark execution
- enable production task execution
- add write-capable MCP tools
- weaken the fail-closed policy
- expose task input or secrets through proof tools

If authentication is unavailable, record `AUTH_UNAVAILABLE` or the actual documented failure condition. Do not work around it.

---

## 6. Production verification

Check:

- `GET /health`
- `GET /audit`
- MCP endpoint availability
- expected HTTP behavior for the supported MCP transport

Record timestamps and observed results without recording secrets.

If the current production deployment has an implementation issue that prevents valid MCP initialization/discovery, fix only the minimal issue, add a regression test, rebuild, redeploy, and document the new commit.

Do not claim production verification from local tests.

---

## 7. Capability matrix update

Only mark the following as proven if the live evidence actually exists:

| Capability | Allowed Phase 2 status |
|---|---|
| Genspark Connector → deployed MCP connection | Proven only after live connection |
| Tool discovery | Proven only after live discovery |
| Genspark → `get_project` invocation | Proven only after live invocation |
| Server-side audit evidence | Proven only after production observation |
| External app → Genspark task submission | Remains unverified |
| Remote Genspark Code execution | Remains unverified |
| Genspark status/result/cancel/retry API | Remains unverified |
| Production task execution | Remains disabled |
| Write-capable MCP tools | Remains disabled |

Do not convert MCP connectivity into evidence of Genspark Code remote control.

---

## 8. Testing

If code changes are made:

```bash
npm run typecheck
npm test
npm run build
```

All must pass before deployment.

Add regression tests for any bug discovered.

Do not claim a command passed unless it was actually executed.

---

## 9. Documentation deliverables

After the proof attempt:

1. Update `README.md` with the accurate Phase 2 status.
2. Update `docs/08_ROADMAP_AND_GATES.md`.
3. Append a dated decision/evidence entry to `docs/10_DECISION_LOG.md`.
4. Add a concise live proof record under `docs/`, for example:
   `docs/15_PHASE_2_LIVE_MCP_PROOF.md`

The proof record must clearly separate:

- proven
- observed but not independently verified
- unverified
- blocked
- next gate

Include production URL and timestamps, but never credentials.

---

## 10. Git discipline

Use focused commits.

Recommended sequence:

- `test: add Phase 2 MCP transport regression coverage` (only if needed)
- `fix: harden MCP transport for Phase 2 proof` (only if needed)
- `docs: record Phase 2 live MCP proof`

Keep the working tree clean.

Never claim:

- Genspark Code remote execution
- external-to-Genspark submission
- production task execution

unless official/public evidence and an actual reproducible test establish them.

---

## 11. Phase 2 exit criteria

Phase 2 is PASS only when all are true:

- [ ] production endpoint reachable
- [ ] Genspark MCP connector accepts endpoint
- [ ] tool discovery succeeds
- [ ] `get_project` invocation succeeds
- [ ] expected result is returned
- [ ] production audit confirms invocation/result
- [ ] no secrets leaked
- [ ] no private Genspark API was used
- [ ] documentation updated accurately
- [ ] code/tests/build pass if code changed

If any item fails, classify the exact failure and stop at that boundary.

## Critical architectural boundary

**MCP proof proves Genspark can use our MCP server. It does not prove our application can remotely control Genspark Code.**

Keep the executor abstraction and capability flags unchanged unless independently verified evidence justifies a new capability.
