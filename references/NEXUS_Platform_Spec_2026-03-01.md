# NEXUS Unified Platform — Complete Build Plan

> **Extracted from:** `nexus-master-build-plan.md` (Track B)
> **Scope:** Monolithic Next.js platform consolidating 7 agency modules into a single codebase, single database, single deployment.
> **Estimated timeline:** 18+ weeks across 12 phases

---

## 1. Platform Overview

NEXUS is a monolithic Next.js application where each of 7 agency tools becomes a module sharing a single PostgreSQL database, a unified auth system, and common infrastructure. The War Room — a cross-module aggregation dashboard — serves as the platform home screen.

### The 7 Modules

| Module | Purpose | Primary Users |
|--------|---------|---------------|
| **War Room** | Platform-wide dashboard aggregating all modules | Admin, Team |
| **Lead Engine** | Lead generation, outreach, and sales pipeline | Admin, Team |
| **Ops Desk** | Client & project management, invoicing, team workload | Admin, Team |
| **Content Engine** | AI content generation pipeline management | Admin, Team |
| **Client Portal** | Client-facing review, approvals, assets, briefs | Clients |
| **Proposal Machine** | Proposal creation, tracking, e-acceptance, auto-onboarding | Admin, Team |
| **Analytics Hub** | Content performance data, scoring, AI insights, reports | Admin, Team |
| **Website** | Public-facing agency site with lead capture & booking | Public |

### Why Monolith

- Single team / solo founder — microservices add unnecessary operational overhead
- Shared data model eliminates sync issues between modules
- One deployment, one database, one codebase to maintain
- Next.js route groups give clean module separation without microservice complexity
- Can extract modules later if independent scaling is needed

---

## 2. Unified Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 14+ (App Router) | Route groups for module separation |
| **Language** | TypeScript (strict mode) | Shared types across all modules |
| **Styling** | Tailwind CSS + shadcn/ui | Consistent design system |
| **Database** | PostgreSQL (single instance) | Shared schema |
| **ORM** | Prisma | Type-safe queries, migration tooling |
| **Auth** | NextAuth.js | Role-based: `admin`, `team`, `client`; password for internal, magic link for clients |
| **Job Queue** | Redis + BullMQ | Content generation, email sending, data ingestion, scheduled tasks |
| **File Storage** | Cloudflare R2 | All assets, proposals, uploads, generated content |
| **Email** | Resend API | Transactional + outreach emails |
| **AI (Primary)** | Claude API | Reply classification, lead scoring, content insights, proposal personalization |
| **AI (Generation)** | Replicate, fal.ai, Runway, ElevenLabs | Image/video/audio content generation via n8n pipelines |
| **Automation** | n8n (self-hosted) | Complex workflows, pipeline orchestration, webhook routing |
| **Payments** | Stripe | Payment links on invoices, Checkout for proposal deposits |
| **Calendar** | Google Calendar API | Meeting booking on public website |
| **Social APIs** | Meta Graph, LinkedIn, X, YouTube Data, TikTok | Analytics Hub data ingestion |
| **Analytics** | Google Analytics Data API | Website performance metrics |
| **PDF** | @react-pdf/renderer or Puppeteer | Proposals, reports |
| **Rich Text** | Monaco Editor (prompts), MDX (blog) | Prompt library editing, blog content |
| **Drag & Drop** | @hello-pangea/dnd | Kanban boards (Ops Desk projects, Lead Engine pipeline) |
| **Real-Time** | Server-Sent Events (SSE) | Generation queue progress, live activity feed |
| **Charts** | Recharts | Dashboards, analytics, cost tracking |
| **Deployment** | Coolify on Hetzner VPS | Single deploy target |

### Gap Patch: Additional Infrastructure

The original document mentions these technologies in the Track A specs but doesn't explicitly list them for Track B. They are required:

| Addition | Why |
|----------|-----|
| **Rate limiting middleware** | Protect API routes, especially email send engine and AI generation endpoints |
| **Cron / scheduled jobs** | Analytics data ingestion (daily pulls), email warmup scheduling, invoice overdue detection, report generation |
| **Error tracking (e.g., Sentry)** | Production monitoring across all modules |
| **Logging** | Structured logging for job queue failures, API errors, webhook delivery |
| **Image optimization** | Next.js `<Image>` for portfolio, content gallery thumbnails |
| **Search** | Full-text search across prospects, clients, content assets, prompts (PostgreSQL `tsvector` or Meilisearch) |
| **Environment management** | `.env.local`, `.env.production`, env validation via `zod` or `t3-env` |

---

## 3. Unified Data Model

### 3.1 Core Entities (Shared Across Modules)

These are the foundation tables that multiple modules read from and write to. Ownership (which module has primary CRUD responsibility) is noted.

#### `users` — Owned by: Auth / Settings

```
id                  UUID PRIMARY KEY
email               VARCHAR UNIQUE NOT NULL
name                VARCHAR NOT NULL
role                ENUM('admin', 'team', 'client') NOT NULL
avatar              VARCHAR (R2 URL, nullable)
capacity            INTEGER (hours per week, nullable — internal users only)
skills              TEXT[] (nullable — internal users only)
auth_method         ENUM('password', 'magic_link') NOT NULL
client_id           UUID REFERENCES clients (nullable — set for client-role users)
created_at          TIMESTAMP NOT NULL DEFAULT NOW()
updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
```

**Gap Patch:** Added `client_id` foreign key for client-role users so the portal knows which client record they belong to. Added `created_at` / `updated_at` timestamps (missing from original).

#### `clients` — Owned by: Ops Desk (CRUD), created by Proposal Machine on acceptance

```
id                  UUID PRIMARY KEY
name                VARCHAR NOT NULL
logo                VARCHAR (R2 URL, nullable)
industry            VARCHAR
package_tier        VARCHAR (references packages.tier)
monthly_value       DECIMAL(10,2)
lifetime_value      DECIMAL(10,2) DEFAULT 0
primary_contact_id  UUID REFERENCES users (the client-role user)
health_status       ENUM('healthy', 'at_risk', 'churned') DEFAULT 'healthy'
renewal_date        DATE (nullable)
r2_bucket_path      VARCHAR (per-client storage prefix)
created_at          TIMESTAMP NOT NULL DEFAULT NOW()
updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
```

**Gap Patch:** Added `created_at` / `updated_at`. Clarified `package_tier` links to `packages` table.

#### `content_assets` — The Single Source of Truth

```
id                  UUID PRIMARY KEY
client_id           UUID REFERENCES clients NOT NULL
project_id          UUID REFERENCES projects (nullable)
generation_job_id   UUID REFERENCES generation_jobs (nullable)
type                ENUM('social_post', 'blog', 'video', 'illustration', 'carousel', 'story', 'reel', 'other')
file_url            VARCHAR NOT NULL (R2 URL)
thumbnail_url       VARCHAR (R2 URL, nullable)
internal_status     ENUM('draft', 'qa_passed', 'sent_to_client') DEFAULT 'draft'
client_status       ENUM('pending', 'approved', 'revision_requested', 'done') DEFAULT 'pending'
version             INTEGER DEFAULT 1
parent_asset_id     UUID REFERENCES content_assets (nullable — version history chain)
metadata            JSONB (dimensions, duration, format, caption, hashtags, etc.)
created_at          TIMESTAMP NOT NULL DEFAULT NOW()
updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
```

**Dual-status pattern:** Internal team manages `internal_status` (draft → qa_passed → sent_to_client). Client manages `client_status` (pending → approved / revision_requested → done). This resolves the overlap where Content Engine, Ops Desk, and Client Portal all need to interact with content.

#### `activity_log` — Unified Activity Stream

```
id                  UUID PRIMARY KEY
timestamp           TIMESTAMP NOT NULL DEFAULT NOW()
actor_id            UUID REFERENCES users NOT NULL
module              ENUM('lead_engine', 'ops_desk', 'content_engine', 'client_portal', 'proposals', 'analytics', 'website', 'system')
action              VARCHAR NOT NULL (e.g., 'created', 'updated', 'approved', 'sent', 'signed_in')
entity_type         VARCHAR NOT NULL (e.g., 'project', 'prospect', 'content_asset', 'proposal')
entity_id           UUID NOT NULL
metadata            JSONB (action-specific details)
```

**Gap Patch:** Added `'system'` to module enum for automated actions (cron jobs, webhook triggers). Added index recommendation: `CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp DESC)` and `CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id)`.

---

### 3.2 Module-Specific Entities

#### Lead Engine

```
prospects
├── id              UUID PRIMARY KEY
├── name            VARCHAR NOT NULL
├── email           VARCHAR NOT NULL
├── company         VARCHAR
├── industry        VARCHAR
├── enrichment_data JSONB (nullable)
├── score           INTEGER DEFAULT 0
├── stage           ENUM('new', 'contacted', 'engaged', 'discovery_call', 'proposal_sent', 'won', 'lost') DEFAULT 'new'
├── source          VARCHAR (e.g., 'website_form', 'csv_import', 'manual')
├── assigned_to     UUID REFERENCES users (nullable)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

campaigns
├── id              UUID PRIMARY KEY
├── name            VARCHAR NOT NULL
├── status          ENUM('draft', 'active', 'paused', 'completed') DEFAULT 'draft'
├── config          JSONB (send windows, timezone, etc.)
├── daily_send_limit INTEGER DEFAULT 50
├── warmup_schedule JSONB (nullable — day-by-day ramp)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

sequence_steps
├── id              UUID PRIMARY KEY
├── campaign_id     UUID REFERENCES campaigns NOT NULL
├── order           INTEGER NOT NULL
├── delay_days      INTEGER NOT NULL
├── template        TEXT NOT NULL (email body with {{merge_fields}})
├── merge_fields    TEXT[] (field names used)
├── variant_a       TEXT (nullable — A/B test variant)
├── variant_b       TEXT (nullable)
├── subject_line    VARCHAR NOT NULL
├── subject_variant VARCHAR (nullable — A/B subject)

email_events
├── id              UUID PRIMARY KEY
├── prospect_id     UUID REFERENCES prospects NOT NULL
├── campaign_id     UUID REFERENCES campaigns NOT NULL
├── step_id         UUID REFERENCES sequence_steps NOT NULL
├── type            ENUM('sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed')
├── timestamp       TIMESTAMP NOT NULL
├── metadata        JSONB (tracking pixel ID, link clicked, bounce reason, etc.)

replies
├── id              UUID PRIMARY KEY
├── prospect_id     UUID REFERENCES prospects NOT NULL
├── email_event_id  UUID REFERENCES email_events (nullable)
├── body            TEXT NOT NULL
├── classification  ENUM('interested', 'not_interested', 'out_of_office', 'unsubscribe', 'question', 'other')
├── sentiment       ENUM('positive', 'neutral', 'negative')
├── ai_confidence   DECIMAL(3,2) (0.00–1.00)
├── classified_at   TIMESTAMP
```

**Gap Patch:** Added `subject_line` and `subject_variant` to `sequence_steps` (emails need subjects). Added `bounced` and `unsubscribed` to email event types. Added `classified_at` to replies. Added `merge_fields` array for template validation.

#### Ops Desk

```
projects
├── id              UUID PRIMARY KEY
├── client_id       UUID REFERENCES clients NOT NULL
├── title           VARCHAR NOT NULL
├── brief           TEXT
├── status          ENUM('briefing', 'asset_prep', 'in_production', 'internal_review', 'client_review', 'revision', 'approved', 'delivered') DEFAULT 'briefing'
├── deadline        DATE (nullable)
├── assigned_to     UUID REFERENCES users (nullable)
├── template_id     UUID (nullable — project template reference)
├── time_tracked_minutes INTEGER DEFAULT 0
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

deliverables
├── id              UUID PRIMARY KEY
├── project_id      UUID REFERENCES projects NOT NULL
├── title           VARCHAR NOT NULL
├── status          ENUM('pending', 'in_progress', 'done') DEFAULT 'pending'
├── order           INTEGER NOT NULL
├── content_asset_id UUID REFERENCES content_assets (nullable — links to generated content)

comments
├── id              UUID PRIMARY KEY
├── entity_type     ENUM('project', 'content_asset', 'proposal', 'brand_profile')
├── entity_id       UUID NOT NULL
├── author_id       UUID REFERENCES users NOT NULL
├── body            TEXT NOT NULL
├── created_at      TIMESTAMP NOT NULL DEFAULT NOW()

invoices
├── id              UUID PRIMARY KEY
├── client_id       UUID REFERENCES clients NOT NULL
├── project_id      UUID REFERENCES projects (nullable)
├── amount          DECIMAL(10,2) NOT NULL
├── status          ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft'
├── due_date        DATE NOT NULL
├── paid_at         TIMESTAMP (nullable)
├── stripe_payment_link VARCHAR (nullable)
├── stripe_payment_id VARCHAR (nullable)
├── line_items      JSONB (description, quantity, unit_price per line)
├── notes           TEXT (nullable)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP
```

**Gap Patch:** Broadened `comments.entity_type` to support commenting on proposals and brand profiles (Client Portal "request change" flow). Added `line_items` and `notes` to invoices (an invoice needs itemization). Added `cancelled` status to invoices.

#### Content Engine

```
brand_profiles
├── id              UUID PRIMARY KEY
├── client_id       UUID REFERENCES clients UNIQUE NOT NULL
├── colors          JSONB (primary, secondary, accent, background)
├── typography      JSONB (heading font, body font, sizes)
├── tone_of_voice   TEXT
├── target_audience TEXT
├── example_urls    TEXT[] (reference content URLs)
├── style_ref_urls  TEXT[] (R2 URLs for uploaded style references)
├── character_sheets JSONB (persona definitions for AI generation)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

pipelines
├── id              UUID PRIMARY KEY
├── name            VARCHAR NOT NULL
├── type            VARCHAR NOT NULL (e.g., 'social_carousel', 'blog_post', 'short_video')
├── status          ENUM('active', 'inactive', 'error') DEFAULT 'active'
├── webhook_url     VARCHAR NOT NULL (n8n webhook endpoint)
├── config          JSONB (pipeline-specific parameters)
├── last_run        TIMESTAMP (nullable)
├── total_processed INTEGER DEFAULT 0
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

prompt_templates
├── id              UUID PRIMARY KEY
├── pipeline_id     UUID REFERENCES pipelines (nullable — can be standalone)
├── content_type    VARCHAR NOT NULL
├── body            TEXT NOT NULL
├── version         INTEGER DEFAULT 1
├── performance_notes TEXT (nullable)
├── ab_notes        TEXT (nullable)
├── is_active       BOOLEAN DEFAULT true
├── category        VARCHAR (nullable — for prompt library organization)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

generation_jobs
├── id              UUID PRIMARY KEY
├── pipeline_id     UUID REFERENCES pipelines NOT NULL
├── client_id       UUID REFERENCES clients NOT NULL
├── brand_profile_id UUID REFERENCES brand_profiles NOT NULL
├── params          JSONB NOT NULL (inputs passed to n8n)
├── status          ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'queued'
├── started_at      TIMESTAMP (nullable)
├── completed_at    TIMESTAMP (nullable)
├── total_cost      DECIMAL(8,4) DEFAULT 0
├── error_message   TEXT (nullable)
├── created_at      TIMESTAMP

model_registry
├── id              UUID PRIMARY KEY
├── name            VARCHAR NOT NULL (e.g., 'claude-sonnet-4-5', 'flux-1.1-pro')
├── provider        VARCHAR NOT NULL (e.g., 'anthropic', 'replicate', 'fal')
├── endpoint        VARCHAR
├── cost_per_unit   DECIMAL(10,6)
├── unit_type       ENUM('token', 'image', 'second', 'request')
├── quality_benchmark DECIMAL(3,2) (nullable — internal quality score)
├── is_active       BOOLEAN DEFAULT true

api_usage_logs
├── id              UUID PRIMARY KEY
├── job_id          UUID REFERENCES generation_jobs (nullable — can log standalone calls too)
├── model_id        UUID REFERENCES model_registry (nullable)
├── model_name      VARCHAR NOT NULL
├── tokens_used     INTEGER (nullable — for LLM calls)
├── cost            DECIMAL(8,6) NOT NULL
├── timestamp       TIMESTAMP NOT NULL DEFAULT NOW()
├── module          VARCHAR (which module made the call)
```

**Gap Patch:** Added `error_message` and `cancelled` status to `generation_jobs`. Added `category` to `prompt_templates` for library organization. Added `is_active` to `model_registry`. Added `module` to `api_usage_logs` so cost can be attributed per-module. Made `api_usage_logs.job_id` nullable for standalone API calls (e.g., lead scoring, proposal personalization).

#### Proposals & Onboarding

```
proposal_templates
├── id              UUID PRIMARY KEY
├── name            VARCHAR NOT NULL
├── sections        JSONB NOT NULL (ordered array: intro, scope, deliverables, pricing, timeline, terms)
├── merge_fields    TEXT[] (available merge field names)
├── is_active       BOOLEAN DEFAULT true
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

proposals
├── id              UUID PRIMARY KEY
├── prospect_id     UUID REFERENCES prospects NOT NULL
├── template_id     UUID REFERENCES proposal_templates NOT NULL
├── packages        JSONB NOT NULL (selected package IDs + any customizations)
├── total_value     DECIMAL(10,2) NOT NULL
├── generated_pdf_url VARCHAR (R2 URL, nullable — set after generation)
├── status          ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired') DEFAULT 'draft'
├── sent_at         TIMESTAMP (nullable)
├── viewed_at       TIMESTAMP (nullable)
├── accepted_at     TIMESTAMP (nullable)
├── expires_at      TIMESTAMP (nullable)
├── stripe_checkout_session_id VARCHAR (nullable)
├── personalized_intro TEXT (nullable — Claude-generated)
├── personalized_scope TEXT (nullable — Claude-generated)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

packages
├── id              UUID PRIMARY KEY
├── name            VARCHAR NOT NULL
├── tier            VARCHAR NOT NULL (e.g., 'starter', 'growth', 'enterprise')
├── monthly_price   DECIMAL(10,2) NOT NULL
├── deliverables    JSONB NOT NULL (array of {type, quantity, description})
├── description     TEXT
├── is_active       BOOLEAN DEFAULT true
├── sort_order      INTEGER DEFAULT 0
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP
```

**Gap Patch:** Added `total_value` to proposals (needed for War Room pipeline value query). Added `expires_at` for proposal expiration. Added `personalized_intro` / `personalized_scope` to store Claude-generated sections. Added `is_active` and `sort_order` to packages. Added `is_active` to proposal_templates.

#### Analytics Hub

```
platform_connections
├── id              UUID PRIMARY KEY
├── client_id       UUID REFERENCES clients NOT NULL
├── platform        ENUM('instagram', 'linkedin', 'x', 'facebook', 'tiktok', 'youtube', 'google_analytics')
├── oauth_tokens    TEXT NOT NULL (encrypted)
├── refresh_token   TEXT (encrypted, nullable)
├── status          ENUM('connected', 'expired', 'error') DEFAULT 'connected'
├── last_synced     TIMESTAMP (nullable)
├── platform_user_id VARCHAR (nullable — the connected account ID)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

content_metrics
├── id              UUID PRIMARY KEY
├── content_asset_id UUID REFERENCES content_assets NOT NULL
├── platform        VARCHAR NOT NULL
├── date            DATE NOT NULL
├── impressions     INTEGER DEFAULT 0
├── reach           INTEGER DEFAULT 0
├── engagement      INTEGER DEFAULT 0
├── clicks          INTEGER DEFAULT 0
├── saves           INTEGER DEFAULT 0
├── shares          INTEGER DEFAULT 0
├── views           INTEGER DEFAULT 0
├── follower_delta  INTEGER DEFAULT 0
├── UNIQUE(content_asset_id, platform, date)

content_scores
├── id              UUID PRIMARY KEY
├── content_asset_id UUID REFERENCES content_assets NOT NULL
├── score           DECIMAL(5,2)
├── percentile      DECIMAL(5,2)
├── calculated_at   TIMESTAMP NOT NULL

insight_reports
├── id              UUID PRIMARY KEY
├── client_id       UUID REFERENCES clients NOT NULL
├── period_start    DATE NOT NULL
├── period_end      DATE NOT NULL
├── ai_insights     JSONB NOT NULL (structured insights from Claude)
├── pdf_url         VARCHAR (R2 URL, nullable)
├── generated_at    TIMESTAMP NOT NULL

performance_tags
├── id              UUID PRIMARY KEY
├── content_asset_id UUID REFERENCES content_assets NOT NULL
├── tag_type        ENUM('topic', 'prompt_version', 'style', 'format', 'audience', 'platform')
├── tag_value       VARCHAR NOT NULL
├── associated_score DECIMAL(5,2)
```

**Gap Patch:** Added `refresh_token` and `platform_user_id` to `platform_connections` (OAuth flows need refresh tokens and account identifiers). Added UNIQUE constraint to `content_metrics` to prevent duplicate daily entries. Added `'audience'` and `'platform'` to `performance_tags.tag_type`.

#### Website

```
contact_submissions
├── id              UUID PRIMARY KEY
├── name            VARCHAR NOT NULL
├── email           VARCHAR NOT NULL
├── company         VARCHAR (nullable)
├── interested_services TEXT[] (nullable)
├── budget_range    VARCHAR (nullable)
├── message         TEXT
├── created_prospect_id UUID REFERENCES prospects (nullable — set after Lead Engine creation)
├── created_at      TIMESTAMP NOT NULL DEFAULT NOW()

bookings
├── id              UUID PRIMARY KEY
├── prospect_name   VARCHAR NOT NULL
├── prospect_email  VARCHAR NOT NULL
├── slot_datetime   TIMESTAMP NOT NULL
├── google_event_id VARCHAR (nullable — set after Calendar API creation)
├── status          ENUM('confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'confirmed'
├── created_prospect_id UUID REFERENCES prospects (nullable)
├── notes           TEXT (nullable)
├── created_at      TIMESTAMP NOT NULL DEFAULT NOW()

blog_posts
├── id              UUID PRIMARY KEY
├── slug            VARCHAR UNIQUE NOT NULL
├── title           VARCHAR NOT NULL
├── content         TEXT NOT NULL (MDX source)
├── excerpt         TEXT (nullable)
├── published_at    TIMESTAMP (nullable — null = draft)
├── seo_meta        JSONB (title, description, og_image)
├── author_id       UUID REFERENCES users
├── tags            TEXT[] (nullable)
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP
```

**Gap Patch:** Added `completed` and `no_show` statuses to bookings. Added `notes` to bookings. Added `excerpt` and `tags` to blog_posts (needed for listing pages and SEO). Added `budget_range` to contact_submissions (useful lead qualification data).

---

### 3.3 Resolved Data Overlaps

These are the specific cross-module conflicts and how the unified schema resolves them:

| Overlap | Resolution |
|---------|------------|
| **Client records** used by Ops Desk, Content Engine, Proposals, Portal, Analytics | One `clients` table. Ops Desk owns CRUD. Content Engine's `brand_profiles` references `client_id`. Proposal Machine creates client record on acceptance. All modules read the same record. |
| **Content gallery** used by Content Engine, Ops Desk, Client Portal | One `content_assets` table with dual status: `internal_status` (team workflow) and `client_status` (client approval). Three UI views, one data source. |
| **Dashboards** in War Room, Ops Desk, Content Engine, Lead Engine | War Room queries all tables directly (same DB, no API hops). Each module keeps its own contextual dashboard for in-module work. |
| **Kanban boards** in Lead Engine and Ops Desk | Separate — they ARE different pipelines. Lead Engine uses `prospects.stage`. Ops Desk uses `projects.status`. Handoff: proposal accepted → `prospects.stage = 'won'` AND new `clients` record simultaneously. |
| **Invoices** in Ops Desk, Client Portal, Proposals | One `invoices` table. Ops Desk generates and manages. Client Portal reads + shows Stripe payment links. Proposal Machine creates first deposit invoice on acceptance. |
| **Brand profiles** in Content Engine, Client Portal | One `brand_profiles` table owned by Content Engine. Client Portal reads same record, provides "request change" comment flow (uses `comments` table with `entity_type = 'brand_profile'`). |
| **Content approval** in Content Engine, Client Portal | Dual status on `content_assets`: internal team approves via `internal_status` (draft → qa_passed → sent_to_client). Client approves via `client_status` (pending → approved / revision_requested). One record, two-stage workflow. |

---

## 4. Authentication & Authorization

### Auth System

- **Provider:** NextAuth.js
- **Internal users (admin, team):** Email + password login at `/(auth)/login`
- **Client users:** Magic link login at `/(auth)/magic-link`
- **Session strategy:** JWT (stateless, works well with single deployment)

### Role-Based Access Control

| Role | Access | Route Group |
|------|--------|-------------|
| `admin` | Everything — all modules, all clients, settings, team management | `(platform)/*` |
| `team` | Assigned projects, modules relevant to their work, no billing/settings | `(platform)/*` (filtered) |
| `client` | Their own portal only — their content, their invoices, their brand, their briefs | `(portal)/*` |

### Gap Patch: Middleware & Guards

The original document mentions role-based auth but doesn't specify implementation. Required:

- **Next.js middleware** at `middleware.ts` checking session on every request to `(platform)` and `(portal)` route groups
- **Route group layouts** enforce role: `(platform)/layout.tsx` rejects client-role users, `(portal)/layout.tsx` rejects non-client users and scopes all queries to `WHERE client_id = session.user.client_id`
- **API route guards**: Shared `withAuth(handler, { roles: ['admin', 'team'] })` wrapper for API routes
- **Client data isolation**: Every Client Portal query MUST filter by the authenticated client's `client_id` — this is a security-critical requirement

### Gap Patch: Invitation & Onboarding Flow

Not addressed in original document:

1. **Admin invites team member** → email sent with password-set link → creates `users` record with `role = 'team'`
2. **Proposal accepted → auto-onboard client** → creates `users` record with `role = 'client'`, `auth_method = 'magic_link'`, linked `client_id` → sends welcome email with magic link
3. **Team capacity management** → `users.capacity` (hours/week) enables workload view in Ops Desk

---

## 5. Next.js Route Group Structure

```
app/
├── (auth)/                         ← Login pages (unauthenticated)
│   ├── login/page.tsx              Internal user login (email + password)
│   └── magic-link/page.tsx         Client magic link entry + verification
│
├── (platform)/                     ← Authenticated internal users (admin + team)
│   ├── layout.tsx                  Sidebar nav + top bar + module switcher
│   │
│   ├── war-room/page.tsx           MODULE: War Room (platform home)
│   │
│   ├── lead-engine/                MODULE: Lead Engine
│   │   ├── page.tsx                Campaign dashboard
│   │   ├── prospects/
│   │   │   ├── page.tsx            Prospect list (data table with search/filters)
│   │   │   ├── [id]/page.tsx       Prospect detail
│   │   │   └── import/page.tsx     CSV import
│   │   ├── campaigns/
│   │   │   ├── page.tsx            Campaign list
│   │   │   ├── [id]/page.tsx       Campaign detail + sequence builder
│   │   │   └── new/page.tsx        Create campaign
│   │   ├── sequences/page.tsx      Sequence step editor (within campaign)
│   │   └── pipeline/page.tsx       Pipeline Kanban view
│   │
│   ├── ops-desk/                   MODULE: Ops Desk
│   │   ├── page.tsx                Ops dashboard (MRR, projects by stage, deadlines)
│   │   ├── clients/
│   │   │   ├── page.tsx            Client list
│   │   │   ├── [id]/page.tsx       Client detail (projects, invoices, brand, health)
│   │   │   └── new/page.tsx        Create client
│   │   ├── projects/
│   │   │   ├── page.tsx            Project Kanban board
│   │   │   ├── [id]/page.tsx       Project detail (brief, deliverables, comments, files)
│   │   │   └── new/page.tsx        Create project
│   │   ├── team/
│   │   │   ├── page.tsx            Team list + workload view
│   │   │   └── [id]/page.tsx       Member detail + capacity
│   │   ├── calendar/page.tsx       Deadlines + meetings + deliveries (layered)
│   │   └── invoices/
│   │       ├── page.tsx            Invoice list (filterable by status, client)
│   │       ├── [id]/page.tsx       Invoice detail
│   │       └── new/page.tsx        Create invoice
│   │
│   ├── content-engine/             MODULE: Content Engine
│   │   ├── page.tsx                Pipeline overview / status dashboard
│   │   ├── brand-profiles/
│   │   │   ├── page.tsx            Brand profile list (by client)
│   │   │   └── [id]/page.tsx       Brand profile editor
│   │   ├── pipelines/
│   │   │   ├── page.tsx            Pipeline registry
│   │   │   └── [id]/page.tsx       Pipeline detail + config
│   │   ├── prompts/
│   │   │   ├── page.tsx            Prompt library (categorized list)
│   │   │   └── [id]/page.tsx       Prompt editor (Monaco) + version history
│   │   ├── queue/page.tsx          Generation queue (real-time SSE progress)
│   │   ├── gallery/
│   │   │   ├── page.tsx            Output gallery (visual grid, filters)
│   │   │   └── [id]/page.tsx       Asset detail (preview, status, comments)
│   │   └── costs/page.tsx          Cost tracker (per-client, per-model, trends)
│   │
│   ├── proposals/                  MODULE: Proposal & Onboarding Machine
│   │   ├── page.tsx                Proposal list (by status)
│   │   ├── create/page.tsx         Create proposal (select prospect, packages, generate)
│   │   ├── [id]/page.tsx           Proposal detail + tracking
│   │   ├── templates/
│   │   │   ├── page.tsx            Template list
│   │   │   └── [id]/page.tsx       Template editor
│   │   └── packages/
│   │       ├── page.tsx            Package list
│   │       └── [id]/page.tsx       Package editor
│   │
│   ├── analytics/                  MODULE: Analytics Hub
│   │   ├── page.tsx                Analytics dashboard (overview metrics)
│   │   ├── connections/page.tsx    Platform OAuth connections per client
│   │   ├── scorecards/page.tsx     Content scorecards (per-piece performance)
│   │   ├── insights/page.tsx       AI insights (monthly analysis)
│   │   └── reports/
│   │       ├── page.tsx            Report list
│   │       └── [id]/page.tsx       Report detail + PDF download
│   │
│   └── settings/                   Platform Settings
│       ├── team/page.tsx           Team management (invite, roles, deactivate)
│       ├── billing/page.tsx        Subscription + Stripe config
│       └── integrations/page.tsx   API keys, n8n config, email config
│
├── (portal)/                       ← Authenticated client users
│   ├── layout.tsx                  Client portal shell (simpler nav, client branding)
│   ├── page.tsx                    Client dashboard (projects, action items, upcoming)
│   ├── review/
│   │   ├── page.tsx                Pending content for review (gallery view)
│   │   └── [id]/page.tsx           Full-size review + approve/revise + comment
│   ├── assets/
│   │   ├── page.tsx                Delivered asset library (search, filter, download)
│   │   └── [id]/page.tsx           Asset detail
│   ├── briefs/
│   │   ├── page.tsx                Brief list (submitted + in progress)
│   │   └── new/page.tsx            Submit new brief (structured form → creates Ops Desk project)
│   ├── brand/page.tsx              Brand Hub (read-only profile, request changes via comments)
│   ├── invoices/
│   │   ├── page.tsx                Invoice list + payment links
│   │   └── [id]/page.tsx           Invoice detail + Stripe payment
│   └── messages/page.tsx           Threaded conversations with account manager
│
├── (website)/                      ← Public (unauthenticated)
│   ├── page.tsx                    Homepage (hero, services, social proof, CTA)
│   ├── services/page.tsx           Services + pricing (interactive cards, 3 tiers)
│   ├── portfolio/
│   │   ├── page.tsx                Filterable portfolio grid
│   │   └── [slug]/page.tsx         Case study detail
│   ├── blog/
│   │   ├── page.tsx                Blog listing
│   │   └── [slug]/page.tsx         Blog post (MDX rendered)
│   ├── contact/page.tsx            Contact form → Lead Engine prospect creation
│   └── book/page.tsx               Meeting booker (Google Calendar slots)
│
├── (proposal-view)/                ← Public (unique link, no auth required)
│   └── [proposal_id]/
│       ├── page.tsx                View proposal (branded, read tracking)
│       └── accept/page.tsx         Accept + optional Stripe deposit
│
└── api/
    ├── auth/                       NextAuth routes
    │   ├── [...nextauth]/route.ts
    │   └── invite/route.ts         Team invitation endpoint
    ├── lead-engine/
    │   ├── prospects/route.ts      CRUD
    │   ├── prospects/[id]/route.ts
    │   ├── prospects/[id]/stage/route.ts
    │   ├── prospects/import/route.ts   CSV import
    │   ├── campaigns/route.ts      CRUD
    │   ├── campaigns/[id]/route.ts
    │   ├── sequences/route.ts      CRUD steps
    │   ├── send/route.ts           Trigger email sends
    │   └── dashboard/route.ts      Campaign metrics
    ├── ops-desk/
    │   ├── clients/route.ts        CRUD
    │   ├── clients/[id]/route.ts
    │   ├── projects/route.ts       CRUD
    │   ├── projects/[id]/route.ts
    │   ├── deliverables/route.ts
    │   ├── comments/route.ts
    │   ├── invoices/route.ts       CRUD
    │   ├── invoices/[id]/route.ts
    │   ├── team/route.ts
    │   └── dashboard/route.ts      Ops metrics
    ├── content-engine/
    │   ├── brand-profiles/route.ts
    │   ├── brand-profiles/[id]/route.ts
    │   ├── pipelines/route.ts
    │   ├── pipelines/[id]/route.ts
    │   ├── prompts/route.ts
    │   ├── prompts/[id]/route.ts
    │   ├── generate/route.ts       Trigger pipeline (→ BullMQ → n8n)
    │   ├── queue/route.ts          Job status (SSE endpoint)
    │   ├── gallery/route.ts        Content asset CRUD
    │   ├── gallery/[id]/route.ts
    │   ├── costs/route.ts          Cost summary
    │   └── models/route.ts         Model registry CRUD
    ├── proposals/
    │   ├── route.ts                CRUD
    │   ├── [id]/route.ts
    │   ├── [id]/generate/route.ts  Generate PDF (Claude + PDF renderer)
    │   ├── [id]/send/route.ts      Send to prospect
    │   ├── [id]/accept/route.ts    E-acceptance + Stripe
    │   ├── templates/route.ts
    │   └── packages/route.ts
    ├── analytics/
    │   ├── connections/route.ts    OAuth management
    │   ├── connections/[id]/route.ts
    │   ├── metrics/route.ts        Metrics query
    │   ├── scores/route.ts         Content scores
    │   ├── insights/route.ts       AI insights
    │   └── reports/route.ts        Report CRUD + generation
    ├── portal/
    │   ├── dashboard/route.ts
    │   ├── review/route.ts
    │   ├── review/[id]/route.ts    Approve / request revision
    │   ├── assets/route.ts
    │   ├── briefs/route.ts         Submit brief → create project
    │   ├── brand/route.ts
    │   ├── invoices/route.ts
    │   └── messages/route.ts
    ├── website/
    │   ├── contact/route.ts        Contact form → create prospect
    │   ├── slots/route.ts          Calendar availability
    │   └── book/route.ts           Create calendar event
    └── webhooks/
        ├── n8n/route.ts            n8n callbacks (job complete, pipeline events)
        ├── stripe/route.ts         Payment confirmations, checkout events
        └── email/route.ts          Inbound email (Gmail push, reply detection)
```

### Gap Patch: Missing Routes Added

- `api/auth/invite/route.ts` — team invitation
- `api/lead-engine/prospects/import/route.ts` — CSV import
- `api/lead-engine/send/route.ts` — email send trigger
- `api/content-engine/models/route.ts` — model registry management
- `api/proposals/[id]/generate/route.ts` — PDF generation
- `api/proposals/[id]/send/route.ts` — send to prospect
- Individual `[id]` routes for all entities (original only listed base routes)
- Detail pages for all list views (original route structure implied but didn't show `[id]` and `[slug]` routes)

---

## 6. War Room — Platform Dashboard Specification

The War Room is the platform's home screen at `/(platform)/war-room/`. It aggregates data from all modules via direct Prisma queries (no API hops — same database).

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                        WAR ROOM                               │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│   MRR    │ Content  │ Pipeline │    API Spend (MTD)           │
│  $24.5k  │  147     │  $85k    │    $1,247.32                 │
├──────────┴──────────┴──────────┴──────────────────────────────┤
│                                │                              │
│   PRODUCTION FLOOR (2/3)       │  CONTENT PIPELINES (1/3)     │
│   Kanban summary from          │  Pipeline status + queue     │
│   projects table               │  depth from generation_jobs  │
│                                │                              │
│                                │  LIVE ACTIVITY               │
│                                │  Feed from activity_log      │
│                                │                              │
├──────────┬──────────┬──────────┴──────────────────────────────┤
│ CLIENTS  │PROPOSALS │  LEAD ENGINE                            │
│ Health   │ Status   │  Campaign stats from                    │
│ overview │ list     │  campaigns + email_events               │
│ (1/3)    │ (1/3)    │  (1/3)                                  │
└──────────┴──────────┴─────────────────────────────────────────┘
```

### Top Row — 4 Metric Cards

| Metric | Query | Source Tables |
|--------|-------|--------------|
| MRR | `SUM(clients.monthly_value) WHERE health_status != 'churned'` | `clients` |
| Content This Month | `COUNT(*) FROM content_assets WHERE created_at >= month_start` | `content_assets` |
| Pipeline Value | `SUM(proposals.total_value) WHERE status IN ('sent', 'viewed')` | `proposals` |
| API Spend (MTD) | `SUM(api_usage_logs.cost) WHERE timestamp >= month_start` | `api_usage_logs` |

### Middle Row

- **Production Floor (2/3 width):** Compact Kanban showing project counts by status from `projects`. Click any column → deep link to Ops Desk filtered view.
- **Content Pipelines (1/3 width, upper):** Active pipelines with queue depth from `pipelines` + `generation_jobs WHERE status IN ('queued', 'processing')`.
- **Live Activity (1/3 width, lower):** Real-time feed from `activity_log ORDER BY timestamp DESC LIMIT 20`. Filterable by module.

### Bottom Row

- **Clients (1/3):** Health distribution — count by `health_status`. Flag at-risk clients with upcoming `renewal_date`.
- **Proposals (1/3):** Recent proposals by status. Show `total_value` and days since `sent_at`.
- **Lead Engine (1/3):** Active campaign count, emails sent today, open rate, reply rate from `campaigns` + `email_events`.

### Gap Patch: War Room Additions

- **Refresh interval:** Auto-refresh every 60 seconds, manual refresh button
- **Date range selector:** Default to current month, allow switching
- **Trend indicators:** Each metric card shows ↑/↓ vs previous period
- **Click-through:** Every card and section deep-links to the relevant module page
- **Notification badges:** Show count of items needing attention (failed jobs, overdue invoices, pending approvals)

---

## 7. Cross-Module Integration Flows

These are the critical data flows where one module's action triggers changes in another. In the monolith, these are direct Prisma calls within the same transaction — no API bridges needed.

### 7.1 Proposal Accepted → Auto-Onboarding

```
Prospect clicks "Accept" on proposal page
  │
  ├─→ proposals.status = 'accepted', accepted_at = NOW()
  ├─→ prospects.stage = 'won'
  ├─→ CREATE clients record (name, industry from prospect, package from proposal)
  ├─→ CREATE users record (role='client', auth_method='magic_link', client_id)
  ├─→ CREATE brand_profiles record (empty, linked to new client)
  ├─→ CREATE invoices record (first deposit, stripe_payment_link from Checkout)
  ├─→ CREATE projects record (onboarding project from proposal deliverables)
  ├─→ TRIGGER n8n webhook:
  │     ├─→ Send welcome email with magic link (Resend)
  │     ├─→ Create R2 bucket path for client assets
  │     └─→ Notify team via activity_log
  └─→ IF Stripe Checkout: redirect to payment → webhook confirms → invoices.status = 'paid'
```

### 7.2 Content Generation Pipeline

```
Team member triggers generation in Content Engine
  │
  ├─→ CREATE generation_jobs (status='queued')
  ├─→ BullMQ enqueues job
  ├─→ Worker sends webhook to n8n with params + brand_profile
  │     └─→ n8n orchestrates: prompt → Claude → image gen → post-processing
  │
  ├─→ n8n callback webhook:
  │     ├─→ generation_jobs.status = 'completed', total_cost updated
  │     ├─→ CREATE content_assets (internal_status='draft', client_status='pending')
  │     ├─→ Upload files to R2, set file_url + thumbnail_url
  │     └─→ CREATE api_usage_logs for each AI call
  │
  └─→ SSE notifies queue UI in real-time
```

### 7.3 Content Approval Flow

```
Content Engine: internal_status = 'draft'
  ↓ (QA team reviews in gallery)
Content Engine: internal_status = 'qa_passed'
  ↓ (team sends to client)
Content Engine: internal_status = 'sent_to_client'
  ↓
Client Portal: client sees in review queue, client_status = 'pending'
  ↓ (client reviews)
  ├─→ Approved: client_status = 'approved' → asset moves to delivered library
  └─→ Revision: client_status = 'revision_requested' + comment with feedback
       ↓ (team revises)
       CREATE new content_assets with parent_asset_id = original
       (version chain preserved)
```

### 7.4 Website Contact → Lead Engine

```
Visitor submits contact form on website
  │
  ├─→ CREATE contact_submissions record
  ├─→ CREATE prospects record (stage='new', source='website_form')
  ├─→ contact_submissions.created_prospect_id = new prospect ID
  ├─→ Send confirmation email via Resend
  └─→ activity_log entry (module='website', action='contact_submitted')
```

### 7.5 Analytics Feedback Loop → Content Engine

```
Daily cron: pull metrics from social platforms
  │
  ├─→ INSERT content_metrics (impressions, reach, engagement, etc.)
  ├─→ RECALCULATE content_scores for updated assets
  │
Monthly cron: generate AI insights
  │
  ├─→ Claude API analyzes: top/underperforming, patterns, recommendations
  ├─→ CREATE insight_reports with ai_insights JSON
  ├─→ Generate PDF report → upload to R2
  │
Feedback loop:
  ├─→ CREATE performance_tags on high-performing assets
  └─→ Content Engine prompt library can query performance_tags
       to identify which prompt versions / styles perform best
```

### Gap Patch: Missing Integration Flow

**7.6 Invoice Payment (Stripe Webhook)**

```
Stripe webhook: payment_intent.succeeded
  │
  ├─→ Match stripe_payment_id to invoices record
  ├─→ invoices.status = 'paid', paid_at = NOW()
  ├─→ activity_log entry
  └─→ Optional: send payment confirmation email via Resend
```

**7.7 Brief Submission (Client Portal → Ops Desk)**

```
Client submits brief in Client Portal
  │
  ├─→ CREATE projects record (client_id from session, status='briefing')
  ├─→ CREATE deliverables from brief's structured form fields
  ├─→ activity_log entry (module='client_portal', action='brief_submitted')
  └─→ Team sees new project in Ops Desk Kanban
```

---

## 8. Background Jobs & Scheduled Tasks

### BullMQ Queues

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `content-generation` | n8n webhook dispatch + callback handling | 5 |
| `email-send` | Outbound email sending via Resend (respects daily limits + warmup) | 3 |
| `email-classify` | Reply classification via Claude API | 2 |
| `report-generation` | PDF report generation (analytics reports, proposals) | 2 |
| `data-ingestion` | Social platform metric pulls | 3 |

### Scheduled Tasks (Cron)

| Schedule | Task | Description |
|----------|------|-------------|
| Every 30 min | Email send batch | Process queued sequence steps, respect warmup schedule |
| Every 5 min | Reply check | Poll Gmail API for new replies, classify via Claude |
| Daily 2:00 AM | Metrics pull | Fetch social media metrics for all connected platforms |
| Daily 3:00 AM | Score recalculation | Recalculate content_scores based on new metrics |
| Daily 6:00 AM | Invoice overdue check | Mark invoices past `due_date` as `overdue`, send reminder |
| Weekly Monday 9 AM | Lead scoring | Re-score all active prospects based on engagement |
| Monthly 1st 4:00 AM | Insight generation | Generate Claude AI insights per client, create reports |
| Monthly 1st 5:00 AM | MRR snapshot | Store monthly MRR for historical trending |

### Gap Patch: Job Infrastructure

The original document mentions Redis + BullMQ but doesn't specify queue architecture or cron schedules. These are required for the email send engine, content generation pipeline, analytics data ingestion, and invoice management to function.

---

## 9. Platform Build Sequence (12 Phases)

### Phase 1: Foundation (Weeks 1–2)

**Goal:** Bare project skeleton — no features, just the bones.

Build:
- Next.js 14+ App Router project with TypeScript strict mode
- Tailwind CSS + shadcn/ui setup with base component library
- Prisma ORM connected to PostgreSQL
- Complete Prisma schema (ALL tables from Section 3 — define the full schema upfront so migrations are clean)
- NextAuth.js with email+password provider and magic link provider
- Role-based middleware (`middleware.ts`) protecting `(platform)` and `(portal)` route groups
- `(platform)/layout.tsx` — sidebar navigation shell with module links
- `(portal)/layout.tsx` — client portal shell with simpler navigation
- `(auth)/login` and `(auth)/magic-link` pages
- Environment config (`.env.example`, validation via zod/t3-env)
- Coolify deployment pipeline (Dockerfile, docker-compose with PostgreSQL + Redis)
- Git repo initialization, CI lint + type check
- Seed script with demo admin user

**Deliverable:** Deployed empty shell where you can log in and see the sidebar, but no module pages exist yet.

### Phase 2: Core Data Layer (Weeks 2–3)

**Goal:** Shared entities operational with basic CRUD.

Build:
- `users` CRUD API + admin team management page (`/settings/team`)
- `clients` CRUD API + list/detail pages (`/ops-desk/clients`)
- `content_assets` CRUD API (create, read, update status, list with filters)
- `activity_log` utility: `logActivity(actor, module, action, entity)` helper used by all modules
- File upload utility: R2 upload/download helpers with presigned URLs
- Shared UI components: DataTable (sortable, filterable, paginated), StatusBadge, MetricCard, EmptyState
- Team invitation flow (invite endpoint, email, password-set page)

**Deliverable:** Can create clients, manage team, upload files. Activity log recording all changes.

### Phase 3: Ops Desk (Weeks 3–5)

**Goal:** The operational backbone — client management, project tracking, invoicing.

Build:
- Client detail page (projects, invoices, health status, brand profile link)
- Project Kanban board with drag-and-drop (`@hello-pangea/dnd`)
- Project detail page (brief, deliverables checklist, comments, file attachments)
- Deliverables CRUD with status tracking and content_asset linking
- Comments system (polymorphic — works on projects, content_assets, proposals, brand_profiles)
- Invoice CRUD with line items, status tracking, Stripe payment link generation
- Ops dashboard: MRR, active projects by stage, deadlines this week, recent activity
- Team workload view: projects per member, capacity utilization
- Calendar view: project deadlines, delivery dates (basic — use a calendar library like `react-big-calendar`)

**Deliverable:** Full project management workflow from client creation through project delivery and invoicing.

### Phase 4: Content Engine (Weeks 5–7)

**Goal:** AI content generation pipeline management.

Build:
- Brand profile CRUD with rich JSON editors for colors, typography, character sheets
- Pipeline registry (list, detail, config editing)
- Pipeline trigger UI: select pipeline + client + parameters → dispatch to BullMQ → webhook to n8n
- Generation queue page with SSE real-time progress updates
- BullMQ worker: dispatch n8n webhook, handle callback, create content_assets
- Output gallery: visual grid with filters (client, type, status), thumbnail previews
- Asset detail page: full-size preview, status management (internal + client), comments
- Prompt library: CRUD, categorization, version history, Monaco editor integration
- Model registry: CRUD for AI models, cost tracking per model
- Cost tracker: per-client, per-model, per-pipeline cost breakdowns, daily/weekly/monthly views
- API usage logging: automatic cost recording on every AI API call
- n8n webhook endpoints for job callbacks

**Deliverable:** Can configure brand profiles, trigger content generation pipelines, track costs, manage generated output.

### Phase 5: Lead Engine (Weeks 7–9)

**Goal:** Client acquisition pipeline.

Build:
- Prospect management: data table with search, filters, sort; create/edit forms
- CSV import: upload, column mapping, validation, bulk create prospects
- Prospect detail page: enrichment data, score, stage, email history, timeline
- Campaign CRUD: create campaign, configure send limits, warmup schedule
- Sequence builder: add/edit/reorder steps, set delays, write templates with merge fields, A/B variants
- Email send engine: BullMQ queue, Resend API integration, respect daily limits + warmup schedule, open/click tracking pixels
- Reply detection: Gmail API polling (or push notifications), Claude API classification, sentiment analysis
- Lead scoring: configurable rules engine + AI-assisted scoring, manual score override
- Pipeline Kanban: drag prospects through stages (New → Contacted → Engaged → Discovery Call → Proposal Sent → Won/Lost)
- Campaign dashboard: send volume, open rates, reply rates, pipeline value by stage

**Deliverable:** Full outbound email campaign system with AI-powered reply classification and lead scoring.

### Phase 6: Client Portal (Weeks 9–10)

**Goal:** Client-facing layer for review, approvals, and communication.

Build:
- Client portal layout with client branding (logo from `clients` table)
- Client dashboard: active projects, upcoming deliverables, items needing review, recent activity
- Content review: gallery of items with `client_status = 'pending'`, full-size preview, approve/revise buttons, comment thread
- Asset library: all `client_status = 'approved'` or `'done'` assets, search, filter by type/date, bulk download (zip)
- Brief submission: structured forms per content type → creates `projects` record in Ops Desk
- Brand Hub: read-only view of brand_profile, "request change" button creates comment
- Invoice list: read-only from invoices table, Stripe payment link buttons, payment status
- Messaging: threaded conversations with account manager (uses `comments` with `entity_type = 'message'` or a dedicated `messages` table)
- Client data isolation: ALL queries scoped to `client_id` from session

**Deliverable:** Clients can review content, approve or request revisions, submit briefs, pay invoices, and communicate with their team.

### Gap Patch: Client Portal Messaging

The original document mentions "messaging" but doesn't specify the data model. Options:

**Option A (Simple):** Reuse `comments` table with `entity_type = 'client_message'` and `entity_id = client_id`. Thread by linking `parent_comment_id`.

**Option B (Dedicated):** Add a `messages` table:
```
messages
├── id              UUID PRIMARY KEY
├── client_id       UUID REFERENCES clients NOT NULL
├── author_id       UUID REFERENCES users NOT NULL
├── thread_id       UUID (nullable — for grouping threads)
├── body            TEXT NOT NULL
├── read_at         TIMESTAMP (nullable)
├── created_at      TIMESTAMP NOT NULL
```

Recommendation: Option B for better querying and read-status tracking.

### Phase 7: Proposals & Onboarding (Weeks 10–11)

**Goal:** Automated proposal generation, tracking, and client onboarding.

Build:
- Package CRUD: tiers, pricing, deliverables, descriptions
- Proposal template CRUD: section editor (intro, scope, deliverables, pricing, timeline, terms), merge field configuration
- Proposal creation flow: select prospect → select packages → Claude API personalizes intro + scope → preview → save draft
- PDF generation: render proposal to branded PDF via @react-pdf/renderer or Puppeteer, upload to R2
- Proposal tracking: list view by status, view/open tracking (pixel or unique URL hit counter)
- Public proposal view page: `/(proposal-view)/[proposal_id]` — branded read-only view, tracks `viewed_at`
- E-acceptance page: accept button → optional Stripe Checkout for deposit → accept confirmation
- Auto-onboarding trigger: on acceptance, execute the full onboarding flow from Section 7.1 (create client, user, brand_profile, invoice, project, send welcome email, notify team)
- Proposal expiration: mark as `expired` if not accepted within configured period

**Deliverable:** Generate branded proposals from prospects, track their status, and automatically onboard clients on acceptance.

### Phase 8: Analytics Hub (Weeks 11–13)

**Goal:** Content performance intelligence.

Build:
- Platform connections: OAuth flows for Instagram, LinkedIn, X/Twitter, Facebook, TikTok, YouTube, Google Analytics
- OAuth token management: encrypted storage, refresh token rotation, connection status monitoring
- Data ingestion workers: daily cron jobs pulling metrics per connected platform per client
- Content metrics storage: tie metrics to specific `content_assets` via `content_asset_id`
- Content scorecards: per-piece performance score relative to client's historical average
- Score calculation: percentile ranking within client's own content, configurable weighting
- AI insights engine: monthly Claude API analysis per client — top/underperforming content, content type comparisons, audience patterns, actionable recommendations
- Report generator: branded PDF with metrics summary, charts (rendered server-side), content gallery, AI narrative
- Reports list and detail pages
- Feedback loop: automatically tag high-performing content with `performance_tags` (topic, style, format, prompt_version) → Content Engine can query these for prompt optimization
- Analytics dashboard: overview of all clients' performance, connection status, recent reports

**Deliverable:** Automated performance tracking across social platforms, AI-generated insights, branded reports, and a feedback loop to improve content generation.

### Phase 9: War Room (Weeks 13–14)

**Goal:** Platform-wide aggregation dashboard.

Build:
- War Room page implementing the full layout from Section 6
- All 4 metric cards with trend indicators (vs previous month)
- Production Floor: compact Kanban summary with click-through to Ops Desk
- Content Pipelines: active pipeline status + queue depth with click-through
- Live Activity: real-time feed from activity_log (consider SSE for live updates)
- Clients: health distribution chart with at-risk flags
- Proposals: status list with value and aging
- Lead Engine: campaign summary metrics
- Date range selector (default: current month)
- Auto-refresh (60s interval)
- Notification badges: overdue invoices, failed jobs, pending approvals, at-risk clients

**Deliverable:** Single-screen view of the entire agency operation.

### Phase 10: Website (Weeks 14–15)

**Goal:** Public agency website as a route group in the same codebase.

Build:
- Homepage: hero section, services overview, social proof (testimonials/logos), call-to-action
- Services page: interactive pricing cards (3 tiers from `packages` table), bundle options
- Portfolio gallery: filterable grid of case studies (can pull from `content_assets` with `client_status = 'approved'` if clients consent, or use curated entries)
- Case study detail pages
- Contact form: structured form → creates `contact_submissions` + `prospects` record, sends confirmation email
- Meeting booker: Google Calendar API integration, available slot display, event creation
- Blog: MDX-powered, listing + detail pages, basic SEO meta tags
- SEO: sitemap.xml, robots.txt, Open Graph tags, structured data
- Performance: static generation where possible, image optimization

**Deliverable:** Professional agency website with lead capture, booking, and blog — all within the same deployment.

### Phase 11: Polish & Production Hardening (Weeks 15–18)

**Goal:** Make everything production-ready.

Build:
- **Permissions refinement:** Granular team permissions (e.g., can this team member see financials? can they send campaigns?). Implement a permissions matrix beyond the basic 3-role system.
- **Notification system:** In-app notifications (bell icon) + email notifications for key events: new brief submitted, content ready for review, invoice paid, proposal viewed/accepted, project deadline approaching. User-configurable notification preferences.
- **Mobile responsiveness:** All pages responsive. Ops Desk Kanban and War Room are priority.
- **Performance optimization:** Database indexing strategy, query optimization (N+1 prevention), ISR/SSG where appropriate, bundle size optimization, lazy loading for heavy components (Monaco, charts).
- **Error handling:** Global error boundaries, API route error standardization, user-friendly error pages, retry logic on transient failures.
- **Error tracking:** Sentry integration (or similar), source maps, error grouping.
- **Loading states:** Skeleton loaders for all data-fetching pages. Optimistic updates for common actions (status changes, approvals).
- **Search:** Full-text search across prospects, clients, content assets, prompts. PostgreSQL `tsvector` or Meilisearch.
- **Data export:** CSV export for prospects, clients, invoices, metrics.
- **Audit trail:** Leverage `activity_log` to show full change history on entity detail pages.
- **Backup strategy:** Automated PostgreSQL backups, R2 versioning.
- **Rate limiting:** Protect public API routes and webhook endpoints.
- **Security audit:** CSRF protection, input sanitization, SQL injection prevention (Prisma handles most), XSS prevention, secure headers.

**Deliverable:** Production-hardened platform ready for daily use.

### Phase 12: Productize (Weeks 18+)

**Goal:** Transform from internal tool to sellable product.

Build:
- **Multi-tenant architecture:** Tenant isolation at database level (row-level security or schema-per-tenant), tenant context in all queries.
- **Onboarding wizard:** Guided setup for new agencies: create account → connect email → set up first client → configure first pipeline.
- **Billing for external agencies:** Stripe subscription management, plan tiers (free trial, starter, growth, enterprise), usage-based billing for AI API costs.
- **White-labeling:** Custom branding per tenant (logo, colors, domain).
- **Documentation:** User docs, API docs (for agencies that want to integrate), admin guide.
- **Landing page / marketing site:** Product marketing for NEXUS as a SaaS offering.

**Deliverable:** NEXUS as a multi-tenant SaaS product other agencies can subscribe to.

---

## 10. Shared UI Component Library

These components are used across multiple modules and should be built in Phase 1–2 as part of the shared infrastructure.

| Component | Used By | Description |
|-----------|---------|-------------|
| `DataTable` | All modules | Sortable, filterable, paginated table with search. Built on shadcn `Table` + `tanstack-table`. |
| `KanbanBoard` | Ops Desk, Lead Engine | Drag-and-drop column board. Built on `@hello-pangea/dnd`. |
| `StatusBadge` | All modules | Colored badge for entity statuses. Configurable color map. |
| `MetricCard` | War Room, module dashboards | Number + label + trend indicator card. |
| `FileUploader` | Ops Desk, Content Engine, Brand profiles | Drag-and-drop file upload to R2 with progress. |
| `GalleryGrid` | Content Engine, Client Portal, Analytics | Responsive image/video grid with filters. |
| `CommentThread` | Projects, Content assets, Brand profiles | Threaded comments with author avatar and timestamp. |
| `RichTextEditor` | Briefs, email templates, proposal sections | Lightweight rich text (Tiptap or similar). |
| `DateRangePicker` | Analytics, War Room, Cost tracker | Date range selection with presets (today, this week, this month). |
| `EmptyState` | All modules | Friendly empty state with illustration and CTA. |
| `ConfirmDialog` | All modules | Confirmation modal for destructive actions. |
| `ModuleSidebar` | Platform layout | Collapsible sidebar with module icons and active state. |
| `ClientSelector` | Content Engine, Analytics, Proposals | Dropdown to pick a client, used across many forms. |
| `ActivityFeed` | War Room, entity detail pages | Chronological activity entries from `activity_log`. |

---

## 11. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/nexus

# Redis
REDIS_URL=redis://host:6379

# NextAuth
NEXTAUTH_URL=https://nexus.yourdomain.com
NEXTAUTH_SECRET=<random-secret>

# Resend (Email)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx

# Replicate
REPLICATE_API_TOKEN=r8_xxx

# fal.ai
FAL_KEY=xxx

# ElevenLabs
ELEVENLABS_API_KEY=xxx

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=nexus-assets
R2_PUBLIC_URL=https://assets.yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Google (Calendar + OAuth)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALENDAR_ID=xxx

# Gmail (for reply detection)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx

# Social Platform OAuth (Analytics Hub)
META_APP_ID=xxx
META_APP_SECRET=xxx
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx
YOUTUBE_API_KEY=xxx
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx

# Google Analytics
GA_PROPERTY_ID=xxx

# n8n
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com/webhook

# App
NEXT_PUBLIC_APP_URL=https://nexus.yourdomain.com
NODE_ENV=production
```

---

## 12. Database Index Strategy

These indexes should be created in the Prisma schema for query performance on the most common access patterns:

```
-- Core lookups
CREATE INDEX idx_clients_health ON clients(health_status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_client ON users(client_id);

-- Activity feed
CREATE INDEX idx_activity_timestamp ON activity_log(timestamp DESC);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_module ON activity_log(module);

-- Content assets (heavily queried)
CREATE INDEX idx_assets_client ON content_assets(client_id);
CREATE INDEX idx_assets_internal_status ON content_assets(internal_status);
CREATE INDEX idx_assets_client_status ON content_assets(client_status);
CREATE INDEX idx_assets_created ON content_assets(created_at DESC);

-- Lead Engine
CREATE INDEX idx_prospects_stage ON prospects(stage);
CREATE INDEX idx_prospects_assigned ON prospects(assigned_to);
CREATE INDEX idx_email_events_prospect ON email_events(prospect_id);
CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_type ON email_events(type);

-- Ops Desk
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_assigned ON projects(assigned_to);
CREATE INDEX idx_projects_deadline ON projects(deadline);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);

-- Content Engine
CREATE INDEX idx_jobs_status ON generation_jobs(status);
CREATE INDEX idx_jobs_client ON generation_jobs(client_id);
CREATE INDEX idx_api_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX idx_api_logs_job ON api_usage_logs(job_id);

-- Analytics
CREATE INDEX idx_metrics_asset_date ON content_metrics(content_asset_id, date);
CREATE INDEX idx_metrics_platform ON content_metrics(platform);
CREATE INDEX idx_connections_client ON platform_connections(client_id);

-- Proposals
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_prospect ON proposals(prospect_id);

-- Comments (polymorphic)
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
```

---

## 13. Deployment Architecture

```
Hetzner VPS (Coolify-managed)
├── nexus-app          (Next.js — single container)
│   ├── Web server     (Next.js routes + API)
│   └── BullMQ workers (content gen, email, analytics)
├── postgresql         (single instance, all tables)
├── redis              (BullMQ queues + caching)
└── n8n                (self-hosted, pipeline orchestration)

Cloudflare
├── R2 bucket          (all file storage)
└── Optional: CDN for public website assets

External Services
├── Resend             (email delivery)
├── Stripe             (payments)
├── Google APIs        (Calendar, Gmail, Analytics)
├── Social APIs        (Meta, LinkedIn, X, TikTok, YouTube)
├── Claude API         (intelligence layer)
└── AI generation APIs (Replicate, fal.ai, Runway, ElevenLabs)
```

### Gap Patch: Deployment Details

- **Docker Compose** with 4 services: `app`, `postgres`, `redis`, `n8n`
- **BullMQ workers** run in the same Node.js process as Next.js (or as a separate `worker` service in Docker Compose for better resource isolation)
- **Database migrations:** Run `npx prisma migrate deploy` as part of deploy pipeline
- **Health checks:** `/api/health` endpoint checking DB + Redis connectivity
- **SSL:** Managed by Coolify (Let's Encrypt)
- **Backups:** Daily PostgreSQL dump to R2, 30-day retention

---

## 14. Gap Summary — What Was Patched

The original `nexus-master-build-plan.md` provides excellent architectural direction and data modeling. The following gaps were identified and patched in this extracted plan:

| Gap | Where Patched |
|-----|---------------|
| Missing `created_at` / `updated_at` on most tables | Section 3 — added to all entities |
| No `client_id` on users table for portal data isolation | Section 3.1 — `users` entity |
| No subject line fields on email sequence steps | Section 3.2 — Lead Engine |
| No `bounced` / `unsubscribed` email event types | Section 3.2 — Lead Engine |
| Invoice missing line items and notes | Section 3.2 — Ops Desk |
| `generation_jobs` missing error_message field | Section 3.2 — Content Engine |
| `api_usage_logs` can't attribute cost per module | Section 3.2 — Content Engine |
| No `total_value` on proposals (needed for War Room query) | Section 3.2 — Proposals |
| Proposal expiration not modeled | Section 3.2 — Proposals |
| OAuth refresh tokens not stored | Section 3.2 — Analytics Hub |
| Content metrics missing uniqueness constraint | Section 3.2 — Analytics Hub |
| Blog posts missing excerpt and tags | Section 3.2 — Website |
| Auth middleware implementation not specified | Section 4 |
| Client data isolation strategy not specified | Section 4 |
| User invitation and onboarding flows not defined | Section 4 |
| Individual API routes and `[id]` routes not enumerated | Section 5 |
| War Room missing refresh, trends, click-through, notifications | Section 6 |
| Stripe payment webhook flow not documented | Section 7.6 |
| Brief submission flow not documented | Section 7.7 |
| No background job queue architecture | Section 8 |
| No cron/scheduled task definitions | Section 8 |
| Client Portal messaging data model not defined | Phase 6 note |
| No shared UI component library specified | Section 10 |
| No environment variable inventory | Section 11 |
| No database index strategy | Section 12 |
| No deployment architecture details | Section 13 |
| Missing infrastructure: rate limiting, error tracking, search, logging, env validation | Section 2 |
| No notification system design | Phase 11 |
| No data export capability | Phase 11 |
