-- A flow can be limited to the customers on a distribution list (null: every customer, as before).
ALTER TABLE flows ADD COLUMN audience_list_id INTEGER REFERENCES lists(id);
