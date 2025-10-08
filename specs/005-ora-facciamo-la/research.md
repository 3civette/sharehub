# Phase 0: Research & Technical Decisions

**Feature**: Event Management Dashboard
**Date**: 2025-10-08

## 1. QR Code Generation Best Practices

### Decision
**Chosen**: `qrcode` npm package (v1.5.3+)

### Rationale
- **Mature & stable**: 10M+ weekly downloads, actively maintained
- **Server-side focused**: Works in Node.js without browser dependencies
- **PNG generation**: Direct buffer/stream output (no canvas required)
- **Flexible API**: Supports both promise and callback patterns
- **Small footprint**: ~50KB, no heavy dependencies

### Implementation Pattern
```typescript
import QRCode from 'qrcode';

export async function generateTokenQR(token: string): Promise<Buffer> {
  const url = `${process.env.FRONTEND_URL}/events/verify?token=${token}`;
  return await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 300,
    margin: 2,
  });
}
```

### Alternatives Considered
- **qr-image**: Rejected - less flexible output formats, lower adoption
- **node-qrcode**: Rejected - unmaintained (last update 2017)
- **Canvas-based**: Rejected - requires node-canvas (complex native dependencies)

---

## 2. Clipboard API Cross-Browser Support

### Decision
**Chosen**: Modern Clipboard API with fallback

### Rationale
- **Native support**: 95%+ browser coverage (Chrome 66+, Firefox 63+, Safari 13.1+)
- **Secure context**: Requires HTTPS (acceptable for admin panel)
- **Simple API**: `navigator.clipboard.writeText()` returns Promise
- **Fallback pattern**: `document.execCommand('copy')` for legacy browsers

### Implementation Pattern
```typescript
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern API (preferred)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('Copy failed:', error);
    return false;
  }
}
```

### Mobile Considerations
- iOS Safari 13.1+: Full support
- Android Chrome 66+: Full support
- No additional permissions required for text copying

---

## 3. Dashboard Data Aggregation Pattern

### Decision
**Chosen**: Single aggregated endpoint with parallel database queries

### Rationale
- **Fewer network round-trips**: 1 HTTP request vs 5+ separate calls
- **Consistent data snapshot**: All data fetched atomically
- **Simpler client code**: No complex orchestration logic
- **Performance**: Parallel Supabase queries (Promise.all) minimize latency
- **Easier caching**: Single cache key for entire dashboard state

### Implementation Pattern
```typescript
export async function getDashboardData(eventId: string, tenantId: string) {
  // Parallel queries for optimal performance
  const [event, tokens, sessions, speeches, photos, metrics] = await Promise.all([
    supabase.from('events').select('*').eq('id', eventId).eq('tenant_id', tenantId).single(),
    supabase.from('access_tokens').select('*').eq('event_id', eventId),
    supabase.from('sessions').select('*').eq('event_id', eventId).order('start_time'),
    supabase.from('speeches').select('*, session:sessions(title)').eq('event_id', eventId),
    supabase.from('event_photos').select('*').eq('event_id', eventId).order('uploaded_at', { ascending: false }),
    metricsService.getCachedMetrics(eventId),
  ]);

  return {
    event: event.data,
    tokens: tokens.data || [],
    sessions: sessions.data || [],
    speeches: speeches.data || [],
    photos: photos.data || [],
    metrics: metrics,
  };
}
```

### Alternatives Considered
- **Multiple endpoints**: Rejected - increases latency (5+ sequential requests)
- **GraphQL**: Rejected - overkill for single-page data fetching
- **Server-side joins**: Rejected - less flexible, harder to cache granularly

---

## 4. Cached Metrics Implementation

### Decision
**Chosen**: Application-level caching with periodic background refresh

### Rationale
- **Simple implementation**: Node.js in-memory cache (node-cache or Map)
- **Low infrastructure cost**: No additional database features required
- **Fast reads**: O(1) lookup from memory
- **Acceptable staleness**: Metrics refresh every 5 minutes (per requirements)
- **Easy to scale**: Move to Redis later if multi-instance deployment needed

### Implementation Pattern
```typescript
import NodeCache from 'node-cache';

// Cache with 5-minute TTL
const metricsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export async function getCachedMetrics(eventId: string): Promise<MetricsSummary> {
  const cacheKey = `metrics:${eventId}`;

  // Try cache first
  let metrics = metricsCache.get<MetricsSummary>(cacheKey);
  if (metrics) {
    return metrics;
  }

  // Cache miss - calculate fresh metrics
  metrics = await calculateMetrics(eventId);
  metricsCache.set(cacheKey, metrics);
  return metrics;
}

async function calculateMetrics(eventId: string): Promise<MetricsSummary> {
  const [views, downloads, participants] = await Promise.all([
    // Query event view logs
    supabase.from('event_views').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    // Query slide download logs
    supabase.from('slide_downloads').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    // Query unique token usage
    supabase.from('access_tokens').select('use_count').eq('event_id', eventId),
  ]);

  return {
    pageViews: views.count || 0,
    slideDownloads: downloads.count || 0,
    participantCount: participants.data?.reduce((sum, t) => sum + (t.use_count || 0), 0) || 0,
  };
}
```

### Cache Invalidation Strategy
- **Time-based**: Automatic expiry after 5 minutes (TTL)
- **Manual refresh**: Admin can manually refresh (future enhancement)
- **Event-triggered**: Clear cache on event updates (optional optimization)

### Alternatives Considered
- **PostgreSQL materialized view**: Rejected - requires REFRESH MATERIALIZED VIEW management
- **Real-time calculations**: Rejected - violates "cached metrics" requirement
- **Redis**: Deferred - over-engineering for single-instance deployment

---

## 5. Inline CRUD Component Pattern

### Decision
**Chosen**: Reuse existing manager components from Feature 005

### Rationale
- **DRY principle**: SessionManager, SpeechManager, EventPhotoManager already exist
- **Consistent UX**: Same CRUD patterns across all admin pages
- **Zero new code**: Simply import and compose on dashboard page
- **Tested**: Existing components already have contract/integration tests

### Component Composition
```typescript
// Dashboard page imports existing managers
import SessionManager from '@/components/admin/SessionManager';
import SpeechManager from '@/components/admin/SpeechManager';
import EventPhotoManager from '@/components/admin/EventPhotoManager';

export default function EventDashboardPage() {
  return (
    <div className="dashboard-grid">
      <EventDashboardOverview event={event} metrics={metrics} />
      <TokenManager tokens={tokens} eventSlug={event.slug} />
      <SessionManager eventId={eventId} sessions={sessions} />
      <SpeechManager eventId={eventId} speeches={speeches} sessions={sessions} />
      <EventPhotoManager eventId={eventId} photos={photos} />
    </div>
  );
}
```

### New Components Required
- **EventDashboardOverview**: Event info + metrics display (read-only)
- **TokenManager**: Token display + copy button + QR download button

---

## Summary

All research tasks completed with clear technical decisions:

1. ✅ **QR Generation**: `qrcode` library with PNG buffer output
2. ✅ **Clipboard**: Modern API with fallback, 95%+ browser support
3. ✅ **Data Aggregation**: Single endpoint, parallel queries, ~500ms target
4. ✅ **Metrics Caching**: In-memory Node.js cache, 5-min TTL
5. ✅ **Component Reuse**: Leverage Feature 005 manager components

**No blockers identified**. All NEEDS CLARIFICATION items resolved. Ready for Phase 1 (Design & Contracts).

**Performance Validation**:
- Dashboard load: Parallel queries + cache hits = est. 1.2-1.5s ✅ (< 2s target)
- Token copy: Native clipboard API = est. 50ms ✅ (< 100ms target)
- QR download: qrcode PNG generation = est. 200-300ms ✅ (< 500ms target)
- Inline CRUD: Reuses existing optimistic UI = est. 300-400ms ✅ (< 500ms target)
