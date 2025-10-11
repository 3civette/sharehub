# Backend Deprecated - Feature 008 Migration

**Status**: DEPRECATED (October 2025)
**Reason**: Migrated to serverless architecture with Next.js API Routes + Cloudflare R2

## What Happened?

As part of **Feature 008: Serverless Architecture Migration**, we moved from a dedicated Express.js backend (deployed on Fly.io) to a serverless architecture using:

- **Next.js 14 API Routes** (`frontend/src/app/api/`) - Replaces Express.js endpoints
- **Cloudflare R2** - Direct client-to-storage uploads/downloads with presigned URLs
- **Netlify Scheduled Functions** - Replaces backend cron jobs for 48-hour cleanup

## Migration Details

### Before (Deprecated Backend)
```
User → Frontend → Backend (Fly.io) → Supabase Storage → Files
                    ↓
                  Supabase DB
```

**Architecture Issues:**
- Backend proxies all file uploads/downloads (bandwidth costs)
- Dedicated server running 24/7 (unnecessary for low traffic)
- Files limited to 100MB due to proxy memory constraints
- Fly.io monthly costs (~$10-20/month)

### After (Serverless Architecture)
```
User → Frontend → Next.js API Routes → Presigned URLs → Cloudflare R2
                         ↓
                    Supabase DB (metadata only)
```

**Benefits:**
- Zero backend infrastructure costs (Fly.io removed)
- Direct client-to-R2 uploads (no proxy, no bandwidth costs)
- Support for files up to 1GB
- Automatic 48-hour retention with scheduled cleanup
- CDN-powered downloads (global edge caching)

## What Was Migrated?

### API Routes Migrated to Next.js
| Old Backend Endpoint | New Next.js Route |
|---------------------|-------------------|
| `POST /api/admin/slides/upload` | `POST /api/slides/presigned-upload` |
| `GET /api/public/slides/:id/download` | `GET /api/slides/[id]/download` |
| `GET /api/admin/slides/:id` | `GET /api/slides/[id]` |
| Backend cron job | `POST /api/cleanup` (Netlify Scheduled Function) |

### Components Updated
- `frontend/src/components/admin/SlideUpload.tsx` - Direct R2 uploads with presigned URLs
- `frontend/src/components/public/SlideDownload.tsx` - Direct R2 downloads with presigned URLs
- `frontend/src/services/eventClient.ts` - Deprecated `getSlideDownloadUrl()`

### Database Changes (Migration 009)
```sql
-- Added columns to slides table
ALTER TABLE slides ADD COLUMN r2_key TEXT;
ALTER TABLE slides ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE slides ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE slides ADD CONSTRAINT slides_storage_location_check
  CHECK ((storage_path IS NOT NULL) OR (r2_key IS NOT NULL));
```

**Note**: Existing slides on Supabase Storage remain unchanged (backward compatible).

## What's Still in the Backend?

**NOT migrated** (still using old backend):
- Event management APIs (`/api/admin/events/*`)
- Session management APIs (`/api/admin/sessions/*`)
- Branding APIs (`/api/admin/branding/*`)
- Public event listing (`/api/public/events/*`)
- Dashboard metrics (`/api/admin/dashboard/*`)

These will be migrated in future features. The backend remains operational for non-slide functionality.

## Archived Files

This directory contains the deprecated backend codebase:

```
backend-deprecated/
├── src/              # Express.js backend source code
├── tests/            # Backend integration tests
├── dist/             # Compiled TypeScript output
├── package.json      # Backend dependencies
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## Reference Documentation

For the new serverless architecture:
- **Feature Spec**: `specs/008-voglio-implementare-la/spec.md`
- **Architecture Design**: `specs/008-voglio-implementare-la/architecture.md`
- **API Contracts**: `specs/008-voglio-implementare-la/contracts/`
- **R2 Setup Guide**: `docs/R2_SETUP.md`
- **Migration Guide**: `docs/MIGRATION_V2.md`

## Cost Savings

**Before (Fly.io Backend):**
- Compute: $10-20/month (1GB RAM, 1 CPU)
- Storage: 5GB volume on Fly.io ($1/GB/month = $5/month)
- Bandwidth: Egress costs for file downloads
- **Total**: ~$15-25/month

**After (Serverless):**
- Compute: $0 (Netlify free tier covers API routes)
- Storage: $0.015/GB/month on R2 (10GB = $0.15/month)
- Bandwidth: $0 egress from R2
- **Total**: ~$0.15/month (99% cost reduction)

## Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Max file size | 100MB | 1GB |
| Upload speed | Limited by backend proxy | Direct to CDN |
| Download speed | Proxied through backend | CDN edge caching |
| URL generation | N/A | <500ms (presigned URLs) |
| Global latency | Single region (AMS) | Multi-region CDN |

## Timeline

- **Feature 007**: Backend deployed to Fly.io with R2 archiving
- **Feature 008**: Backend deprecated, migrated to serverless
- **October 11, 2025**: Backend code archived to this directory

## Questions?

See the main project CLAUDE.md for current architecture patterns and guidelines.

**Last Updated**: October 11, 2025
**Migration Complete**: Feature 008 - Serverless Architecture
