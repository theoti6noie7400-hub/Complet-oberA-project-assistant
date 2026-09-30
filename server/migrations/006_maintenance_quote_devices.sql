-- Keep legacy request rows intact. A maintenance quotation may cover zero or more
-- devices, each constrained to the same client organization as its request.
ALTER TABLE portal_requests DROP CONSTRAINT portal_requests_request_type_check;
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_request_type_check
  CHECK (request_type IN ('general', 'sav', 'consumables', 'maintenance_quote'));
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_id_org_type_unique
  UNIQUE (id, organization_id, request_type);

CREATE TABLE portal_request_devices (
  request_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  request_type text NOT NULL DEFAULT 'maintenance_quote'
    CHECK (request_type = 'maintenance_quote'),
  device_id uuid NOT NULL,
  PRIMARY KEY (request_id, device_id),
  CONSTRAINT portal_request_devices_request_fk FOREIGN KEY (request_id, organization_id, request_type)
    REFERENCES portal_requests (id, organization_id, request_type),
  CONSTRAINT portal_request_devices_device_fk FOREIGN KEY (device_id, organization_id)
    REFERENCES devices (id, client_organization_id)
);
CREATE INDEX portal_request_devices_device_idx ON portal_request_devices (device_id);
