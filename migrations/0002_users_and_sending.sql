CREATE TABLE users (
 email TEXT PRIMARY KEY CHECK (email = lower(trim(email)) AND instr(email,'@') > 1),
 name TEXT NOT NULL DEFAULT '',
 role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
 active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
 can_bulk_send INTEGER NOT NULL DEFAULT 0 CHECK (can_bulk_send IN (0,1)),
 daily_limit INTEGER CHECK (daily_limit IS NULL OR daily_limit >= 0),
 density TEXT CHECK (density IS NULL OR density IN ('wide','narrow','dense')),
 created_at INTEGER NOT NULL,
 last_seen_at INTEGER
);
INSERT INTO users (email, created_at) SELECT DISTINCT email, CAST(strftime('%s','now') AS INTEGER) * 1000 FROM user_numbers;
ALTER TABLE user_numbers ADD COLUMN can_send INTEGER NOT NULL DEFAULT 0 CHECK (can_send IN (0,1));
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE opt_outs (number TEXT PRIMARY KEY, source TEXT NOT NULL CHECK (source IN ('keyword','manual')), created_at INTEGER NOT NULL, created_by TEXT);
CREATE TABLE sends (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 system_number TEXT NOT NULL REFERENCES system_numbers(number),
 body TEXT NOT NULL,
 recipients INTEGER NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('sending','accepted','rejected','unknown')),
 task_id TEXT,
 error TEXT,
 created_at INTEGER NOT NULL,
 finished_at INTEGER
);
CREATE INDEX idx_sends_email_time ON sends(email, created_at);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT NOT NULL, action TEXT NOT NULL, target TEXT, details TEXT);
ALTER TABLE messages ADD COLUMN sent_by TEXT;
ALTER TABLE messages ADD COLUMN send_id TEXT;
