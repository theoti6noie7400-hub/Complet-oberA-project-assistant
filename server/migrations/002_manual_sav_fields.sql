-- Preserve the entered SAV business reference; never use the device serial as its substitute.
ALTER TABLE sav_cases RENAME COLUMN entered_reference TO sav_reference;
ALTER TABLE sav_cases ALTER COLUMN display_reference DROP NOT NULL;
ALTER TABLE sav_cases ALTER COLUMN client_organization_id DROP NOT NULL;
ALTER TABLE sav_cases ADD COLUMN serial_number text NOT NULL DEFAULT '';
ALTER TABLE sav_cases ADD COLUMN client_name text NOT NULL DEFAULT '';
ALTER TABLE sav_cases ADD COLUMN client_number text NOT NULL DEFAULT '';
ALTER TABLE sav_cases ADD COLUMN submission_key uuid;
ALTER TABLE sav_cases ADD COLUMN request_hash text;
CREATE UNIQUE INDEX sav_cases_submission_key_idx ON sav_cases (created_by, submission_key);
