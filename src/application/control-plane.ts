import type { Auditor } from "../audit/audit";
import { TaskStateMachine, type TaskState } from "../domain/state-machine";
import { validateTask, type Task } from "../domain/task";
import type { Executor, ExecutionResult } from "../executors/executor";
import { evaluatePolicy, type PolicyDecision } from "../policy/policy";
import { verifyExecution, type VerificationOutcome } from "../verification/verification";
import * as z from "zod/v4";

export interface ControlPlaneOutcome {
  task_id: string;
  state: TaskState;
  policy?: PolicyDecision;
  execution_id?: string;
  result?: ExecutionResult;
  verification?: VerificationOutcome;
}

export class ControlPlane {
  constructor(private readonly auditor: Auditor) {}

  async execute(candidate: unknown, executor: Executor, expectedOutputSchema?: z.ZodType): Promise<ControlPlaneOutcome> {
    const taskId = this.taskId(candidate);
    const machine = new TaskStateMachine();
    await this.auditor.emit({ event: "task.created", task_id: taskId });

    const validation = validateTask(candidate);
    if (!validation.valid) {
      await this.auditor.emit({ event: "execution.failed", task_id: taskId, outcome: "task_validation_failed", details: validation.issues });
      return { task_id: taskId, state: "failed" };
    }
    const task: Task = validation.task;
    machine.transition("validated");
    await this.auditor.emit({ event: "task.validated", task_id: task.task_id, outcome: "accepted" });

    const executorValidation = await executor.validate(task);
    const policy = evaluatePolicy(task, executor.name, executor.capabilities());
    await this.auditor.emit({
      event: "task.authorization.checked",
      task_id: task.task_id,
      executor: executor.name,
      outcome: policy.allowed && executorValidation.valid ? "allowed" : "denied"
    });

    if (!policy.allowed || !executorValidation.valid) {
      await this.auditor.emit({
        event: "policy.denied",
        task_id: task.task_id,
        executor: executor.name,
        outcome: "denied",
        details: [...policy.reasons, ...executorValidation.reasons]
      });
      return { task_id: task.task_id, state: "failed", policy };
    }

    machine.transition("authorized");
    machine.transition("queued");

    try {
      machine.transition("running");
      const submitted = await executor.submit(task);
      await this.auditor.emit({ event: "execution.submitted", task_id: task.task_id, execution_id: submitted.execution_id, executor: executor.name });

      const status = await executor.status(submitted.execution_id);
      const result = await executor.result(submitted.execution_id);
      const verification = verifyExecution(task.task_id, submitted.execution_id, status, result, expectedOutputSchema);

      if (!verification.accepted) {
        machine.transition("failed");
        await this.auditor.emit({ event: "verification.rejected", task_id: task.task_id, execution_id: submitted.execution_id, details: verification.reasons });
        return { task_id: task.task_id, state: machine.state, policy, execution_id: submitted.execution_id, result, verification };
      }

      await this.auditor.emit({ event: "verification.completed", task_id: task.task_id, execution_id: submitted.execution_id, outcome: result.state });
      machine.transition(result.state);
      await this.auditor.emit({
        event: result.state === "succeeded" ? "execution.completed" : "execution.failed",
        task_id: task.task_id,
        execution_id: submitted.execution_id,
        executor: executor.name,
        outcome: result.state
      });
      return { task_id: task.task_id, state: machine.state, policy, execution_id: submitted.execution_id, result, verification };
    } catch (error) {
      if (machine.state === "queued" || machine.state === "running") machine.transition(machine.state === "queued" ? "cancelled" : "failed");
      await this.auditor.emit({ event: "execution.failed", task_id: task.task_id, executor: executor.name, outcome: "executor_error", details: error });
      return { task_id: task.task_id, state: machine.state, policy };
    }
  }

  private taskId(candidate: unknown): string {
    if (candidate && typeof candidate === "object" && "task_id" in candidate && typeof candidate.task_id === "string") {
      return candidate.task_id;
    }
    return "unknown-task";
  }
}
