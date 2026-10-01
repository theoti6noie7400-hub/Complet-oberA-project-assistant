-- A notice is authorized by the model of an organization-owned device.
-- Files are stored outside the web root; this migration does not publish or
-- import any notice and does not alter historical documents or requests.
CREATE TABLE client_notice_assets (
  sha256 text PRIMARY KEY CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  storage_key text NOT NULL UNIQUE,
  source_name text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  CHECK (storage_key = 'client-notices/' || sha256 || '.pdf')
);

CREATE TABLE client_model_notices (
  model text PRIMARY KEY,
  asset_sha256 text NOT NULL REFERENCES client_notice_assets(sha256)
);
CREATE INDEX client_model_notices_asset_idx ON client_model_notices(asset_sha256);
