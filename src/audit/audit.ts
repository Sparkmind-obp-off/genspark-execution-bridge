export const auditEventNames = [
  "task.created",
  "task.validated",
  "task.authorization.checked",
  "execution.submitted",
  "execution.completed",
  "execution.failed",
  "verification.completed",
  "verification.rejected",
  "mcp.connection.checked",
  "mcp.tool.discovered",
  "mcp.tool.invoked",
  "mcp.tool.result_returned",
  "policy.denied",
  "auth.checked",
  "task.persisted",
  "idempotency.reserved",
  "idempotency.replayed",
  "idempotency.conflicted",
  "execution.state_changed",
  "provider.requested",
  "provider.responded",
  "audit.persisted"
] as const;

export type AuditEventName = (typeof auditEventNames)[number];

export interface AuditEvent {
  event: AuditEventName;
  timestamp: string;
  request_id?: string;
  task_id?: string;
  execution_id?: string;
  actor?: string;
  executor?: string;
  tool?: string;
  resource?: string;
  outcome?: string;
  details?: unknown;
}

export interface AuditSink {
  write(event: AuditEvent): void | Promise<void>;
}

const sensitiveKey = /(?:api[-_]?key|access[-_]?token|refresh[-_]?token|bearer|password|passwd|cookie|authorization|secret|credential)/i;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const credentialUrlPattern = /\bhttps?:\/\/[^\s/@:]+:[^\s/@]+@[^\s]+/gi;
const sensitiveQueryPattern = /([?&](?:api[-_]?key|token|access[-_]?token|password|authorization|secret)=)[^&#\s]+/gi;
const daytonaTokenPattern = /\bdtn_[A-Za-z0-9]+\b/g;

function redactString(value: string): string {
  return value
    .replace(daytonaTokenPattern, "[REDACTED_DAYTONA_TOKEN]")
    .replace(bearerPattern, "Bearer [REDACTED]")
    .replace(credentialUrlPattern, "[REDACTED_CREDENTIAL_URL]")
    .replace(sensitiveQueryPattern, "$1[REDACTED]");
}

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[REDACTED_CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, seen));

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : redact(entry, seen)
    ])
  );
}

export class InMemoryAuditSink implements AuditSink {
  private readonly stored: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.stored.push(redact(event) as AuditEvent);
  }

  events(): AuditEvent[] {
    return this.stored.map((event) => structuredClone(event));
  }

  clear(): void {
    this.stored.length = 0;
  }
}

export class Auditor {
  constructor(
    private readonly sink: AuditSink,
    private readonly clock: () => Date = () => new Date()
  ) {}

  emit(event: Omit<AuditEvent, "timestamp">): void | Promise<void> {
    return this.sink.write(redact({ ...event, timestamp: this.clock().toISOString() }) as AuditEvent);
  }
}
