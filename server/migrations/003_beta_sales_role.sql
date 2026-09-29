-- Keep existing prototype service users while applying the beta's explicit sales role.
ALTER TABLE users DROP CONSTRAINT users_role_check;
UPDATE users SET role = 'sales' WHERE role = 'commercial';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'global_admin', 'sav_manager', 'sav_technician', 'sales', 'adv',
  'logistics', 'marketing', 'client', 'reseller'
));
-- Sessions issued by the no-PIN prototype endpoint must not survive beta activation.
DELETE FROM sessions;
