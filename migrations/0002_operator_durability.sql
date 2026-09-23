-- Fixed-purpose synthetic verification records; never stores credentials or arbitrary SQL.
CREATE TABLE IF NOT EXISTS gateway_durability_proof (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL CHECK(actor_id = 'operator'),
  created_at TEXT NOT NULL
);
