CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  score INTEGER NOT NULL,
  seed INTEGER,
  simt REAL,
  cards INTEGER,
  created INTEGER NOT NULL,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores (created);
CREATE INDEX IF NOT EXISTS idx_scores_ip ON scores (ip, created);
