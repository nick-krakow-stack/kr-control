-- KR Control D1 Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 0,
  recall_hours INTEGER NOT NULL DEFAULT 24,
  invite_token TEXT,
  invite_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  gps_lat REAL,
  gps_lng REAL,
  spots_count INTEGER DEFAULT 0,
  max_duration_minutes INTEGER DEFAULT 120,
  client_name TEXT,
  contract_type TEXT DEFAULT 'standard',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_locations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, location_id)
);

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  license_plate TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  case_type TEXT NOT NULL DEFAULT 'standard',
  ticket_number TEXT,
  payment_deadline TEXT,
  ordnungsamt_requested_at TEXT,
  letter_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  recall_deadline TEXT,
  recalled_at TEXT,
  reported_by_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS case_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT,
  image_type TEXT DEFAULT 'additional',
  gps_lat REAL,
  gps_lng REAL,
  captured_at TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cases_location_id ON cases(location_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_reported_at ON cases(reported_at);
CREATE INDEX IF NOT EXISTS idx_case_images_case_id ON case_images(case_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token);
