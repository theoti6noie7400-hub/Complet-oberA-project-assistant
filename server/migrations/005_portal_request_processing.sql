-- Keep portal links consistent even if an API caller supplies arbitrary UUIDs.
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_public_status_check
  CHECK (public_status IN ('received', 'in_progress', 'closed'));
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_sav_link_type_check
  CHECK (linked_sav_case_id IS NULL OR (kind = 'client' AND request_type = 'sav' AND device_id IS NOT NULL));
ALTER TABLE sav_cases ADD CONSTRAINT sav_cases_id_organization_unique UNIQUE (id, client_organization_id);
ALTER TABLE sav_cases ADD CONSTRAINT sav_cases_id_device_unique UNIQUE (id, device_id);
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_link_organization_fk
  FOREIGN KEY (linked_sav_case_id, organization_id)
  REFERENCES sav_cases (id, client_organization_id) ON DELETE SET NULL (linked_sav_case_id);
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_link_device_fk
  FOREIGN KEY (linked_sav_case_id, device_id)
  REFERENCES sav_cases (id, device_id) ON DELETE SET NULL (linked_sav_case_id);
CREATE INDEX portal_requests_queue_idx ON portal_requests (created_at DESC, id DESC);
