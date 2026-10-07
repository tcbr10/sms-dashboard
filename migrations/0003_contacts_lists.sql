CREATE TABLE contacts (number TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)), updated_at INTEGER NOT NULL, updated_by TEXT);
ALTER TABLE users ADD COLUMN columns TEXT;
ALTER TABLE users ADD COLUMN test_number TEXT;
ALTER TABLE users ADD COLUMN sessions_revoked_at INTEGER;
ALTER TABLE sends ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1));
CREATE TABLE lists (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, name TEXT NOT NULL, shared INTEGER NOT NULL DEFAULT 0 CHECK (shared IN (0,1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX idx_lists_owner ON lists(owner);
CREATE TABLE list_members (list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE, number TEXT NOT NULL, PRIMARY KEY (list_id, number));
