# NEXUS Platform — V2 Build Plan (Content Engine)

> **Version:** 2.0
> **Scope:** Content Engine module — brand profiles, pipeline management, prompt library, generation queue, content gallery, cost tracking
> **Extends:** V1 plan (`NEXUS_V1_Barker_Plan_2026-03-01.md`) — all V1 task IDs remain stable
> **Run with:** `barker run NEXUS_V2_Barker_Plan_2026-03-04.md`
> **Prerequisites:** V1 fully built and passing validation. `NEXUS_Platform_Spec_2026-03-01.md` in the same directory.

```yaml
# ============================================================
# NEXUS PLATFORM — V2: CONTENT ENGINE
# ============================================================
# This plan EXTENDS V1. All V1 tasks are listed as-is so
# Barker can skip them (hashes match) and build only V2 phases.
# Do NOT rename or remove any V1 task IDs.
# ============================================================

project:
  name: "nexus"
  description: "Agency management platform — V2: Content Engine"
  working_directory: "."

input_files:
  - path: "NEXUS_Platform_Spec_2026-03-01.md"
    alias: "spec"
    description: "Complete platform specification with data model, routes, and module details"

# ============================================================
# V1 PHASES — CARRIED (Barker skips completed tasks)
# ============================================================
phases:
  - id: "phase-1"
    name: "Project Scaffolding"
    description: "Bare Next.js project with all tooling — no features yet"
    phase_check: "npx tsc --noEmit"
    tasks:
      - id: "p1-init"
        name: "Initialize Next.js project"
        model: "sonnet"
        depends_on: []
        estimated_minutes: 8
        prompt: "V1 task — carried."
        expected_files: ["package.json", "tsconfig.json", "tailwind.config.ts", "next.config.ts", "src/app/layout.tsx", "src/app/page.tsx", "components.json"]

      - id: "p1-prisma"
        name: "Prisma schema + database setup"
        model: "opus"
        depends_on: ["p1-init"]
        estimated_minutes: 15
        prompt: "V1 task — carried."
        expected_files: ["prisma/schema.prisma", "prisma/seed.ts", "src/lib/db.ts"]

      - id: "p1-auth"
        name: "NextAuth configuration + middleware"
        model: "opus"
        depends_on: ["p1-prisma"]
        estimated_minutes: 12
        prompt: "V1 task — carried."
        expected_files: ["src/lib/auth.ts", "src/lib/auth.config.ts", "src/lib/auth-guard.ts", "src/middleware.ts", "src/app/api/auth/[...nextauth]/route.ts", "src/types/next-auth.d.ts"]

      - id: "p1-layout"
        name: "Platform layout shell"
        model: "sonnet"
        depends_on: ["p1-auth"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/layout.tsx", "src/app/(auth)/layout.tsx", "src/app/(auth)/login/page.tsx", "src/app/(auth)/login/actions.ts", "src/app/(portal)/layout.tsx"]

      - id: "p1-shared-ui"
        name: "Shared UI components"
        model: "sonnet"
        depends_on: ["p1-init"]
        estimated_minutes: 15
        prompt: "V1 task — carried."
        expected_files: ["src/components/shared/data-table.tsx", "src/components/shared/status-badge.tsx", "src/components/shared/metric-card.tsx", "src/components/shared/empty-state.tsx", "src/components/shared/confirm-dialog.tsx", "src/components/shared/file-uploader.tsx", "src/components/shared/comment-thread.tsx", "src/components/shared/activity-feed.tsx", "src/components/shared/kanban-board.tsx", "src/components/shared/index.ts"]

      - id: "p1-utils"
        name: "Shared utilities"
        model: "sonnet"
        depends_on: ["p1-prisma"]
        estimated_minutes: 8
        prompt: "V1 task — carried."
        expected_files: ["src/lib/r2.ts", "src/lib/activity.ts", "src/lib/format.ts", "src/lib/constants.ts", "src/lib/env.ts", "src/lib/utils.ts", "src/lib/validations.ts"]

  - id: "phase-2"
    name: "Client Management"
    description: "Full CRUD for the clients entity"
    tasks:
      - id: "p2-client-api"
        name: "Client API routes"
        model: "opus"
        depends_on: ["p1-prisma", "p1-auth"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/api/ops-desk/clients/route.ts", "src/app/api/ops-desk/clients/[id]/route.ts"]

      - id: "p2-client-list"
        name: "Client list page"
        model: "sonnet"
        depends_on: ["p2-client-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/clients/page.tsx", "src/app/(platform)/ops-desk/clients/clients-table.tsx"]

      - id: "p2-client-forms"
        name: "Client create/edit forms"
        model: "sonnet"
        depends_on: ["p2-client-api", "p1-shared-ui"]
        estimated_minutes: 8
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/clients/new/page.tsx", "src/components/shared/client-form.tsx"]

      - id: "p2-client-detail"
        name: "Client detail page"
        model: "sonnet"
        depends_on: ["p2-client-api", "p1-shared-ui"]
        estimated_minutes: 12
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/clients/[id]/page.tsx"]

  - id: "phase-3"
    name: "Project Management"
    description: "Kanban board and project detail pages"
    tasks:
      - id: "p3-project-api"
        name: "Project API routes"
        model: "opus"
        depends_on: ["p1-prisma", "p1-auth"]
        estimated_minutes: 12
        prompt: "V1 task — carried."
        expected_files: ["src/app/api/ops-desk/projects/route.ts", "src/app/api/ops-desk/projects/[id]/route.ts", "src/app/api/ops-desk/projects/[id]/status/route.ts", "src/app/api/ops-desk/deliverables/route.ts", "src/app/api/ops-desk/deliverables/[id]/route.ts", "src/app/api/ops-desk/comments/route.ts"]

      - id: "p3-kanban"
        name: "Project Kanban board"
        model: "opus"
        depends_on: ["p3-project-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 15
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/projects/page.tsx"]

      - id: "p3-project-detail"
        name: "Project detail page"
        model: "sonnet"
        depends_on: ["p3-project-api", "p1-shared-ui"]
        estimated_minutes: 15
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/projects/[id]/page.tsx"]

      - id: "p3-project-create"
        name: "Project create page"
        model: "sonnet"
        depends_on: ["p3-project-api", "p1-shared-ui"]
        estimated_minutes: 8
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/projects/new/page.tsx"]

  - id: "phase-4"
    name: "Invoicing & Payments"
    description: "Invoice CRUD and PayMongo integration"
    tasks:
      - id: "p4-invoice-api"
        name: "Invoice API routes + PayMongo"
        model: "opus"
        depends_on: ["p1-prisma", "p1-auth"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/api/ops-desk/invoices/route.ts", "src/app/api/ops-desk/invoices/[id]/route.ts", "src/app/api/ops-desk/invoices/[id]/send/route.ts", "src/app/api/webhooks/paymongo/route.ts", "src/lib/paymongo.ts"]

      - id: "p4-invoice-list"
        name: "Invoice list page"
        model: "sonnet"
        depends_on: ["p4-invoice-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 8
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/invoices/page.tsx"]

      - id: "p4-invoice-detail-create"
        name: "Invoice detail + create pages"
        model: "sonnet"
        depends_on: ["p4-invoice-api", "p1-shared-ui"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/invoices/[id]/page.tsx", "src/app/(platform)/ops-desk/invoices/new/page.tsx"]

  - id: "phase-5"
    name: "Team Management & Dashboard"
    description: "Team pages, Ops dashboard, calendar"
    tasks:
      - id: "p5-team-api"
        name: "Team management API"
        model: "sonnet"
        depends_on: ["p1-prisma", "p1-auth"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/api/ops-desk/team/route.ts", "src/app/api/ops-desk/team/[id]/route.ts", "src/app/api/auth/invite/route.ts"]

      - id: "p5-team-pages"
        name: "Team list + detail pages"
        model: "sonnet"
        depends_on: ["p5-team-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/team/page.tsx", "src/app/(platform)/ops-desk/team/[id]/page.tsx", "src/app/(platform)/settings/team/page.tsx"]

      - id: "p5-dashboard"
        name: "Ops Desk dashboard"
        model: "opus"
        depends_on: ["p2-client-api", "p3-project-api", "p4-invoice-api", "p1-layout"]
        estimated_minutes: 12
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/page.tsx"]

      - id: "p5-calendar"
        name: "Calendar view"
        model: "sonnet"
        depends_on: ["p3-project-api", "p1-layout"]
        estimated_minutes: 10
        prompt: "V1 task — carried."
        expected_files: ["src/app/(platform)/ops-desk/calendar/page.tsx"]

  # ============================================================
  # PHASE 7: CONTENT ENGINE INFRASTRUCTURE
  # New phase — activates Redis+BullMQ, n8n webhooks, SSE, cost logging
  # ============================================================
  - id: "phase-7"
    name: "Content Engine Infrastructure"
    description: "Redis+BullMQ worker, n8n webhook endpoints, SSE queue feed, API usage logging utility, Prisma schema migration for V2 tables"
    phase_check: "npx prisma validate && npx tsc --noEmit"

    tasks:
      - id: "p7-schema-migration"
        name: "Prisma schema migration — V2 tables"
        model: "opus"
        depends_on: ["p1-prisma"]
        estimated_minutes: 12
        context_sources:
          - alias: "spec"
            sections: ["3.2 Module-Specific Entities"]
        prompt: |
          Read prisma/schema.prisma to understand the existing V1 schema.
          Read the context section for the full field specifications of the 6 new Content Engine tables.

          Add the following models to prisma/schema.prisma:

          BrandProfile
          - id: String @id @default(uuid())
          - clientId: String @unique (FK to Client, @relation "ClientBrandProfile")
          - colors: Json? (JSONB: primary, secondary, accent, background)
          - typography: Json? (JSONB: heading font, body font, sizes)
          - toneOfVoice: String? @db.Text
          - targetAudience: String? @db.Text
          - exampleUrls: String[] (array of reference URLs)
          - styleRefUrls: String[] (R2 URLs for style references)
          - characterSheets: Json? (JSONB: persona definitions)
          - createdAt: DateTime @default(now())
          - updatedAt: DateTime @updatedAt
          - Add @map("brand_profiles") and column maps for snake_case fields

          PipelineStatus enum: ACTIVE, INACTIVE, ERROR

          Pipeline
          - id: String @id @default(uuid())
          - name: String
          - type: String (e.g. 'social_carousel', 'blog_post', 'short_video')
          - status: PipelineStatus @default(ACTIVE)
          - webhookUrl: String @map("webhook_url")
          - config: Json? (pipeline-specific parameters)
          - lastRun: DateTime? @map("last_run")
          - totalProcessed: Int @default(0) @map("total_processed")
          - createdAt: DateTime @default(now())
          - updatedAt: DateTime @updatedAt
          - @map("pipelines")

          PromptTemplate
          - id: String @id @default(uuid())
          - pipelineId: String? (FK to Pipeline, nullable, @relation "PipelinePrompts")
          - contentType: String @map("content_type")
          - body: String @db.Text
          - version: Int @default(1)
          - performanceNotes: String? @db.Text @map("performance_notes")
          - abNotes: String? @db.Text @map("ab_notes")
          - isActive: Boolean @default(true) @map("is_active")
          - category: String?
          - createdAt: DateTime @default(now())
          - updatedAt: DateTime @updatedAt
          - @map("prompt_templates")

          GenerationJobStatus enum: QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED

          GenerationJob
          - id: String @id @default(uuid())
          - pipelineId: String (FK to Pipeline, @relation "PipelineJobs")
          - clientId: String (FK to Client, @relation "ClientGenerationJobs")
          - brandProfileId: String (FK to BrandProfile, @relation "BrandProfileJobs")
          - params: Json (inputs passed to n8n)
          - status: GenerationJobStatus @default(QUEUED)
          - startedAt: DateTime? @map("started_at")
          - completedAt: DateTime? @map("completed_at")
          - totalCost: Decimal @default(0) @db.Decimal(8,4) @map("total_cost")
          - errorMessage: String? @db.Text @map("error_message")
          - createdAt: DateTime @default(now())
          - @map("generation_jobs")

          ModelRegistry
          - id: String @id @default(uuid())
          - name: String (e.g. 'claude-sonnet-4-5', 'flux-1.1-pro')
          - provider: String (e.g. 'anthropic', 'replicate', 'fal')
          - endpoint: String?
          - costPerUnit: Decimal @db.Decimal(10,6) @map("cost_per_unit")
          - unitType: String @map("unit_type") (token/image/second/request)
          - qualityBenchmark: Decimal? @db.Decimal(3,2) @map("quality_benchmark")
          - isActive: Boolean @default(true) @map("is_active")
          - @map("model_registry")

          ApiUsageLog
          - id: String @id @default(uuid())
          - jobId: String? (FK to GenerationJob, nullable, @relation "JobUsageLogs")
          - modelId: String? (FK to ModelRegistry, nullable, @relation "ModelUsageLogs")
          - modelName: String @map("model_name")
          - tokensUsed: Int? @map("tokens_used")
          - cost: Decimal @db.Decimal(8,6)
          - timestamp: DateTime @default(now())
          - module: String (which module made the call, e.g. 'content_engine', 'ops_desk')
          - @map("api_usage_logs")

          Also update ContentAsset to add:
          - generationJobId field FK to GenerationJob (it's already nullable String in the schema,
            just add the proper @relation if not present: @relation("JobContentAssets"))

          Add indexes:
          - @@index([clientId]) on BrandProfile
          - @@index([status]) on Pipeline
          - @@index([pipelineId]) on PromptTemplate
          - @@index([clientId, status]) on GenerationJob
          - @@index([timestamp]) on ApiUsageLog
          - @@index([module]) on ApiUsageLog

          After updating schema, run:
            npx prisma migrate dev --name add_content_engine_tables

          Verify migration succeeded:
            npx prisma validate

          Hardening requirements:
          - Ensure all FK constraints use proper @relation names to avoid Prisma relation ambiguity errors
          - Use @db.Decimal for all monetary/cost fields to avoid floating-point precision loss
          - Verify existing V1 relations are not broken by adding new relations to Client and ContentAsset
          - If migrate dev prompts for anything, use --create-only flag and run migrate deploy manually
        expected_files:
          - "prisma/schema.prisma"
          - "prisma/migrations"
        done_check: "npx prisma validate"

      - id: "p7-bullmq-setup"
        name: "Redis + BullMQ worker setup"
        model: "opus"
        depends_on: ["p7-schema-migration"]
        estimated_minutes: 15
        context_sources:
          - alias: "spec"
            sections: ["8. Background Jobs & Scheduled Tasks"]
        prompt: |
          Read package.json. Read prisma/schema.prisma to understand GenerationJob and ContentAsset models.
          Read src/lib/db.ts for the database client pattern.

          Install Redis and BullMQ dependencies:
            npm install bullmq ioredis

          Create src/lib/queue.ts:
          - Export a singleton Redis connection: `export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null })`
          - Export a Queue instance: `export const generationQueue = new Queue('generation', { connection: redis })`
          - Export type: `GenerationJobPayload { jobId: string, pipelineId: string, clientId: string, brandProfileId: string, params: Record<string, unknown> }`
          - Export helper: `enqueueGenerationJob(payload: GenerationJobPayload): Promise<Job>`
            - Creates BullMQ job with jobId as job name
            - Sets attempts: 3, backoff: { type: 'exponential', delay: 5000 }

          Create src/workers/generation-worker.ts:
          - Import Queue, Worker from bullmq; import redis from @/lib/queue; import db from @/lib/db
          - Create a Worker for the 'generation' queue
          - Worker processor:
            1. Find the GenerationJob by jobId from payload
            2. Update job status to PROCESSING, set startedAt
            3. Fetch the Pipeline to get webhookUrl
            4. POST to pipeline.webhookUrl with payload: { jobId, clientId, brandProfileId, params }
               - Set 30-second timeout on the fetch
               - Headers: { 'Content-Type': 'application/json', 'X-Nexus-Job-Id': jobId }
            5. If webhook returns non-2xx: throw error (BullMQ will retry)
            6. Update GenerationJob status to COMPLETED, set completedAt
            7. Log to activity_log: module CONTENT_ENGINE, action 'dispatched', entityType 'generation_job', entityId jobId
          - On worker error: update GenerationJob status to FAILED, set errorMessage
          - Export startWorker() function that initializes the worker

          Create src/workers/index.ts:
          - Exports startWorker from generation-worker

          Add to .env.example:
            REDIS_URL=redis://localhost:6379

          Update src/lib/env.ts to add REDIS_URL as optional string with default 'redis://localhost:6379'.

          Hardening requirements:
          - Redis connection must have maxRetriesPerRequest: null (required for BullMQ)
          - Worker processor must wrap all DB calls in try/catch; on catch: update job to FAILED with errorMessage
          - Webhook POST must have explicit timeout (30s) — use AbortController with setTimeout
          - Never let a webhook failure crash the worker — catch all fetch errors and throw them so BullMQ can retry
          - GenerationJob DB update must happen in a transaction when updating both status and startedAt
          - Handle case where GenerationJob record is not found (may have been deleted) — skip processing gracefully
        expected_files:
          - "src/lib/queue.ts"
          - "src/workers/generation-worker.ts"
          - "src/workers/index.ts"
        done_check: "test -f src/lib/queue.ts && test -f src/workers/generation-worker.ts"

      - id: "p7-n8n-webhook"
        name: "n8n callback webhook endpoint + SSE queue feed"
        model: "sonnet"
        depends_on: ["p7-bullmq-setup"]
        estimated_minutes: 12
        prompt: |
          Read src/lib/db.ts, src/lib/activity.ts, src/lib/auth-guard.ts.
          Read prisma/schema.prisma for GenerationJob, ContentAsset, ApiUsageLog models.

          Create src/app/api/webhooks/n8n/route.ts:
          This is the callback endpoint n8n posts to when a generation job completes.
          - POST handler (public route — no auth, but verify X-Nexus-Job-Id header matches jobId in body)
          - Expected body: {
              jobId: string,
              status: 'completed' | 'failed',
              outputs?: Array<{ fileUrl: string, thumbnailUrl?: string, type: string, metadata?: object }>,
              cost?: number,
              modelName?: string,
              tokensUsed?: number,
              errorMessage?: string
            }
          - Validation: require jobId and status. If status not in ['completed', 'failed'], return 400.
          - Find GenerationJob by jobId. If not found, return 404.
          - If status === 'completed':
            1. For each output: create a ContentAsset record (clientId from job, generationJobId from job,
               type from output.type cast to ContentAssetType, fileUrl, thumbnailUrl, metadata)
            2. Update GenerationJob: status COMPLETED, completedAt now(), totalCost (cost ?? 0)
            3. If cost and modelName provided: create ApiUsageLog record
            4. Log activity: CONTENT_ENGINE, 'completed', 'generation_job'
          - If status === 'failed':
            1. Update GenerationJob: status FAILED, errorMessage
            2. Log activity: CONTENT_ENGINE, 'failed', 'generation_job'
          - Broadcast SSE event (see below)
          - Return { received: true } 200

          Create src/app/api/content-engine/queue/route.ts:
          This is the SSE endpoint for real-time queue updates.
          - GET handler (auth required — ADMIN or TEAM)
          - Use ReadableStream with a TransformStream to push SSE events
          - Maintain a global Map<string, Set<ReadableStreamDefaultController>> for active connections
          - On connect: send current queue state (all non-terminal jobs with their status)
          - On disconnect (abort signal): remove from active connections map
          - SSE event format: `data: ${JSON.stringify({ type: 'job_update', job: {...} })}\n\n`
          - Export broadcastJobUpdate(job: object): void that pushes to all active connections

          Create src/lib/sse.ts:
          - Export the connections Map and broadcastJobUpdate function
          - Import this in the n8n webhook to broadcast after status updates

          Add to src/middleware.ts public paths:
            '/api/webhooks/n8n'

          Hardening requirements:
          - n8n webhook: validate Content-Type is application/json before parsing body
          - n8n webhook: wrap entire handler in try/catch; on error return 500 with { error } but do NOT expose stack traces
          - n8n webhook: use Prisma transaction for creating multiple ContentAssets + updating GenerationJob atomically
          - SSE endpoint: set headers: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive
          - SSE endpoint: handle client disconnect via request.signal.addEventListener('abort', cleanup)
          - SSE endpoint: send a heartbeat comment (': heartbeat\n\n') every 30 seconds to prevent proxy timeouts
          - broadcastJobUpdate: wrap each controller.enqueue in try/catch — a broken connection should not stop other broadcasts
        expected_files:
          - "src/app/api/webhooks/n8n/route.ts"
          - "src/app/api/content-engine/queue/route.ts"
          - "src/lib/sse.ts"
        done_check: "test -f src/app/api/webhooks/n8n/route.ts && test -f src/app/api/content-engine/queue/route.ts"

      - id: "p7-api-usage-logger"
        name: "API usage logging utility"
        model: "sonnet"
        depends_on: ["p7-schema-migration"]
        estimated_minutes: 6
        prompt: |
          Read prisma/schema.prisma for ApiUsageLog and ModelRegistry models.
          Read src/lib/db.ts for the db client.

          Create src/lib/api-usage.ts:

          Export:
          - logApiUsage(params: {
              jobId?: string,
              modelId?: string,
              modelName: string,
              tokensUsed?: number,
              cost: number,
              module: string
            }): Promise<ApiUsageLog>
            Creates an ApiUsageLog record. Never throws — wrap in try/catch and log warning on failure
            so that a logging error never breaks the calling code.

          - getCostByClient(clientId: string, from: Date, to: Date): Promise<{ total: number, byModel: Record<string, number> }>
            Joins ApiUsageLog → GenerationJob to aggregate costs for a client in a date range.

          - getCostByModule(module: string, from: Date, to: Date): Promise<number>
            Returns total cost for a module in a date range.

          Hardening requirements:
          - logApiUsage must never throw — all errors should be caught and console.warn'd
          - Validate that cost is a non-negative finite number before writing; default to 0 if invalid
          - getCostByClient: if no records found, return { total: 0, byModel: {} } not null
        expected_files:
          - "src/lib/api-usage.ts"
        done_check: "test -f src/lib/api-usage.ts"

  # ============================================================
  # PHASE 8: BRAND PROFILES & PIPELINE MANAGEMENT
  # ============================================================
  - id: "phase-8"
    name: "Brand Profiles & Pipeline Management"
    description: "Brand profile CRUD, pipeline registry, trigger flow"
    phase_check: "test -f src/app/(platform)/content-engine/brand-profiles/page.tsx && test -f src/app/(platform)/content-engine/pipelines/page.tsx"

    tasks:
      - id: "p8-brand-profile-api"
        name: "Brand profile API routes"
        model: "opus"
        depends_on: ["p7-schema-migration", "p1-auth"]
        estimated_minutes: 12
        context_sources:
          - alias: "spec"
            sections: ["3.2 Module-Specific Entities"]
        prompt: |
          Read prisma/schema.prisma for BrandProfile and Client models.
          Read src/lib/auth-guard.ts and src/lib/activity.ts.
          Read src/lib/validations.ts to follow the existing Zod validation pattern.

          Create src/app/api/content-engine/brand-profiles/route.ts:
          - GET: list all brand profiles. Include client name. Support ?clientId= filter.
            Auth: ADMIN, TEAM.
          - POST: create brand profile.
            Body: { clientId, colors?, typography?, toneOfVoice?, targetAudience?, exampleUrls?, styleRefUrls?, characterSheets? }
            Validate: clientId is valid UUID and client exists. clientId must be unique per brand profile (enforce at API level too, not just DB).
            Auth: ADMIN.
            Log activity: CONTENT_ENGINE, 'created', 'brand_profile'.

          Create src/app/api/content-engine/brand-profiles/[id]/route.ts:
          - GET: single brand profile by id. Include client info.
            Auth: ADMIN, TEAM.
          - PATCH: update any field. Partial update — only provided fields are changed.
            Auth: ADMIN, TEAM.
            Log activity: CONTENT_ENGINE, 'updated', 'brand_profile'.
          - DELETE: delete brand profile.
            Auth: ADMIN.
            Log activity: CONTENT_ENGINE, 'deleted', 'brand_profile'.

          Add Zod schemas to src/lib/validations.ts:
          - createBrandProfileSchema: require clientId (UUID), all other fields optional
          - updateBrandProfileSchema: all fields optional

          Hardening requirements:
          - POST: return 409 if a brand profile already exists for clientId
          - PATCH: verify brand profile exists before updating; return 404 if not
          - DELETE: return 409 if there are GenerationJobs referencing this brand profile (check count before deleting)
          - All JSONB fields (colors, typography, characterSheets): accept any valid JSON object; do not enforce internal structure at API level (flexible for future schema changes)
          - styleRefUrls and exampleUrls: validate each is a non-empty string; max 20 items each
          - Return consistent { data: BrandProfile } shape for all successful responses
        expected_files:
          - "src/app/api/content-engine/brand-profiles/route.ts"
          - "src/app/api/content-engine/brand-profiles/[id]/route.ts"
        done_check: "test -f src/app/api/content-engine/brand-profiles/route.ts"

      - id: "p8-pipeline-api"
        name: "Pipeline registry API routes"
        model: "sonnet"
        depends_on: ["p7-schema-migration", "p1-auth"]
        estimated_minutes: 10
        prompt: |
          Read prisma/schema.prisma for Pipeline model.
          Read src/lib/auth-guard.ts, src/lib/activity.ts, src/lib/validations.ts.

          Create src/app/api/content-engine/pipelines/route.ts:
          - GET: list all pipelines. Support ?status= filter (ACTIVE/INACTIVE/ERROR).
            Auth: ADMIN, TEAM.
          - POST: create pipeline.
            Body: { name, type, webhookUrl, config?, status? }
            Validate: name non-empty (1-200 chars), type non-empty, webhookUrl is valid URL.
            Auth: ADMIN.
            Log activity: CONTENT_ENGINE, 'created', 'pipeline'.

          Create src/app/api/content-engine/pipelines/[id]/route.ts:
          - GET: single pipeline. Include count of jobs (all-time and last 30 days).
            Auth: ADMIN, TEAM.
          - PATCH: update pipeline fields. Can update status (to deactivate/reactivate).
            Auth: ADMIN, TEAM.
            Log activity: CONTENT_ENGINE, 'updated', 'pipeline'.
          - DELETE: delete pipeline. Block if active jobs exist.
            Auth: ADMIN.

          Create src/app/api/content-engine/pipelines/[id]/trigger/route.ts:
          - POST: trigger a generation job on this pipeline.
            Body: { clientId, brandProfileId, params }
            Validate: pipeline must be ACTIVE; clientId and brandProfileId must be valid and exist.
            1. Create GenerationJob record (status QUEUED)
            2. Enqueue to BullMQ via enqueueGenerationJob() from src/lib/queue.ts
            3. Update pipeline lastRun and totalProcessed
            4. Log activity: CONTENT_ENGINE, 'triggered', 'pipeline'
            5. Return { data: { jobId, status: 'QUEUED' } }
            Auth: ADMIN, TEAM.

          Hardening requirements:
          - Trigger endpoint: if BullMQ enqueue throws, roll back the GenerationJob creation (use transaction or delete on catch)
          - Trigger endpoint: return 422 if pipeline status is INACTIVE or ERROR with message explaining why
          - DELETE: check for QUEUED or PROCESSING jobs before allowing delete; return 409 if any exist
          - webhookUrl: validate it starts with http:// or https:// and is a parseable URL
        expected_files:
          - "src/app/api/content-engine/pipelines/route.ts"
          - "src/app/api/content-engine/pipelines/[id]/route.ts"
          - "src/app/api/content-engine/pipelines/[id]/trigger/route.ts"
        done_check: "test -f src/app/api/content-engine/pipelines/route.ts && test -f src/app/api/content-engine/pipelines/[id]/trigger/route.ts"

      - id: "p8-brand-profile-pages"
        name: "Brand profile pages"
        model: "sonnet"
        depends_on: ["p8-brand-profile-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 15
        prompt: |
          Read src/app/api/content-engine/brand-profiles/route.ts and [id]/route.ts.
          Read src/components/shared/index.ts for available shared components.
          Read src/app/(platform)/layout.tsx to understand the platform layout structure.
          Read src/lib/constants.ts for status color patterns to follow.

          Create src/app/(platform)/content-engine/layout.tsx:
          - Sub-navigation for the Content Engine module
          - Links: Overview (/content-engine), Brand Profiles, Pipelines, Prompt Library, Queue, Gallery, Cost Tracker
          - Match the style of src/app/(platform)/ops-desk/layout.tsx

          Create src/app/(platform)/content-engine/page.tsx:
          - Content Engine module overview/dashboard (placeholder metrics for now)
          - Show: total brand profiles count, active pipelines count, jobs this month (queued/completed/failed)
          - Quick links to the sub-sections

          Create src/app/(platform)/content-engine/brand-profiles/page.tsx:
          - List all brand profiles with client name, last updated
          - "New Brand Profile" button → /content-engine/brand-profiles/new
          - Click row → /content-engine/brand-profiles/[id]

          Create src/app/(platform)/content-engine/brand-profiles/new/page.tsx:
          - Create form with: Client dropdown (fetch from /api/ops-desk/clients), tone of voice textarea,
            target audience textarea, example URLs (add/remove text inputs), style reference image uploads
          - JSONB fields (colors, typography, character sheets): render as editable JSON textarea for now
            (Monaco editor integration comes in the prompt library task)
          - On submit: POST to /api/content-engine/brand-profiles, redirect to detail page

          Create src/app/(platform)/content-engine/brand-profiles/[id]/page.tsx:
          - Display all brand profile fields
          - Colors: show color swatches if colors JSON has hex values
          - Style references: show image thumbnails if styleRefUrls are R2 URLs
          - Tabs: Overview, Character Sheets, Activity
          - Edit button → inline edit mode or separate edit page (choose whichever is simpler)
          - Trigger generation button → opens modal to select pipeline and enter params → calls trigger endpoint

          Hardening requirements:
          - New brand profile form: validate client dropdown is selected before submit
          - JSONB textarea inputs: attempt JSON.parse on blur; show inline error if invalid JSON
          - Brand profile detail: handle null/empty JSONB gracefully (don't crash if colors is null)
          - Loading states on all data fetches; empty state if no brand profiles exist
        expected_files:
          - "src/app/(platform)/content-engine/layout.tsx"
          - "src/app/(platform)/content-engine/page.tsx"
          - "src/app/(platform)/content-engine/brand-profiles/page.tsx"
          - "src/app/(platform)/content-engine/brand-profiles/new/page.tsx"
          - "src/app/(platform)/content-engine/brand-profiles/[id]/page.tsx"
        done_check: "test -f src/app/(platform)/content-engine/brand-profiles/page.tsx"

      - id: "p8-pipeline-pages"
        name: "Pipeline management pages"
        model: "sonnet"
        depends_on: ["p8-pipeline-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 12
        prompt: |
          Read src/app/api/content-engine/pipelines/route.ts and [id]/route.ts and [id]/trigger/route.ts.
          Read src/app/(platform)/content-engine/layout.tsx (just created).
          Read src/components/shared/index.ts.

          Create src/app/(platform)/content-engine/pipelines/page.tsx:
          - List all pipelines with: name, type, status badge (ACTIVE=green, INACTIVE=gray, ERROR=red),
            last run timestamp, total processed count
          - "New Pipeline" button → /content-engine/pipelines/new
          - Filter by status
          - Click pipeline → /content-engine/pipelines/[id]

          Create src/app/(platform)/content-engine/pipelines/new/page.tsx:
          - Form: name, type (text input with placeholder examples), webhook URL, config (JSON textarea)
          - Webhook URL: show helper text explaining this is the n8n webhook endpoint
          - On submit: POST to /api/content-engine/pipelines, redirect to pipeline detail

          Create src/app/(platform)/content-engine/pipelines/[id]/page.tsx:
          - Header: name, type, status badge, last run, total processed
          - Activate/Deactivate toggle (PATCH status)
          - "Trigger Job" button: opens a TriggerJobModal
          - TriggerJobModal:
            - Client dropdown (fetch clients)
            - Brand Profile dropdown (fetch brand profiles filtered by selected client)
            - Params: JSON textarea (pre-filled with pipeline.config as template)
            - Submit → POST /api/content-engine/pipelines/[id]/trigger → show success toast with jobId
          - Recent jobs table: last 10 GenerationJobs for this pipeline (status, client, created, cost)

          Hardening requirements:
          - TriggerJobModal: disable submit if client or brand profile not selected
          - TriggerJobModal: validate params JSON on blur before submit
          - Brand Profile dropdown: refetch when client changes; show "No brand profile for this client" if none found
          - Loading state during trigger submission; disable button to prevent double-submit
          - Pipeline detail: if status is ERROR, show a warning banner with the last error message
        expected_files:
          - "src/app/(platform)/content-engine/pipelines/page.tsx"
          - "src/app/(platform)/content-engine/pipelines/new/page.tsx"
          - "src/app/(platform)/content-engine/pipelines/[id]/page.tsx"
        done_check: "test -f src/app/(platform)/content-engine/pipelines/page.tsx"

      - id: "p8-sidebar-update"
        name: "Update sidebar navigation for Content Engine"
        model: "sonnet"
        depends_on: ["p8-brand-profile-pages", "p8-pipeline-pages"]
        estimated_minutes: 5
        prompt: |
          Read src/app/(platform)/layout.tsx to understand the current sidebar structure.
          The sidebar currently shows Content Engine as "Coming Soon."

          Update the Content Engine sidebar entry to be a fully active navigation item:
          - Remove the "Coming Soon" badge
          - Link to /content-engine
          - The sub-navigation is handled by src/app/(platform)/content-engine/layout.tsx

          Also update src/lib/constants.ts if it has a MODULE_STATUS or similar — mark
          CONTENT_ENGINE as active.

          This is a small targeted edit. Read the file carefully before modifying.
        expected_files:
          - "src/app/(platform)/layout.tsx"
        done_check: "test -f src/app/(platform)/layout.tsx"

  # ============================================================
  # PHASE 9: PROMPT LIBRARY & GENERATION QUEUE
  # ============================================================
  - id: "phase-9"
    name: "Prompt Library & Generation Queue"
    description: "Prompt templates with version history, Monaco editor, real-time queue dashboard"
    phase_check: "test -f src/app/(platform)/content-engine/prompt-library/page.tsx && test -f src/app/(platform)/content-engine/queue/page.tsx"

    tasks:
      - id: "p9-prompt-api"
        name: "Prompt template API routes"
        model: "sonnet"
        depends_on: ["p7-schema-migration", "p1-auth"]
        estimated_minutes: 10
        prompt: |
          Read prisma/schema.prisma for PromptTemplate model.
          Read src/lib/auth-guard.ts, src/lib/activity.ts, src/lib/validations.ts.

          Create src/app/api/content-engine/prompts/route.ts:
          - GET: list prompt templates. Filters: ?pipelineId=, ?category=, ?isActive=true/false, ?search= (search name/body).
            Auth: ADMIN, TEAM.
            Include pipeline name in response.
          - POST: create prompt template.
            Body: { pipelineId?, contentType, body, category?, performanceNotes?, abNotes? }
            Validate: contentType non-empty (1-100 chars), body non-empty (1-50000 chars).
            Auth: ADMIN, TEAM.
            Log activity: CONTENT_ENGINE, 'created', 'prompt_template'.

          Create src/app/api/content-engine/prompts/[id]/route.ts:
          - GET: single prompt template. Auth: ADMIN, TEAM.
          - PATCH: update prompt template. When body changes:
            - Increment version number
            - Keep isActive state unless explicitly changed
            Auth: ADMIN, TEAM.
            Log activity: CONTENT_ENGINE, 'updated', 'prompt_template'.
          - DELETE: soft delete — set isActive to false rather than hard delete.
            Auth: ADMIN.

          Add Zod schemas to src/lib/validations.ts:
          - createPromptSchema, updatePromptSchema

          Hardening requirements:
          - Body field: enforce maximum 50000 character limit
          - Version increment: use Prisma transaction to read current version and write version+1 atomically
          - Search filter: use Prisma contains with mode insensitive; do not allow SQL injection via raw queries
          - isActive filter: parse as boolean (query param comes as string 'true'/'false')
        expected_files:
          - "src/app/api/content-engine/prompts/route.ts"
          - "src/app/api/content-engine/prompts/[id]/route.ts"
        done_check: "test -f src/app/api/content-engine/prompts/route.ts"

      - id: "p9-generation-job-api"
        name: "Generation job API routes"
        model: "sonnet"
        depends_on: ["p7-schema-migration", "p7-bullmq-setup", "p1-auth"]
        estimated_minutes: 8
        prompt: |
          Read prisma/schema.prisma for GenerationJob model.
          Read src/lib/auth-guard.ts, src/lib/activity.ts.

          Create src/app/api/content-engine/jobs/route.ts:
          - GET: list generation jobs.
            Filters: ?clientId=, ?pipelineId=, ?status=, ?from= (ISO date), ?to= (ISO date)
            Pagination: ?page=, ?limit= (default 20)
            Include: client name, pipeline name
            Auth: ADMIN, TEAM.

          Create src/app/api/content-engine/jobs/[id]/route.ts:
          - GET: single job detail. Include client, pipeline, and associated ContentAssets.
            Auth: ADMIN, TEAM.
          - PATCH: cancel a job. Only allowed if status is QUEUED.
            Update status to CANCELLED. Also cancel in BullMQ if possible (import queue from src/lib/queue.ts).
            Log activity: CONTENT_ENGINE, 'cancelled', 'generation_job'.
            Auth: ADMIN, TEAM.

          Hardening requirements:
          - GET list: parse date filters carefully — invalid ISO strings should return 400, not 500
          - Cancel endpoint: if job is already PROCESSING, return 409 with message "Job is already processing and cannot be cancelled"
          - BullMQ cancel: wrap in try/catch — BullMQ job may already be dequeued; log warning but don't fail the DB update
        expected_files:
          - "src/app/api/content-engine/jobs/route.ts"
          - "src/app/api/content-engine/jobs/[id]/route.ts"
        done_check: "test -f src/app/api/content-engine/jobs/route.ts"

      - id: "p9-prompt-library-page"
        name: "Prompt library page with Monaco editor"
        model: "opus"
        depends_on: ["p9-prompt-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 18
        prompt: |
          Read src/app/api/content-engine/prompts/route.ts and [id]/route.ts.
          Read src/app/(platform)/content-engine/layout.tsx.
          Read package.json — Monaco editor is NOT installed yet.

          Install Monaco editor:
            npm install @monaco-editor/react

          Create src/app/(platform)/content-engine/prompt-library/page.tsx:
          - List all prompt templates with: contentType, category, version, isActive badge, pipeline (if linked)
          - Search input (filters by contentType/category/body preview)
          - Filter by category, pipeline, active/inactive
          - "New Prompt" button → opens NewPromptModal
          - Click row → opens PromptEditorModal

          Create src/components/content-engine/prompt-editor-modal.tsx:
          - Full-screen modal (or large drawer) for editing a prompt template
          - Left panel: metadata fields (contentType, category, pipelineId dropdown, performanceNotes, abNotes)
          - Right panel: Monaco editor for the body field
            - Language: 'handlebars' or 'plaintext' (handlebars is closer to template syntax)
            - Theme: vs-dark
            - Options: wordWrap on, lineNumbers on, minimap disabled
          - Show current version number. On save, new version is auto-incremented by the API.
          - Save button: PATCH to /api/content-engine/prompts/[id]
          - Archive button: sets isActive to false

          Create src/components/content-engine/new-prompt-modal.tsx:
          - Modal with: contentType input, category input, pipeline dropdown (optional), body (Monaco editor)
          - POST to /api/content-engine/prompts on submit

          Hardening requirements:
          - Monaco editor: load dynamically (next/dynamic with ssr: false) — SSR will fail for Monaco
          - Loading state while Monaco loads (show textarea placeholder)
          - Auto-save indicator: show "Unsaved changes" when editor content differs from saved version
          - Confirm dialog before archiving a prompt
          - Handle Monaco editor errors gracefully (show fallback textarea if Monaco fails to load)
        expected_files:
          - "src/app/(platform)/content-engine/prompt-library/page.tsx"
          - "src/components/content-engine/prompt-editor-modal.tsx"
          - "src/components/content-engine/new-prompt-modal.tsx"
        done_check: "test -f src/app/(platform)/content-engine/prompt-library/page.tsx"

      - id: "p9-queue-page"
        name: "Generation queue page with SSE"
        model: "sonnet"
        depends_on: ["p9-generation-job-api", "p7-n8n-webhook", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 15
        prompt: |
          Read src/app/api/content-engine/jobs/route.ts and [id]/route.ts.
          Read src/app/api/content-engine/queue/route.ts for the SSE endpoint.
          Read src/components/shared/index.ts for available components.

          Create src/app/(platform)/content-engine/queue/page.tsx:
          This is a CLIENT COMPONENT (needs 'use client').

          Layout:
          - Header with "Generation Queue" title and a refresh button
          - Status summary bar: count of QUEUED, PROCESSING, COMPLETED (today), FAILED (today)
          - Job table with columns: client, pipeline, status (colored badge), created time, duration (if completed), cost, actions
          - Actions column: "Cancel" button for QUEUED jobs, "View Assets" link for COMPLETED jobs

          Real-time updates via SSE:
          - On mount: connect to GET /api/content-engine/queue
          - Use EventSource API to receive job_update events
          - On event: update the corresponding row in local state
          - On disconnect: show "Live updates paused" indicator, attempt reconnect after 5s
          - On unmount: close EventSource connection

          Initial data load: GET /api/content-engine/jobs?limit=50 sorted by createdAt desc
          After SSE update for a job already in the list: update in-place
          After SSE update for a new job: prepend to list

          Cancel action: PATCH /api/content-engine/jobs/[id] with { status: 'CANCELLED' }
          Show ConfirmDialog before cancelling.

          Hardening requirements:
          - EventSource: handle onerror event — don't show a crash, just show reconnect indicator
          - Status updates: use functional setState to avoid stale closure issues
          - Cancel: disable cancel button immediately on click (optimistic); revert if API returns error
          - Duration: calculate as completedAt - startedAt; show as "Xm Ys" or "Pending" if not complete
          - Cost: format with ₱ or $ depending on model (use formatCurrency from src/lib/format.ts)
          - Empty state: show when no jobs exist with a helpful message to trigger a pipeline
        expected_files:
          - "src/app/(platform)/content-engine/queue/page.tsx"
        done_check: "test -f src/app/(platform)/content-engine/queue/page.tsx"

  # ============================================================
  # PHASE 10: GALLERY, MODEL REGISTRY & COST TRACKING
  # ============================================================
  - id: "phase-10"
    name: "Gallery, Model Registry & Cost Tracking"
    description: "Content gallery, asset detail, model registry CRUD, cost tracker dashboard"
    phase_check: "test -f src/app/(platform)/content-engine/gallery/page.tsx && test -f src/app/(platform)/content-engine/cost-tracker/page.tsx"

    tasks:
      - id: "p10-content-asset-api"
        name: "Content asset API routes for Content Engine"
        model: "sonnet"
        depends_on: ["p7-schema-migration", "p1-auth"]
        estimated_minutes: 10
        prompt: |
          Read prisma/schema.prisma for ContentAsset model (V1 schema + generationJobId FK added in V2).
          Read src/lib/auth-guard.ts, src/lib/activity.ts, src/lib/validations.ts.

          The ContentAsset model already exists in V1 but has no dedicated API routes.
          V1 surfaces content assets through the deliverables system. V2 adds direct Content Engine management.

          Create src/app/api/content-engine/assets/route.ts:
          - GET: list content assets.
            Filters: ?clientId=, ?type=, ?internalStatus=, ?clientStatus=, ?search= (search metadata captions)
            Pagination: page + limit (default 24 for gallery grid)
            Include: client name, generation job id
            Sort: createdAt desc by default
            Auth: ADMIN, TEAM.
          - POST: create content asset manually (not via generation job).
            Body: { clientId, projectId?, type, fileUrl, thumbnailUrl?, metadata? }
            Auth: ADMIN, TEAM.
            Log activity: CONTENT_ENGINE, 'created', 'content_asset'.

          Create src/app/api/content-engine/assets/[id]/route.ts:
          - GET: single asset. Include client, generationJob (if exists), project (if exists).
            Auth: ADMIN, TEAM.
          - PATCH: update internalStatus or other fields.
            Validate internalStatus transitions: DRAFT → QA_PASSED → SENT_TO_CLIENT (can go forward only, not backward).
            Log activity on status change: CONTENT_ENGINE, 'status_updated', 'content_asset', metadata { from, to }.
            Auth: ADMIN, TEAM.
          - DELETE: delete asset. Also soft-delete by checking for deliverable links first (warn, don't block).
            Auth: ADMIN.

          Hardening requirements:
          - internalStatus transition validation: return 422 with clear message if invalid transition attempted
          - GET list: do not return file binary — only URLs. Never expose R2 internal paths directly.
          - POST: validate fileUrl is a non-empty string (actual URL validation is done at upload time upstream)
          - DELETE: if contentAsset is linked to deliverables, return a 200 with a warnings field (not a 4xx) — the delete goes through but the caller is informed
        expected_files:
          - "src/app/api/content-engine/assets/route.ts"
          - "src/app/api/content-engine/assets/[id]/route.ts"
        done_check: "test -f src/app/api/content-engine/assets/route.ts"

      - id: "p10-model-registry-api"
        name: "Model registry API routes"
        model: "sonnet"
        depends_on: ["p7-schema-migration", "p1-auth"]
        estimated_minutes: 8
        prompt: |
          Read prisma/schema.prisma for ModelRegistry model.
          Read src/lib/auth-guard.ts, src/lib/validations.ts.

          Create src/app/api/content-engine/models/route.ts:
          - GET: list all models. Support ?isActive= filter. Auth: ADMIN, TEAM.
          - POST: create model registry entry.
            Body: { name, provider, endpoint?, costPerUnit, unitType, qualityBenchmark?, isActive? }
            Validate: name non-empty, provider non-empty, costPerUnit is non-negative number,
            unitType is one of 'token', 'image', 'second', 'request'.
            Auth: ADMIN.

          Create src/app/api/content-engine/models/[id]/route.ts:
          - GET: single model with usage stats (total jobs using this model from api_usage_logs).
            Auth: ADMIN, TEAM.
          - PATCH: update any field. Auth: ADMIN.
          - DELETE: soft delete (set isActive false). Hard delete only if no ApiUsageLogs reference it.
            Auth: ADMIN.

          Hardening requirements:
          - costPerUnit: validate as Decimal-compatible — reject NaN, Infinity, negative values
          - qualityBenchmark: if provided, validate between 0.00 and 1.00
          - DELETE: check ApiUsageLog references; if any exist, only soft-delete (isActive: false), never hard-delete
        expected_files:
          - "src/app/api/content-engine/models/route.ts"
          - "src/app/api/content-engine/models/[id]/route.ts"
        done_check: "test -f src/app/api/content-engine/models/route.ts"

      - id: "p10-gallery-page"
        name: "Content gallery page"
        model: "sonnet"
        depends_on: ["p10-content-asset-api", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 15
        prompt: |
          Read src/app/api/content-engine/assets/route.ts and [id]/route.ts.
          Read src/lib/constants.ts for ContentAssetType, InternalStatus, ClientStatus enums and labels.
          Read src/components/shared/index.ts.

          Create src/app/(platform)/content-engine/gallery/page.tsx:
          This is a CLIENT COMPONENT.

          Layout: visual grid gallery (responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop)

          Filter bar (sticky at top):
          - Client dropdown (fetch all clients)
          - Type multi-select (SOCIAL_POST, BLOG, VIDEO, ILLUSTRATION, etc.)
          - Internal Status filter (DRAFT, QA_PASSED, SENT_TO_CLIENT)
          - Search input (searches metadata captions)
          - Results count

          Gallery grid — each AssetCard:
          - Thumbnail image (thumbnailUrl) with fallback to a type-based placeholder icon
          - Type badge (top-left overlay)
          - Internal status badge (top-right overlay) with color coding
          - Client name (bottom)
          - On hover: show "View" and "Update Status" buttons
          - Click → opens AssetDetailModal

          Create src/components/content-engine/asset-detail-modal.tsx:
          - Large modal (90vw max, scrollable)
          - Left: full-size asset preview (image/video embed based on type)
          - Right:
            - Asset metadata: client, type, version, created date, linked project (if any), generation job (if any)
            - Internal status selector: DRAFT → QA_PASSED → SENT_TO_CLIENT (forward-only, each step is a button)
            - Client status badge (read-only here — client controls this)
            - Comments thread (use CommentThread shared component, entityType CONTENT_ASSET)
            - Download button (link to fileUrl)

          Pagination: load 24 at a time, "Load more" button (not infinite scroll — avoid complexity).

          Hardening requirements:
          - thumbnailUrl fallback: if image fails to load (onerror), show a placeholder with the asset type icon
          - Status update: optimistic UI — update badge immediately, revert on API error
          - Video assets: render <video> tag instead of <img>; do NOT attempt to render video as image
          - Gallery: debounce filter changes by 300ms before fetching
          - Empty state: show friendly message per filter state ("No assets match your filters" vs "No assets yet")
        expected_files:
          - "src/app/(platform)/content-engine/gallery/page.tsx"
          - "src/components/content-engine/asset-detail-modal.tsx"
        done_check: "test -f src/app/(platform)/content-engine/gallery/page.tsx"

      - id: "p10-cost-tracker"
        name: "Model registry + cost tracker pages"
        model: "opus"
        depends_on: ["p10-model-registry-api", "p7-api-usage-logger", "p1-layout", "p1-shared-ui"]
        estimated_minutes: 16
        prompt: |
          Read src/app/api/content-engine/models/route.ts and [id]/route.ts.
          Read src/lib/api-usage.ts for getCostByClient and getCostByModule.
          Read src/app/api/content-engine/jobs/route.ts.
          Read src/lib/format.ts for currency formatting.
          Read package.json — recharts should be available (it's a platform dependency; install if not).

          Install recharts if not present: npm install recharts

          Create src/app/(platform)/content-engine/cost-tracker/page.tsx:
          This is a SERVER COMPONENT (data fetched on server via direct Prisma calls — no API roundtrip needed).

          Import db from @/lib/db directly. Calculate date ranges server-side.

          Layout — three sections:

          1. Summary cards (this month):
             - Total AI spend (sum of api_usage_logs.cost WHERE timestamp >= start of month)
             - Jobs completed this month
             - Average cost per job
             - Most expensive model (by total cost this month)

          2. Cost by client chart (Recharts BarChart):
             - For each client, sum cost of ApiUsageLogs joined through GenerationJobs
             - Show top 10 clients by spend
             - Bar labeled with client name, tooltip shows exact amount
             - Date range selector (this month / last 30 days / last 90 days) — use searchParams for this

          3. Model usage breakdown table:
             - For each model in ModelRegistry: name, provider, cost per unit, unit type, total calls (count of ApiUsageLogs), total cost (sum)
             - Sort by total cost desc
             - Link each row to /content-engine/models/[id]

          Create src/app/(platform)/content-engine/models/page.tsx:
          - List all models in ModelRegistry
          - Columns: name, provider, cost per unit, unit type, quality benchmark, active status
          - "Add Model" button → /content-engine/models/new
          - Toggle isActive inline

          Create src/app/(platform)/content-engine/models/new/page.tsx:
          - Form: name, provider, endpoint (optional), cost per unit, unit type (dropdown), quality benchmark (optional 0–1)

          Hardening requirements:
          - Cost queries: all aggregations must handle NULL cost values (use COALESCE or Prisma's _sum which returns null for empty sets — default to 0)
          - Date range: clamp to maximum 90 days to prevent slow queries
          - BarChart: if no data for a date range, show empty state (not a broken chart)
          - Cost display: always show 2 decimal places; use Philippine Peso (₱) symbol by default matching the rest of the app
          - Model registry: qualityBenchmark column — render as a visual score bar (0–100%) not a raw number
        expected_files:
          - "src/app/(platform)/content-engine/cost-tracker/page.tsx"
          - "src/app/(platform)/content-engine/models/page.tsx"
          - "src/app/(platform)/content-engine/models/new/page.tsx"
        done_check: "test -f src/app/(platform)/content-engine/cost-tracker/page.tsx && test -f src/app/(platform)/content-engine/models/page.tsx"

  # ============================================================
  # PHASE 11: V2 VALIDATION
  # ============================================================
validation:
  checks:
    - "npm run build"
    - "npx tsc --noEmit"
    - "npx prisma validate"
    - "npm run lint"
  fix_budget: 5
  context_sources:
    - alias: "spec"
      sections: ["all"]
  prompt: |
    This is V2 of the NEXUS platform: Content Engine module added on top of the V1 foundation.

    New V2 infrastructure:
    - 6 new Prisma models: BrandProfile, Pipeline, PromptTemplate, GenerationJob, ModelRegistry, ApiUsageLog
    - Redis + BullMQ job queue (src/lib/queue.ts, src/workers/)
    - SSE endpoint for real-time updates (src/lib/sse.ts, src/app/api/content-engine/queue/)
    - n8n webhook callback (src/app/api/webhooks/n8n/)

    Priority areas for the validator:

    1. PRISMA SCHEMA & MIGRATION:
       - Verify all 6 new models have correct relations without breaking V1 relations
       - Verify ContentAsset.generationJobId FK is properly defined with @relation
       - Verify all Decimal fields use @db.Decimal (not Float) for monetary precision
       - Run `npx prisma validate` and fix any schema issues

    2. BULLMQ & WORKER:
       - Verify src/lib/queue.ts has maxRetriesPerRequest: null on Redis connection (required by BullMQ)
       - Verify src/workers/generation-worker.ts properly updates GenerationJob status on success AND failure
       - Verify the worker handles missing GenerationJob records gracefully (don't crash)

    3. SSE IMPLEMENTATION:
       - Verify src/lib/sse.ts broadcastJobUpdate doesn't throw when a client disconnects mid-broadcast
       - Verify the SSE endpoint sends proper headers (Content-Type: text/event-stream)
       - Verify the heartbeat keeps the connection alive

    4. n8n WEBHOOK:
       - Verify /api/webhooks/n8n creates ContentAssets in a Prisma transaction
       - Verify it handles the case where jobId in header doesn't match jobId in body (reject)
       - Verify it's in the middleware.ts public paths list

    5. API ROUTE CONSISTENCY:
       - All Content Engine API routes follow the same { data: ... } response shape as V1 routes
       - All mutations log to activity_log with module: CONTENT_ENGINE
       - No API route leaks stack traces in error responses

    6. internalStatus TRANSITIONS:
       - Verify PATCH /api/content-engine/assets/[id] enforces DRAFT → QA_PASSED → SENT_TO_CLIENT
         (cannot go backward, cannot skip steps)

    7. FRONT-END:
       - Monaco editor loaded with next/dynamic + ssr: false (will fail SSR without this)
       - EventSource in queue page has error handler and reconnect logic
       - All new pages have loading states, error states, and empty states
       - Gallery image fallbacks handle broken thumbnailUrl gracefully

    8. IMPORT PATHS & TYPES:
       - No 'any' types in new V2 files
       - All imports from @/lib/, @/components/, @/generated/prisma are correct
       - Prisma generated client is re-generated after schema migration

    9. V1 REGRESSION:
       - Verify V1 Ops Desk pages still work (no broken imports from Prisma schema changes)
       - Verify middleware.ts still protects all correct routes

    Fix any TypeScript errors, broken imports, missing env vars in .env.example,
    or schema inconsistencies. Run `npm run build` after each fix batch.
```

---

## Human-Readable Summary

### What V2 Adds

| Area | What's Built |
|------|-------------|
| **Infrastructure** | Redis+BullMQ worker, n8n webhook endpoint, SSE real-time feed, API usage logging |
| **Database** | 6 new tables: brand_profiles, pipelines, prompt_templates, generation_jobs, model_registry, api_usage_logs |
| **Brand Profiles** | CRUD API + list/create/detail pages, client-linked, rich JSONB fields for brand data |
| **Pipelines** | CRUD API + pages + trigger flow (BullMQ enqueue → n8n dispatch) |
| **Prompt Library** | CRUD API + Monaco editor integration, version history on edits |
| **Generation Queue** | Job API (list/cancel) + real-time SSE queue page |
| **Gallery** | Content asset API + visual grid gallery, asset detail modal, internal status workflow |
| **Model Registry** | CRUD API + pages, cost-per-unit tracking |
| **Cost Tracker** | Server-rendered dashboard, per-client and per-model breakdowns, Recharts bar chart |

### New Task IDs

All new tasks use `p7-*` through `p10-*` prefixes. No V1 task IDs were modified.

### Dependency Graph (V2 only)

```
p1-prisma ──────────────────────┐
                                 ↓
p7-schema-migration ─────┬──→ p7-bullmq-setup ──→ p7-n8n-webhook
                         │
                         └──→ p7-api-usage-logger
                         │
                         ├──→ p8-brand-profile-api ──→ p8-brand-profile-pages ──→ p8-sidebar-update
                         │                                                       ↗
                         └──→ p8-pipeline-api ──→ p8-pipeline-pages ────────────
                         │
                         ├──→ p9-prompt-api ──→ p9-prompt-library-page
                         │
                         ├──→ p9-generation-job-api + p7-n8n-webhook ──→ p9-queue-page
                         │
                         ├──→ p10-content-asset-api ──→ p10-gallery-page
                         │
                         └──→ p10-model-registry-api ──→ p10-cost-tracker
                              p7-api-usage-logger ────────────↑
```

### Parallelism

After `p7-schema-migration` completes, the following can run simultaneously:
- `p7-bullmq-setup`, `p7-n8n-webhook` (sequential — n8n depends on bullmq)
- `p7-api-usage-logger` (independent)
- `p8-brand-profile-api` and `p8-pipeline-api` (fully parallel)
- `p9-prompt-api` and `p9-generation-job-api` (fully parallel)
- `p10-content-asset-api` and `p10-model-registry-api` (fully parallel)

After APIs: all page tasks can run in parallel within their dependency constraints.

### Model Assignment Summary

| Task | Model | Rationale |
|------|-------|-----------|
| p7-schema-migration | **Opus** | Complex multi-model Prisma migration; must not break V1 relations |
| p7-bullmq-setup | **Opus** | New infrastructure pattern; worker error handling is nuanced |
| p7-n8n-webhook | Sonnet | Clear requirements; standard API + SSE patterns |
| p7-api-usage-logger | Sonnet | Simple utility with aggregation queries |
| p8-brand-profile-api | **Opus** | Sets JSONB field patterns for the module; conflict handling |
| p8-pipeline-api | Sonnet | Standard CRUD with a trigger endpoint |
| p8-brand-profile-pages | Sonnet | UI with JSONB editor inputs |
| p8-pipeline-pages | Sonnet | Standard pages + trigger modal |
| p8-sidebar-update | Sonnet | Small targeted edit |
| p9-prompt-api | Sonnet | Standard CRUD with version increment |
| p9-generation-job-api | Sonnet | Standard CRUD |
| p9-prompt-library-page | **Opus** | Monaco editor integration + dynamic loading; nuanced |
| p9-queue-page | Sonnet | SSE client + real-time state management |
| p10-content-asset-api | Sonnet | Status transition logic + standard CRUD |
| p10-model-registry-api | Sonnet | Simple CRUD |
| p10-gallery-page | Sonnet | Visual grid + modal + status updates |
| p10-cost-tracker | **Opus** | Complex Prisma aggregations + Recharts + server component |

**Split: 6 Opus (35%) / 11 Sonnet (65%)**

### New Environment Variables Required

Add to `.env`:
```
REDIS_URL=redis://localhost:6379
```

Add to Docker Compose (if using Coolify):
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

### Estimated Timeline

| Phase | Critical Path | Wall Clock |
|-------|--------------|------------|
| Phase 7: Infrastructure | p7-schema-migration → p7-bullmq-setup → p7-n8n-webhook | ~40 min |
| Phase 8: Brand + Pipelines | p8-brand-profile-api + p8-pipeline-api → pages | ~35 min |
| Phase 9: Prompt + Queue | p9-prompt-library-page (Monaco, longest task) | ~30 min |
| Phase 10: Gallery + Costs | p10-cost-tracker (complex aggregations) | ~30 min |
| Phase 11: Validation | ~20–30 min with fix cycles |
| **Total estimated** | | **~2.5–3.5 hours** |
