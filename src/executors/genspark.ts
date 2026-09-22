import type { Task } from "../domain/task";
import {
  ExecutorError,
  type ExecutionResult,
  type ExecutionStatus,
  type Executor,
  type ExecutorCapabilities,
  type ExecutorValidation
} from "./executor";

const DISABLED_CAPABILITIES: Readonly<ExecutorCapabilities> = Object.freeze({
  submit: false,
  status: false,
  result: false,
  cancel: false,
  retry: false,
  code_mode: false,
  read: false,
  mock_execution: false
});

export class GensparkExecutor implements Executor {
  readonly name = "genspark";

  capabilities(): ExecutorCapabilities {
    return { ...DISABLED_CAPABILITIES };
  }

  async validate(_task: Task): Promise<ExecutorValidation> {
    return {
      valid: false,
      reasons: [{
        code: "UNSUPPORTED_CAPABILITY",
        message: "No official public Genspark remote execution interface has been verified."
      }]
    };
  }

  submit(_task: Task): Promise<ExecutionStatus> {
    return this.unsupported("submit");
  }

  status(_executionId: string): Promise<ExecutionStatus> {
    return this.unsupported("status");
  }

  result(_executionId: string): Promise<ExecutionResult> {
    return this.unsupported("result");
  }

  cancel(_executionId: string): Promise<ExecutionStatus> {
    return this.unsupported("cancel");
  }

  retry(_executionId: string): Promise<ExecutionStatus> {
    return this.unsupported("retry");
  }

  private unsupported<T>(capability: keyof ExecutorCapabilities): Promise<T> {
    return Promise.reject(new ExecutorError(
      "UNSUPPORTED_CAPABILITY",
      `Genspark capability '${capability}' is disabled because no official interface has been verified.`,
      { executor: this.name, capability }
    ));
  }
}
