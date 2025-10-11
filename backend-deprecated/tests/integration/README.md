# Integration Tests for ShareHub Admin Panel

This directory contains integration tests for the ShareHub admin panel secondary screens (Feature 002).

## Test Files

All integration tests follow the scenarios defined in `specs/002-facciamo-tutti-gli/quickstart.md`:

### T034: create-event-flow.test.ts
**Test Scenario 1: Create Event Flow**
- Login as admin and save authentication token
- Create public event and verify no tokens generated
- Create private event and verify organizer/participant tokens generated
- Test tenant isolation (cannot see other tenant's events)
- Validate error handling for invalid data

**Total Tests**: 8 tests

### T035: edit-event-flow.test.ts
**Test Scenario 2: Edit Event Flow**
- Create and successfully edit future events
- Prevent editing past events (return 400 error)
- Preserve tokens when editing private events
- Test partial updates to event fields
- Validate error handling and tenant isolation

**Total Tests**: 9 tests

### T036: branding-flow.test.ts
**Test Scenario 3: Branding Flow**
- Get current branding (verify defaults)
- Update primary and secondary colors
- Upload logo to Supabase Storage
- Verify logo file exists in storage
- Reset branding to defaults and remove logo
- Validate color format and file type restrictions

**Total Tests**: 12 tests

### T037: event-list-flow.test.ts
**Test Scenario 4: Event List Flow**
- List events with default sort (date ascending)
- Sort by date descending and created date descending
- Filter active events only (future)
- Filter past events only
- Combine sort and filter options
- Enforce tenant isolation
- Validate invalid sort/filter options

**Total Tests**: 12 tests

### T038: settings-flow.test.ts
**Test Scenario 5: Settings Flow**
- Get current tenant settings
- Update hotel_name, contact_email, contact_phone
- Test partial updates
- Validate email format and hotel_name length
- Verify billing_info is read-only (cannot be updated)
- Test tenant isolation and authentication

**Total Tests**: 17 tests

---

## Prerequisites

Before running the integration tests, ensure:

1. **Backend server is running** on `http://localhost:3001`
   ```bash
   cd backend
   npm run dev
   ```

2. **Database is set up** with all migrations applied
   - Supabase instance configured
   - Test tenant exists with ID: `523c2648-f980-4c9e-8e53-93d812cfa79f`

3. **Test admin user exists**
   - Email: `admin@sharehub.test`
   - Password: `ShareHub2025!`
   - Associated with test tenant

4. **Environment variables are set** in `backend/.env`:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=3001
   ```

---

## Running the Tests

### Run all integration tests
```bash
cd backend
npm test tests/integration
```

### Run a specific test file
```bash
# Test create event flow
npm test tests/integration/create-event-flow.test.ts

# Test edit event flow
npm test tests/integration/edit-event-flow.test.ts

# Test branding flow
npm test tests/integration/branding-flow.test.ts

# Test event list flow
npm test tests/integration/event-list-flow.test.ts

# Test settings flow
npm test tests/integration/settings-flow.test.ts
```

### Run tests with coverage
```bash
npm test -- --coverage tests/integration
```

### Run tests in watch mode (for development)
```bash
npm test -- --watch tests/integration
```

### Run tests with verbose output
```bash
npm test -- --reporter=verbose tests/integration
```

---

## Test Structure

Each test file follows this pattern:

1. **Setup (beforeAll)**
   - Login as test admin
   - Get authentication token
   - Get tenant ID

2. **Test Cases**
   - Comprehensive positive and negative test cases
   - Database verification using Supabase client
   - Proper assertions with meaningful error messages

3. **Cleanup (afterAll)**
   - Delete created test data
   - Restore original state
   - Clean up database records

---

## Common Issues and Solutions

### Issue: Tests fail with 401 Unauthorized
**Solution**: Verify test admin user exists and credentials are correct in test files.

### Issue: Tests fail with connection errors
**Solution**: Ensure backend server is running on `http://localhost:3001` before running tests.

### Issue: Supabase errors (PGRST errors)
**Solution**:
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify database migrations are applied
- Check RLS policies are not blocking service role

### Issue: Logo upload tests fail
**Solution**:
- Verify Supabase Storage bucket `logos` exists
- Check storage policies allow uploads
- Ensure multer is properly configured

### Issue: Tenant isolation tests fail
**Solution**:
- Verify RLS policies are correctly enforcing tenant isolation
- Check middleware properly attaches `tenantId` to requests

### Issue: Tests leave orphaned data
**Solution**:
- Check `afterAll` hooks are executing
- Manually clean up using SQL if needed:
  ```sql
  DELETE FROM private_event_tokens WHERE event_id IN (SELECT id FROM events WHERE tenant_id = '523c2648-f980-4c9e-8e53-93d812cfa79f');
  DELETE FROM events WHERE tenant_id = '523c2648-f980-4c9e-8e53-93d812cfa79f' AND event_name LIKE '%Test%';
  ```

---

## Test Data Cleanup

All tests include cleanup in `afterAll` hooks to remove test data. However, if tests fail unexpectedly, you may need to manually clean up:

```sql
-- Clean up test events
DELETE FROM private_event_tokens
WHERE event_id IN (
  SELECT id FROM events
  WHERE tenant_id = '523c2648-f980-4c9e-8e53-93d812cfa79f'
  AND event_name LIKE '%Conference%'
);

DELETE FROM events
WHERE tenant_id = '523c2648-f980-4c9e-8e53-93d812cfa79f'
AND event_name LIKE '%Conference%';

-- Reset branding to defaults
UPDATE tenants
SET
  primary_color = '#3B82F6',
  secondary_color = '#10B981',
  logo_url = NULL
WHERE id = '523c2648-f980-4c9e-8e53-93d812cfa79f';

-- Reset settings to defaults
UPDATE tenants
SET
  hotel_name = 'Test Hotel',
  contact_email = NULL,
  contact_phone = NULL
WHERE id = '523c2648-f980-4c9e-8e53-93d812cfa79f';
```

---

## Expected Test Results

When all tests pass, you should see:

```
✓ Integration Test: Create Event Flow (8)
✓ Integration Test: Edit Event Flow (9)
✓ Integration Test: Branding Flow (12)
✓ Integration Test: Event List Flow (12)
✓ Integration Test: Settings Flow (17)

Total: 58 tests passed
```

---

## CI/CD Integration

These tests can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd backend && npm install
      - name: Start backend
        run: cd backend && npm run dev &
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      - name: Wait for server
        run: sleep 5
      - name: Run integration tests
        run: cd backend && npm test tests/integration
```

---

## Notes

- **Test Isolation**: Each test suite creates and cleans up its own data
- **Parallel Execution**: Tests can run in parallel (no shared state)
- **Real Database**: Tests use real Supabase database (not mocked)
- **Authentication**: Tests use real JWT tokens from Supabase Auth
- **File Upload**: Logo upload tests use real Supabase Storage

---

## Troubleshooting

For detailed troubleshooting, refer to:
- `specs/002-facciamo-tutti-gli/quickstart.md` - Integration test scenarios
- Backend API documentation in `backend/src/routes/`
- Supabase logs in dashboard for storage/database issues

---

## Contributing

When adding new integration tests:

1. Follow the existing test structure
2. Include proper setup/cleanup hooks
3. Use descriptive test names
4. Add meaningful assertions
5. Document any special setup requirements
6. Update this README with new test information
