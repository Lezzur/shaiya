# NEXUS Platform — Version Roadmap

> **How to read this document:** Each version is a self-contained milestone with clear boundaries. V1 ships a usable platform. Each subsequent version adds one module. After V1, you run `barker run` with the updated plan file — Barker skips completed tasks and builds only the new ones.

---

## Version Strategy

The NEXUS platform is built incrementally. Each version adds one module to the platform, with the first version establishing the foundation and the most critical operational module.

| Version | Codename | What Ships | Why This Order |
|---------|----------|------------|----------------|
| **V1** | **Foundation + Ops Desk** | Auth, shared data layer, platform shell, full Ops Desk module | Ops Desk is the operational backbone — clients, projects, invoices. Everything else hangs off it. |
| **V2** | **Content Engine** | AI content pipeline, brand profiles, generation queue, gallery, cost tracking | The revenue engine. Content generation is the core product. Depends on clients from V1. |
| **V3** | **Lead Engine** | Prospects, campaigns, sequences, email sending, reply detection, scoring | Client acquisition. Can operate independently but benefits from client data in Ops Desk. |
| **V4** | **Client Portal** | Client-facing review, approvals, assets, briefs, invoices, messaging | Client-facing layer. Requires Ops Desk (projects, invoices) and Content Engine (assets, brand profiles). |
| **V5** | **Proposals & Onboarding** | Proposal templates, PDF generation, tracking, e-acceptance, auto-onboarding | Sales acceleration. Requires Lead Engine (prospects) and Ops Desk (client creation). |
| **V6** | **Analytics Hub** | Platform connections, metrics ingestion, scoring, AI insights, reports, feedback loop | Intelligence layer. Requires Content Engine (content_assets to score) and Ops Desk (clients). |
| **V7** | **War Room** | Cross-module aggregation dashboard | Requires all modules to exist for meaningful data. |
| **V8** | **Website** | Public agency site, contact form, booking, blog | Can technically ship anytime, but depends on Lead Engine for contact→prospect flow. |
| **V9** | **Polish & Hardening** | Permissions, notifications, mobile, performance, search, security | Production hardening across all modules. |
| **V10** | **Productize** | Multi-tenant, onboarding wizard, billing, white-label, docs | Transform to SaaS product. |

### Why Ops Desk First?

Every module in the platform references `clients`. Ops Desk owns the `clients` table and the `projects`/`invoices`/`comments` infrastructure that the Content Engine, Client Portal, Proposals, and Analytics all depend on. Building Ops Desk first means:

- The shared data layer is proven with real CRUD before other modules build on it
- The `activity_log`, `comments`, and file upload patterns are established
- The platform shell (sidebar, layouts, auth) is fully functional
- You can immediately use the platform for client/project management while building the rest

---

## V1 — Foundation + Ops Desk

**Goal:** A deployed, usable platform with authentication, the shared data layer, and full client/project management.

**What you can do after V1:**
- Log in as admin or team member
- Create and manage clients (name, logo, industry, package tier, monthly value, health status)
- Create and manage projects (Kanban board with drag-and-drop, 8-stage workflow)
- Track deliverables per project with checklist
- Add comments on projects
- Upload files to Cloudflare R2
- Create and manage invoices with Stripe payment links
- View team workload and capacity
- See an Ops dashboard (MRR, active projects, deadlines, activity feed)
- Invite team members via email

**What doesn't exist yet:** Content generation, lead management, client portal, proposals, analytics, website, War Room.

### V1 Phases

#### Phase 1: Project Scaffolding

Set up the bare Next.js project with all tooling configured but no features.

**Tasks:**
1. **Initialize Next.js project** (Sonnet, ~5 min)
   - Next.js 14+ with App Router, TypeScript strict, Tailwind CSS, shadcn/ui
   - ESLint, Prettier, path aliases
   - Package.json with all shared dependencies

2. **Configure Prisma + database** (Sonnet, ~8 min)
   - Prisma ORM setup with PostgreSQL connection
   - Complete schema for ALL V1 tables: `users`, `clients`, `projects`, `deliverables`, `comments`, `invoices`, `activity_log`, `content_assets` (empty for now but schema-ready)
   - Run initial migration
   - Seed script with demo admin user

3. **Configure NextAuth** (Opus, ~10 min)
   - Email + password provider for internal users
   - Magic link provider for future client users
   - JWT session strategy with role field
   - Middleware protecting `(platform)` and `(portal)` route groups
   - API route auth guard helper: `withAuth(handler, { roles })`

4. **Platform layout shell** (Sonnet, ~10 min)
   - `(platform)/layout.tsx` — sidebar with module navigation, top bar with user menu
   - `(auth)/login/page.tsx` — login form
   - `(portal)/layout.tsx` — placeholder client portal shell
   - Responsive sidebar (collapsible on mobile)

5. **Shared UI components** (Sonnet, ~15 min)
   - DataTable (sortable, filterable, paginated — built on shadcn Table + tanstack-table)
   - StatusBadge, MetricCard, EmptyState, ConfirmDialog
   - FileUploader (R2 presigned URL upload)
   - CommentThread component
   - ActivityFeed component

6. **Shared utilities** (Sonnet, ~8 min)
   - R2 upload/download helpers with presigned URLs
   - `logActivity()` helper for unified activity logging
   - Date formatting, currency formatting, status color maps
   - Environment variable validation (zod)

**Phase gate:** `npx tsc --noEmit && npx prisma validate`

#### Phase 2: Client Management

Full CRUD for the `clients` entity — the data foundation everything else depends on.

**Tasks:**
1. **Client API routes** (Opus, ~10 min)
   - `POST /api/ops-desk/clients` — create with validation
   - `GET /api/ops-desk/clients` — list with search, filter by health status, pagination
   - `GET /api/ops-desk/clients/[id]` — detail with related projects and invoices count
   - `PATCH /api/ops-desk/clients/[id]` — update
   - `DELETE /api/ops-desk/clients/[id]` — soft delete or archive
   - Activity log entries on all mutations

2. **Client list page** (Sonnet, ~10 min)
   - `/ops-desk/clients/page.tsx` — DataTable with columns: name, industry, package tier, monthly value, health status, renewal date
   - Search by name/industry
   - Filter by health status
   - "New Client" button → create page

3. **Client create/edit forms** (Sonnet, ~8 min)
   - `/ops-desk/clients/new/page.tsx` — creation form
   - Form fields: name, logo upload, industry, package tier dropdown, monthly value, primary contact, health status, renewal date
   - Validation with zod
   - Success → redirect to client detail

4. **Client detail page** (Sonnet, ~12 min)
   - `/ops-desk/clients/[id]/page.tsx`
   - Header: name, logo, health badge, package tier, monthly value
   - Tabs or sections: Overview (key metrics), Projects (list), Invoices (list), Activity (feed)
   - Edit button → inline edit or modal
   - Quick actions: change health status, update renewal date

**Phase gate:** `test -f src/app/(platform)/ops-desk/clients/page.tsx`

#### Phase 3: Project Management

The Kanban board and project detail pages — the daily workhorse of the platform.

**Tasks:**
1. **Project API routes** (Opus, ~12 min)
   - Full CRUD for projects, deliverables
   - Status transitions with validation (can't skip stages)
   - Deliverables: create, update status, reorder
   - Comments: create, list by entity
   - Activity log on all mutations

2. **Project Kanban board** (Opus, ~15 min)
   - `/ops-desk/projects/page.tsx`
   - 8 columns: Briefing → Asset Prep → In Production → Internal Review → Client Review → Revision → Approved → Delivered
   - Drag-and-drop between columns with `@hello-pangea/dnd`
   - Card shows: title, client name, deadline (red if overdue), assigned avatar
   - Filter by client, assigned team member
   - "New Project" button

3. **Project detail page** (Sonnet, ~15 min)
   - `/ops-desk/projects/[id]/page.tsx`
   - Header: title, client (linked), status badge, deadline, assigned to
   - Brief section (rich text display)
   - Deliverables checklist (add, check off, reorder, link to content_asset)
   - Comments thread
   - File attachments (upload to R2)
   - Activity timeline

4. **Project create/edit** (Sonnet, ~8 min)
   - `/ops-desk/projects/new/page.tsx`
   - Form: title, client (dropdown), brief (textarea), deadline, assigned to (dropdown), status
   - Validation

**Phase gate:** `test -f src/app/(platform)/ops-desk/projects/page.tsx`

#### Phase 4: Invoicing & Financial Tracking

**Tasks:**
1. **Invoice API routes** (Opus, ~10 min)
   - Full CRUD with line items
   - Stripe payment link generation
   - Status management (draft → sent → paid/overdue)
   - Auto-overdue detection logic (called by future cron)

2. **Invoice list page** (Sonnet, ~8 min)
   - `/ops-desk/invoices/page.tsx`
   - DataTable: client, amount, status, due date, paid date
   - Filter by status, client
   - Totals row

3. **Invoice detail + create** (Sonnet, ~10 min)
   - `/ops-desk/invoices/[id]/page.tsx` — view with line items, status, payment link
   - `/ops-desk/invoices/new/page.tsx` — create form with dynamic line items (add/remove rows)
   - Generate Stripe payment link on send

4. **Stripe webhook handler** (Sonnet, ~8 min)
   - `/api/webhooks/stripe/route.ts`
   - Handle `payment_intent.succeeded` → update invoice status to paid
   - Handle `checkout.session.completed` for future proposal deposits
   - Signature verification

**Phase gate:** `test -f src/app/(platform)/ops-desk/invoices/page.tsx`

#### Phase 5: Team Management & Dashboard

**Tasks:**
1. **Team management** (Sonnet, ~10 min)
   - `/ops-desk/team/page.tsx` — team list with workload indicators
   - `/settings/team/page.tsx` — invite new member, manage roles
   - Invite flow: send email → set password → activate account
   - Capacity tracking: projects assigned vs capacity hours

2. **Ops Desk dashboard** (Opus, ~12 min)
   - `/ops-desk/page.tsx`
   - Metric cards: MRR (sum of active clients' monthly_value), Active Projects count, Projects by stage (mini-chart), Deadlines this week
   - Recent activity feed (from activity_log, filtered to ops_desk module)
   - Quick links to most-used actions

3. **Calendar view** (Sonnet, ~10 min)
   - `/ops-desk/calendar/page.tsx`
   - Project deadlines, delivery dates
   - Monthly/weekly view (react-big-calendar or similar)
   - Click event → navigate to project detail

**Phase gate:** `npm run build`

#### Phase 6: V1 Validation

Barker's Opus validator runs all checks and fixes cross-cutting issues.

**Validation checks:**
- `npm run build` — project compiles
- `npx tsc --noEmit` — no type errors
- `npx prisma validate` — schema is valid
- `npm run lint` — no lint errors

**Validator focus areas:**
- Cross-page navigation consistency (sidebar active states, breadcrumbs)
- Auth middleware correctly blocks unauthenticated access
- API routes return consistent error shapes
- All DataTable instances paginate correctly
- Kanban drag-and-drop updates database correctly
- Invoice Stripe integration handles edge cases

---

### V1 Summary

| Metric | Value |
|--------|-------|
| **Phases** | 6 (5 build + 1 validation) |
| **Tasks** | ~22 |
| **Opus tasks** | ~8 (36%) |
| **Sonnet tasks** | ~14 (64%) |
| **Estimated build time** | 3–5 hours (critical path, not total) |
| **Tables used** | users, clients, projects, deliverables, comments, invoices, activity_log |
| **Route groups active** | (auth), (platform)/ops-desk, (platform)/settings |
| **Pages** | ~15 |
| **API routes** | ~20 |

---

## V2 — Content Engine

**Depends on:** V1 (clients, file upload, comments, activity_log, auth)

**What ships:** Full AI content generation pipeline management.

**New capabilities after V2:**
- Create and manage brand profiles per client (colors, typography, tone, audience, character sheets)
- Register and configure content generation pipelines (n8n webhook integration)
- Manage a prompt library with version history and Monaco editor
- Trigger content generation jobs → dispatch to n8n → track in real-time queue
- View generated content in a visual gallery, filter by client/type/status
- Approve/reject content internally (internal_status workflow)
- Track AI API costs per client, per model, per pipeline
- Manage model registry (providers, costs, benchmarks)

**New tables activated:** brand_profiles, pipelines, prompt_templates, generation_jobs, model_registry, api_usage_logs

**New infrastructure:** Redis + BullMQ job queue, n8n webhook endpoints, SSE for real-time queue updates

### V2 Phases

#### Phase 7: Content Engine Infrastructure
- Redis + BullMQ setup (Docker Compose addition, worker process)
- n8n webhook route handlers (`/api/webhooks/n8n`)
- SSE endpoint for real-time job status (`/api/content-engine/queue`)
- API usage logging utility (wraps AI API calls, logs cost automatically)

#### Phase 8: Brand Profiles & Pipeline Management
- Brand profile CRUD API and pages
- Rich JSON editors for colors, typography, character sheets
- Pipeline registry CRUD and pages
- Pipeline trigger: select pipeline + client + params → BullMQ → n8n webhook

#### Phase 9: Prompt Library & Generation Queue
- Prompt template CRUD with Monaco editor integration
- Version history on prompts
- Categorization and search
- Generation queue page with SSE real-time progress
- BullMQ worker: dispatch n8n, handle callbacks, create content_assets

#### Phase 10: Gallery & Cost Tracking
- Output gallery: visual grid, filters (client, type, internal_status), thumbnails
- Asset detail page: full preview, internal status management, comments
- Model registry CRUD
- Cost tracker dashboard: per-client, per-model, per-pipeline breakdowns, trends
- Content Engine module dashboard (pipeline overview)

#### Phase 11: V2 Validation
- Validate build, types, lint
- Focus: BullMQ job lifecycle, n8n webhook round-trip, SSE stability, cost calculation accuracy, content_assets dual-status correctness

### V2 Barker Plan Strategy
- All V1 task IDs remain stable in the plan file
- New tasks use `p7-*` through `p11-*` IDs
- New tasks `depends_on` V1 tasks where needed (e.g., `p8-brand-profiles` depends on `p2-client-api`)
- Validation block updated to include BullMQ health check

---

## V3 — Lead Engine

**Depends on:** V1 (clients, activity_log, auth)

**What ships:** Complete outbound email campaign system with AI-powered classification.

**New capabilities after V3:**
- Import prospects from CSV, create manually, search and filter
- Build multi-step email sequences with templates, merge fields, A/B variants
- Send emails via Resend API with daily limits, warmup schedules, tracking
- Detect replies via Gmail API, classify with Claude API (interested/not interested/OOO/etc.)
- Score leads with AI-assisted configurable rules
- Pipeline Kanban: drag prospects through sales stages
- Campaign dashboard with send/open/reply metrics

**New tables activated:** prospects, campaigns, sequence_steps, email_events, replies

**New infrastructure:** Gmail API integration, Resend API send queue (BullMQ — uses V2's Redis), tracking pixel endpoint

### V3 Phases

#### Phase 12: Lead Engine Core
- Prospect CRUD API and pages (list, detail, create, CSV import)
- Campaign CRUD API and pages
- Sequence builder UI (add steps, set delays, write templates, A/B variants)

#### Phase 13: Send Engine & Reply Detection
- Email send engine: BullMQ queue, Resend API integration, warmup scheduling, daily limits
- Open/click tracking pixels and link wrapping
- Gmail API polling for reply detection
- Claude API reply classification and sentiment analysis
- Lead scoring engine (rule-based + AI-assisted)

#### Phase 14: Pipeline & Dashboard
- Pipeline Kanban (drag prospects through stages)
- Campaign dashboard (send volume, open rates, reply rates, pipeline value)
- Lead Engine module dashboard

#### Phase 15: V3 Validation
- Focus: email send rate limiting, tracking pixel delivery, Gmail API auth flow, classification accuracy

---

## V4 — Client Portal

**Depends on:** V1 (clients, projects, invoices), V2 (content_assets, brand_profiles)

**What ships:** Client-facing layer for content review, approval, and self-service.

**New capabilities after V4:**
- Clients log in via magic link to their own portal
- Review pending content, approve or request revisions with comments
- Browse and download delivered assets
- Submit new project briefs (creates Ops Desk project)
- View brand profile, request changes
- View and pay invoices via Stripe
- Message their account manager

**New tables activated:** messages (for client-team communication)

**New infrastructure:** Magic link email delivery, client data isolation middleware

### V4 Phases

#### Phase 16: Client Portal Core
- `(portal)/layout.tsx` with client branding
- Client dashboard: active projects, pending reviews, upcoming deliverables
- Magic link auth flow (send link → verify token → session with client_id)
- Data isolation: all portal queries scoped to `WHERE client_id = session.user.client_id`

#### Phase 17: Content Review & Assets
- Content review page: gallery of `client_status = 'pending'` items
- Review detail: full-size preview, approve/revise buttons, comment thread
- Asset library: all approved/done assets, search, filter, bulk download

#### Phase 18: Briefs, Brand, Invoices, Messaging
- Brief submission form → creates project in Ops Desk
- Brand Hub: read-only brand profile view, "request change" comment
- Invoice list with Stripe payment buttons
- Messaging: threaded conversations with account manager

#### Phase 19: V4 Validation
- Focus: data isolation security (client A cannot see client B's data), magic link flow, approval status transitions, brief→project creation

---

## V5 — Proposals & Onboarding

**Depends on:** V1 (clients, invoices), V3 (prospects)

**What ships:** Automated proposal generation, tracking, and client onboarding pipeline.

**New capabilities after V5:**
- Create and manage service packages (tiers, pricing, deliverables)
- Build proposal templates with sections and merge fields
- Generate personalized proposals with Claude API (intro, scope)
- Render proposals to branded PDF
- Send proposals with view tracking
- Public proposal view page with accept button
- Stripe Checkout for deposit payment
- On acceptance: auto-create client, user, brand profile, first invoice, first project, send welcome email

**New tables activated:** proposal_templates, proposals, packages

### V5 Phases

#### Phase 20: Package & Template Management
- Package CRUD API and pages
- Proposal template CRUD with section editor
- Merge field configuration

#### Phase 21: Proposal Generation & Tracking
- Create proposal flow: select prospect → packages → Claude personalizes → preview → save
- PDF generation (react-pdf or Puppeteer) → upload to R2
- Proposal list page with status tracking
- Public proposal view page `(proposal-view)/[proposal_id]`
- View tracking (pixel/URL hit)

#### Phase 22: E-Acceptance & Auto-Onboarding
- Accept page with Stripe Checkout integration
- Auto-onboarding transaction: create client + user + brand_profile + invoice + project
- Welcome email via Resend with magic link
- n8n webhook for team notifications + R2 bucket setup
- Update prospect stage to 'won'

#### Phase 23: V5 Validation
- Focus: PDF rendering quality, Stripe Checkout flow, onboarding transaction atomicity, prospect→client data handoff

---

## V6 — Analytics Hub

**Depends on:** V1 (clients), V2 (content_assets)

**What ships:** Content performance intelligence with social platform integration and AI insights.

**New capabilities after V6:**
- Connect client social accounts via OAuth (Instagram, LinkedIn, X, Facebook, TikTok, YouTube)
- Connect Google Analytics
- Daily automated metric ingestion per platform per client
- Per-piece content performance scoring with percentile ranking
- Monthly AI insights report per client (Claude API analysis)
- Branded PDF report generation
- Feedback loop: tag high-performing content → expose to Content Engine prompt library

**New tables activated:** platform_connections, content_metrics, content_scores, insight_reports, performance_tags

**New infrastructure:** Multiple OAuth provider configurations, daily cron jobs for metric pulls

### V6 Phases

#### Phase 24: Platform Connections & Data Ingestion
- OAuth flows for each platform (Meta, LinkedIn, X, TikTok, YouTube, GA)
- Encrypted token storage with refresh rotation
- Data ingestion workers (daily cron → BullMQ jobs → platform API pulls)
- Content metrics storage with deduplication

#### Phase 25: Scoring, Insights & Reports
- Content scoring algorithm (percentile within client's history)
- AI insights engine: monthly Claude analysis per client
- Report generator: branded PDF with charts, gallery, AI narrative
- Report list and detail pages

#### Phase 26: Feedback Loop & Dashboard
- Performance tagging: auto-tag high-performing content attributes
- Expose performance_tags to Content Engine (prompt library can query "what styles score best for this client")
- Analytics Hub dashboard: connections status, scoring overview, recent reports

#### Phase 27: V6 Validation
- Focus: OAuth token refresh handling, metric deduplication, score calculation accuracy, report PDF quality

---

## V7 — War Room

**Depends on:** V1–V6 (all modules must exist for meaningful aggregation)

**What ships:** Platform-wide aggregation dashboard — the "god view."

### V7 Phases

#### Phase 28: War Room Dashboard
- Top row: MRR, Content Produced, Pipeline Value, API Spend (MTD) — each with trend indicators
- Middle row: Production Floor (project Kanban summary), Content Pipelines (queue depth), Live Activity (real-time feed)
- Bottom row: Client health distribution, Proposal status list, Lead Engine campaign metrics
- Date range selector, auto-refresh, click-through to source modules
- Notification badges (overdue invoices, failed jobs, pending approvals)

#### Phase 29: V7 Validation
- Focus: query performance across all tables, data accuracy vs individual module dashboards, refresh behavior

---

## V8 — Website

**Depends on:** V3 (prospects — contact form creates prospect), V5 (packages — pricing page)

**What ships:** Public agency website integrated into the same codebase.

### V8 Phases

#### Phase 30: Website Pages
- Homepage: hero, services overview, social proof, CTA
- Services: interactive pricing cards from `packages` table
- Portfolio: filterable grid (curated content or consented client content)
- Case study detail pages
- Blog: MDX listing + detail, SEO meta, tags

#### Phase 31: Lead Capture & Booking
- Contact form → creates `contact_submissions` + `prospects` record + confirmation email
- Meeting booker: Google Calendar API, slot display, event creation
- SEO: sitemap.xml, robots.txt, structured data, OG tags

#### Phase 32: V8 Validation
- Focus: SEO meta correctness, contact form → Lead Engine flow, Calendar API auth, page load performance

---

## V9 — Polish & Production Hardening

**Depends on:** V1–V8

### V9 Phases

#### Phase 33: Permissions & Notifications
- Granular team permissions matrix (beyond 3 roles)
- In-app notification system (bell icon) + email notification preferences
- Notification triggers: brief submitted, content ready, invoice paid, proposal viewed, deadline approaching

#### Phase 34: Performance & Security
- Database index optimization (see index strategy in platform spec)
- Query optimization (N+1 prevention, proper eager loading)
- Rate limiting on public API routes and webhook endpoints
- Security audit: CSRF, XSS, SQL injection review, secure headers
- Error tracking (Sentry integration)
- Automated PostgreSQL backups to R2

#### Phase 35: UX Polish
- Mobile responsiveness (priority: Ops Desk Kanban, War Room)
- Loading skeletons for all data-fetching pages
- Optimistic updates for status changes
- Full-text search across prospects, clients, content, prompts
- CSV data export for all major entities
- Consistent error pages and empty states

#### Phase 36: V9 Validation
- Focus: permission enforcement, notification delivery, mobile breakpoints, search accuracy, export correctness

---

## V10 — Productize

**Depends on:** V1–V9

### V10 Phases

#### Phase 37: Multi-Tenant Architecture
- Row-level security or tenant_id on all tables
- Tenant context in middleware
- Tenant admin vs platform admin distinction
- Data isolation verification

#### Phase 38: SaaS Infrastructure
- Stripe subscription management (free trial, starter, growth, enterprise tiers)
- Usage-based billing for AI API costs (metered billing)
- Onboarding wizard for new agencies
- White-labeling: custom logo, colors, domain per tenant

#### Phase 39: Documentation & Marketing
- User documentation
- API documentation (for agencies wanting integrations)
- Admin guide
- Product marketing landing page

#### Phase 40: V10 Validation
- Focus: tenant isolation (tenant A cannot access tenant B), subscription lifecycle, billing accuracy, onboarding flow completion rate

---

## Version Dependency Graph

```
V1 (Foundation + Ops Desk)
├── V2 (Content Engine) ──── requires V1.clients, V1.activity_log
│   └── V6 (Analytics Hub) ── requires V2.content_assets
│       └── V7 (War Room) ─── requires V1–V6
├── V3 (Lead Engine) ──────── requires V1.auth
│   ├── V5 (Proposals) ────── requires V3.prospects + V1.clients
│   └── V8 (Website) ──────── requires V3.prospects + V5.packages
├── V4 (Client Portal) ────── requires V1.clients/projects/invoices + V2.content_assets
└── V9 (Polish) ───────────── requires V1–V8
    └── V10 (Productize) ──── requires V9
```

**Flexible ordering:** V2 and V3 could technically be swapped. V8 (Website) could ship as early as after V3 if you want the public site sooner. The ordering above optimizes for building the highest-value internal tools first.

---

## Cumulative Statistics

| Version | New Tasks (est.) | Total Tasks (cumul.) | New Pages | New API Routes | New Tables |
|---------|-----------------|---------------------|-----------|----------------|------------|
| V1 | ~22 | 22 | ~15 | ~20 | 7 |
| V2 | ~18 | 40 | ~12 | ~15 | 6 |
| V3 | ~16 | 56 | ~10 | ~12 | 5 |
| V4 | ~14 | 70 | ~10 | ~10 | 1 |
| V5 | ~14 | 84 | ~8 | ~10 | 3 |
| V6 | ~14 | 98 | ~8 | ~8 | 5 |
| V7 | ~4 | 102 | ~1 | ~0 | 0 |
| V8 | ~10 | 112 | ~8 | ~4 | 3 |
| V9 | ~12 | 124 | ~0 (mods) | ~2 | 0 |
| V10 | ~12 | 136 | ~5 | ~5 | 0 (mods) |

**Total estimated:** ~136 tasks across 10 versions, ~40 phases, ~77 pages, ~86 API routes, 30 tables.
