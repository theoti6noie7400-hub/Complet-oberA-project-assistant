-- External requests remain separate from internal SAV cases. A future internal workflow
-- may attach a request to a case after checking both organizations.
ALTER TABLE organizations ADD CONSTRAINT organizations_id_kind_unique UNIQUE (id, kind);
ALTER TABLE devices ADD CONSTRAINT devices_id_client_unique UNIQUE (id, client_organization_id);
ALTER TABLE portal_requests ADD COLUMN request_type text NOT NULL DEFAULT 'general'
  CHECK (request_type IN ('general', 'sav', 'consumables'));
ALTER TABLE portal_requests ADD COLUMN device_id uuid;
ALTER TABLE portal_requests ADD COLUMN submission_key uuid;
ALTER TABLE portal_requests ADD COLUMN request_hash text;
ALTER TABLE portal_requests ADD COLUMN linked_sav_case_id uuid REFERENCES sav_cases(id) ON DELETE SET NULL;
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_org_kind_fk
  FOREIGN KEY (organization_id, kind) REFERENCES organizations(id, kind);
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_device_org_fk
  FOREIGN KEY (device_id, organization_id) REFERENCES devices(id, client_organization_id);
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_type_check
  CHECK (request_type <> 'sav' OR (kind = 'client' AND device_id IS NOT NULL));
CREATE UNIQUE INDEX portal_requests_submission_idx ON portal_requests(created_by, submission_key);
CREATE INDEX portal_requests_device_idx ON portal_requests(device_id) WHERE device_id IS NOT NULL;

ALTER TABLE documents ADD COLUMN mime_type text NOT NULL DEFAULT 'application/octet-stream';
