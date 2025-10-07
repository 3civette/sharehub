# Feature 003: Event Flow Management - Migration Guide

## Migration File
`003-complete-migration.sql` - Single comprehensive migration file

## What This Migration Does

### 1. Creates 7 Tables
- **events** - Core event entity with public/private visibility
- **sessions** - Time blocks or thematic groupings within events
- **speeches** - Individual presentations within sessions
- **slides** - Uploaded presentation files (PDF, PPT, PPTX, Keynote, ODP)
- **access_tokens** - Token-based authentication (21-char nanoid)
- **event_metrics** - Analytics with basic (free) and premium metrics
- **activity_logs** - Audit trail with configurable retention

### 2. Row-Level Security (RLS)
- Tenant isolation on all tables via `app.current_tenant_id` setting
- Public read access for token validation
- Separate INSERT/UPDATE/DELETE policies for fine-grained control

### 3. Database Functions
- `cleanup_expired_activity_logs()` - Remove logs past retention period
- `update_event_status()` - Auto-transition events (upcoming → past → archived)
- `generate_event_hierarchy_json(uuid)` - Efficient nested JSON retrieval
- `validate_token_access(text, uuid)` - Token validation with usage tracking
- `get_event_metrics_summary(uuid, boolean)` - Tiered metrics access
- `test_rls_isolation(uuid)` - Verify RLS policies work correctly

### 4. Performance Indexes (25 total)
- Fast token validation (critical path)
- Slug lookup for public event pages
- Ordered retrieval (sessions → speeches → slides)
- Retention cleanup optimization
- Foreign key indexes

### 5. Triggers
- Auto-update `updated_at` timestamp on events, sessions, speeches, event_metrics

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `003-complete-migration.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify success message appears

### Option 2: Supabase CLI
```bash
supabase db push
```

## Verification

After applying the migration, run this query to verify RLS isolation:
```sql
-- Replace with your actual tenant ID
SELECT * FROM test_rls_isolation('your-tenant-id-here');
```

Expected output: All tables should show `can_read = true`

## Cron Jobs (Optional but Recommended)

Set up these periodic tasks:

### Daily: Update Event Status
```sql
SELECT * FROM update_event_status();
```
This transitions events from `upcoming` to `past`, applies retention policies.

### Weekly: Cleanup Activity Logs
```sql
SELECT * FROM cleanup_expired_activity_logs();
```
This removes logs that exceed their configured retention period.

## Rollback

To rollback this migration:
```sql
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS event_metrics CASCADE;
DROP TABLE IF EXISTS slides CASCADE;
DROP TABLE IF EXISTS speeches CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS access_tokens CASCADE;
DROP TABLE IF EXISTS events CASCADE;

DROP FUNCTION IF EXISTS cleanup_expired_activity_logs();
DROP FUNCTION IF EXISTS update_event_status();
DROP FUNCTION IF EXISTS generate_event_hierarchy_json(UUID);
DROP FUNCTION IF EXISTS validate_token_access(TEXT, UUID);
DROP FUNCTION IF EXISTS get_event_metrics_summary(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS test_rls_isolation(UUID);
DROP FUNCTION IF EXISTS trigger_set_updated_at();
```

## Notes

- **Safe to re-run**: The migration includes DROP statements, so it's idempotent
- **Preserves data**: If you need to preserve existing data, remove the DROP statements
- **Dependencies**: Requires `tenants` and `admins` tables from Feature 002
- **Storage**: Remember to create Supabase Storage bucket named `slides` with appropriate policies

## What's Next

After successful migration:
1. Run contract tests: `npm test tests/contract/events.test.ts`
2. Verify all endpoints work correctly
3. Begin frontend implementation (Phase 3.8-3.13)
