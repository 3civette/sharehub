-- Fix RLS policies to allow admin access from frontend
-- This migration adds policies for direct admin access (not via middleware)

-- EVENTS: Allow admins to manage events for their tenant
CREATE POLICY "events_admin_access"
ON events
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
);

-- SESSIONS: Allow admins to manage sessions for their tenant
CREATE POLICY "sessions_admin_access"
ON sessions
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
);

-- SPEECHES: Allow admins to manage speeches for their tenant
CREATE POLICY "speeches_admin_access"
ON speeches
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
);

-- SLIDES: Allow admins to manage slides for their tenant
CREATE POLICY "slides_admin_access"
ON slides
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
);

-- ACTIVITY_LOGS: Allow admins to read activity logs for their tenant
CREATE POLICY "activity_logs_admin_read"
ON activity_logs
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
);

-- EVENT_METRICS: Allow admins to read metrics for their tenant
CREATE POLICY "event_metrics_admin_read"
ON event_metrics
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS admin access policies created successfully';
  RAISE NOTICE 'Admins can now access their tenant data directly from frontend';
END $$;
