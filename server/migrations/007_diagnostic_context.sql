-- Older requests remain readable. This snapshot is optional and cannot be
-- attached to a maintenance, consumables or historical reseller request.
ALTER TABLE portal_requests ADD COLUMN diagnostic_context jsonb;
ALTER TABLE portal_requests ADD CONSTRAINT portal_requests_diagnostic_context_type_check
  CHECK (diagnostic_context IS NULL OR
    (kind = 'client' AND request_type = 'sav' AND device_id IS NOT NULL
      AND jsonb_typeof(diagnostic_context) = 'object'));
