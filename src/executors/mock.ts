import type { Task } from "../domain/task";
import {
  ExecutorError,
  type ExecutionResult,
  type ExecutionStatus,
  type Executor,
  type ExecutorCapabilities,
  type ExecutorValidation
} from "./executor";

type MockBehavior = "success" | "failure" | "timeout" | "error";

interface StoredExecution {
  task: Task;
  status: ExecutionStatus;
  result?: ExecutionResult;
}

export class MockExecutor implements Executor {
  readonly name = "mock";
  private readonly executions = new Map<string, StoredExecution>();

  capabilities(): ExecutorCapabilities {
    return {
      submit: true,
      status: true,
      result: true,
      cancel: true,
      retry: true,
      code_mode: false,
      read: true,
      mock_execution: true
    };
  }

  async validate(task: Task): Promise<ExecutorValidation> {
    const unsupported = task.requested_capabilities.filter((capability) => {
      const capabilities = this.capabilities() as unknown as Record<string, boolean>;
      return capabilities[capability] !== true;
    });
    return unsupported.length === 0
      ? { valid: true, reasons: [] }
      : {
          valid: false,
          reasons: unsupported.map((capability) => ({
            code: "UNSUPPORTED_CAPABILITY",
            message: `Mock executor does not support '${capability}'.`
          }))
        };
  }

  async submit(task: Task): Promise<ExecutionStatus> {
    const validation = await this.validate(task);
    if (!validation.valid) {
      throw new ExecutorError("UNSUPPORTED_CAPABILITY", validation.reasons[0]?.message ?? "Unsupported capability");
    }

    const behavior = this.behavior(task);
    if (behavior === "timeout") {
      throw new ExecutorError("MOCK_TIMEOUT", "Deterministic mock timeout.", { task_id: task.task_id });
    }
    if (behavior === "error") {
      throw new ExecutorError("MOCK_ERROR", "Deterministic mock executor error.", { task_id: task.task_id });
    }

    const executionId = `mock:${task.task_id}:1`;
    const state = behavior === "failure" ? "failed" : "succeeded";
    const status: ExecutionStatus = { execution_id: executionId, task_id: task.task_id, state, attempt: 1 };
    const result: ExecutionResult = behavior === "failure"
      ? {
          execution_id: executionId,
          task_id: task.task_id,
          state: "failed",
          error: { code: "MOCK_FAILURE", message: "Deterministic mock failure." }
        }
      : {
          execution_id: executionId,
          task_id: task.task_id,
          state: "succeeded",
          output: { ok: true, echo: task.input }
        };

    this.executions.set(executionId, { task, status, result });
    return { ...status };
  }

  async status(executionId: string): Promise<ExecutionStatus> {
    return { ...this.requireExecution(executionId).status };
  }

  async result(executionId: string): Promise<ExecutionResult> {
    const result = this.requireExecution(executionId).result;
    if (!result) throw new ExecutorError("RESULT_NOT_READY", "Execution result is not ready.");
    return structuredClone(result);
  }

  async cancel(executionId: string): Promise<ExecutionStatus> {
    const execution = this.requireExecution(executionId);
    if (["succeeded", "failed", "cancelled"].includes(execution.status.state)) {
      throw new ExecutorError("EXECUTION_TERMINAL", "A terminal execution cannot be cancelled.");
    }
    execution.status = { ...execution.status, state: "cancelled" };
    execution.result = {
      execution_id: executionId,
      task_id: execution.task.task_id,
      state: "cancelled"
    };
    return { ...execution.status };
  }

  async retry(executionId: string): Promise<ExecutionStatus> {
    const previous = this.requireExecution(executionId);
    if (previous.status.state !== "failed") {
      throw new ExecutorError("RETRY_NOT_ALLOWED", "Only failed executions can be retried.");
    }

    const attempt = previous.status.attempt + 1;
    const retryId = `mock:${previous.task.task_id}:${attempt}`;
    const status: ExecutionStatus = {
      execution_id: retryId,
      task_id: previous.task.task_id,
      state: "succeeded",
      attempt
    };
    this.executions.set(retryId, {
      task: previous.task,
      status,
      result: {
        execution_id: retryId,
        task_id: previous.task.task_id,
        state: "succeeded",
        output: { ok: true, retried_from: executionId, echo: previous.task.input }
      }
    });
    return { ...status };
  }

  private behavior(task: Task): MockBehavior {
    const value = task.input.mock_behavior;
    return value === "failure" || value === "timeout" || value === "error" ? value : "success";
  }

  private requireExecution(executionId: string): StoredExecution {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new ExecutorError("UNKNOWN_EXECUTION", `Unknown execution '${executionId}'.`);
    }
    return execution;
  }
}
