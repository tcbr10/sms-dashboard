PRAGMA foreign_keys = ON;
CREATE TABLE system_numbers (number TEXT PRIMARY KEY, label TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)));
CREATE TABLE user_numbers (email TEXT NOT NULL CHECK (email = lower(trim(email))), system_number TEXT NOT NULL REFERENCES system_numbers(number), PRIMARY KEY (email, system_number));
CREATE TABLE messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_key TEXT NOT NULL UNIQUE,
 direction TEXT NOT NULL CHECK (direction IN ('in','out')),
 system_number TEXT NOT NULL REFERENCES system_numbers(number),
 peer_number TEXT NOT NULL, body TEXT NOT NULL,
 occurred_at INTEGER NOT NULL, received_at INTEGER NOT NULL,
 time_source TEXT NOT NULL CHECK (time_source IN ('provider','receipt','workflow')),
 submission_status TEXT CHECK (submission_status IS NULL OR submission_status IN ('pending','accepted','rejected','unknown')),
 provider_message_id TEXT, updated_at INTEGER NOT NULL,
 CHECK ((direction = 'in' AND submission_status IS NULL) OR (direction = 'out' AND submission_status IS NOT NULL))
);
CREATE INDEX idx_messages_number_time ON messages(system_number, occurred_at DESC, id DESC);
CREATE INDEX idx_messages_conversation_time ON messages(system_number, peer_number, occurred_at DESC, id DESC);
CREATE INDEX idx_messages_updates ON messages(updated_at, id);
