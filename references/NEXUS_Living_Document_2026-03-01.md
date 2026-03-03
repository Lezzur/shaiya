# NEXUS × Barker — Living Project Document

> **Last updated:** March 1, 2026
> **Purpose:** Single source of truth for the NEXUS platform project and its Barker orchestration toolchain. Contains the full context of all decisions, documents, and artifacts produced during planning.

---

## Table of Contents

1. [Session Summary](#1-session-summary)
2. [Document Registry](#2-document-registry)
3. [Project Overview: NEXUS Platform](#3-project-overview-nexus-platform)
4. [Barker Toolchain Status](#4-barker-toolchain-status)
5. [Decisions Log](#5-decisions-log)
6. [NEXUS Platform Specification (Complete)](#6-nexus-platform-specification-complete)
7. [Version Roadmap](#7-version-roadmap)
8. [V1 Build Plan (Barker-Ready)](#8-v1-build-plan-barker-ready)
9. [Barker Schema Migration](#9-barker-schema-migration)
10. [Open Items & Next Steps](#10-open-items--next-steps)

---

## 1. Session Summary

### What happened in this session

This session started with a master build plan for "NEXUS" — a unified platform consolidating 7 agency management tools into a single monolithic Next.js application. Over the course of the conversation, we:

1. **Evaluated the master plan** (`NEXUS_Master_Build_Plan_Original.md`) — confirmed full understanding of the two-track strategy (Track A: standalone apps, Track B: unified platform)

2. **Extracted the monolith plan** — Pulled Track B out into a complete, standalone specification (`NEXUS_Platform_Spec_2026-03-01.md`), patching 30+ gaps in the original document including missing timestamps, auth middleware, background job architecture, database indexes, deployment details, and more

3. **Created a version roadmap** (`NEXUS_Version_Roadmap_2026-03-01.md`) — Defined 10 versions with clear boundaries. V1 = Foundation + Ops Desk. Each subsequent version adds one module. Dependency graph between versions documented.

4. **Created a V1 Barker build plan** (`NEXUS_V1_Barker_Plan_2026-03-01.md`) — Fully executable Barker YAML with 22 tasks across 6 phases, detailed prompts, dependency graph, model assignments (36% Opus / 64% Sonnet), expected files, and done_checks.

5. **Discovered a Barker schema conflict** — `BARKER_DOCS.md` used the old `done_condition` object schema while `BARKER_PLANNING_TEMPLATE.md` used the new `done_check` / `phase_check` / `validation` schema. These are incompatible.

6. **Fixed the conflict** — Updated `BARKER_DOCS.md` and `BARKER_PROMPTS.md` to align with the planning template as the authoritative schema. Created a Claude Code migration prompt to audit and fix any Barker source code that was built from the old schema.

---

## 2. Document Registry

### Input Documents (Provided at Session Start)

| Document | Location | Role | Status |
|----------|----------|------|--------|
| `NEXUS_Master_Build_Plan_Original.md` | Uploaded by user | Original master plan with Track A + Track B | **Read-only reference** — not modified |
| `BARKER_DOCS.md` | Project file (original) | Barker user documentation | **Superseded** — updated version produced |
| `BARKER_PROMPTS.md` | Project file (original) | Barker build prompts (instructions for building Barker itself) | **Superseded** — updated version produced |
| `BARKER_PLANNING_TEMPLATE.md` | Project file | Template given to Claude for generating build plans | **Authoritative** — no changes needed |

### Output Documents (Produced This Session)

| Document | Filename | Purpose | Status |
|----------|----------|---------|--------|
| **NEXUS Platform Spec** | `NEXUS_Platform_Spec_2026-03-01.md` | Complete Track B specification with all gaps patched | ✅ Final |
| **Version Roadmap** | `NEXUS_Version_Roadmap_2026-03-01.md` | Human-readable V1–V10 roadmap with version boundaries | ✅ Final |
| **V1 Barker Plan** | `NEXUS_V1_Barker_Plan_2026-03-01.md` | Barker-executable YAML for Foundation + Ops Desk | ✅ Final |
| **BARKER Docs** | `BARKER_Docs_Final_2026-03-01.md` | Merged: schema migration + Build Hardening section | ✅ Final (merged) |
| **BARKER Prompts** | `BARKER_Prompts_Final_2026-03-01.md` | Merged: schema migration + 8 hardening blocks | ✅ Final (merged) |
| **Migration Prompt** | `BARKER_Migration_Prompt_2026-03-01.md` | Claude Code prompt to audit/fix Barker source code | ✅ Final |
| **This Document** | `NEXUS_Living_Document_2026-03-01.md` | Living document — everything in one place | 🔄 Living |

### Superseded Documents (Do Not Use)

These files were intermediate versions that have been merged into the Final versions above:

| File | Reason Superseded |
|------|-------------------|
| `BARKER_Docs_Updated_2026-03-01.md` | Had schema migration but missing Build Hardening section → merged into `_Final_` |
| `BARKER_DOCS_20260301_0932.md` | Had Build Hardening but still used old `done_condition` schema → merged into `_Final_` |
| `BARKER_Prompts_Updated_2026-03-01.md` | Had schema migration but missing 8 hardening blocks → merged into `_Final_` |
| `BARKER_PROMPTS_20260301_0932.md` | Had hardening blocks but still used old `done_condition` schema → merged into `_Final_` |

---

## 3. Project Overview: NEXUS Platform

### What Is NEXUS?

NEXUS is a monolithic Next.js application that consolidates 7 agency management tools into a single platform with one PostgreSQL database, one auth system, and one deployment.

### The 7 Modules

| # | Module | Purpose | Primary Users |
|---|--------|---------|---------------|
| 1 | **Ops Desk** | Client & project management, invoicing, team workload | Admin, Team |
| 2 | **Content Engine** | AI content generation pipeline management | Admin, Team |
| 3 | **Lead Engine** | Lead generation, outreach, and sales pipeline | Admin, Team |
| 4 | **Client Portal** | Client-facing review, approvals, assets, briefs | Clients |
| 5 | **Proposal Machine** | Proposal creation, tracking, e-acceptance, auto-onboarding | Admin, Team |
| 6 | **Analytics Hub** | Content performance data, scoring, AI insights, reports | Admin, Team |
| 7 | **War Room** | Platform-wide aggregation dashboard (home screen) | Admin, Team |
| + | **Website** | Public-facing agency site with lead capture & booking | Public |

### Tech Stack Summary

- **Framework:** Next.js 14+ (App Router), TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL (single instance, shared schema)
- **ORM:** Prisma
- **Auth:** NextAuth.js (password for internal, magic link for clients)
- **Job Queue:** Redis + BullMQ
- **File Storage:** Cloudflare R2
- **Email:** Resend API
- **AI:** Claude API (primary), Replicate, fal.ai, Runway, ElevenLabs
- **Automation:** n8n (self-hosted)
- **Payments:** Stripe
- **Deployment:** Coolify on Hetzner VPS

### Data Model Summary

- **4 core entities** shared across all modules: `users`, `clients`, `content_assets`, `activity_log`
- **30+ tables** total across all modules
- **Key pattern:** Dual-status on `content_assets` (`internal_status` for team workflow, `client_status` for client approval)
- **Key principle:** One table per entity, one module owns CRUD, others read

Full schema details: See `NEXUS_Platform_Spec_2026-03-01.md`, Section 3.

---

## 4. Barker Toolchain Status

### What Is Barker?

Barker is a Claude Code orchestrator that builds software projects in parallel. It dispatches tasks from a structured YAML build plan to multiple Claude Code instances (1 Opus + 4 Sonnet by default), isolates work via git worktrees, and provides a live TUI dashboard.

### Schema Alignment Status

| Document | Schema Version | Status |
|----------|---------------|--------|
| `BARKER_PLANNING_TEMPLATE.md` | **New** (done_check + phase_check + validation) | ✅ Authoritative — no changes needed |
| `BARKER_Docs_Final_2026-03-01.md` | ~~Old (done_condition)~~ → **New** + Build Hardening | ✅ Final (merged) |
| `BARKER_Prompts_Final_2026-03-01.md` | ~~Old (done_condition)~~ → **New** + 8 hardening blocks | ✅ Final (merged) |
| Barker source code (`.ts` files) | **Unknown** — may be old or new | ⚠️ Needs audit — use migration prompt |

### Schema Differences (Old → New)

| Aspect | Old (`done_condition`) | New (`done_check` / `validation`) |
|--------|----------------------|----------------------------------|
| **Task completion** | `done_condition` required object with `type` ("exit_success" / "file_exists" / "command") and `value` | `done_check` optional string — shell command run after task exits cleanly |
| **Failure behavior** | Task FAILED → retry → block dependents | Task DEGRADED → work still merged, dependents still run, Validator notified |
| **Phase gates** | Not supported | `phase_check` optional shell command per phase |
| **Holistic validation** | Not supported | `validation` required block — Opus runs checks + fixes after all tasks |
| **Philosophy** | Verify each task individually | Build-then-validate — tasks build, Validator verifies holistically |

### How to Audit Barker Source Code

Use the migration prompt (`BARKER_Migration_Prompt_2026-03-01.md`):
1. Open Claude Code inside the Barker project directory
2. Paste the entire prompt
3. Claude Code will search → audit → migrate → verify → report

---

## 5. Decisions Log

Decisions made during this session that affect the project going forward.

### Decision 1: Track B Direct Build (Not Track A → Track B Migration)

**Context:** The master plan recommended building Track A (standalone apps) first, then consolidating into Track B (monolith).

**Decision:** We are building Track B (the monolith) directly, skipping Track A entirely.

**Rationale:** The spec is complete enough to go straight to the unified platform. The Track A specs serve as detailed module specifications, not as a prerequisite build step.

### Decision 2: Ops Desk as V1 Module

**Context:** Could have started with any module. Content Engine is the "revenue engine." Lead Engine is "client acquisition."

**Decision:** V1 = Foundation + Ops Desk.

**Rationale:** Every module references `clients`. Ops Desk owns the `clients` table and the `projects` / `invoices` / `comments` infrastructure. Building it first proves the shared data layer with real CRUD before anything else builds on it.

### Decision 3: One Module Per Version

**Context:** Could have grouped modules into larger versions.

**Decision:** Each version after V1 adds exactly one module.

**Rationale:** Clear version boundaries, predictable scope, easier to test and ship incrementally. Barker's plan evolution feature supports this natively — each version appends phases to the same plan file while keeping completed task IDs stable.

### Decision 4: Planning Template as Authoritative Schema

**Context:** BARKER_DOCS.md and BARKER_PLANNING_TEMPLATE.md described different schemas.

**Decision:** The planning template is the canonical schema reference. BARKER_DOCS.md and BARKER_PROMPTS.md are updated to match.

**Rationale:** The planning template represents the more evolved design (build-then-validate with degraded state, phase gates, and holistic validation). The old done_condition model is deprecated.

### Decision 5: Full Prisma Schema in Phase 1

**Context:** Could define tables incrementally as each module is built.

**Decision:** V1's Phase 1 defines the complete Prisma schema for ALL V1 tables upfront.

**Rationale:** Clean single migration, no migration conflicts between tasks, types available from the start for all parallel task development.

---

## 6. NEXUS Platform Specification (Complete)

> **Full document:** `NEXUS_Platform_Spec_2026-03-01.md` (1,425 lines)

### What It Contains

| Section | Description |
|---------|-------------|
| 1. Platform Overview | Module list, monolith rationale |
| 2. Unified Tech Stack | Complete technology table with gap patches |
| 3. Unified Data Model | All 30+ tables with field-level detail, types, constraints |
| 3.1 Core Entities | users, clients, content_assets, activity_log |
| 3.2 Module-Specific Entities | Lead Engine (5 tables), Ops Desk (4), Content Engine (6), Proposals (3), Analytics Hub (5), Website (3) |
| 3.3 Resolved Data Overlaps | 7 overlap resolutions (clients, content, dashboards, Kanban, invoices, brand profiles, approvals) |
| 4. Authentication & Authorization | Auth system, RBAC, middleware, invitation flows |
| 5. Route Group Structure | Every page and API route enumerated |
| 6. War Room Spec | Layout, metric cards, queries, aggregation sources |
| 7. Cross-Module Integration Flows | 7 flows: proposal→onboarding, content pipeline, approval flow, contact→lead, analytics feedback, Stripe webhook, brief submission |
| 8. Background Jobs & Scheduled Tasks | BullMQ queues, cron schedules |
| 9. Build Sequence (12 Phases) | Phase-by-phase breakdown with deliverables |
| 10. Shared UI Components | 14 reusable components |
| 11. Environment Variables | Complete .env template |
| 12. Database Index Strategy | All recommended indexes |
| 13. Deployment Architecture | Docker Compose layout, infrastructure diagram |
| 14. Gap Summary | 30+ gaps identified and patched from original |

### Gaps Patched (Summary)

Missing timestamps, client-user linkage for portal isolation, email subject fields, OAuth refresh tokens, invoice line items, generation job error tracking, proposal total_value/expiration, content metrics uniqueness, blog excerpts/tags, auth middleware implementation, cron/job architecture, messaging data model, shared component library, env vars, index strategy, deployment details, notification system, data export, rate limiting, error tracking, search infrastructure.

---

## 7. Version Roadmap

> **Full document:** `NEXUS_Version_Roadmap_2026-03-01.md` (629 lines)

### Version Summary

| Version | What Ships | Est. Tasks | Key Dependencies |
|---------|------------|-----------|-----------------|
| **V1** | Foundation + Ops Desk | ~22 | None (first build) |
| **V2** | Content Engine | ~18 | V1.clients, V1.activity_log |
| **V3** | Lead Engine | ~16 | V1.auth |
| **V4** | Client Portal | ~14 | V1 + V2.content_assets |
| **V5** | Proposals & Onboarding | ~14 | V3.prospects + V1.clients |
| **V6** | Analytics Hub | ~14 | V2.content_assets + V1.clients |
| **V7** | War Room | ~4 | V1–V6 (all modules) |
| **V8** | Website | ~10 | V3.prospects + V5.packages |
| **V9** | Polish & Hardening | ~12 | V1–V8 |
| **V10** | Productize (SaaS) | ~12 | V9 |

### Version Dependency Graph

```
V1 (Foundation + Ops Desk)
├── V2 (Content Engine)
│   └── V6 (Analytics Hub)
│       └── V7 (War Room)
├── V3 (Lead Engine)
│   ├── V5 (Proposals)
│   └── V8 (Website)
├── V4 (Client Portal) ← requires V1 + V2
└── V9 (Polish) ← requires V1–V8
    └── V10 (Productize)
```

### Cumulative Scale

**Total estimated across all 10 versions:** ~136 tasks, ~40 phases, ~77 pages, ~86 API routes, 30+ tables.

---

## 8. V1 Build Plan (Barker-Ready)

> **Full document:** `NEXUS_V1_Barker_Plan_2026-03-01.md` (1,277 lines)

### V1 Structure

| Phase | Name | Tasks | Key Deliverables |
|-------|------|-------|-----------------|
| Phase 1 | Project Scaffolding | 6 | Next.js project, Prisma schema (all V1 tables), NextAuth, platform shell, shared components, utilities |
| Phase 2 | Client Management | 4 | Client CRUD API, list/detail/create pages |
| Phase 3 | Project Management | 4 | Project CRUD API + deliverables + comments, Kanban board (DnD), detail/create pages |
| Phase 4 | Invoicing & Payments | 3 | Invoice CRUD API + Stripe payment links + webhook, list/detail/create pages |
| Phase 5 | Team, Dashboard & Calendar | 4 | Team API + invite flow, Ops dashboard (Prisma aggregations), calendar view |
| Phase 6 | V1 Validation | 0 (validator) | Build, type check, lint, Prisma validate + holistic fix pass |

### Model Split

**8 Opus (36%) / 14 Sonnet (64%)**

Opus assigned to: Prisma schema design, auth/middleware, client API (sets pattern), project API (complex), Kanban board (DnD + optimistic updates), invoice API (Stripe), Ops dashboard (aggregation queries).

### Parallelism

After `p1-prisma` completes, 6 tasks can run simultaneously across different instances (auth, utils, client API, project API, invoice API, team API). After APIs complete, all page tasks can run in parallel.

**Estimated wall clock time:** 2.5–4 hours with 5 instances.

### Input File Required

The Barker plan references `NEXUS_Platform_Spec_2026-03-01.md` as its `input_file` (alias: `spec`). This file must be in the same directory as the plan when you run `barker run NEXUS_V1_Barker_Plan_2026-03-01.md`.

---

## 9. Barker Schema Migration

### What Was Updated

| File | Changes Made |
|------|-------------|
| `BARKER_Docs_Final_2026-03-01.md` | Schema migration (11 edits: done_condition→done_check, added phase_check, validation block, DEGRADED state, authoritative note, updated examples/lifecycle/error handling/crash recovery/troubleshooting) + Build Hardening section (The Hardening Strategy, What Goes in Hardening Requirements, Why Not a Separate Hardening Phase) merged from separate editing session |
| `BARKER_Prompts_Final_2026-03-01.md` | Schema migration (5 edits across tasks 2, 4a, 4b, 13c) + 8 hardening requirement blocks (tasks 4a, 6a, 7, 9a, 10a, 13a, 13c, 23) + 4 extra error handling lines in task 22a, all merged from separate editing session |

### Migration Prompt for Source Code

**File:** `BARKER_Migration_Prompt_2026-03-01.md`

**What it does:** A 5-step Claude Code prompt that:
1. Searches the entire Barker codebase for old schema references (`grep` across all file types)
2. Audits each file and classifies what type of change is needed (types, parser, scheduler, state, TUI, tests)
3. Migrates all code to the new schema
4. Verifies with `tsc --noEmit` and a final grep confirming zero old references
5. Reports what it found, what it changed, and what didn't exist yet

**How to use:** Paste the prompt into Claude Code while inside the Barker project directory.

---

## 10. Open Items & Next Steps

### Immediate Next Steps

| # | Action | Status |
|---|--------|--------|
| 1 | **Run Barker schema migration** — Paste `BARKER_Migration_Prompt_2026-03-01.md` into Claude Code inside the Barker project to audit/fix source code | 🔲 Todo |
| 2 | **Place spec file** — Ensure `NEXUS_Platform_Spec_2026-03-01.md` is in the same directory where you'll run `barker run` | 🔲 Todo |
| 3 | **Run V1 build** — Execute `barker run NEXUS_V1_Barker_Plan_2026-03-01.md` | 🔲 Todo |
| 4 | **Test V1** — After build completes, manually verify: login, create client, create project, drag on Kanban, create invoice | 🔲 Todo |
| 5 | **Create V2 plan** — Append Content Engine phases to the V1 plan file (keep all V1 task IDs stable) | 🔲 Todo |

### Open Questions

| # | Question | Impact | Resolution |
|---|----------|--------|------------|
| 1 | ~~Is Barker built?~~ | ~~Determines migration scope~~ | ✅ **Yes — Barker is built and operational.** |
| 2 | Which Prisma schema approach for V2+ — extend the V1 migration or add new migrations? | Affects how the Barker plan handles database changes across versions | Open |
| 3 | Should the Client Portal be a separate deployment or same deployment with route groups? | The spec supports both; needs a decision before V4 | Open |
| 4 | n8n self-hosting — is an n8n instance already running, or does it need to be set up as part of V2? | Affects V2 (Content Engine) scope | Open |
| 5 | Social API OAuth credentials — which platforms are priority for V6 (Analytics Hub)? | Some platforms have lengthy approval processes | Open |

### Infrastructure Decisions

#### Payment Gateway: PayMongo (not Stripe)

Stripe is not officially available in the Philippines. The workaround requires forming a US LLC, which is unnecessary overhead. **PayMongo** is the recommended alternative:

- Filipino fintech, Y Combinator-backed, built for the PH market
- RESTful API similar to Stripe's design patterns
- Supports credit/debit cards, GCash, Maya, GrabPay, 7-Eleven OTC
- Fees: 3.5% + ₱15 per card transaction, 3% for e-wallets
- No setup fees, no monthly fees
- JavaScript SDK available

**Impact on V1 build plan:** ✅ Updated. The V1 Barker plan now uses PayMongo throughout:
- Dependency: `paymongo-node` instead of `stripe`
- Prisma schema: `paymongoPaymentLinkId`, `paymongoPaymentLinkUrl`, `paymongoPaymentId` fields
- New file: `src/lib/paymongo.ts` (client init, createPaymentLink helper, webhook signature verification)
- Invoice send endpoint: creates PayMongo Link via API
- Webhook route: `src/app/api/webhooks/paymongo/route.ts` handles `link.payment.paid` events
- PayMongo supports PHP and USD (card transactions via Payment Intent API, requires account config for USD)
- US customers can pay with Visa/Mastercard; non-PH cards incur +1% cross-border fee

**Future:** If V10 (Productize) targets international clients, Stripe can be added alongside PayMongo at that point. PayMongo handles PH customers, Stripe handles international.

#### File Storage: Cloudflare R2

R2 is S3-compatible object storage from Cloudflare. Used for storing client logos, uploaded files, generated content, invoice PDFs, and any other binary assets.

- **Get it at:** dash.cloudflare.com → R2 → Create bucket
- **Free tier:** 10 GB storage, 1M writes, 10M reads per month
- **Paid:** $0.015/GB/month storage, zero egress fees
- **Estimated cost for NEXUS:** Under $5/month for the first year
- **API:** S3-compatible — use `@aws-sdk/client-s3` (already in the V1 plan)

#### Database: PostgreSQL (no change needed for SaaS)

PostgreSQL scales from V1 through V10 and beyond. No replacement needed for multi-tenant SaaS:

- Natively supports row-level security (for tenant isolation in V10)
- Scales vertically to hundreds of thousands of users
- Read replicas available when needed
- Used by Stripe, Discord, Instagram (early), and countless SaaS products at scale

Only consideration for far future: add a specialized analytics layer (ClickHouse/TimescaleDB) alongside PostgreSQL if real-time aggregation across hundreds of millions of rows becomes a bottleneck. PostgreSQL itself stays.

### Future Version Planning

**How Barker handles V1 → V2 → V3... (Plan Evolution)**

Barker has a built-in plan differ (`src/core/plan-differ.ts`) that enables incremental builds from a single growing plan file. The mechanism:

1. After V1 completes, `.barker/state.json` stores the SHA-256 hash of every completed task's prompt and expected_files
2. To build V2: edit the same plan file — keep all V1 task IDs and phases, append new V2 phases with new task IDs
3. Run `barker run` on the updated plan → the plan differ classifies every task:
   - **Carried:** completed + hashes match → skip (already built)
   - **Modified:** completed but prompt/model/files changed → Barker shows diff, asks Re-run or Skip
   - **Added:** new task ID → schedule it
   - **Removed:** task ID in state but not in plan → noted, no action
   - **Unchanged pending:** in state but never completed → schedule it
4. New V2 tasks can `depends_on` V1 tasks — Barker treats completed dependencies as automatically satisfied
5. Plan version is incremented in `planHistory`, and the plan file is archived to `.barker/plans/`

**Key rules for plan evolution:**
- Never rename existing task IDs (Barker matches by ID)
- Never remove completed tasks from the plan (needed for dependency graph)
- Add new phases at the end with new task IDs (`p7-*`, `p8-*`, etc.)
- Update the `validation` block if V2 adds new check requirements

When you're ready to build V2 (Content Engine), the process is:

1. Open `NEXUS_V1_Barker_Plan_2026-03-01.md`
2. Keep all existing task IDs and phases unchanged
3. Append new phases (Phase 7–11) with new task IDs (`p7-*` through `p11-*`)
4. New tasks can `depends_on` V1 tasks — Barker treats completed dependencies as automatically satisfied
5. Update the `validation` block to include any new checks
6. Run `barker run NEXUS_V1_Barker_Plan_2026-03-01.md` — Barker skips all completed V1 tasks and builds only V2

The same pattern repeats for V3–V10. The plan file grows with each version but Barker only executes what's new or changed.

---

## Appendix: File Checksums

For verifying document integrity across sessions:

| File | Lines | Purpose |
|------|-------|---------|
| `NEXUS_Master_Build_Plan_Original.md` | 705 | Original input (unchanged) |
| `NEXUS_Platform_Spec_2026-03-01.md` | 1,425 | Complete Track B spec with gaps patched |
| `NEXUS_Version_Roadmap_2026-03-01.md` | 629 | Human-readable V1–V10 roadmap |
| `NEXUS_V1_Barker_Plan_2026-03-01.md` | 1,277 | Barker-executable V1 plan |
| `BARKER_Docs_Final_2026-03-01.md` | ~985 | Merged Barker documentation (schema + hardening) |
| `BARKER_Prompts_Final_2026-03-01.md` | ~954 | Merged Barker build prompts (schema + hardening) |
| `BARKER_PLANNING_TEMPLATE.md` | 509 | Authoritative schema (unchanged) |
| `BARKER_Migration_Prompt_2026-03-01.md` | ~100 | Claude Code audit/migration prompt |
| `NEXUS_Living_Document_2026-03-01.md` | this file | Living document — everything in one place |
