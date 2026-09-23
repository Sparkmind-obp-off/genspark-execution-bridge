-- An idempotency reservation is never removed automatically: a crash must not resubmit.
CREATE TABLE IF NOT EXISTS gateway_idempotency (
  key TEXT PRIMARY KEY, actor_id TEXT NOT NULL, operation TEXT NOT NULL,
  fingerprint TEXT NOT NULL, task_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gateway_tasks (
  task_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, request_id TEXT NOT NULL,
  state TEXT NOT NULL, policy_version TEXT NOT NULL, policy_reason TEXT NOT NULL,
  command_digest TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gateway_executions (
  task_id TEXT PRIMARY KEY REFERENCES gateway_tasks(task_id),
  execution_id TEXT, state TEXT NOT NULL, verification TEXT NOT NULL,
  result_code TEXT, provider_id TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gateway_audit (
  event_id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, request_id TEXT NOT NULL,
  actor_id TEXT NOT NULL, task_id TEXT, execution_id TEXT,
  event TEXT NOT NULL, outcome TEXT, details TEXT
);
CREATE INDEX IF NOT EXISTS idx_gateway_audit_task ON gateway_audit(task_id, timestamp);
