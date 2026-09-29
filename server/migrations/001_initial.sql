-- Empty schema only. No prototype SAV data or real customer records are imported.
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('client', 'reseller')),
  name text NOT NULL,
  external_reference text UNIQUE
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  identity_issuer text NOT NULL,
  identity_subject text NOT NULL,
  role text NOT NULL CHECK (role IN (
    'global_admin', 'sav_manager', 'sav_technician', 'commercial', 'adv',
    'logistics', 'marketing', 'client', 'reseller'
  )),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (identity_issuer, identity_subject)
);

CREATE TABLE user_organizations (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  PRIMARY KEY (user_id, organization_id)
);
CREATE INDEX user_organizations_org_idx ON user_organizations (organization_id);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE devices (
  id uuid PRIMARY KEY,
  client_organization_id uuid NOT NULL REFERENCES organizations(id),
  model text NOT NULL,
  serial text NOT NULL,
  wavesoft_reference text,
  UNIQUE (client_organization_id, serial)
);
CREATE INDEX devices_client_idx ON devices (client_organization_id);

CREATE TABLE sav_cases (
  id uuid PRIMARY KEY,
  display_reference text NOT NULL UNIQUE,
  client_organization_id uuid NOT NULL REFERENCES organizations(id),
  device_id uuid REFERENCES devices(id),
  entered_reference text NOT NULL,
  model text NOT NULL,
  site text NOT NULL,
  problem text NOT NULL,
  cause text NOT NULL,
  sav_action text NOT NULL,
  sav_type text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'waiting_client', 'waiting_parts', 'closed'
  )),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sav_cases_client_idx ON sav_cases (client_organization_id, created_at DESC);

CREATE TABLE contracts (
  id uuid PRIMARY KEY,
  client_organization_id uuid NOT NULL REFERENCES organizations(id),
  reference text NOT NULL UNIQUE,
  site_address text NOT NULL,
  site_city text NOT NULL,
  site_country text NOT NULL,
  frequency_months smallint NOT NULL CHECK (frequency_months IN (6, 12)),
  start_date date NOT NULL,
  end_date date NOT NULL,
  last_visit_date date,
  last_visit_technician text,
  next_planned_visit_date date,
  notes text NOT NULL DEFAULT ''
);
CREATE INDEX contracts_client_idx ON contracts (client_organization_id);

CREATE TABLE contract_devices (
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  model text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (contract_id, model)
);

CREATE TABLE portal_requests (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('client', 'reseller')),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  created_by uuid NOT NULL REFERENCES users(id),
  subject text NOT NULL,
  message text NOT NULL,
  public_status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_requests_org_idx ON portal_requests (kind, organization_id, created_at DESC);

CREATE TABLE documents (
  id uuid PRIMARY KEY,
  storage_key text NOT NULL UNIQUE,
  title text NOT NULL,
  audience text NOT NULL DEFAULT 'internal' CHECK (audience IN ('internal', 'client', 'reseller')),
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (audience = 'internal' OR organization_id IS NOT NULL)
);

CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_kind text NOT NULL,
  resource_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
