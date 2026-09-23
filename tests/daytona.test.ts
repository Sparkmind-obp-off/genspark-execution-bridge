import assert from "node:assert/strict";
import test from "node:test";
import { DaytonaNotFoundError } from "@daytona/sdk";
import { redact } from "../src/audit/audit";
import type { Task } from "../src/domain/task";
import {
  DaytonaExecutor,
  DaytonaSdkProvider,
  type DaytonaCommandLogs,
  type DaytonaCommandResponse,
  type DaytonaProvider,
  type DaytonaSandboxHandle
} from "../src/executors/daytona";
import { ExecutorError } from "../src/executors/executor";

const task: Task = {
  task_id: "daytona-test-001",
  type: "execution",
  input: { command: "printf PHASE_4_EXECUTION_PROOF_OK" },
  requested_capabilities: ["code_mode"],
  risk_level: "low",
  created_at: "2026-09-22T00:00:00.000Z",
  metadata: { correlation_id: "bridge-correlation-001" }
};

interface FakeOptions {
  createError?: Error;
  executeError?: Error;
  response?: DaytonaCommandResponse;
  logs?: DaytonaCommandLogs;
  stopError?: Error;
  deleteError?: Error;
  lookupError?: Error;
  stillExists?: boolean;
}

function fakeProvider(options: FakeOptions = {}) {
  const calls = { create: 0, stop: 0, delete: 0, lookup: 0 };
  const sandbox: DaytonaSandboxHandle = {
    id: "sandbox-proof-001",
    state: "started",
    async createSession() {},
    async execute() {
      if (options.executeError) throw options.executeError;
      return options.response ?? {
        commandId: "command-proof-001",
        exitCode: 0,
        stdout: "PHASE_4_EXECUTION_PROOF_OK\n",
        stderr: ""
      };
    },
    async logs() {
      return options.logs ?? { stdout: "PHASE_4_EXECUTION_PROOF_OK\n", stderr: "" };
    },
    async stop() {
      calls.stop += 1;
      if (options.stopError) throw options.stopError;
    },
    async delete() {
      calls.delete += 1;
      if (options.deleteError) throw options.deleteError;
    },
    async verifyDeleted() {
      calls.lookup += 1;
      if (options.lookupError) throw options.lookupError;
      return !options.stillExists;
    }
  };
  const provider: DaytonaProvider = {
    async create() {
      calls.create += 1;
      if (options.createError) throw options.createError;
      return sandbox;
    }
  };
  return { provider, calls };
}

test("Daytona maps a successful verified execution with provider correlation", async () => {
  const fake = fakeProvider();
  const executor = new DaytonaExecutor(fake.provider);
  const status = await executor.submit(task);
  assert.equal(status.execution_id, "daytona:sandbox-proof-001:command-proof-001");
  assert.equal(status.state, "succeeded");
  const result = await executor.result(status.execution_id);
  assert.equal(result.state, "succeeded");
  assert.deepEqual(result.output, {
    provider: "daytona",
    sandbox_id: "sandbox-proof-001",
    command_id: "command-proof-001",
    session_id: "bridge-daytona-test-001",
    exit_code: 0,
    stdout: "PHASE_4_EXECUTION_PROOF_OK\n",
    stderr: "",
    logs: { stdout: "PHASE_4_EXECUTION_PROOF_OK\n", stderr: "" },
    cleanup: { stopped: true, deleted: true, postDeleteVerified: true }
  });
  assert.deepEqual(fake.calls, { create: 1, stop: 1, delete: 1, lookup: 1 });
});

test("SDK post-delete lookup accepts only authoritative 404, never transport or auth errors", async () => {
  const provider = new DaytonaSdkProvider("test-only-sdk-key");
  let lookup: () => Promise<unknown> = async () => ({ id: "sandbox-test" });
  Object.defineProperty(provider, "client", { value: {
    create: async () => ({ id: "sandbox-test", state: "started", process: {}, stop: async () => {}, delete: async () => {} }),
    get: async () => lookup()
  } });
  const sandbox = await provider.create({name:"proof",labels:{},networkBlockAll:true,ttlMinutes:10});
  assert.equal(await sandbox.verifyDeleted(), false);
  lookup = async () => { throw new DaytonaNotFoundError("not found", 404); };
  assert.equal(await sandbox.verifyDeleted(), true);
  for (const error of [new Error("network unavailable"), new Error("authentication rejected"), new DaytonaNotFoundError("unconfirmed")]) {
    lookup = async () => { throw error; };
    await assert.rejects(sandbox.verifyDeleted(), error);
  }
});

test("Daytona fails closed when credentials are missing", () => {
  assert.throws(
    () => new DaytonaSdkProvider(""),
    (error: unknown) => error instanceof ExecutorError && error.code === "MISSING_CREDENTIALS"
  );
});

test("Daytona rejects unsupported task and provider capability requests before creation", async () => {
  const fake = fakeProvider();
  const executor = new DaytonaExecutor(fake.provider);
  await assert.rejects(
    executor.submit({ ...task, type: "external_write", requested_capabilities: ["retry"] }),
    (error: unknown) => error instanceof ExecutorError && error.code === "VALIDATION_FAILED"
  );
  assert.equal(fake.calls.create, 0);
});

test("Daytona maps sandbox creation failure without leaking provider semantics", async () => {
  const fake = fakeProvider({ createError: new Error("provider unavailable") });
  await assert.rejects(
    new DaytonaExecutor(fake.provider).submit(task),
    (error: unknown) => error instanceof ExecutorError
      && error.code === "DAYTONA_SANDBOX_CREATION_FAILED"
      && /provider unavailable/.test(error.message)
  );
});

test("Daytona maps execution failure and still cleans up", async () => {
  const fake = fakeProvider({ executeError: new Error("execution transport failed") });
  const executor = new DaytonaExecutor(fake.provider);
  const status = await executor.submit(task);
  assert.equal(status.state, "failed");
  const result = await executor.result(status.execution_id);
  assert.equal(result.error?.code, "DAYTONA_EXECUTION_FAILED");
  assert.deepEqual(fake.calls, { create: 1, stop: 1, delete: 1, lookup: 1 });
});

test("Daytona rejects missing or uncertain post-delete evidence", async () => {
  for (const options of [{ stillExists: true }, { lookupError: new Error("lookup unavailable") }]) {
    const fake = fakeProvider(options);
    const executor = new DaytonaExecutor(fake.provider);
    const status = await executor.submit(task);
    assert.equal((await executor.result(status.execution_id)).error?.code, "DAYTONA_CLEANUP_FAILED");
    assert.equal(fake.calls.lookup, 1);
  }
});

test("Daytona fails closed when result or command identity is missing", async () => {
  const missingResult = fakeProvider({ response: { commandId: "command-proof-001" } });
  const resultStatus = await new DaytonaExecutor(missingResult.provider).submit(task);
  assert.equal(resultStatus.state, "failed");
  assert.equal((await new DaytonaExecutor(fakeProvider().provider).validate(task)).valid, true);

  const missingIdentity = fakeProvider({ response: { exitCode: 0, stdout: "ok" } });
  const identityExecutor = new DaytonaExecutor(missingIdentity.provider);
  const identityStatus = await identityExecutor.submit(task);
  assert.equal((await identityExecutor.result(identityStatus.execution_id)).error?.code, "DAYTONA_IDENTITY_MISSING");
});

test("Daytona surfaces timeout as execution failure", async () => {
  const timeout = Object.assign(new Error("operation timed out"), { code: "ETIMEDOUT" });
  const fake = fakeProvider({ executeError: timeout });
  const executor = new DaytonaExecutor(fake.provider, 1);
  const status = await executor.submit(task);
  assert.equal((await executor.result(status.execution_id)).error?.code, "DAYTONA_EXECUTION_FAILED");
});

test("Daytona reports cleanup failure and keeps cancel fail-closed", async () => {
  const fake = fakeProvider({ deleteError: new Error("delete failed") });
  const executor = new DaytonaExecutor(fake.provider);
  const status = await executor.submit(task);
  assert.equal((await executor.result(status.execution_id)).error?.code, "DAYTONA_CLEANUP_FAILED");
  await assert.rejects(
    executor.cancel(status.execution_id),
    (error: unknown) => error instanceof ExecutorError && error.code === "UNSUPPORTED_CAPABILITY"
  );
});

test("Daytona token-shaped values are redacted from provider errors and audit data", async () => {
  const token = ["dtn", "abcdefghijklmnopqrstuvwxyz0123456789"].join("_");
  const fake = fakeProvider({ executeError: new Error(`provider rejected ${token}`) });
  const executor = new DaytonaExecutor(fake.provider);
  const status = await executor.submit(task);
  const serialized = JSON.stringify(await executor.result(status.execution_id));
  assert.equal(serialized.includes(token), false);
  assert.equal(JSON.stringify(redact({ note: token })).includes(token), false);
});

test("Daytona canonical execution ID retains sandbox and command correlation", async () => {
  const fake = fakeProvider();
  const executor = new DaytonaExecutor(fake.provider);
  const status = await executor.submit(task);
  assert.match(status.execution_id, /^daytona:sandbox-proof-001:command-proof-001$/);
  assert.deepEqual(await executor.status(status.execution_id), status);
  await assert.rejects(
    executor.retry(status.execution_id),
    (error: unknown) => error instanceof ExecutorError && error.code === "UNSUPPORTED_CAPABILITY"
  );
});
