ALTER TABLE user_numbers ADD COLUMN view_from INTEGER;
ALTER TABLE user_numbers ADD COLUMN view_rules TEXT CHECK (view_rules IS NULL OR json_valid(view_rules));
CREATE INDEX idx_bot_answers_peer ON bot_answers(system_number, peer_number);
