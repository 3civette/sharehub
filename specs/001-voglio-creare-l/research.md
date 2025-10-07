# Research: Hotel Admin Dashboard

**Feature**: Hotel Admin Dashboard
**Date**: 2025-10-06
**Status**: Complete

## Overview
This document captures research decisions for implementing the ShareHub hotel admin dashboard with multi-tenant branding customization, activity logging, and token-based access control.

---

## 1. Dashboard Metrics Calculation

### Decision
Use **Supabase PostgreSQL aggregate queries** with **page-load refresh** (no caching layer initially).

### Rationale
- Simplicity: Direct queries to Supabase avoid additional infrastructure
- Performance: Modern PostgreSQL handles simple aggregations efficiently
- Requirements: FR-005 specifies page-load refresh (no real-time needed)
- Scale: Initial 100 hotels × 10 avg events = 1000 rows, easily handled

### Implementation Approach
```typescript
// Backend service: src/services/metrics.ts
async function getDashboardMetrics(tenantId: string) {
  // Count active upcoming events
  const { count: activeEventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('event_date', new Date().toISOString())
    .eq('status', 'active');

  // Get most recent activity
  const { data: recentActivity } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    active_events_count: activeEventsCount || 0,
    last_activity_at: recentActivity?.created_at || null
  };
}
```

### Alternatives Considered
- **Redis caching**: Rejected - adds complexity, overkill for initial scale
- **Real-time subscriptions**: Rejected - not required per FR-005
- **Materialized views**: Rejected - premature optimization

---

## 2. Branding Inheritance & Customization

### Decision
Use **JSONB columns** for branding data with **CSS custom properties** for theme application.

### Rationale
- Flexibility: JSONB allows schema evolution without migrations
- Granularity: Per-element customization flags fit naturally in JSON structure
- Performance: PostgreSQL JSONB is indexed and queryable
- Preview: CSS custom properties enable instant theme switching without reloading

### Implementation Approach

**Database Schema**:
```sql
-- tenants table enhancement
ALTER TABLE tenants ADD COLUMN branding_config JSONB DEFAULT '{
  "colors": {"primary": "#3B82F6", "secondary": "#10B981"},
  "logo_url": null,
  "advertisements": []
}'::jsonb;

-- events table enhancement
ALTER TABLE events ADD COLUMN branding_overrides JSONB DEFAULT '{
  "colors": {"value": null, "customizable": true},
  "logo_url": {"value": null, "customizable": true},
  "advertisements": {"value": null, "customizable": true}
}'::jsonb;
```

**Frontend Theme Application**:
```typescript
// Apply branding to page
function applyBranding(branding: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', branding.colors.primary);
  root.style.setProperty('--color-secondary', branding.colors.secondary);
  // Logo and ads rendered via React components
}
```

**Inheritance Logic**:
```typescript
// Resolve effective branding for an event
function resolveEventBranding(hotelBranding, eventOverrides) {
  return {
    colors: eventOverrides.colors.customizable && eventOverrides.colors.value
      ? eventOverrides.colors.value
      : hotelBranding.colors,
    logo_url: eventOverrides.logo_url.customizable && eventOverrides.logo_url.value
      ? eventOverrides.logo_url.value
      : hotelBranding.logo_url,
    advertisements: eventOverrides.advertisements.customizable && eventOverrides.advertisements.value
      ? eventOverrides.advertisements.value
      : hotelBranding.advertisements
  };
}
```

### Alternatives Considered
- **Separate branding tables**: Rejected - JSONB simpler for this use case
- **Tailwind dynamic classes**: Rejected - CSS custom properties more flexible
- **Iframe preview**: Rejected - inline with scoped styles lighter weight

---

## 3. Activity Logging

### Decision
Create dedicated **`activity_logs` table** with **7-day retention** policy (configurable).

### Rationale
- Separation: Dedicated table keeps events table clean
- Query performance: Indexed by tenant_id + created_at
- Retention: Dashboard only shows last 3-5 items (FR-010), no need for long history
- Future-proof: Can add more event types without schema changes

### Implementation Approach

**Schema**:
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'organizer', 'participant', 'system')),
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_tenant_created ON activity_logs(tenant_id, created_at DESC);
CREATE INDEX idx_activity_logs_event ON activity_logs(event_id) WHERE event_id IS NOT NULL;

-- Retention policy (run daily)
DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '7 days';
```

**Logging Helper**:
```typescript
async function logActivity(params: {
  tenantId: string;
  eventId?: string;
  actorType: 'admin' | 'organizer' | 'participant' | 'system';
  actionType: string;
  metadata?: Record<string, any>;
}) {
  await supabase.from('activity_logs').insert({
    tenant_id: params.tenantId,
    event_id: params.eventId,
    actor_type: params.actorType,
    action_type: params.actionType,
    metadata: params.metadata || {}
  });
}
```

### Alternatives Considered
- **Event sourcing**: Rejected - too complex for simple activity log
- **Append to events metadata**: Rejected - pollutes events table, poor query performance

---

## 4. Token Generation & Display

### Decision
Use **nanoid** (21 chars, URL-safe) for both organizer and participant tokens.

### Rationale
- Security: 21-char nanoid has ~149 years to 1% collision probability at 1000 IDs/hour
- URL-safe: No special characters, works in URLs without encoding
- Short: More user-friendly than UUID (36 chars)
- Standard: Well-established library with TypeScript support

### Implementation Approach

**Token Generation**:
```typescript
import { nanoid } from 'nanoid';

async function createEvent(eventData) {
  const organizerToken = nanoid(); // e.g., "V1StGXR8_Z5jdHi6B-myT"
  const participantToken = nanoid();

  const { data, error } = await supabase.from('events').insert({
    ...eventData,
    organizer_token: organizerToken,
    participant_token: participantToken
  });

  return { ...data, organizerToken, participantToken };
}
```

**Copy-to-Clipboard** (Frontend):
```typescript
function TokenDisplay({ label, token }: { label: string; token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="bg-gray-100 px-3 py-2 rounded">{token}</code>
      <button onClick={handleCopy} className="btn-secondary">
        {copied ? 'Copiato!' : 'Copia'}
      </button>
    </div>
  );
}
```

### Alternatives Considered
- **UUID v4**: Rejected - longer, less user-friendly
- **Custom short codes**: Rejected - reinventing the wheel, collision risk

---

## 5. Multi-tenant Data Isolation

### Decision
Use **Supabase Row-Level Security (RLS)** policies + **backend middleware** for double-layer isolation.

### Rationale
- Defense in depth: RLS at database + middleware at API layer
- Supabase native: RLS integrates with Supabase Auth
- Zero trust: Even if backend is compromised, RLS prevents cross-tenant access
- Performance: Postgres RLS is efficient with proper indexing

### Implementation Approach

**RLS Policies**:
```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can only access their tenant's data
CREATE POLICY "Admins access own tenant"
  ON tenants FOR ALL
  USING (id IN (
    SELECT tenant_id FROM admins WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins access own tenant events"
  ON events FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM admins WHERE user_id = auth.uid()
  ));
```

**Backend Middleware**:
```typescript
// src/middleware/tenantContext.ts
export function extractTenantId(req: Request): string {
  const user = req.user; // From Supabase JWT
  const tenantId = user.tenant_id; // Stored in user metadata or admins table
  if (!tenantId) throw new Error('No tenant context');
  return tenantId;
}

// Usage in routes
app.get('/api/events', async (req, res) => {
  const tenantId = extractTenantId(req);
  const events = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', tenantId); // Redundant with RLS but explicit
  res.json(events);
});
```

### Alternatives Considered
- **Backend-only isolation**: Rejected - single point of failure
- **Schema-per-tenant**: Rejected - complex, not needed at this scale

---

## 6. Next.js 14 App Router Patterns

### Decision
Use **Server Components** for dashboard data fetching + **Client Components** for interactive UI.

### Rationale
- Performance: Server components reduce client bundle, faster initial load
- SEO: Server-rendered dashboard (though behind auth)
- Simplicity: Next.js 14 recommends server components by default
- Interactivity: Client components for forms, buttons, real-time features

### Implementation Approach

**Dashboard Page** (Server Component):
```typescript
// app/admin/dashboard/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import MetricCard from '@/components/dashboard/MetricCard'; // Client
import ActivityLog from '@/components/dashboard/ActivityLog'; // Client

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  // Server-side data fetching
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.user_metadata?.tenant_id;

  const metrics = await fetch(`${process.env.API_URL}/dashboard/metrics/${tenantId}`);
  const activities = await fetch(`${process.env.API_URL}/dashboard/activity/${tenantId}`);

  return (
    <div>
      <h1>Dashboard - {user?.user_metadata?.hotel_name}</h1>
      <MetricCard data={metrics} /> {/* Client component */}
      <ActivityLog activities={activities} /> {/* Client component */}
    </div>
  );
}
```

**Login Redirect** (Middleware):
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  // Redirect authenticated users from login to dashboard
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  // Redirect unauthenticated users from admin pages to login
  if (!session && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/login', '/admin/:path*']
};
```

### Alternatives Considered
- **Client-only SPA**: Rejected - slower initial load, no SSR benefits
- **Pages Router**: Rejected - App Router is Next.js 14 standard

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Metrics | PostgreSQL aggregates, page-load refresh | Simplicity, meets requirements |
| Branding | JSONB + CSS custom properties | Flexibility, instant preview |
| Activity Logging | Dedicated table, 7-day retention | Clean separation, performance |
| Tokens | nanoid (21 chars) | Security, URL-safe, user-friendly |
| Multi-tenancy | RLS + backend middleware | Defense in depth |
| Next.js Pattern | Server Components + Client for interactivity | Performance, best practices |

---

## Open Questions / Future Enhancements

1. **Metrics Caching**: Monitor query performance, add Redis if dashboard load >2s
2. **Activity Retention**: Make retention period configurable per tenant
3. **Branding Themes**: Consider predefined theme templates for quick setup
4. **Token Expiry**: Consider optional expiry dates for tokens
5. **Real-time Updates**: Could add for activity log if users request it

---

**Status**: ✅ All research complete, ready for Phase 1 (Design & Contracts)
