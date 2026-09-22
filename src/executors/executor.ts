import type { Task } from "../domain/task";

export interface ExecutorCapabilities {
  submit: boolean;
  status: boolean;
  result: boolean;
  cancel: boolean;
  retry: boolean;
  code_mode: boolean;
  read: boolean;
  mock_execution: boolean;
}

export type ExecutionState = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface ExecutionStatus {
  execution_id: string;
  task_id: string;
  state: ExecutionState;
  attempt: number;
}

export interface ExecutionResult {
  execution_id: string;
  task_id: string;
  state: Extract<ExecutionState, "succeeded" | "failed" | "cancelled">;
  output?: unknown;
  error?: { code: string; message: string };
}

export interface ExecutorValidation {
  valid: boolean;
  reasons: Array<{ code: string; message: string }>;
}

export interface Executor {
  readonly name: string;
  capabilities(): ExecutorCapabilities;
  validate(task: Task): Promise<ExecutorValidation>;
  submit(task: Task): Promise<ExecutionStatus>;
  status(executionId: string): Promise<ExecutionStatus>;
  result(executionId: string): Promise<ExecutionResult>;
  cancel(executionId: string): Promise<ExecutionStatus>;
  retry(executionId: string): Promise<ExecutionStatus>;
}

export class ExecutorError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ExecutorError";
  }
}
