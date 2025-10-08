# Research: Pagina Pubblica Evento

**Feature**: 004-facciamo-la-pagina
**Date**: 2025-10-07

## Research Questions & Findings

### 1. ZIP Generation for Batch Downloads

**Decision**: Use `archiver` npm package (already installed in Feature 003)

**Rationale**:
- Industry standard for Node.js ZIP creation (3M weekly downloads)
- Streaming support for large files (doesn't load everything in memory)
- Supports directory structure (needed for session → speech organization)
- Already used in Feature 003 backend

**Alternatives Considered**:
- `jszip`: Client-side focus, less efficient for server streaming
- `adm-zip`: Synchronous API, blocks event loop

**Implementation Pattern**:
```typescript
import archiver from 'archiver';

const archive = archiver('zip', { zlib: { level: 6 } });
archive.pipe(res);
archive.file(slidePath, { name: slideFilename });
archive.finalize();
```

---

### 2. Rate Limiting Strategy (50 downloads/hour per IP)

**Decision**: Use `express-rate-limit` with IP-based key generator

**Rationale**:
- Already used in Feature 003 for API rate limiting
- Supports custom key generators (IP extraction from req)
- Memory store sufficient for 100 concurrent users
- Per-route configuration (only apply to download endpoints)

**Alternatives Considered**:
- Redis-based limiting: Overkill for current scale, adds infrastructure dependency
- Token-bucket algorithm: More complex, no significant benefit for download use case

**Implementation Pattern**:
```typescript
import rateLimit from 'express-rate-limit';

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress,
  message: 'Download limit exceeded (50/hour). Please try again later.'
});

router.get('/download/:slideId', downloadLimiter, downloadSlide);
```

---

### 3. Next.js Dynamic Route Patterns for `/events/[slug]`

**Decision**: App Router with parallel data fetching

**Rationale**:
- Next.js 14 App Router supports async Server Components
- Dynamic route `[slug]` automatically extracts param
- Can fetch event + sessions + speeches in parallel using Promise.all
- Streaming/suspense support for incremental loading

**Alternatives Considered**:
- Pages Router: Deprecated pattern, no Server Components
- Client-side fetching: Slower initial render, worse SEO

**Implementation Pattern**:
```typescript
// app/events/[slug]/page.tsx
export default async function EventPage({ params }: { params: { slug: string } }) {
  const [event, sessions] = await Promise.all([
    fetchEvent(params.slug),
    fetchSessions(params.slug)
  ]);

  return <EventLayout event={event} sessions={sessions} />;
}
```

---

### 4. Session Storage for Token Persistence

**Decision**: Use `sessionStorage` API with automatic revalidation

**Rationale**:
- Persists only for browser session (closes when tab closes)
- Domain-scoped (secure, can't be stolen by other sites)
- Synchronous API (no async overhead)
- Cleared on logout/tab close (good security hygiene)

**Alternatives Considered**:
- `localStorage`: Persists forever, security risk if token expires
- Cookies: Overkill for client-only storage, GDPR concerns
- URL parameters: Token leakage via browser history/referrer headers

**Implementation Pattern**:
```typescript
// Save token after validation
sessionStorage.setItem(`event-token-${eventId}`, token);

// Auto-retrieve on page load
const savedToken = sessionStorage.getItem(`event-token-${eventId}`);
if (savedToken) {
  await validateToken(savedToken, eventId);
}
```

---

### 5. Collapsible Speech UI Component Pattern

**Decision**: Use native HTML `<details>` + `<summary>` with React state for controlled behavior

**Rationale**:
- Semantic HTML (accessibility built-in)
- No JavaScript required for basic expand/collapse
- WCAG 2.1 compliant by default (keyboard navigation, screen reader support)
- Can enhance with React state for programmatic control (e.g., expand all)

**Alternatives Considered**:
- Custom accordion with `useState`: More code, manual accessibility handling
- Third-party library (Radix UI): Adds dependency, unnecessary for simple use case

**Implementation Pattern**:
```typescript
<details className="speech-item">
  <summary className="cursor-pointer">
    <h4>{speech.title}</h4>
    <span className="text-sm text-gray-600">{speech.speaker}</span>
  </summary>
  <div className="mt-4">
    <p>{speech.description}</p>
    <SlideDownload slides={speech.slides} />
  </div>
</details>
```

---

### 6. Public Metrics Display Strategy

**Decision**: Server-side aggregation in API, client-side display with polling

**Rationale**:
- Page views incremented on page load (server-side)
- Total downloads aggregated from `event_metrics.total_slide_downloads`
- Polling every 30s to show live metrics (optional enhancement)
- Premium metrics (unique_visitors, per_slide_downloads) filtered out in API response

**Alternatives Considered**:
- WebSocket real-time updates: Overkill for 30s refresh, adds complexity
- Client-side calculation: Requires exposing raw activity_logs (security risk)

**Implementation Pattern**:
```typescript
// Backend: /api/public/events/:slug/metrics
const metrics = await supabase
  .from('event_metrics')
  .select('page_views, total_slide_downloads')
  .eq('event_id', eventId)
  .single();

// Frontend: Display with optional polling
const [metrics, setMetrics] = useState(initialMetrics);
useEffect(() => {
  const interval = setInterval(async () => {
    const updated = await fetchMetrics(slug);
    setMetrics(updated);
  }, 30000); // 30s
  return () => clearInterval(interval);
}, [slug]);
```

---

### 7. RLS Policies for Public Read Access

**Decision**: Add public read policies with visibility='public' OR valid token check

**Rationale**:
- Extends Feature 003 RLS patterns (tenant isolation preserved)
- Public events: `visibility = 'public'` allows read without auth
- Private events: Check `app.current_token_id` set by middleware after validation
- Download tracking still uses activity_logs (actor_type='anonymous')

**Alternatives Considered**:
- Separate public schema: Duplicates data, complicates sync
- API-only access (no RLS): Requires maintaining parallel permission logic

**Implementation Pattern**:
```sql
-- Public read for events
CREATE POLICY "public_events_read"
ON events FOR SELECT
USING (
  visibility = 'public'
  OR
  (visibility = 'private' AND id IN (
    SELECT event_id FROM access_tokens
    WHERE id = app.current_token_id() AND expires_at > NOW()
  ))
);
```

---

### 8. Performance Optimization for Events with 100+ Speeches

**Decision**: Implement pagination for speeches (50 per page) + lazy loading for slides

**Rationale**:
- Most events < 50 speeches (fits in one page)
- For large events, pagination prevents DOM bloat
- Slide thumbnails/metadata loaded only when speech expanded
- Total page size < 500KB (target: < 2s load on 3G)

**Alternatives Considered**:
- Infinite scroll: Poor UX for finding specific speech
- Virtual scrolling: Complex implementation, unnecessary for 100 items

**Implementation Pattern**:
```typescript
// Backend: Add pagination params
GET /api/public/events/:slug?page=1&limit=50

// Frontend: Lazy load slides on speech expansion
<details onToggle={(e) => {
  if (e.currentTarget.open && !slidesLoaded) {
    loadSlides(speechId);
  }
}}>
```

---

## Summary

All technical decisions made with existing ShareHub stack:
- **Backend**: Express.js + archiver (ZIP) + express-rate-limit (50/hour IP)
- **Frontend**: Next.js 14 App Router + sessionStorage (token persistence) + HTML `<details>` (collapsible speeches)
- **Database**: Supabase RLS with public read policies (visibility check + token validation)
- **Performance**: Pagination (50 speeches/page) + lazy loading (slides on expand)

No new major dependencies required. All patterns align with Constitution principles (security first, simplicity, TDD).
