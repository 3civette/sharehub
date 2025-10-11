# Cloudflare R2 Storage Setup Guide

**Feature 008**: Serverless architecture with Cloudflare R2 for slide storage

This guide walks through setting up Cloudflare R2 for ShareHub's serverless file storage.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create R2 Bucket](#step-1-create-r2-bucket)
4. [Step 2: Generate API Credentials](#step-2-generate-api-credentials)
5. [Step 3: Configure CORS](#step-3-configure-cors)
6. [Step 4: Set Bucket Policy (Optional)](#step-4-set-bucket-policy-optional)
7. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
8. [Step 6: Test Configuration](#step-6-test-configuration)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**What is R2?**
Cloudflare R2 is an S3-compatible object storage service with zero egress fees and global CDN distribution.

**Why R2 for ShareHub?**
- **Cost**: No egress fees (downloads are free)
- **Performance**: Cloudflare's global CDN
- **Scalability**: Handles files up to 5GB (ShareHub uses 1GB max)
- **Security**: Presigned URLs with time-limited access (1-hour expiry)
- **Simplicity**: No dedicated backend needed

**Storage Architecture:**
```
Client → Next.js API (/api/slides/presigned-upload)
      → Presigned URL (1h expiry)
      → Direct upload to R2 bucket

Client → Next.js API (/api/slides/[id]/download)
      → Presigned URL (1h expiry)
      → Direct download from R2 bucket
```

---

## Prerequisites

- Active Cloudflare account ([Sign up here](https://dash.cloudflare.com/sign-up))
- Billing enabled (R2 has a free tier: 10GB storage + 10M Class B operations/month)
- ShareHub project repository cloned locally

---

## Step 1: Create R2 Bucket

### 1.1 Access R2 Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the left sidebar
3. Click **Create bucket**

### 1.2 Configure Bucket

**Bucket Configuration:**
- **Name**: `sharehub-slides` (or your preferred name)
- **Location**: Auto (Cloudflare automatically selects optimal location)
- **Storage Class**: Standard

Click **Create bucket**.

### 1.3 Verify Creation

Your bucket should now appear in the R2 dashboard with:
- **Objects**: 0 (initially empty)
- **Storage**: 0 B
- **Status**: Active

---

## Step 2: Generate API Credentials

### 2.1 Create API Token

1. In the R2 dashboard, click **Manage R2 API Tokens** (top right)
2. Click **Create API Token**
3. Configure token:
   - **Token Name**: `sharehub-api-token`
   - **Permissions**:
     - ✅ **Object Read & Write** (required for uploads/downloads/deletes)
   - **Bucket restrictions**:
     - Select **Apply to specific buckets only**
     - Choose `sharehub-slides`
   - **TTL**: No expiry (or set based on your security policy)
4. Click **Create API Token**

### 2.2 Save Credentials

⚠️ **CRITICAL**: Copy these credentials immediately - they won't be shown again!

You'll receive:
```
Account ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Access Key ID: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
Secret Access Key: A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6
```

Store these in a secure password manager.

---

## Step 3: Configure CORS

R2 buckets require CORS configuration to allow direct uploads/downloads from the browser.

### 3.1 Access Bucket Settings

1. In R2 dashboard, click on your `sharehub-slides` bucket
2. Go to **Settings** tab
3. Scroll to **CORS Policy** section

### 3.2 Add CORS Rules

Click **Add CORS Policy** and use this configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-sharehub-domain.netlify.app",
      "https://your-custom-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT"
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

**Important**: Replace the `AllowedOrigins` with:
- Your Netlify deployment URL
- Your custom domain (if applicable)
- `http://localhost:3000` for local development

### 3.3 Save CORS Configuration

Click **Save** to apply the CORS policy.

---

## Step 4: Set Bucket Policy (Optional)

By default, R2 buckets are private. ShareHub uses presigned URLs for access control, so no bucket policy is required.

**Optional**: If you want to enable public read access (not recommended for ShareHub):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sharehub-slides/*"
    }
  ]
}
```

**Recommendation**: Keep the bucket private and use presigned URLs (current implementation).

---

## Step 5: Configure Environment Variables

### 5.1 Local Development (.env.local)

Create or update `frontend/.env.local`:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
R2_ACCESS_KEY_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
R2_SECRET_ACCESS_KEY=A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6
R2_BUCKET_NAME=sharehub-slides

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **SECURITY**: Never commit `.env.local` to Git. It's already in `.gitignore`.

### 5.2 Netlify Production

1. Go to Netlify Dashboard → **Site settings → Environment variables**
2. Add each variable:
   - `R2_ACCOUNT_ID`: Your Cloudflare account ID
   - `R2_ACCESS_KEY_ID`: Your R2 access key ID
   - `R2_SECRET_ACCESS_KEY`: Your R2 secret access key (**SECRET**)
   - `R2_BUCKET_NAME`: `sharehub-slides`
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (**SECRET**)

3. Redeploy your site after adding variables

---

## Step 6: Test Configuration

### 6.1 Test Presigned Upload URL

```bash
cd frontend
npm run dev
```

Navigate to an admin page with slide upload functionality and try uploading a file.

**Expected behavior:**
1. Upload button generates presigned URL from `/api/slides/presigned-upload`
2. File uploads directly to R2 (check browser Network tab)
3. Slide metadata saved to Supabase
4. Upload progress displayed

### 6.2 Test Presigned Download URL

Navigate to a public event page with slides and click download.

**Expected behavior:**
1. Download button fetches presigned URL from `/api/slides/[id]/download`
2. File downloads directly from R2
3. Download URL expires after 1 hour

### 6.3 Verify R2 Storage

1. Go to Cloudflare R2 dashboard → `sharehub-slides` bucket
2. Click **Object Browser**
3. You should see uploaded files with structure:
   ```
   tenant-{uuid}/
     event-{uuid}/
       slide-{uuid}.pdf
       slide-{uuid}.pptx
   ```

---

## Monitoring & Maintenance

### Storage Usage

Monitor R2 usage in Cloudflare Dashboard → **R2** → **Metrics**:
- **Storage**: Total bytes stored
- **Class B Operations**: Upload/download requests
- **Egress**: Always $0 with R2 (no egress fees)

**Free Tier Limits:**
- 10 GB storage per month
- 1 million Class A operations (writes/deletes)
- 10 million Class B operations (reads/lists)

### Automated Cleanup

ShareHub runs an automated cleanup job every 6 hours via Netlify Scheduled Functions:
- **Function**: `/api/cleanup`
- **Schedule**: `0 */6 * * *` (cron: every 6 hours)
- **Action**: Deletes slides older than 48 hours

**Monitor cleanup logs:**
```bash
# View Netlify function logs
netlify functions:log cleanup
```

### Cost Estimation

**Typical ShareHub usage:**
- 100 events/month
- 10 slides per event (1 MB avg)
- 1000 total slides = 1 GB storage (**within free tier**)
- 1000 uploads + 5000 downloads = 6000 operations (**within free tier**)

**Cost**: $0/month (within free tier)

---

## Troubleshooting

### Issue: "R2 upload failed with status 403"

**Cause**: CORS policy not configured or incorrect origin

**Solution**:
1. Check CORS configuration in R2 bucket settings
2. Verify `AllowedOrigins` includes your Netlify URL
3. Ensure `AllowedMethods` includes `PUT`

### Issue: "Failed to generate upload URL"

**Cause**: Missing or invalid R2 credentials

**Solution**:
1. Verify environment variables are set correctly
2. Check `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
3. Regenerate API token if credentials are compromised

### Issue: "Download URL expired"

**Cause**: Presigned URL has 1-hour TTL

**Solution**:
- This is expected behavior (security feature)
- Users should request a new download URL from `/api/slides/[id]/download`
- Frontend automatically fetches fresh URLs on each download request

### Issue: "Cleanup function not running"

**Cause**: Netlify Scheduled Functions not configured

**Solution**:
1. Verify `netlify.toml` has scheduled function configuration:
   ```toml
   [[functions]]
     path = "/api/cleanup"
     schedule = "0 */6 * * *"
   ```
2. Check Netlify dashboard → **Functions** → Verify cleanup function is listed
3. View logs in Netlify dashboard → **Functions** → **cleanup** → **Logs**

### Issue: "File not found after upload"

**Cause**: Metadata not saved to Supabase, but file uploaded to R2

**Solution**:
1. Check database migrations are applied (see `backend/migrations/009-r2-storage-migration.sql`)
2. Verify `slides` table has `r2_key` column
3. Check Supabase logs for database errors

---

## Next Steps

1. ✅ R2 bucket configured
2. ✅ API credentials generated
3. ✅ CORS policy set
4. ✅ Environment variables configured
5. → **Test end-to-end upload/download flow**
6. → **Apply database migrations** (see `backend/migrations/README-APPLY-009.md`)
7. → **Deploy to Netlify** (see `DEPLOYMENT.md`)

---

## Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [S3-Compatible API Reference](https://developers.cloudflare.com/r2/api/s3/api/)
- [CORS Configuration Guide](https://developers.cloudflare.com/r2/buckets/cors/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)

---

**Last Updated**: 2025-01-11
**Feature**: 008-voglio-implementare-la (Serverless Architecture with R2 Storage)
