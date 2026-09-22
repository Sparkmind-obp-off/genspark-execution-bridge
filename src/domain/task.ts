import * as z from "zod/v4";

export const taskTypeSchema = z.enum([
  "read",
  "mock_execution",
  "genspark_execution",
  "external_write",
  "production_deployment"
]);

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const taskSchema = z.object({
  task_id: z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  type: taskTypeSchema,
  input: z.record(z.string(), z.unknown()),
  requested_capabilities: z.array(z.string().min(1).max(100)).max(50),
  risk_level: riskLevelSchema,
  created_at: z.iso.datetime({ offset: true }),
  metadata: z.record(z.string(), z.unknown())
}).strict();

export type Task = z.infer<typeof taskSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export type TaskValidation =
  | { valid: true; task: Task }
  | { valid: false; issues: Array<{ path: string; message: string }> };

export function validateTask(candidate: unknown): TaskValidation {
  const parsed = taskSchema.safeParse(candidate);
  if (parsed.success) return { valid: true, task: parsed.data };

  return {
    valid: false,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  };
}
