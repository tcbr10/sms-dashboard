ALTER TABLE users ADD COLUMN can_edit_contacts INTEGER NOT NULL DEFAULT 1 CHECK (can_edit_contacts IN (0,1));
