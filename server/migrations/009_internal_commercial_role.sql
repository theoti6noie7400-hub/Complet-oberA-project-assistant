-- Add a read-only internal role for viewing client parks and previewing the client diagnostic.
-- Preserve existing sales and historical data; no user or session is changed here.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'global_admin', 'sav_manager', 'sav_technician', 'commercial', 'sales',
  'adv', 'logistics', 'marketing', 'client', 'reseller'
));
