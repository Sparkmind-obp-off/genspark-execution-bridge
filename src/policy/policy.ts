import type { Task } from "../domain/task";
import type { ExecutorCapabilities } from "../executors/executor";

export type PolicyDenialCode =
  | "EXTERNAL_WRITE_DENIED"
  | "PRODUCTION_DEPLOYMENT_DENIED"
  | "SECRET_IN_INPUT"
  | "HIGH_RISK_DENIED"
  | "UNKNOWN_EXECUTOR_CAPABILITY"
  | "PRIVATE_GENSPARK_ENDPOINT_DENIED"
  | "TASK_TYPE_DENIED";

export interface PolicyReason {
  code: PolicyDenialCode;
  message: string;
  path?: string;
}

export type PolicyDecision =
  | { allowed: true; reasons: [] }
  | { allowed: false; reasons: PolicyReason[] };

const sensitiveKey = /(?:api[-_]?key|access[-_]?token|refresh[-_]?token|password|passwd|cookie|authorization|secret|credential)/i;
const credentialUrl = /^https?:\/\/[^\s/@:]+:[^\s/@]+@/i;
const gensparkEndpoint = /^https?:\/\/(?:[^/]+\.)?genspark\.ai\//i;

function inspectInput(value: unknown, path = "input", seen = new WeakSet<object>()): PolicyReason[] {
  const reasons: PolicyReason[] = [];
  if (typeof value === "string") {
    if (/\bBearer\s+\S+/i.test(value) || credentialUrl.test(value)) {
      reasons.push({ code: "SECRET_IN_INPUT", message: "Credential-like value is not allowed in task input.", path });
    }
    if (gensparkEndpoint.test(value)) {
      reasons.push({
        code: "PRIVATE_GENSPARK_ENDPOINT_DENIED",
        message: "Genspark web/private endpoints are not accepted as execution interfaces.",
        path
      });
    }
    return reasons;
  }
  if (value === null || typeof value !== "object" || seen.has(value)) return reasons;
  seen.add(value);

  for (const [key, entry] of Object.entries(value)) {
    const entryPath = `${path}.${key}`;
    if (sensitiveKey.test(key) && entry !== "" && entry !== null && entry !== undefined) {
      reasons.push({ code: "SECRET_IN_INPUT", message: "Secrets are not allowed in task input.", path: entryPath });
      continue;
    }
    reasons.push(...inspectInput(entry, entryPath, seen));
  }
  return reasons;
}

export function evaluatePolicy(
  task: Task,
  executorName: string,
  capabilities: ExecutorCapabilities
): PolicyDecision {
  const reasons = inspectInput(task.input);

  if (task.type === "external_write") {
    reasons.push({ code: "EXTERNAL_WRITE_DENIED", message: "Arbitrary external writes are denied in Phase 1." });
  }
  if (task.type === "production_deployment") {
    reasons.push({ code: "PRODUCTION_DEPLOYMENT_DENIED", message: "Production execution is outside Phase 1 acceptance." });
  }
  if (task.risk_level === "high" || task.risk_level === "critical") {
    reasons.push({ code: "HIGH_RISK_DENIED", message: `Risk level '${task.risk_level}' is denied by the Phase 1 policy.` });
  }
  if (!(["read", "mock_execution"] as string[]).includes(task.type)) {
    reasons.push({ code: "TASK_TYPE_DENIED", message: `Task type '${task.type}' is not allowed by default.` });
  }

  const capabilityMap = capabilities as unknown as Record<string, boolean>;
  for (const requested of task.requested_capabilities) {
    if (capabilityMap[requested] !== true) {
      reasons.push({
        code: "UNKNOWN_EXECUTOR_CAPABILITY",
        message: `Executor '${executorName}' has not proven capability '${requested}'.`,
        path: "requested_capabilities"
      });
    }
  }

  return reasons.length === 0 ? { allowed: true, reasons: [] } : { allowed: false, reasons };
}
