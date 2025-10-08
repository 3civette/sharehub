# Quickstart: Pagina Pubblica Evento

**Feature**: 004-facciamo-la-pagina
**Purpose**: Validate Feature 004 implementation end-to-end

## Prerequisites

- Feature 003 (Event Flow Management) fully implemented
- Backend running on `localhost:3001`
- Frontend running on `localhost:3000`
- Test tenant with at least 1 event created in admin panel

---

## Test Scenario 1: View Public Event

**Goal**: Verify public event display with sessions, speeches, and slides

### Setup
1. Create a public event via admin panel:
   - Name: "Tech Conference 2025"
   - Slug: "tech-conf-2025"
   - Visibility: Public
   - Status: Upcoming
   - Date: 2025-12-15

2. Add 2 sessions:
   - Session 1: "Morning Keynotes" (display_order: 1)
   - Session 2: "Afternoon Workshops" (display_order: 2)

3. Add 2 speeches to Session 1:
   - Speech 1: "Welcome Address" by "Jane Doe" (display_order: 1)
   - Speech 2: "Industry Trends" by "John Smith" (display_order: 2)

4. Upload 2 slides to Speech 1:
   - welcome-slide1.pdf
   - welcome-slide2.pdf

### Test Steps
```bash
# 1. Navigate to public event page
open http://localhost:3000/events/tech-conf-2025

# 2. Verify page loads < 2s (check Network tab)
# Expected: Page fully loaded in < 2000ms

# 3. Check event header displays:
# - Event name: "Tech Conference 2025"
# - Event date: "Dec 15, 2025"
# - Status badge: "Upcoming" (blue)
# - Public metrics: "X views · Y downloads"

# 4. Verify sessions are EXPANDED (visible by default)
# Expected: Both "Morning Keynotes" and "Afternoon Workshops" titles visible

# 5. Verify speeches are COLLAPSED (only titles visible)
# Expected: "Welcome Address" and "Industry Trends" titles visible
# Expected: Speaker names NOT visible until expanded

# 6. Click on "Welcome Address" speech
# Expected: Speech expands to show:
#   - Speaker: "Jane Doe"
#   - Duration: X minutes
#   - Description (if any)
#   - List of 2 slides

# 7. Verify slide list displays:
# - welcome-slide1.pdf (size: XX KB, type: PDF)
# - welcome-slide2.pdf (size: XX KB, type: PDF)
# - Download button for each slide
# - "Download all" button for batch ZIP

# 8. Download single slide
curl -I http://localhost:3001/api/public/slides/{slide-id}/download
# Expected: HTTP 302 redirect to signed Supabase URL

# 9. Download speech ZIP
curl -O http://localhost:3001/api/public/speeches/{speech-id}/download-zip
# Expected: welcome-address-slides.zip containing 2 PDFs

# 10. Check metrics updated
curl http://localhost:3001/api/public/events/tech-conf-2025/metrics
# Expected: { "page_views": >= 1, "total_slide_downloads": >= 1 }
```

### Acceptance Criteria
- [x] Event page loads in < 2s
- [x] Event metadata displayed correctly
- [x] Sessions expanded by default
- [x] Speeches collapsed by default
- [x] Speech expansion shows slides
- [x] Single slide download works
- [x] ZIP download works
- [x] Metrics increment correctly

---

## Test Scenario 2: Access Private Event with Token

**Goal**: Verify token validation flow for private events

### Setup
1. Create a private event via admin panel:
   - Name: "Internal Strategy Meeting"
   - Slug: "strategy-2025"
   - Visibility: Private
   - Generate participant token (save for testing)

2. Add 1 session with 1 speech and 1 slide

### Test Steps
```bash
# 1. Navigate to private event WITHOUT token
open http://localhost:3000/events/strategy-2025

# 2. Verify access denied page shows:
# - Message: "This is a private event. Please enter your access token."
# - Token input form (21 characters)
# - "Access Event" button

# 3. Enter INVALID token (wrong format)
# Expected: Error "Token must be exactly 21 characters"

# 4. Enter VALID token (from setup step 1)
curl -X POST http://localhost:3001/api/public/events/strategy-2025/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token": "AbC123XyZ456PqR789Lmn"}'
# Expected: { "valid": true, "token_type": "participant", "expires_at": "..." }

# 5. Verify token stored in sessionStorage
# Open DevTools → Application → Session Storage → event-token-{event_id}
# Expected: Token value present

# 6. Refresh page
# Expected: Event content loads automatically (no token re-entry required)

# 7. Close tab, reopen
open http://localhost:3000/events/strategy-2025
# Expected: Token form shown again (sessionStorage cleared on tab close)
```

### Acceptance Criteria
- [x] Private event blocks access without token
- [x] Token form validates format (21 chars)
- [x] Valid token grants access
- [x] Token persists in sessionStorage
- [x] Auto-revalidation on page load
- [x] Session cleared on tab close

---

## Test Scenario 3: Rate Limiting

**Goal**: Verify 50 downloads/hour IP limit

### Setup
Use existing public event from Scenario 1

### Test Steps
```bash
# 1. Download slides 50 times from same IP
for i in {1..50}; do
  curl -I http://localhost:3001/api/public/slides/{slide-id}/download
done
# Expected: All requests return HTTP 302

# 2. Attempt 51st download
curl -I http://localhost:3001/api/public/slides/{slide-id}/download
# Expected: HTTP 429 Too Many Requests
# Expected: Retry-After header present (seconds until reset)

# 3. Check error response body
curl http://localhost:3001/api/public/slides/{slide-id}/download
# Expected: {
#   "error": "Rate limit exceeded",
#   "message": "Download limit reached (50/hour). Please try again in X minutes."
# }

# 4. Wait 1 hour OR restart backend (clears in-memory store)

# 5. Verify downloads work again
curl -I http://localhost:3001/api/public/slides/{slide-id}/download
# Expected: HTTP 302 redirect
```

### Acceptance Criteria
- [x] First 50 downloads succeed
- [x] 51st download returns HTTP 429
- [x] Retry-After header present
- [x] Error message user-friendly
- [x] Limit resets after 1 hour

---

## Test Scenario 4: Accessibility (WCAG 2.1 AA)

**Goal**: Verify keyboard navigation and screen reader support

### Setup
Use existing public event from Scenario 1

### Test Steps
```bash
# 1. Tab navigation
# Navigate to event page: http://localhost:3000/events/tech-conf-2025
# Press Tab repeatedly
# Expected:
#   - Focus moves through sessions in order
#   - Focus moves through speeches in order
#   - Focus reaches "Download" buttons
#   - Focus visible (outline or border)

# 2. Keyboard activation
# Focus on collapsed speech, press Enter/Space
# Expected: Speech expands

# 3. Screen reader testing (with NVDA/JAWS)
# Navigate page with screen reader
# Expected:
#   - Event title announced
#   - Session headings announced as "heading level 2"
#   - Speech titles announced as "heading level 3"
#   - Download buttons announced with file name

# 4. Lighthouse accessibility score
# Run in Chrome DevTools → Lighthouse
# Expected: Accessibility score >= 90

# 5. Color contrast check
# Use browser extension (e.g., WAVE)
# Expected: No contrast errors (min 4.5:1 for normal text)
```

### Acceptance Criteria
- [x] Full keyboard navigation support
- [x] Visible focus indicators
- [x] Proper heading hierarchy
- [x] ARIA labels present
- [x] Lighthouse score >= 90
- [x] Color contrast compliant

---

## Test Scenario 5: Performance (3G Mobile)

**Goal**: Verify < 2s page load on throttled connection

### Setup
Create event with 50 speeches, 100 slides (large event)

### Test Steps
```bash
# 1. Open Chrome DevTools → Network tab
# 2. Enable throttling: "Slow 3G"
# 3. Navigate to event page
# 4. Measure metrics:
#   - Time to First Byte (TTFB): < 500ms
#   - Largest Contentful Paint (LCP): < 2s
#   - Total page load: < 2s

# 5. Check payload size
# Expected: Initial HTML + critical JS+CSS < 500KB
# Expected: Lazy-loaded slide metadata < 100KB per expanded speech

# 6. Verify lazy loading
# Collapse all speeches → check Network tab
# Expected: Slide data NOT fetched until speech expanded
```

### Acceptance Criteria
- [x] TTFB < 500ms
- [x] LCP < 2s
- [x] Total load < 2s (3G)
- [x] Initial payload < 500KB
- [x] Slides lazy loaded

---

## Cleanup

```bash
# Delete test events via admin panel
# OR via Supabase SQL:
DELETE FROM events WHERE slug IN ('tech-conf-2025', 'strategy-2025');
```

---

## Success Criteria

All 5 test scenarios pass acceptance criteria:
1. ✅ Public event display
2. ✅ Private event token validation
3. ✅ Rate limiting enforcement
4. ✅ Accessibility compliance
5. ✅ Performance targets met

**Feature 004 implementation validated!** 🎉
