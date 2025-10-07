# Research & Technical Decisions

**Feature**: Event Flow Management (003-ora-facciamo-il)
**Date**: 2025-10-07
**Status**: Complete

## Overview

All technical context clarified during specification phase. This document captures research on best practices for implementing the three-level content hierarchy, token-based access control, PDF generation with QR codes, rate limiting, and hierarchical ZIP downloads.

---

## 1. Hierarchical Data Model (Event → Session → Speech → Slide)

### Decision
Implement strict parent-child relationships with CASCADE DELETE and display_order for manual sorting.

### Rationale
- PostgreSQL foreign keys with ON DELETE CASCADE ensure data integrity
- display_order (integer) allows flexible drag-and-drop reordering without timestamp dependencies
- Self-contained entities minimize joins for common queries
- Each level independently queryable with RLS policies

### Alternatives Considered
- **Nested Set Model**: Rejected due to complexity of reordering operations
- **Path Enumeration**: Rejected due to update overhead when restructuring
- **Adjacency List (chosen)**: Simple, efficient for shallow hierarchies (3 levels)

### Implementation Pattern
```typescript
// Event table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  visibility TEXT CHECK (visibility IN ('public', 'private')),
  status TEXT CHECK (status IN ('upcoming', 'past', 'archived')),
  token_expiration_date TIMESTAMP WITH TIME ZONE,
  retention_policy TEXT CHECK (retention_policy IN ('keep_forever', 'archive_1year', 'delete_2years')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Session table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Speech table
CREATE TABLE speeches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  speaker_name TEXT,
  duration INTEGER, -- minutes
  description TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Slide table
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speech_id UUID NOT NULL REFERENCES speeches(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  uploaded_by TEXT, -- 'organizer' or token reference
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Related Requirements
FR-012a through FR-012l (hierarchical content management)

---

## 2. Token-Based Access Control

### Decision
Generate cryptographically secure tokens (nanoid) stored in database with type and expiration, validated via middleware.

### Rationale
- nanoid provides URL-safe 21-character tokens (similar entropy to UUID)
- Stored tokens allow revocation and usage tracking
- Middleware pattern enables reuse across endpoints
- Separate organizer/participant types simplify permission logic

### Alternatives Considered
- **JWT**: Rejected because tokens cannot be revoked without blacklist
- **Session-based**: Rejected because requires cookie management for public links
- **Database tokens (chosen)**: Revocable, trackable, simple validation

### Implementation Pattern
```typescript
// Access Token table
CREATE TABLE access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('organizer', 'participant')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

// Middleware validation
export async function validateToken(token: string) {
  const { data, error } = await supabase
    .from('access_tokens')
    .select('*, events!inner(*)')
    .eq('token', token)
    .single();

  if (error || !data) throw new Error('Invalid token');
  if (new Date(data.expires_at) < new Date()) throw new Error('Token expired');

  // Update last_used_at
  await supabase
    .from('access_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { token: data, event: data.events };
}
```

### Related Requirements
FR-004, FR-007, FR-007a, FR-008, FR-009, FR-011, FR-012

---

## 3. PDF Generation with QR Codes

### Decision
Use `pdfkit` (backend) or `jsPDF` (frontend) for PDF generation, `qrcode` library for QR code generation.

### Rationale
- pdfkit is production-ready with extensive formatting options
- QR codes encode full URLs for easy mobile scanning
- Backend generation ensures consistent formatting
- Single PDF contains both tokens for easy distribution

### Alternatives Considered
- **HTML to PDF (Puppeteer)**: Rejected due to resource overhead
- **Client-side only**: Rejected due to inconsistent cross-browser rendering
- **Server-side pdfkit (chosen)**: Lightweight, reliable, well-documented

### Implementation Pattern
```typescript
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export async function generateTokenPDF(event: Event, organizerToken: string, participantToken: string) {
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));

  // Event details
  doc.fontSize(20).text(`Event: ${event.name}`, { align: 'center' });
  doc.fontSize(12).text(`Created: ${new Date().toLocaleDateString()}`);
  doc.text(`Token Expiration: ${new Date(event.token_expiration_date).toLocaleDateString()}`);

  // Organizer token
  doc.moveDown().fontSize(16).text('Organizer Token (Full Access)');
  const organizerQR = await QRCode.toDataURL(`${process.env.APP_URL}/events/${event.id}?token=${organizerToken}`);
  doc.image(organizerQR, { width: 150 });
  doc.fontSize(10).text(organizerToken);

  // Participant token
  doc.addPage();
  doc.fontSize(16).text('Participant Token (View Only)');
  const participantQR = await QRCode.toDataURL(`${process.env.APP_URL}/events/${event.id}?token=${participantToken}`);
  doc.image(participantQR, { width: 150 });
  doc.fontSize(10).text(participantToken);

  doc.end();
  return Buffer.concat(buffers);
}
```

### Related Requirements
FR-006b, FR-006c, FR-006d, FR-006e

---

## 4. Rate Limiting (100 req/hour per IP)

### Decision
Use `express-rate-limit` with memory store for development, Redis for production.

### Rationale
- express-rate-limit is standard Express middleware
- Memory store sufficient for single-instance development
- Redis enables distributed rate limiting for horizontal scaling
- Per-IP limiting prevents individual abuse without affecting legitimate users

### Alternatives Considered
- **nginx rate limiting**: Rejected to keep logic in application layer
- **API Gateway (Cloudflare)**: Deferred as external dependency
- **express-rate-limit (chosen)**: Simple, well-tested, production-ready

### Implementation Pattern
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

export const rateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.NODE_ENV === 'production'
    ? new RedisStore({ client: redisClient, prefix: 'rl:' })
    : undefined, // Memory store for development
  message: 'Too many requests from this IP, please try again after an hour.',
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.status(429)
       .set('Retry-After', retryAfter.toString())
       .json({ error: 'Rate limit exceeded', retryAfter });
  }
});

// Apply to routes
router.get('/events/:id', rateLimiter, getEvent);
router.get('/events/:id/slides', rateLimiter, getSlides);
```

### Related Requirements
FR-030, FR-030a, FR-030b, FR-030c, FR-030d

---

## 5. Hierarchical ZIP Download

### Decision
Use `archiver` library to create ZIP archives with folder structure matching content hierarchy.

### Rationale
- archiver streams files directly from storage to ZIP without loading all in memory
- Supports folder structure for organization
- Works with Supabase Storage signed URLs
- Handles large file sets efficiently

### Alternatives Considered
- **JSZip**: Rejected due to memory constraints for large files
- **zip-stream**: Similar to archiver but less maintained
- **archiver (chosen)**: Production-ready, streaming, well-documented

### Implementation Pattern
```typescript
import archiver from 'archiver';
import { supabase } from './supabaseClient';

export async function generateEventZIP(eventId: string, res: Response) {
  const archive = archiver('zip', { zlib: { level: 9 } });

  // Pipe archive to response
  res.attachment(`event-${eventId}-slides-${new Date().toISOString().split('T')[0]}.zip`);
  archive.pipe(res);

  // Query hierarchical structure
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, speeches(*, slides(*))')
    .eq('event_id', eventId)
    .order('display_order');

  // Add files to archive with folder structure
  for (const session of sessions) {
    for (const speech of session.speeches) {
      for (const slide of speech.slides) {
        const { data } = await supabase.storage
          .from('slides')
          .createSignedUrl(slide.storage_path, 3600);

        if (data?.signedUrl) {
          const response = await fetch(data.signedUrl);
          const buffer = await response.arrayBuffer();
          archive.append(Buffer.from(buffer), {
            name: `${session.title}/${speech.title}/${slide.filename}`
          });
        }
      }
    }
  }

  await archive.finalize();
}
```

### Related Requirements
FR-023b, FR-023c, FR-023d, FR-023e

---

## 6. Tiered Metrics (Free vs Premium Plans)

### Decision
Store all metrics in database, filter display based on tenant.subscription_plan field.

### Rationale
- Collect comprehensive metrics for all tenants (enables easy plan upgrades)
- Frontend conditionally renders metric cards based on plan tier
- Single metrics table with optional JSONB columns for premium data
- No data migration needed when tenant upgrades plan

### Alternatives Considered
- **Separate tables**: Rejected due to migration complexity
- **External analytics**: Deferred to keep data in-house
- **Single table with selective display (chosen)**: Simple, upgrade-friendly

### Implementation Pattern
```typescript
// Event Metrics table
CREATE TABLE event_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  -- Basic metrics (free tier)
  page_views INTEGER DEFAULT 0,
  total_slide_downloads INTEGER DEFAULT 0,
  -- Premium metrics (stored as JSONB)
  unique_visitors JSONB, -- { visitor_ip: last_seen_timestamp }
  per_slide_downloads JSONB, -- { slide_id: download_count }
  per_speech_downloads JSONB, -- { speech_id: download_count }
  geographic_data JSONB, -- { country_code: count }
  device_types JSONB, -- { device_type: count }
  access_timeline JSONB, -- [ { timestamp, action, actor_type } ]
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Service layer filtering
export async function getMetrics(eventId: string, tenantPlan: string) {
  const { data } = await supabase
    .from('event_metrics')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (tenantPlan === 'free') {
    return {
      page_views: data.page_views,
      total_slide_downloads: data.total_slide_downloads
    };
  }

  // Return full metrics for premium
  return data;
}
```

### Related Requirements
FR-015, FR-015a, FR-015b, FR-015c

---

## 7. Activity Log with Configurable Retention

### Decision
Store logs in dedicated table, implement scheduled cleanup job based on retention_days field.

### Rationale
- Dedicated table enables efficient querying and purging
- Retention period stored per-event for flexibility
- Scheduled job (cron or pg_cron) performs automatic cleanup
- Logs remain queryable until retention expires

### Alternatives Considered
- **Time-series database**: Rejected as overkill for volume
- **TTL indexes (MongoDB)**: Not available in PostgreSQL
- **Scheduled cleanup job (chosen)**: Standard PostgreSQL pattern

### Implementation Pattern
```typescript
// Activity Log table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actor_type TEXT CHECK (actor_type IN ('organizer', 'participant', 'anonymous')),
  action_type TEXT CHECK (action_type IN ('upload', 'download', 'view')),
  filename TEXT,
  file_size INTEGER,
  session_id UUID REFERENCES sessions(id),
  speech_id UUID REFERENCES speeches(id),
  slide_id UUID REFERENCES slides(id),
  retention_days INTEGER NOT NULL -- 30, 90, 365, or -1 for indefinite
);

// Cleanup job (runs daily)
CREATE OR REPLACE FUNCTION cleanup_expired_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE retention_days > 0
    AND timestamp < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

// Schedule with pg_cron (or Node.js cron job)
SELECT cron.schedule('cleanup-logs', '0 2 * * *', 'SELECT cleanup_expired_logs()');
```

### Related Requirements
FR-019, FR-019a, FR-019b, FR-019c, FR-029, FR-029a, FR-029b

---

## 8. Double Confirmation for Past Events

### Decision
Implement two-step UI pattern: checkbox acknowledgment + confirmation button.

### Rationale
- Prevents accidental changes to past events that affect shared links
- Clear warning message explains consequences
- Checkbox ensures user reads warning (cannot click button until checked)
- Standard UX pattern for destructive actions

### Implementation Pattern
```tsx
export function DoubleConfirmDialog({ onConfirm, eventName }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Dialog>
      <Warning>
        You are editing a past event. This will affect all shared URLs and tokens.
      </Warning>

      <Checkbox
        checked={acknowledged}
        onChange={(e) => setAcknowledged(e.target.checked)}
        label="I understand this affects existing links"
      />

      <Button
        disabled={!acknowledged}
        onClick={onConfirm}
        variant="danger"
      >
        Confirm Changes
      </Button>
    </Dialog>
  );
}
```

### Related Requirements
FR-032c, FR-032d, FR-032e

---

## 9. RLS Policies for Multi-Tenant Isolation

### Decision
Implement RLS policies at each hierarchy level with tenant_id checks, avoid recursion by using direct tenant_id columns.

### Rationale
- Constitution Principle IV requires multi-tenant isolation
- Lesson learned from feature 002: avoid recursive policies (see FINAL_STATUS.md)
- Direct tenant_id on each table eliminates need for joins in policies
- Policies deny by default, explicitly allow tenant-scoped access

### Implementation Pattern
```sql
-- Events table RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can only access their own events"
ON events FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Sessions table RLS (includes tenant_id to avoid recursion)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can only access their own sessions"
ON sessions FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Similar for speeches, slides, activity_logs, event_metrics
```

### Related Requirements
Constitution Principles II, IV (Security First, Multi-Tenant Isolation)

---

## 10. Technology Stack Summary

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.18+ with TypeScript 5.3+
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Supabase Storage for slides
- **PDF Generation**: pdfkit + qrcode
- **ZIP Generation**: archiver
- **Rate Limiting**: express-rate-limit + Redis (production)
- **Testing**: Vitest for contract tests
- **Token Generation**: nanoid

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS 3.4+
- **UI Library**: Headless UI + custom components
- **State Management**: React hooks + Context API
- **API Client**: Fetch API with custom wrappers
- **Testing**: Jest + React Testing Library

### Infrastructure
- **Authentication**: Supabase Auth (admin authentication from feature 002)
- **File Storage**: Supabase Storage with signed URLs
- **Database**: Supabase PostgreSQL with RLS policies
- **Rate Limiting**: Redis (production), Memory (development)
- **Scheduled Jobs**: pg_cron or Node.js cron

---

## Implementation Priorities

1. **Phase 1A**: Database schema (events, sessions, speeches, slides, access_tokens, activity_logs, event_metrics)
2. **Phase 1B**: Backend services (event, session, speech, slide, token, metrics, rate limit)
3. **Phase 1C**: API routes with contract tests
4. **Phase 2A**: Admin UI (event creation, token display, hierarchy management)
5. **Phase 2B**: Organizer dashboard (metrics, activity log, file management)
6. **Phase 2C**: Public event page (hierarchical agenda, slide downloads)
7. **Phase 3**: Integration tests (full flow, token access, hierarchy CRUD)
8. **Phase 4**: Performance optimization (ZIP streaming, metrics caching)

---

## Research Complete

All technical decisions documented with rationale and implementation patterns. No NEEDS CLARIFICATION markers remain. Ready for Phase 1: Design & Contracts.
