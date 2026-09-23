import type { AuditEvent, AuditSink } from "../audit/audit";
import { redact } from "../audit/audit";

export interface TaskRecord {
  task_id: string; actor_id: string; request_id: string; state: string;
  policy_version: string; policy_reason: string; command_digest: string; created_at: string;
}
export interface ExecutionRecord {
  task_id: string; execution_id: string | null; state: string;
  verification: string; result_code: string | null; provider_id: string | null; updated_at: string;
}
export interface Reservation {
  key: string; actor_id: string; operation: string; fingerprint: string; task_id: string; created_at: string;
}
export interface TaskStore {
  createTask(task: TaskRecord): Promise<void>;
  getTask(id: string): Promise<TaskRecord | null>;
  changeState(id: string, from: string, to: string): Promise<void>;
}
export interface ExecutionStore {
  createExecution(execution: ExecutionRecord): Promise<void>;
  getExecution(taskId: string): Promise<ExecutionRecord | null>;
  changeExecution(taskId: string, from: string, update: Partial<ExecutionRecord>): Promise<void>;
}
export interface IdempotencyStore {
  reserve(reservation: Reservation): Promise<"created" | "replayed" | "conflict">;
  getReservedTaskId(key: string): Promise<string | null>;
}
export interface GatewayStore extends TaskStore, ExecutionStore, IdempotencyStore, AuditSink {
  auditForTask(actorId: string, taskId: string): Promise<AuditEvent[]>;
}

export class StorageFailure extends Error {
  constructor() { super("Durable gateway storage unavailable."); this.name = "StorageFailure"; }
}

// D1's UNIQUE key and INSERT OR IGNORE are atomic across concurrent Worker isolates.
// A reservation without a task is UNKNOWN; it is deliberately never resubmitted.
export class D1GatewayStore implements GatewayStore {
  constructor(private readonly db: D1Database) {}
  private async run(statement: D1PreparedStatement): Promise<D1Result> {
    try {
      const result = await statement.run();
      if (!result.success) throw new StorageFailure();
      return result;
    } catch { throw new StorageFailure(); }
  }
  private async first<T>(statement: D1PreparedStatement): Promise<T | null> {
    try { return (await statement.first<T>()) ?? null; } catch { throw new StorageFailure(); }
  }
  async reserve(r: Reservation): Promise<"created" | "replayed" | "conflict"> {
    const result = await this.run(this.db.prepare("INSERT OR IGNORE INTO gateway_idempotency (key,actor_id,operation,fingerprint,task_id,created_at) VALUES (?,?,?,?,?,?)")
      .bind(r.key, r.actor_id, r.operation, r.fingerprint, r.task_id, r.created_at));
    if (result.meta.changes === 1) return "created";
    const existing = await this.first<Reservation>(this.db.prepare("SELECT * FROM gateway_idempotency WHERE key=?").bind(r.key));
    return existing?.actor_id === r.actor_id && existing.operation === r.operation && existing.fingerprint === r.fingerprint ? "replayed" : "conflict";
  }
  async getReservedTaskId(key: string): Promise<string | null> {
    const row = await this.first<{task_id:string}>(this.db.prepare("SELECT task_id FROM gateway_idempotency WHERE key=?").bind(key));
    return row?.task_id ?? null;
  }
  async createTask(t: TaskRecord): Promise<void> {
    await this.run(this.db.prepare("INSERT INTO gateway_tasks VALUES (?,?,?,?,?,?,?,?)")
      .bind(t.task_id,t.actor_id,t.request_id,t.state,t.policy_version,t.policy_reason,t.command_digest,t.created_at));
  }
  getTask(id: string): Promise<TaskRecord | null> {
    return this.first(this.db.prepare("SELECT * FROM gateway_tasks WHERE task_id=?").bind(id));
  }
  async changeState(id: string, from: string, to: string): Promise<void> {
    const result = await this.run(this.db.prepare("UPDATE gateway_tasks SET state=? WHERE task_id=? AND state=?").bind(to,id,from));
    if (result.meta.changes !== 1) throw new StorageFailure();
  }
  async createExecution(e: ExecutionRecord): Promise<void> {
    await this.run(this.db.prepare("INSERT INTO gateway_executions VALUES (?,?,?,?,?,?,?)")
      .bind(e.task_id,e.execution_id,e.state,e.verification,e.result_code,e.provider_id,e.updated_at));
  }
  getExecution(taskId: string): Promise<ExecutionRecord | null> {
    return this.first(this.db.prepare("SELECT * FROM gateway_executions WHERE task_id=?").bind(taskId));
  }
  async changeExecution(taskId: string, from: string, update: Partial<ExecutionRecord>): Promise<void> {
    const now = new Date().toISOString();
    const result = await this.run(this.db.prepare("UPDATE gateway_executions SET state=?,execution_id=?,verification=?,result_code=?,provider_id=?,updated_at=? WHERE task_id=? AND state=?")
      .bind(update.state,update.execution_id ?? null,update.verification,update.result_code ?? null,update.provider_id ?? null,now,taskId,from));
    if (result.meta.changes !== 1) throw new StorageFailure();
  }
  async write(event: AuditEvent): Promise<void> {
    const safe = redact(event) as AuditEvent;
    const extended = safe as AuditEvent & { request_id?: string };
    await this.run(this.db.prepare("INSERT INTO gateway_audit VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),safe.timestamp,extended.request_id ?? "none",safe.actor ?? "none",safe.task_id ?? null,safe.execution_id ?? null,safe.event,safe.outcome ?? null,JSON.stringify(safe.details ?? null)));
  }
  async auditForTask(actorId: string, taskId: string): Promise<AuditEvent[]> {
    try {
      const rows = await this.db.prepare("SELECT timestamp,request_id,actor_id,task_id,execution_id,event,outcome,details FROM gateway_audit WHERE actor_id=? AND task_id=? ORDER BY timestamp,event_id")
        .bind(actorId,taskId).all<{timestamp:string;request_id:string;actor_id:string;task_id:string;execution_id:string|null;event:string;outcome:string|null;details:string}>();
      if (!rows.success) throw new StorageFailure();
      return rows.results.map(row => ({ timestamp:row.timestamp,request_id:row.request_id,actor:row.actor_id,task_id:row.task_id,execution_id:row.execution_id ?? undefined,event:row.event as AuditEvent["event"],outcome:row.outcome ?? undefined,details:JSON.parse(row.details) }));
    } catch { throw new StorageFailure(); }
  }
}
