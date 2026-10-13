ALTER TABLE system_numbers ADD COLUMN bot_reply TEXT NOT NULL DEFAULT 'response' CHECK (bot_reply IN ('response','api'));
