CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  score INTEGER NOT NULL,
  seed INTEGER,
  simt REAL,
  cards INTEGER,
  created INTEGER NOT NULL,
  ip TEXT,
  ver INTEGER,         -- sim.js VERSION: hamleler yalnızca aynı sürümde tekrar oynatılır
  steps INTEGER,       -- oyunun toplam adım sayısı
  actions TEXT,        -- JSON hamle listesi [{s,c,x,y}]
  cause TEXT,          -- JSON ölüm sebebi {k,types,why}
  after INTEGER        -- aynı oturumda önceki oyunun bitişinden bu yana saniye (ilk oyunda NULL)
);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores (created);
CREATE INDEX IF NOT EXISTS idx_scores_ip ON scores (ip, created);
