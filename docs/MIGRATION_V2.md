# Migration Guide: V1 (Backend) → V2 (Serverless)

**Target**: Existing ShareHub installations running with dedicated backend (Fly.io)
**Goal**: Migrate to serverless architecture (Next.js API Routes + Cloudflare R2)
**Estimated Time**: 30-45 minutes

## Overview

This guide walks you through migrating from ShareHub V1 (dedicated Express.js backend) to V2 (serverless with R2 storage):

**What Changes:**
- Slide uploads: Backend proxy → Direct R2 uploads with presigned URLs
- Slide downloads: Backend proxy → Direct R2 downloads with presigned URLs
- Storage: Supabase Storage (100MB limit) → Cloudflare R2 (1GB files)
- Backend: Fly.io dedicated server → Next.js API Routes (serverless)
- Cleanup: Backend cron job → Netlify Scheduled Function (every 6 hours)
- Infrastructure cost: $15-25/month → ~$0.15/month

**What Stays:**
- ✅ All existing slides remain accessible (backward compatible)
- ✅ Event management, sessions, branding (still uses old backend for now)
- ✅ Database schema (migrations add columns, don't break existing data)
- ✅ Frontend UI (no changes to user experience)

## Prerequisites

Before you begin:

1. ✅ Cloudflare account with R2 enabled
2. ✅ Netlify account (free tier is sufficient)
3. ✅ Access to your Supabase project
4. ✅ Git repository access
5. ✅ Node.js 20+ installed locally

## Phase 1: Setup Cloudflare R2 (15 min)

### Step 1.1: Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage** in the sidebar
3. Click **Create Bucket**
4. Name your bucket: `sharehub-slides` (or any name you prefer)
5. Choose a location: **Automatic** (Cloudflare will optimize)
6. Click **Create Bucket**

### Step 1.2: Configure CORS Policy

1. Open your newly created bucket
2. Go to **Settings** tab
3. Scroll to **CORS Policy** section
4. Click **Add CORS Policy**
5. Paste this configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://your-app.netlify.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**IMPORTANT**: Replace `https://your-app.netlify.app` with your actual Netlify domain.

6. Click **Save**

### Step 1.3: Create R2 API Token

1. In Cloudflare Dashboard, go to **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Select **Account** token type (not "user")
4. Permissions:
   - ✅ **Object Read & Write**
   - ✅ **Object Delete** (required for cleanup function)
5. Click **Create API Token**
6. **IMPORTANT**: Copy these values immediately (you won't see them again):
   - Access Key ID (32 characters)
   - Secret Access Key (64 characters)

### Step 1.4: Get Your Account ID

1. While still in Cloudflare Dashboard, look at the URL
2. It should be: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2/...`
3. Copy the 32-character Account ID from the URL
4. Or find it in: **R2** → **Overview** → **Account ID**

## Phase 2: Update Supabase Database (5 min)

### Step 2.1: Apply Database Migration

Run the migration to add R2 support to your slides table:

```sql
-- Migration 009: R2 Storage Support
-- This adds columns for R2 keys and soft deletes

-- Add R2 key column
ALTER TABLE slides ADD COLUMN IF NOT EXISTS r2_key TEXT;

-- Add soft delete column
ALTER TABLE slides ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Make storage_path nullable (for backward compatibility)
ALTER TABLE slides ALTER COLUMN storage_path DROP NOT NULL;

-- Update file size constraint (100MB → 1GB)
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_file_size_check;
ALTER TABLE slides ADD CONSTRAINT slides_file_size_check
  CHECK (file_size > 0 AND file_size <= 1073741824);

-- Add constraint: must have either storage_path OR r2_key
ALTER TABLE slides ADD CONSTRAINT slides_storage_location_check
  CHECK ((storage_path IS NOT NULL) OR (r2_key IS NOT NULL));

-- Add index for cleanup queries (finds expired slides faster)
CREATE INDEX IF NOT EXISTS idx_slides_cleanup
  ON slides(uploaded_at, deleted_at)
  WHERE deleted_at IS NULL;

-- Create view for active slides with metadata
CREATE OR REPLACE VIEW slides_with_metadata AS
SELECT
  s.*,
  e.name as event_name,
  sp.title as speech_title,
  t.name as tenant_name,
  CASE
    WHEN s.r2_key IS NOT NULL THEN 'r2'
    ELSE 'supabase'
  END as storage_type,
  CASE
    WHEN s.deleted_at IS NOT NULL THEN true
    ELSE false
  END as is_deleted
FROM slides s
LEFT JOIN speeches sp ON s.speech_id = sp.id
LEFT JOIN sessions sess ON sp.session_id = sess.id
LEFT JOIN events e ON sess.event_id = e.id
LEFT JOIN tenants t ON e.tenant_id = t.id
WHERE s.deleted_at IS NULL;

-- Create function to get expired slides (for cleanup job)
CREATE OR REPLACE FUNCTION get_expired_slides(retention_hours INTEGER DEFAULT 48)
RETURNS TABLE (
  id UUID,
  r2_key TEXT,
  filename TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.r2_key,
    s.filename,
    s.file_size,
    s.uploaded_at,
    e.tenant_id
  FROM slides s
  LEFT JOIN speeches sp ON s.speech_id = sp.id
  LEFT JOIN sessions sess ON sp.session_id = sess.id
  LEFT JOIN events e ON sess.event_id = e.id
  WHERE s.uploaded_at < NOW() - (retention_hours || ' hours')::INTERVAL
    AND s.deleted_at IS NULL
    AND s.r2_key IS NOT NULL
  ORDER BY s.uploaded_at ASC;
END;
$$ LANGUAGE plpgsql;
```

**How to apply:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** in the sidebar
4. Paste the migration SQL above
5. Click **Run**
6. Verify: Check that `slides` table now has `r2_key` and `deleted_at` columns

### Step 2.2: Get Service Role Key

You'll need the service role key for the cleanup scheduled function:

1. In Supabase Dashboard, go to **Settings** → **API**
2. Scroll to **Project API keys**
3. Find **service_role** key (starts with `eyJ...`)
4. Click **Reveal** and copy it
5. **WARNING**: This key bypasses RLS. Keep it secret!

## Phase 3: Deploy Updated Frontend (10 min)

### Step 3.1: Update Environment Variables

1. Pull the latest code from your repository
2. Copy `frontend/.env.local.example` to `frontend/.env.local`
3. Fill in the values:

```bash
# =============================================================================
# Supabase Configuration
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key

# Service role key for cleanup function (KEEP SECRET!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-role-key

# =============================================================================
# Cloudflare R2 Configuration
# =============================================================================
R2_ACCOUNT_ID=your-32-char-account-id
R2_ACCESS_KEY_ID=your-32-char-access-key-id
R2_SECRET_ACCESS_KEY=your-64-char-secret-key
R2_BUCKET_NAME=sharehub-slides

# =============================================================================
# Legacy Backend (keep for now - other features still use it)
# =============================================================================
NEXT_PUBLIC_API_URL=https://your-backend.fly.dev
```

4. Install new dependencies:

```bash
cd frontend
npm install @aws-sdk/client-s3@^3.908.0
npm install @aws-sdk/s3-request-presigner@^3.908.0
```

### Step 3.2: Test Locally

Before deploying, test the R2 configuration:

```bash
# Test R2 connection
cd frontend
node test-r2-config.js
```

Expected output:
```
✅ Successfully connected to R2!
   Objects in bucket: 0
🎉 R2 configuration is valid!
```

### Step 3.3: Configure Netlify Environment Variables

1. Log in to [Netlify](https://app.netlify.com)
2. Select your site (or create a new site if first deploy)
3. Go to **Site settings** → **Environment variables**
4. Add these variables (click **Add a variable** for each):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | ⚠️ SECRET - Do NOT mark as public |
| `R2_ACCOUNT_ID` | `your-account-id` | ⚠️ SECRET |
| `R2_ACCESS_KEY_ID` | `your-access-key` | ⚠️ SECRET |
| `R2_SECRET_ACCESS_KEY` | `your-secret-key` | ⚠️ SECRET |
| `R2_BUCKET_NAME` | `sharehub-slides` | ⚠️ SECRET |
| `NEXT_PUBLIC_API_URL` | `https://your-backend.fly.dev` | Public (keep for now) |

**CRITICAL**: Make sure R2 and service role key variables are **NOT** marked as public!

5. Click **Save**

### Step 3.4: Configure Netlify Scheduled Function

The cleanup job runs every 6 hours automatically:

1. In Netlify Dashboard, go to **Site configuration** → **Functions**
2. Verify scheduled function appears: `cleanup-slides` (runs every 6 hours)
3. Check cron expression in `netlify.toml` (should be: `0 */6 * * *`)
4. No additional configuration needed - Netlify automatically detects the schedule

### Step 3.5: Deploy to Netlify

```bash
# Deploy via git push (recommended)
git add .
git commit -m "feat: migrate to serverless architecture with R2 storage"
git push origin main

# Netlify will automatically deploy on push
```

Or deploy manually:

```bash
cd frontend
npm run build
netlify deploy --prod
```

### Step 3.6: Verify Deployment

1. Wait for deployment to complete (~2-3 minutes)
2. Open your Netlify site URL
3. Test the following:

**✅ Upload Test:**
- Log in as admin
- Go to an event → Add slides
- Upload a file (test with a large file ~500MB to verify 1GB limit)
- Should see "Uploading..." then "Upload successful"

**✅ Download Test:**
- Open the public event page
- Click download on the slide you just uploaded
- File should download successfully

**✅ Cleanup Test (optional):**
- Trigger manually: `POST https://your-app.netlify.app/api/cleanup`
- Or wait 6 hours for automatic run
- Check logs in Netlify Functions dashboard

## Phase 4: Monitor & Validate (5 min)

### Step 4.1: Check R2 Storage

1. Go to Cloudflare Dashboard → R2 → Your bucket
2. You should see uploaded files in this structure:
   ```
   tenant-{uuid}/
     event-{uuid}/
       slide-{uuid}.pdf
       slide-{uuid}.pptx
   ```

### Step 4.2: Monitor Scheduled Function

1. In Netlify Dashboard, go to **Functions**
2. Find `cleanup-slides` function
3. Check **Recent invocations** tab
4. Should run every 6 hours
5. Check logs for successful cleanup:
   ```
   ✅ Successfully deleted 0 slides (no expired slides found)
   ```

### Step 4.3: Verify Metrics

Check that everything is working:

- ✅ Slide uploads complete in <30 seconds (direct to R2, no proxy)
- ✅ Large files (500MB+) upload successfully
- ✅ Download links work and are fast (CDN-powered)
- ✅ Old slides (on Supabase Storage) still work
- ✅ New slides (on R2) work
- ✅ Upload URL generation <500ms
- ✅ Download URL generation <500ms

## Phase 5: Deprecate Backend (Optional - 5 min)

Once you've verified slides work perfectly, you can optionally shut down the backend:

**⚠️ WARNING**: Other features (events, sessions, branding) still use the backend! Only deprecate if:
- You're only using slide functionality
- OR you've migrated all features to Next.js API routes

### If You're Ready to Deprecate:

1. In Fly.io Dashboard, pause the backend:
   ```bash
   fly scale count 0 -a sharehub-backend
   ```

2. Monitor for 24 hours - if no errors, you can delete it:
   ```bash
   fly apps destroy sharehub-backend
   ```

3. Update `NEXT_PUBLIC_API_URL` in Netlify:
   - Remove or comment out (only needed for non-slide features)

### If Keeping Backend Running:

Leave it as-is! The migration is complete and both systems coexist:
- **Slides**: Use new R2 serverless architecture
- **Events/Sessions/Branding**: Continue using backend

## Troubleshooting

### Upload fails with "CORS error"

**Cause**: R2 bucket CORS policy not configured correctly

**Fix**:
1. Go to Cloudflare → R2 → Your bucket → Settings
2. Update CORS policy with your actual Netlify domain
3. Make sure `AllowedMethods` includes `PUT`
4. Redeploy frontend

### Download fails with "File not found"

**Cause**: Slide has `r2_key` but file doesn't exist in R2

**Fix**:
1. Check R2 bucket in Cloudflare Dashboard
2. Verify the file exists at the path in `r2_key` column
3. If missing, re-upload the slide

### Cleanup function not running

**Cause**: Netlify Scheduled Function not configured

**Fix**:
1. Verify `netlify.toml` has correct schedule configuration
2. Check Netlify Functions dashboard for errors
3. Manually trigger: `POST https://your-app.netlify.app/api/cleanup`
4. Check logs for error details

### "R2_ACCOUNT_ID environment variable is required"

**Cause**: R2 environment variables not set in Netlify

**Fix**:
1. Netlify Dashboard → Site settings → Environment variables
2. Add all R2 variables (account ID, keys, bucket name)
3. Make sure they're **NOT** marked as public
4. Redeploy

### Old slides don't work after migration

**Cause**: Migration broke backward compatibility

**Fix**:
1. Verify `storage_path` column is still populated for old slides
2. Check that `slides_storage_location_check` constraint allows `storage_path`
3. Old slides should continue using Supabase Storage
4. New slides use R2 (have `r2_key` instead)

### Upload progress stuck at 0%

**Cause**: Presigned URL expired or network error

**Fix**:
1. URLs expire after 1 hour - refresh and try again
2. Check browser console for CORS or network errors
3. Verify R2 credentials are valid
4. Test connection: `node test-r2-config.js`

## Cost Comparison

### Before (Backend on Fly.io)

| Item | Cost/Month |
|------|-----------|
| Fly.io VM (1GB RAM, 1 CPU) | $10-20 |
| Fly.io Storage (5GB volume) | $5 |
| Bandwidth (file downloads) | Variable |
| **Total** | **~$15-25** |

### After (Serverless)

| Item | Cost/Month |
|------|-----------|
| Netlify (free tier) | $0 |
| R2 Storage (10GB @ $0.015/GB) | $0.15 |
| R2 Operations (Class A/B) | ~$0.01 |
| R2 Bandwidth (egress) | $0 (free!) |
| **Total** | **~$0.16** |

**Savings**: ~$15-25/month → ~$0.15/month (**99% cost reduction**)

## Performance Improvements

| Metric | Before (Backend) | After (R2) |
|--------|-----------------|-----------|
| Max file size | 100MB | 1GB |
| Upload speed | Limited by backend proxy | Direct to CDN |
| Download speed | Proxied through backend | CDN edge caching |
| URL generation | N/A | <500ms |
| Global latency | Single region (AMS) | Multi-region CDN |
| Infrastructure | Dedicated server | Serverless (auto-scale) |

## Next Steps

1. ✅ Monitor R2 usage in Cloudflare Dashboard
2. ✅ Set up alerts for cleanup function failures (Netlify)
3. ✅ Consider migrating other features (events, sessions) to serverless
4. ✅ Optionally deprecate backend completely once all features migrated
5. ✅ Celebrate your 99% cost reduction! 🎉

## Support

If you encounter issues:

1. Check logs in Netlify Functions dashboard
2. Test R2 connection: `node test-r2-config.js`
3. Verify database migration applied correctly
4. Check GitHub issues: [shareHub/issues](https://github.com/your-org/sharehub/issues)
5. Review `backend-deprecated/README.md` for architecture comparison

## Rollback Plan

If you need to rollback to the old backend:

1. Keep the backend running (don't destroy Fly.io app)
2. Revert frontend code to previous commit
3. Old slides continue working (on Supabase Storage)
4. New slides on R2 remain accessible (URLs work via Next.js API routes)

The migration is designed to be **zero-downtime** and **backward compatible**.

---

**Migration Complete!** 🎉

You've successfully migrated to serverless architecture with:
- ✅ 99% cost reduction
- ✅ 10x larger file support (1GB)
- ✅ CDN-powered downloads
- ✅ Automatic 48-hour cleanup
- ✅ Zero backend infrastructure management

Enjoy your new serverless ShareHub!
