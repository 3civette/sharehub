# Tasks: Serverless Architecture con R2 Storage

**Input**: Design documents from `specs/008-voglio-implementare-la/`
**Feature**: Migrate from dedicated backend (Fly.io) to serverless architecture using Next.js API Routes + Cloudflare R2 storage with 48-hour automatic file retention

## Path Conventions
This is a web application with `frontend/` and `backend/` directories. The backend will be **deprecated** after this migration completes. All new code goes in `frontend/src/app/api/` (Next.js API Routes).

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup & Research
- [x] T001 Create Phase 1 design documents: research.md, data-model.md, contracts/
- [x] T002 Research Cloudflare R2 presigned URL generation using @aws-sdk/client-s3
- [x] T003 Research Netlify Scheduled Functions configuration and cron syntax
- [x] T004 Install dependencies: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner in frontend/
- [x] T005 Configure environment variables for R2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (All Parallel)
- [x] T006 [P] Contract test: POST /api/slides/presigned-upload in frontend/tests/contract/presigned-upload.test.ts
- [x] T007 [P] Contract test: GET /api/slides/:id/download in frontend/tests/contract/presigned-download.test.ts
- [x] T008 [P] Contract test: POST /api/cleanup (scheduled) in frontend/tests/contract/cleanup.test.ts
- [x] T009 [P] Contract test: GET /api/slides/:id metadata retrieval in frontend/tests/contract/slide-metadata.test.ts

### Integration Tests (All Parallel)
- [x] T010 [P] Integration test: 48-hour retention enforcement in frontend/tests/integration/retention.test.ts
- [x] T011 [P] Integration test: Direct R2 upload flow (presigned URL → upload → metadata) in frontend/tests/integration/upload-flow.test.ts
- [x] T012 [P] Integration test: Download flow with RLS validation in frontend/tests/integration/download-flow.test.ts

## Phase 3.3: Database Migration (ONLY after tests are failing)
- [x] T013 Create database migration: Add r2_key column to slides table in supabase/migrations/
- [x] T014 Create database migration: Add uploaded_at index for cleanup queries in supabase/migrations/
- [x] T015 Create database migration: Add deleted_at column (soft delete) to slides table in supabase/migrations/
- [x] T016 Apply migrations to Supabase (via npx supabase db push or SQL Editor)

## Phase 3.4: Core Implementation - R2 Client & Types
- [x] T017 [P] Create R2 client wrapper in frontend/src/lib/r2.ts (S3Client initialization, presigned URL generation)
- [x] T018 [P] Update Slide type definition to include r2_key field in frontend/src/types/slide.ts
- [x] T019 [P] Create R2 utility functions: generateUploadKey, validateFileType, generatePresignedUploadUrl in frontend/src/lib/r2.ts

## Phase 3.5: Core Implementation - API Routes (Sequential due to shared patterns)
- [x] T020 Implement POST /api/slides/presigned-upload in frontend/src/app/api/slides/presigned-upload/route.ts
- [x] T021 Implement GET /api/slides/[id]/download in frontend/src/app/api/slides/[id]/download/route.ts
- [x] T022 Implement GET /api/slides/[id] metadata endpoint in frontend/src/app/api/slides/[id]/route.ts
- [x] T023 Implement POST /api/cleanup scheduled function in frontend/src/app/api/cleanup/route.ts

## Phase 3.6: Frontend Component Updates
- [x] T024 Update SlideUpload component: Replace backend upload with direct R2 upload using presigned URLs in frontend/src/components/admin/SlideUpload.tsx
- [x] T025 Update file validation: Client-side checks for 1GB max size and allowed MIME types in frontend/src/components/admin/SlideUpload.tsx
- [x] T026 Add upload progress tracking: Monitor direct R2 upload progress in frontend/src/components/admin/SlideUpload.tsx
- [x] T027 Update download links: Use presigned download URLs instead of backend proxy in frontend/src/components/public/SlideDownload.tsx

## Phase 3.7: Deployment Configuration
- [x] T028 Configure Netlify Scheduled Functions in netlify.toml (cron: every 6 hours, path: /api/cleanup)
- [x] T029 Add Netlify environment variables configuration template in netlify.toml
- [x] T030 [P] Create deployment documentation: Update DEPLOYMENT.md with R2 setup instructions
- [x] T031 [P] Create Cloudflare R2 bucket setup guide in docs/R2_SETUP.md (CORS configuration, bucket policy)

## Phase 3.8: Testing & Validation
- [ ] T032 Run all contract tests: Verify all API endpoints pass contract tests
- [ ] T033 Run all integration tests: Verify 48h retention and upload/download flows
- [ ] T034 Manual testing: Follow quickstart.md scenarios (upload 1GB file, download, trigger cleanup)
- [ ] T035 Performance validation: Verify upload URL generation <500ms, download URL generation <500ms

## Phase 3.9: Backend Deprecation
- [ ] T036 Update frontend API calls: Replace all backend/* API calls with /api/* Next.js routes
- [ ] T037 Remove Fly.io configuration files: Delete backend/fly.toml, backend/Dockerfile
- [ ] T038 Archive backend code: Move backend/src/ to backend-deprecated/ with README explaining migration
- [ ] T039 Update package.json: Remove backend-specific scripts

## Phase 3.10: Polish & Documentation
- [ ] T040 [P] Add error handling for R2 failures (network errors, quota exceeded) in frontend/src/lib/r2.ts
- [ ] T041 [P] Add logging for cleanup operations (files deleted, errors) in frontend/src/app/api/cleanup/route.ts
- [ ] T042 [P] Update environment variables documentation in .env.example
- [ ] T043 [P] Create migration guide for existing installations in docs/MIGRATION_V2.md
- [ ] T044 Update CLAUDE.md: Add R2 patterns, Netlify Scheduled Functions patterns
- [ ] T045 Final validation: Run full test suite (npm test) and manual quickstart scenarios

## Dependencies

### Critical Path
1. **Setup** (T001-T005) → All other phases
2. **Tests** (T006-T012) → Implementation phases (3.3-3.7)
3. **Database** (T013-T016) → API Routes (T020-T023)
4. **R2 Client** (T017-T019) → API Routes (T020-T023) → Frontend Updates (T024-T027)
5. **Core Implementation** (T020-T027) → Testing & Validation (T032-T035)
6. **Validation** (T032-T035) → Backend Deprecation (T036-T039)

### Blocking Relationships
- T013-T016 (DB migrations) block T020-T023 (API routes that use new schema)
- T017-T019 (R2 client) blocks T020-T023 (API routes that use R2 client)
- T020-T021 (presigned URL APIs) block T024-T026 (upload component using those APIs)
- T021 (download API) blocks T027 (download component)
- T032-T035 (validation) must pass before T036-T039 (backend removal)

## Parallel Execution Examples

### Phase 3.2: Launch all contract tests together
```bash
# In one terminal session with Agent tool:
Task: "Contract test: POST /api/slides/presigned-upload in frontend/tests/contract/presigned-upload.test.ts"
Task: "Contract test: GET /api/slides/:id/download in frontend/tests/contract/presigned-download.test.ts"
Task: "Contract test: POST /api/cleanup in frontend/tests/contract/cleanup.test.ts"
Task: "Contract test: GET /api/slides/:id metadata in frontend/tests/contract/slide-metadata.test.ts"
```

### Phase 3.2: Launch all integration tests together
```bash
Task: "Integration test: 48h retention in frontend/tests/integration/retention.test.ts"
Task: "Integration test: Upload flow in frontend/tests/integration/upload-flow.test.ts"
Task: "Integration test: Download flow in frontend/tests/integration/download-flow.test.ts"
```

### Phase 3.4: Launch R2 utilities together
```bash
Task: "Create R2 client wrapper in frontend/src/lib/r2.ts"
Task: "Update Slide type in frontend/src/types/slide.ts"
Task: "Create R2 utility functions in frontend/src/lib/r2.ts"
```

### Phase 3.10: Launch documentation tasks together
```bash
Task: "Add error handling for R2 failures in frontend/src/lib/r2.ts"
Task: "Add logging for cleanup in frontend/src/app/api/cleanup/route.ts"
Task: "Update .env.example with R2 variables"
Task: "Create migration guide in docs/MIGRATION_V2.md"
```

## Validation Checklist
*GATE: Must pass before marking feature complete*

- [x] All contracts have corresponding tests (T006-T009)
- [x] All entities updated in data model (Slide entity with r2_key)
- [x] All tests come before implementation (Phase 3.2 before 3.3-3.7)
- [x] Parallel tasks are truly independent (marked [P] appropriately)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [ ] All contract tests passing (T032)
- [ ] All integration tests passing (T033)
- [ ] Manual quickstart scenarios validated (T034)
- [ ] Performance targets met: <500ms URL generation (T035)
- [ ] Backend successfully deprecated without breaking functionality (T036-T039)

## Success Metrics
- ✅ Zero backend infrastructure costs (Fly.io removed)
- ✅ File uploads up to 1GB complete successfully
- ✅ Upload/download URL generation <500ms
- ✅ 48-hour retention enforced by scheduled function
- ✅ All existing functionality preserved
- ✅ CDN-powered downloads (fast global access)

## Notes
- **Architecture simplification**: This migration REMOVES complexity (no dedicated backend)
- **TDD enforced**: Contract tests (T006-T012) must be written and failing before any implementation
- **Database-first**: Schema changes (T013-T016) before API implementation
- **Parallel optimization**: 17 tasks marked [P] for concurrent execution
- **Backward compatibility**: Existing slides remain on current storage (not migrated)
- **Security maintained**: RLS policies unchanged, presigned URLs time-limited (1h)
- **Zero downtime**: Frontend continues working with old backend until T036 switchover
