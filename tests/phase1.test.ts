import assert from "node:assert/strict";
import test from "node:test";
import * as z from "zod/v4";
import { Auditor, InMemoryAuditSink, redact } from "../src/audit/audit";
import { ControlPlane } from "../src/application/control-plane";
import { InvalidTaskTransitionError, TaskStateMachine } from "../src/domain/state-machine";
import { taskSchema, validateTask, type Task } from "../src/domain/task";
import { ExecutorError } from "../src/executors/executor";
import { GensparkExecutor } from "../src/executors/genspark";
import { MockExecutor } from "../src/executors/mock";
import { invokeSafeTool, safeMcpToolSchemas } from "../src/mcp/safe-tools";
import { evaluatePolicy } from "../src/policy/policy";
import { verifyExecution } from "../src/verification/verification";

const baseTask: Task = {
  task_id: "task-001",
  type: "mock_execution",
  input: { message: "hello" },
  requested_capabilities: ["mock_execution"],
  risk_level: "low",
  created_at: "2026-09-22T00:00:00.000Z",
  metadata: { actor: "test" }
};

function testAuditor() {
  const sink = new InMemoryAuditSink();
  return { sink, auditor: new Auditor(sink, () => new Date("2026-09-22T00:00:00.000Z")) };
}

test("task model accepts a canonical task and rejects malformed input", () => {
  assert.equal(validateTask(baseTask).valid, true);
  const invalid = validateTask({ ...baseTask, task_id: "", risk_level: "unknown" });
  assert.equal(invalid.valid, false);
  assert.equal(taskSchema.safeParse(baseTask).success, true);
});

test("state machine allows only explicit transitions", () => {
  const machine = new TaskStateMachine();
  for (const state of ["validated", "authorized", "queued", "running", "succeeded"] as const) {
    assert.equal(machine.transition(state), state);
  }
  assert.throws(() => machine.transition("running"), InvalidTaskTransitionError);
  assert.throws(() => new TaskStateMachine("created").transition("succeeded"), /Invalid task transition/);
});

test("policy allows safe read and mock tasks", () => {
  const executor = new MockExecutor();
  assert.deepEqual(evaluatePolicy(baseTask, executor.name, executor.capabilities()), { allowed: true, reasons: [] });
  const readTask: Task = { ...baseTask, task_id: "read-001", type: "read", requested_capabilities: ["read"] };
  assert.equal(evaluatePolicy(readTask, executor.name, executor.capabilities()).allowed, true);
});

test("policy denies writes, production, high risk, secrets, private Genspark URLs, and unknown capability", () => {
  const executor = new MockExecutor();
  const denied: Task = {
    ...baseTask,
    type: "production_deployment",
    risk_level: "critical",
    input: {
      password: "do-not-store",
      authorization: "Bearer abc.def",
      endpoint: "https://www.genspark.ai/private/task"
    },
    requested_capabilities: ["deploy"]
  };
  const decision = evaluatePolicy(denied, executor.name, executor.capabilities());
  assert.equal(decision.allowed, false);
  const writeDecision = evaluatePolicy(
    { ...baseTask, task_id: "write-001", type: "external_write" },
    executor.name,
    executor.capabilities()
  );
  assert.equal(writeDecision.allowed, false);
  if (!writeDecision.allowed) {
    assert.equal(writeDecision.reasons.some((reason) => reason.code === "EXTERNAL_WRITE_DENIED"), true);
  }
  if (decision.allowed) assert.fail("Expected denial");
  const codes = new Set(decision.reasons.map((reason) => reason.code));
  for (const code of [
    "PRODUCTION_DEPLOYMENT_DENIED",
    "HIGH_RISK_DENIED",
    "SECRET_IN_INPUT",
    "PRIVATE_GENSPARK_ENDPOINT_DENIED",
    "UNKNOWN_EXECUTOR_CAPABILITY",
    "TASK_TYPE_DENIED"
  ]) assert.equal(codes.has(code as never), true, `Missing ${code}`);
});

test("MockExecutor deterministically succeeds and returns identity-bound result", async () => {
  const executor = new MockExecutor();
  const submitted = await executor.submit(baseTask);
  assert.equal(submitted.execution_id, "mock:task-001:1");
  assert.equal(submitted.state, "succeeded");
  assert.deepEqual(await executor.result(submitted.execution_id), {
    execution_id: "mock:task-001:1",
    task_id: "task-001",
    state: "succeeded",
    output: { ok: true, echo: { message: "hello" } }
  });
});

test("MockExecutor deterministically fails, retries, times out, and errors", async () => {
  const executor = new MockExecutor();
  const failed = await executor.submit({ ...baseTask, task_id: "task-fail", input: { mock_behavior: "failure" } });
  assert.equal(failed.state, "failed");
  assert.equal((await executor.result(failed.execution_id)).error?.code, "MOCK_FAILURE");
  assert.equal((await executor.retry(failed.execution_id)).execution_id, "mock:task-fail:2");

  await assert.rejects(
    executor.submit({ ...baseTask, task_id: "task-timeout", input: { mock_behavior: "timeout" } }),
    (error: unknown) => error instanceof ExecutorError && error.code === "MOCK_TIMEOUT"
  );
  await assert.rejects(
    executor.submit({ ...baseTask, task_id: "task-error", input: { mock_behavior: "error" } }),
    (error: unknown) => error instanceof ExecutorError && error.code === "MOCK_ERROR"
  );
});

test("Genspark adapter defaults every remote execution capability to false and fails closed", async () => {
  const executor = new GensparkExecutor();
  assert.deepEqual(executor.capabilities(), {
    submit: false,
    status: false,
    result: false,
    cancel: false,
    retry: false,
    code_mode: false,
    read: false,
    mock_execution: false
  });
  assert.equal((await executor.validate(baseTask)).valid, false);
  await assert.rejects(
    executor.submit(baseTask),
    (error: unknown) => error instanceof ExecutorError && error.code === "UNSUPPORTED_CAPABILITY"
  );
});

test("verification accepts valid identity, shape, and terminal consistency", () => {
  const outcome = verifyExecution(
    "task-001",
    "mock:task-001:1",
    { execution_id: "mock:task-001:1", task_id: "task-001", state: "succeeded", attempt: 1 },
    { execution_id: "mock:task-001:1", task_id: "task-001", state: "succeeded", output: { ok: true } },
    z.object({ ok: z.literal(true) })
  );
  assert.deepEqual(outcome, { accepted: true, reasons: [] });
});

test("verification rejects identity, result shape, and terminal inconsistencies", () => {
  const mismatch = verifyExecution(
    "task-001",
    "expected-execution",
    { execution_id: "wrong-execution", task_id: "wrong-task", state: "running", attempt: 1 },
    { execution_id: "wrong-execution", task_id: "wrong-task", state: "failed", error: { code: "X", message: "x" } }
  );
  assert.equal(mismatch.accepted, false);
  if (!mismatch.accepted) assert.deepEqual(
    new Set(mismatch.reasons.map((reason) => reason.code)),
    new Set(["EXECUTION_ID_MISMATCH", "TASK_ID_MISMATCH", "NON_TERMINAL_STATUS", "TERMINAL_STATE_MISMATCH"])
  );

  const invalid = verifyExecution("task-001", "execution", {
    execution_id: "execution", task_id: "task-001", state: "succeeded", attempt: 1
  }, { state: "succeeded" });
  assert.equal(invalid.accepted, false);
});

test("audit redacts sensitive keys, bearer values, cookies, and credential URLs", async () => {
  const { sink, auditor } = testAuditor();
  await auditor.emit({
    event: "policy.denied",
    details: {
      api_key: "key-value",
      password: "password-value",
      Cookie: "session=value",
      nested: { authorization: "Bearer token-value" },
      note: "Bearer abc.def and https://user:pass@example.com/path?token=secret"
    }
  });
  const serialized = JSON.stringify(sink.events());
  for (const secret of ["key-value", "password-value", "session=value", "token-value", "user:pass", "token=secret"]) {
    assert.equal(serialized.includes(secret), false, `Leaked ${secret}`);
  }
  assert.match(serialized, /REDACTED/);
  assert.deepEqual(redact({ safe: "value" }), { safe: "value" });
});

test("MCP safe tools expose explicit schemas, deterministic results, audit, and unknown-resource errors", async () => {
  assert.deepEqual(Object.keys(safeMcpToolSchemas).sort(), ["get_project", "get_status", "get_task"]);
  assert.equal(safeMcpToolSchemas.get_project.input.safeParse({ project_id: "proof-project" }).success, true);
  assert.equal(safeMcpToolSchemas.get_task.input.safeParse({ task_id: "", extra: true }).success, false);

  const { sink, auditor } = testAuditor();
  const project = await invokeSafeTool("get_project", { project_id: "proof-project" }, auditor);
  assert.equal(project.ok, true);
  const unknown = await invokeSafeTool("get_status", { execution_id: "missing" }, auditor);
  assert.deepEqual(unknown, {
    ok: false,
    error: { code: "UNKNOWN_RESOURCE", message: "The requested resource does not exist." }
  });
  assert.deepEqual(sink.events().map((event) => event.event), [
    "mcp.tool.invoked",
    "mcp.tool.result_returned",
    "mcp.tool.invoked",
    "mcp.tool.result_returned"
  ]);
});

test("control plane completes only after independent verification", async () => {
  const { sink, auditor } = testAuditor();
  const outcome = await new ControlPlane(auditor).execute(
    baseTask,
    new MockExecutor(),
    z.object({ ok: z.literal(true), echo: z.record(z.string(), z.unknown()) })
  );
  assert.equal(outcome.state, "succeeded");
  assert.equal(outcome.verification?.accepted, true);
  assert.equal(sink.events().some((event) => event.event === "verification.completed"), true);

  const rejected = await new ControlPlane(auditor).execute(
    { ...baseTask, task_id: "task-bad-shape" },
    new MockExecutor(),
    z.object({ impossible: z.literal(true) })
  );
  assert.equal(rejected.state, "failed");
  assert.equal(rejected.verification?.accepted, false);
  assert.equal(sink.events().some((event) => event.event === "verification.rejected"), true);
});
