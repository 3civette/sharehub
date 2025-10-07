# Apply Migration 002: Admin Panel Secondary Screens

## Instructions

To apply the database migration for feature 002 (Admin Panel Secondary Screens), follow these steps:

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `agmkgrpxgpzqscbkizdl`
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `backend/migrations/002_admin_screens.sql`
6. Paste into the SQL Editor
7. Click **Run** button
8. Verify success message: "Success. No rows returned"

### Option 2: Run via curl with service_role key

```bash
# Read migration file
migration_sql=$(cat backend/migrations/002_admin_screens.sql)

# Execute via Supabase REST API (requires service_role key)
curl -X POST "https://agmkgrpxgpzqscbkizdl.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$migration_sql\"}"
```

### Verification

After applying the migration, verify the changes:

```sql
-- Check events table has new column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'branding_overrides';

-- Check tenants table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name IN ('branding', 'hotel_name', 'contact_email', 'contact_phone');

-- Check indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'events'
AND indexname IN ('idx_events_date_sort', 'idx_events_created_sort');

-- Check RLS policies exist
SELECT policyname FROM pg_policies
WHERE tablename IN ('events', 'tenants')
AND policyname IN ('admin_can_edit_future_events', 'admin_can_update_tenant_branding');
```

### Expected Results

- ✅ `events.branding_overrides` column added (JSONB, nullable)
- ✅ `tenants.branding` column added (JSONB with default)
- ✅ `tenants.hotel_name` column added (VARCHAR(100), default 'Unnamed Hotel')
- ✅ `tenants.contact_email` column added (VARCHAR(255), nullable)
- ✅ `tenants.contact_phone` column added (VARCHAR(50), nullable)
- ✅ 2 indexes created on events table
- ✅ 2 RLS policies created

### Next Steps

After successful migration, continue with:
- T004-T011: Write contract tests
- T012-T015: Create backend models and services
