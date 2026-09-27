CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  isp TEXT,
  loc_en TEXT,
  loc_zh TEXT
);
CREATE INDEX IF NOT EXISTS visitors_ts ON visitors (ts DESC);
CREATE INDEX IF NOT EXISTS visitors_ip ON visitors (ip);
