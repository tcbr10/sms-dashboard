CREATE TABLE links (code TEXT PRIMARY KEY, send_id TEXT NOT NULL, system_number TEXT NOT NULL, peer_number TEXT NOT NULL, url TEXT NOT NULL, created_at INTEGER NOT NULL, clicks INTEGER NOT NULL DEFAULT 0, auto_clicks INTEGER NOT NULL DEFAULT 0, first_click_at INTEGER, last_click_at INTEGER) WITHOUT ROWID;
ALTER TABLE messages ADD COLUMN clicks INTEGER;
ALTER TABLE messages ADD COLUMN auto_clicks INTEGER;
ALTER TABLE messages ADD COLUMN clicked_at INTEGER;
ALTER TABLE scheduled_sends ADD COLUMN track_links INTEGER NOT NULL DEFAULT 0 CHECK (track_links IN (0,1));
