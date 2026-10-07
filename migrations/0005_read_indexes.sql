CREATE INDEX idx_messages_time ON messages(occurred_at, id);
CREATE INDEX idx_messages_peer_time ON messages(peer_number, occurred_at, id);
