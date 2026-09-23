import { Daytona } from "@daytona/sdk";
import { redact } from "../audit/audit";
import type { Task } from "../domain/task";
import {
  ExecutorError,
  type ExecutionResult,
  type ExecutionStatus,
  type Executor,
  type ExecutorCapabilities,
  type ExecutorValidation
} from "./executor";

export interface DaytonaCommandResponse {
  commandId?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  output?: string;
}

export interface DaytonaCommandLogs {
  stdout?: string;
  stderr?: string;
  output?: string;
}

export interface DaytonaSandboxHandle {
  id: string;
  state?: string;
  createSession(sessionId: string): Promise<void>;
  execute(sessionId: string, command: string, timeoutSeconds: number): Promise<DaytonaCommandResponse>;
  logs(sessionId: string, commandId: string): Promise<DaytonaCommandLogs>;
  stop(): Promise<void>;
  delete(): Promise<void>;
  verifyDeleted(): Promise<boolean>;
}

export interface DaytonaProvider {
  create(options: {
    name: string;
    labels: Record<string, string>;
    networkBlockAll: boolean;
    ttlMinutes: number;
  }): Promise<DaytonaSandboxHandle>;
}

export class DaytonaSdkProvider implements DaytonaProvider {
  private readonly client: Daytona;

  constructor(apiKey = process.env.DAYTONA_API_KEY) {
    if (!apiKey) {
      throw new ExecutorError("MISSING_CREDENTIALS", "DAYTONA_API_KEY is required.");
    }
    this.client = new Daytona({ apiKey, useDeprecatedPolling: true, requestTimeoutMs: 120_000 });
  }

  async create(options: {
    name: string;
    labels: Record<string, string>;
    networkBlockAll: boolean;
    ttlMinutes: number;
  }): Promise<DaytonaSandboxHandle> {
    const sandbox = await this.client.create({
      name: options.name,
      language: "typescript",
      labels: options.labels,
      networkBlockAll: options.networkBlockAll,
      autoStopInterval: 5,
      ttlMinutes: options.ttlMinutes
    }, { timeout: 120 });

    return {
      id: sandbox.id,
      state: sandbox.state,
      createSession: (sessionId) => sandbox.process.createSession(sessionId),
      execute: async (sessionId, command, timeoutSeconds) => {
        const response = await sandbox.process.executeSessionCommand(sessionId, {
          command,
          runAsync: false
        }, timeoutSeconds);
        return {
          commandId: response.cmdId,
          exitCode: response.exitCode,
          stdout: response.stdout,
          stderr: response.stderr,
          output: response.output
        };
      },
      logs: (sessionId, commandId) => sandbox.process.getSessionCommandLogs(sessionId, commandId),
      stop: () => sandbox.stop(60),
      delete: () => sandbox.delete(60, true),
      verifyDeleted: async () => {
        try { await this.client.get(sandbox.id); return false; } catch { return true; }
      }
    };
  }
}

interface StoredExecution {
  status: ExecutionStatus;
  result: ExecutionResult;
}

const CAPABILITIES: Readonly<ExecutorCapabilities> = Object.freeze({
  submit: true,
  status: true,
  result: true,
  cancel: false,
  retry: false,
  code_mode: true,
  read: true,
  mock_execution: false
});

export class DaytonaExecutor implements Executor {
  readonly name = "daytona";
  private readonly executions = new Map<string, StoredExecution>();

  constructor(
    private readonly provider: DaytonaProvider,
    private readonly timeoutSeconds = 30
  ) {}

  static fromEnvironment(timeoutSeconds = 30): DaytonaExecutor {
    return new DaytonaExecutor(new DaytonaSdkProvider(), timeoutSeconds);
  }

  capabilities(): ExecutorCapabilities {
    return { ...CAPABILITIES };
  }

  async validate(task: Task): Promise<ExecutorValidation> {
    const reasons: ExecutorValidation["reasons"] = [];
    if (task.type !== "execution") {
      reasons.push({ code: "UNSUPPORTED_TASK_TYPE", message: "Daytona accepts only canonical execution tasks." });
    }
    if (task.risk_level !== "low") {
      reasons.push({ code: "RISK_NOT_ALLOWED", message: "Only low-risk Daytona tasks are enabled." });
    }
    if (typeof task.input.command !== "string" || task.input.command.trim() === "") {
      reasons.push({ code: "INVALID_COMMAND", message: "A non-empty input.command string is required." });
    }
    const unsupported = task.requested_capabilities.filter((capability) => {
      const capabilities = CAPABILITIES as unknown as Record<string, boolean>;
      return capabilities[capability] !== true;
    });
    for (const capability of unsupported) {
      reasons.push({ code: "UNSUPPORTED_CAPABILITY", message: `Daytona capability '${capability}' is not verified.` });
    }
    return { valid: reasons.length === 0, reasons };
  }

  async submit(task: Task): Promise<ExecutionStatus> {
    const validation = await this.validate(task);
    if (!validation.valid) {
      throw new ExecutorError("VALIDATION_FAILED", validation.reasons[0]?.message ?? "Task validation failed.");
    }

    let sandbox: DaytonaSandboxHandle;
    try {
      sandbox = await this.provider.create({
        name: `bridge-${task.task_id}`,
        labels: { bridge: "genspark-execution-bridge", task_id: task.task_id },
        networkBlockAll: true,
        ttlMinutes: 10
      });
    } catch (error) {
      throw this.providerError("DAYTONA_SANDBOX_CREATION_FAILED", "Daytona sandbox creation failed.", error);
    }

    const sessionId = `bridge-${task.task_id}`;
    let commandId = "unavailable";
    let cleanup = { stopped: false, deleted: false, postDeleteVerified: false };
    let result: ExecutionResult;

    try {
      await sandbox.createSession(sessionId);
      const response = await sandbox.execute(sessionId, task.input.command as string, this.timeoutSeconds);
      if (typeof response.exitCode !== "number" || typeof (response.stdout ?? response.output) !== "string") {
        throw new ExecutorError("DAYTONA_RESULT_MISSING", "Daytona returned no verifiable status/result.");
      }
      commandId = response.commandId ?? "unavailable";
      if (commandId === "unavailable") {
        throw new ExecutorError("DAYTONA_IDENTITY_MISSING", "Daytona returned no command identity.");
      }
      const logs = await sandbox.logs(sessionId, commandId);
      const executionId = `daytona:${sandbox.id}:${commandId}`;
      result = response.exitCode === 0
        ? {
            execution_id: executionId,
            task_id: task.task_id,
            state: "succeeded",
            output: {
              provider: this.name,
              sandbox_id: sandbox.id,
              command_id: commandId,
              session_id: sessionId,
              exit_code: response.exitCode,
              stdout: response.stdout ?? response.output,
              stderr: response.stderr ?? "",
              logs: {
                stdout: logs.stdout ?? logs.output ?? "",
                stderr: logs.stderr ?? ""
              }
            }
          }
        : {
            execution_id: executionId,
            task_id: task.task_id,
            state: "failed",
            error: {
              code: "DAYTONA_EXECUTION_FAILED",
              message: this.safeMessage(response.stderr ?? response.output ?? `Daytona command exited with ${response.exitCode}.`)
            }
          };
    } catch (error) {
      const executionId = `daytona:${sandbox.id}:${commandId}`;
      const mapped = error instanceof ExecutorError
        ? error
        : this.providerError("DAYTONA_EXECUTION_FAILED", "Daytona execution failed.", error);
      result = {
        execution_id: executionId,
        task_id: task.task_id,
        state: "failed",
        error: { code: mapped.code, message: this.safeMessage(mapped.message) }
      };
    } finally {
      try {
        await sandbox.stop();
        cleanup.stopped = true;
      } catch {
        cleanup.stopped = false;
      }
      try {
        await sandbox.delete();
        cleanup.deleted = true;
        cleanup.postDeleteVerified = await sandbox.verifyDeleted();
      } catch {
        cleanup.deleted = false;
      }
    }

    if (!cleanup.stopped || !cleanup.deleted || !cleanup.postDeleteVerified) {
      result = {
        execution_id: result.execution_id,
        task_id: task.task_id,
        state: "failed",
        error: { code: "DAYTONA_CLEANUP_FAILED", message: "Daytona sandbox cleanup could not be verified." }
      };
    } else if (result.state === "succeeded" && result.output && typeof result.output === "object") {
      result.output = { ...(result.output as Record<string, unknown>), cleanup };
    }

    const status: ExecutionStatus = {
      execution_id: result.execution_id,
      task_id: task.task_id,
      state: result.state,
      attempt: 1
    };
    this.executions.set(status.execution_id, { status, result });
    return structuredClone(status);
  }

  async status(executionId: string): Promise<ExecutionStatus> {
    return structuredClone(this.requireExecution(executionId).status);
  }

  async result(executionId: string): Promise<ExecutionResult> {
    return structuredClone(this.requireExecution(executionId).result);
  }

  cancel(_executionId: string): Promise<ExecutionStatus> {
    return Promise.reject(new ExecutorError(
      "UNSUPPORTED_CAPABILITY",
      "Daytona cancellation is disabled because the verified adapter executes synchronously."
    ));
  }

  retry(_executionId: string): Promise<ExecutionStatus> {
    return Promise.reject(new ExecutorError(
      "UNSUPPORTED_CAPABILITY",
      "Daytona retry semantics have not been verified."
    ));
  }

  private requireExecution(executionId: string): StoredExecution {
    const execution = this.executions.get(executionId);
    if (!execution) throw new ExecutorError("UNKNOWN_EXECUTION", `Unknown execution '${executionId}'.`);
    return execution;
  }

  private providerError(code: string, fallback: string, error: unknown): ExecutorError {
    const providerMessage = error instanceof Error ? error.message : String(error);
    return new ExecutorError(code, `${fallback} ${this.safeMessage(providerMessage)}`.trim());
  }

  private safeMessage(message: string): string {
    return String(redact(message));
  }
}
