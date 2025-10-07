# ShareHub Constitution

## Core Principles

### I. No Easy Fixes (NON-NEGOTIABLE)
**Never take shortcuts or quick fixes that mask underlying problems.**
- When encountering errors, investigate and fix root causes
- Temporary workarounds (like disabling security) are forbidden in development
- Document why each solution addresses the actual problem, not symptoms
- Example: RLS policy causing recursion? Fix the policy logic, don't disable RLS

### II. Security First
**Security features must be properly configured, never bypassed.**
- Row Level Security (RLS) must be enabled and correctly implemented
- No production code should bypass authentication or authorization
- RLS policies must be tested to avoid infinite recursion
- Use least privilege principle: grant only necessary permissions

### III. Test-Driven Development (TDD)
**Tests written first, implementation second.**
- Write contract tests before implementation
- Red-Green-Refactor cycle strictly enforced
- Tests must fail initially to prove they test the right behavior
- No code ships without corresponding tests

### IV. Multi-Tenant Isolation
**Strict data separation between tenants.**
- Every table must have tenant_id foreign key
- RLS policies enforce tenant-scoped queries
- No cross-tenant data leakage allowed
- Test multi-tenant isolation explicitly

### V. UX-First Design
**User experience drives technical decisions.**
- Features must solve real user problems
- Performance targets: <1s preview, <2s listings, <10s uploads
- Simple interfaces over complex options
- Mobile-responsive by default

### VI. Simplicity
**Choose simple solutions over complex ones.**
- Use proven libraries and frameworks (Supabase, Next.js)
- Avoid premature optimization
- YAGNI: You Aren't Gonna Need It
- Complexity must be justified and documented

## Technical Standards

### Database (Supabase PostgreSQL)
- **RLS Policies**: Must avoid infinite recursion via self-referencing queries
- **Migrations**: Applied via Supabase Dashboard, versioned in git
- **Schema**: Soft delete (deleted_at), audit logs, JSONB for flexible schemas
- **Performance**: Indexes on foreign keys, tenant_id, and common queries

### Backend (Express.js + TypeScript)
- **Architecture**: Service layer pattern, middleware pipeline
- **Error Handling**: Centralized error handler, proper HTTP status codes
- **Validation**: Input validation at API boundary
- **Testing**: Contract tests for all API endpoints

### Frontend (Next.js 14 + React 18)
- **Routing**: App Router with dynamic routes
- **State**: React hooks, Context for tenant branding
- **Styling**: Tailwind CSS with dynamic CSS variables
- **Authentication**: Supabase Auth Helpers

## Development Workflow

### Problem-Solving Process
1. **Identify root cause** - Never guess, investigate fully
2. **Research proper solution** - Read docs, check patterns
3. **Implement fix** - Address the actual problem
4. **Test fix** - Verify it solves the issue completely
5. **Document** - Explain why this solution is correct

### Quality Gates
- All tests must pass before merging
- RLS policies tested for recursion and correctness
- API contracts verified with contract tests
- Multi-tenant isolation explicitly tested

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]
<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->