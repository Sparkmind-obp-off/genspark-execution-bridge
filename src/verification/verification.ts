import * as z from "zod/v4";
import type { ExecutionResult, ExecutionStatus } from "../executors/executor";

export type VerificationReasonCode =
  | "INVALID_RESULT_SCHEMA"
  | "EXECUTION_ID_MISMATCH"
  | "TASK_ID_MISMATCH"
  | "NON_TERMINAL_STATUS"
  | "TERMINAL_STATE_MISMATCH"
  | "EXPECTED_RESULT_SHAPE_MISMATCH";

export interface VerificationReason {
  code: VerificationReasonCode;
  message: string;
}

export type VerificationOutcome =
  | { accepted: true; reasons: [] }
  | { accepted: false; reasons: VerificationReason[] };

const executionResultSchema = z.object({
  execution_id: z.string().min(1),
  task_id: z.string().min(1),
  state: z.enum(["succeeded", "failed", "cancelled"]),
  output: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional()
}).strict();

export function verifyExecution(
  expectedTaskId: string,
  expectedExecutionId: string,
  status: ExecutionStatus,
  candidateResult: unknown,
  expectedOutputSchema?: z.ZodType
): VerificationOutcome {
  const reasons: VerificationReason[] = [];
  const parsed = executionResultSchema.safeParse(candidateResult);
  if (!parsed.success) {
    return {
      accepted: false,
      reasons: [{ code: "INVALID_RESULT_SCHEMA", message: "Executor result does not match the canonical result schema." }]
    };
  }

  const result: ExecutionResult = parsed.data;
  if (status.execution_id !== expectedExecutionId || result.execution_id !== expectedExecutionId) {
    reasons.push({ code: "EXECUTION_ID_MISMATCH", message: "Status/result execution identity does not match the submitted execution." });
  }
  if (status.task_id !== expectedTaskId || result.task_id !== expectedTaskId) {
    reasons.push({ code: "TASK_ID_MISMATCH", message: "Status/result task identity does not match the submitted task." });
  }
  if (!["succeeded", "failed", "cancelled"].includes(status.state)) {
    reasons.push({ code: "NON_TERMINAL_STATUS", message: "Verification requires a terminal execution status." });
  }
  if (status.state !== result.state) {
    reasons.push({ code: "TERMINAL_STATE_MISMATCH", message: "Executor status and result disagree on terminal state." });
  }
  if (result.state === "succeeded" && expectedOutputSchema && !expectedOutputSchema.safeParse(result.output).success) {
    reasons.push({ code: "EXPECTED_RESULT_SHAPE_MISMATCH", message: "Successful output does not match the independently expected shape." });
  }

  return reasons.length === 0 ? { accepted: true, reasons: [] } : { accepted: false, reasons };
}
