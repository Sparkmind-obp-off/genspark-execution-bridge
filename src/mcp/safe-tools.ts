import * as z from "zod/v4";
import type { Auditor } from "../audit/audit";

const resourceId = z.string().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const getProjectInputSchema = z.object({ project_id: resourceId }).strict();
export const getProjectOutputSchema = z.object({
  project_id: z.string(),
  name: z.string(),
  status: z.literal("ok"),
  proof: z.literal(true)
}).strict();

export const getTaskInputSchema = z.object({ task_id: resourceId }).strict();
export const getTaskOutputSchema = z.object({
  task_id: z.string(),
  type: z.literal("read"),
  state: z.literal("succeeded"),
  requested_capabilities: z.array(z.string()),
  risk_level: z.literal("low"),
  created_at: z.string()
}).strict();

export const getStatusInputSchema = z.object({ execution_id: resourceId }).strict();
export const getStatusOutputSchema = z.object({
  execution_id: z.string(),
  task_id: z.string(),
  state: z.literal("succeeded"),
  attempt: z.literal(1)
}).strict();

export const safeMcpToolSchemas = {
  get_project: { input: getProjectInputSchema, output: getProjectOutputSchema },
  get_task: { input: getTaskInputSchema, output: getTaskOutputSchema },
  get_status: { input: getStatusInputSchema, output: getStatusOutputSchema }
} as const;

export type SafeToolName = keyof typeof safeMcpToolSchemas;

export const proofProject = Object.freeze({
  project_id: "proof-project",
  name: "Genspark Execution Bridge Proof",
  status: "ok" as const,
  proof: true as const
});

export const proofTask = Object.freeze({
  task_id: "proof-task",
  type: "read" as const,
  state: "succeeded" as const,
  requested_capabilities: ["read"],
  risk_level: "low" as const,
  created_at: "2026-01-01T00:00:00.000Z"
});

export const proofStatus = Object.freeze({
  execution_id: "proof-execution",
  task_id: "proof-task",
  state: "succeeded" as const,
  attempt: 1 as const
});

export type SafeToolResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: { code: "INVALID_INPUT" | "UNKNOWN_RESOURCE"; message: string } };

export async function invokeSafeTool(
  name: SafeToolName,
  input: unknown,
  auditor: Auditor
): Promise<SafeToolResult> {
  await auditor.emit({ event: "mcp.tool.invoked", tool: name, resource: resourceFromInput(input) });
  const schema = safeMcpToolSchemas[name].input;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const result = { ok: false as const, error: { code: "INVALID_INPUT" as const, message: "Input does not match the tool schema." } };
    await auditor.emit({ event: "mcp.tool.result_returned", tool: name, outcome: result.error.code });
    return result;
  }

  let value: Record<string, unknown> | undefined;
  if (name === "get_project" && "project_id" in parsed.data && parsed.data.project_id === proofProject.project_id) value = proofProject;
  if (name === "get_task" && "task_id" in parsed.data && parsed.data.task_id === proofTask.task_id) value = proofTask;
  if (name === "get_status" && "execution_id" in parsed.data && parsed.data.execution_id === proofStatus.execution_id) value = proofStatus;

  if (!value) {
    const result = { ok: false as const, error: { code: "UNKNOWN_RESOURCE" as const, message: "The requested resource does not exist." } };
    await auditor.emit({ event: "mcp.tool.result_returned", tool: name, outcome: result.error.code });
    return result;
  }

  await auditor.emit({ event: "mcp.tool.result_returned", tool: name, outcome: "success" });
  return { ok: true, value: structuredClone(value) };
}

function resourceFromInput(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  for (const key of ["project_id", "task_id", "execution_id"]) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}
