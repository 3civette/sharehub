# Contract Tests - TDD Approach

**Feature**: 003-ora-facciamo-il (Event Flow Management)
**Created**: 2025-10-07
**Status**: RED Phase (Tests written, implementation pending)

---

## Purpose

These contract tests follow **Test-Driven Development (TDD)** principles:

1. **RED Phase** (Current): Tests are written first and MUST fail
2. **GREEN Phase** (Next): Implementation makes tests pass
3. **REFACTOR Phase** (Final): Code is optimized while keeping tests green

---

## Constitution Principle III

> "Tests written first, implementation second. TDD is the way."

These tests verify that our API implementation will match the OpenAPI specification in `specs/003-ora-facciamo-il/contracts/events-api.yaml`.

---

## Test Coverage

### Events API (`events.test.ts`)

**60+ test scenarios** covering:

#### 1. Event Management
- ✅ Create public events
- ✅ Create private events with token generation
- ✅ Validate token expiration requirements
- ✅ List events with filters and pagination
- ✅ Get event details with hierarchy
- ✅ Update events (with double confirmation for past events)

#### 2. Content Hierarchy
- ✅ Create sessions within events
- ✅ Create speeches within sessions
- ✅ Upload slides to speeches
- ✅ Validate display_order uniqueness
- ✅ Permission checks (organizer vs participant)

#### 3. Token-Based Access Control
- ✅ Organizer tokens (full access)
- ✅ Participant tokens (read-only)
- ✅ Token validation and expiration checks
- ✅ Invalid token rejection

#### 4. File Uploads
- ✅ Upload slides with mime type validation
- ✅ Reject files over 100MB
- ✅ Reject invalid file types (.txt, etc.)
- ✅ Track file metadata (size, filename)

#### 5. Organizer Dashboard
- ✅ View event with complete hierarchy
- ✅ View metrics (basic for free, premium for paid plans)
- ✅ View activity logs with pagination
- ✅ Tenant plan detection

#### 6. Public Event Page
- ✅ Access public events without authentication
- ✅ Access private events with valid token
- ✅ Reject private events without token

#### 7. Rate Limiting
- ✅ Enforce 100 requests/hour limit
- ✅ Return 429 with Retry-After header

#### 8. PDF Generation
- ✅ Generate tokens PDF with QR codes
- ✅ Reject PDF generation for public events

---

## Expected Test Results

### ❌ RED Phase (Current State)

All tests should **FAIL** with errors like:

- **Connection Errors**: `ECONNREFUSED` (no server running)
- **404 Not Found**: Routes not implemented
- **500 Server Errors**: Validation or database issues
- **Timeout Errors**: Endpoints don't exist

**This is expected and correct!** TDD requires tests to fail before implementation.

---

### ✅ GREEN Phase (Target State)

After implementing:
- Phase 3.4: Backend Services (T017-T023)
- Phase 3.5: Backend Middleware (T024-T026)
- Phase 3.6: Backend Routes (T027-T037)

All tests should **PASS** with:
- Correct HTTP status codes
- Valid response structures matching OpenAPI spec
- Proper error handling
- Working token validation
- RLS policies enforcing tenant isolation

---

## Running Tests

### Run All Contract Tests
```bash
cd backend
npm test tests/contract/events.test.ts
```

### Run with Coverage
```bash
npm test tests/contract/events.test.ts -- --coverage
```

### Run in Watch Mode
```bash
npm test tests/contract/events.test.ts -- --watch
```

---

## Dependencies

### Required for Tests to Pass

1. **Database Schema** (Phase 3.1) ✅
   - `backend/migrations/003-events-schema.sql`
   - `backend/migrations/003-rls-policies.sql`
   - `backend/migrations/003-indexes.sql`
   - `backend/migrations/003-functions.sql`

2. **Models** (Phase 3.2) ✅
   - `backend/src/models/event.ts`
   - `backend/src/models/session.ts`
   - `backend/src/models/speech.ts`
   - `backend/src/models/slide.ts`
   - `backend/src/models/accessToken.ts`
   - `backend/src/models/eventMetrics.ts`
   - `backend/src/models/activityLog.ts`

3. **Services** (Phase 3.4) ⏳ PENDING
   - TokenService (nanoid generation, validation)
   - EventService (CRUD, token generation)
   - SessionService (CRUD, reordering)
   - SpeechService (CRUD, reordering)
   - SlideService (upload, Supabase Storage, ZIP generation)
   - MetricsService (tracking, tiered access)
   - RateLimitService (express-rate-limit + Redis)

4. **Middleware** (Phase 3.5) ⏳ PENDING
   - TokenAuth middleware
   - RateLimit middleware
   - TenantIsolation middleware (RLS context)

5. **Routes** (Phase 3.6) ⏳ PENDING
   - Events routes (POST, GET, PUT, DELETE)
   - Sessions routes (POST, GET, PUT, DELETE, reorder)
   - Speeches routes (POST, GET, PUT, DELETE, reorder)
   - Slides routes (POST upload, GET download, ZIP)
   - Dashboard route (organizer only)
   - Public page route (token optional)

---

## Test Failures Documentation

### Phase 3.3: Expected Failures (T015)

When running tests before implementation, document failures:

```bash
npm test tests/contract/events.test.ts > test-failures.log 2>&1
```

**Common failure patterns:**

1. **Connection Refused**
   - Cause: Backend server not running
   - Fix: Start server with `npm start` in Phase 3.6

2. **404 Not Found**
   - Cause: Routes not mounted in Express app
   - Fix: Implement routes in Phase 3.6

3. **422 Validation Error**
   - Cause: Request validation not implemented
   - Fix: Add Zod schemas in Phase 3.4

4. **403 Forbidden**
   - Cause: Token validation middleware missing
   - Fix: Implement TokenAuth middleware in Phase 3.5

5. **500 Server Error**
   - Cause: Database queries failing or RLS blocking access
   - Fix: Verify RLS policies and tenant context setting

---

## Constitution Compliance

✅ **Principle III**: Tests written first (RED phase complete)
⏳ **Principle IV**: Implementation makes tests pass (GREEN phase pending)
⏳ **Principle V**: Refactor with confidence (tests ensure no regression)

---

## Next Steps

1. **T015**: Run tests and verify they FAIL (document failures)
2. **T016**: Create this README ✅
3. **Phase 3.4**: Implement services to make tests pass
4. **Phase 3.7**: Run tests again and verify they PASS (GREEN phase)

---

**Remember**: A failing test is a successful first step in TDD! 🎯
