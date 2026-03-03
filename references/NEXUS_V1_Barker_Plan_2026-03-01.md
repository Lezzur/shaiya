# NEXUS Platform — V1 Build Plan (Foundation + Ops Desk)

> **Version:** 1.0
> **Scope:** Platform foundation (auth, shared data, shell) + full Ops Desk module
> **Subsequent versions:** V2–V10 will extend this plan. Keep all task IDs stable.

```yaml
# ============================================================
# NEXUS PLATFORM — V1: FOUNDATION + OPS DESK
# ============================================================

project:
  name: "nexus"
  description: "Agency management platform — V1: Foundation + Ops Desk"
  working_directory: "."

input_files:
  - path: "NEXUS_Platform_Spec_2026-03-01.md"
    alias: "spec"
    description: "Complete platform specification with data model, routes, and module details"

# ============================================================
# PHASE 1: PROJECT SCAFFOLDING
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
        context_sources:
          - alias: "spec"
            sections: ["2. Unified Tech Stack"]
        prompt: |
          Create a new Next.js 14 project with App Router in the current directory.
          Use TypeScript with strict mode enabled.

          Install and configure:
          - Tailwind CSS
          - shadcn/ui (initialize with `npx shadcn@latest init`, default style, zinc color)
          - ESLint + Prettier
          - Path aliases: `@/` pointing to `src/`

          Install these dependencies now (they'll be needed across the project):
          - @hello-pangea/dnd (drag and drop)
          - @tanstack/react-table (data tables)
          - react-big-calendar (calendar views)
          - date-fns (date utilities)
          - zod (validation)
          - uuid
          - paymongo-node (PayMongo SDK)
          - lucide-react (icons — should come with shadcn but verify)

          Create this directory structure with placeholder files:

          src/
          ├── app/
          │   ├── (auth)/
          │   ├── (platform)/
          │   ├── (portal)/
          │   ├── (website)/
          │   ├── api/
          │   ├── layout.tsx (root layout with fonts + global styles)
          │   └── page.tsx (redirect to /login or /war-room based on auth)
          ├── components/
          │   ├── ui/ (shadcn components go here)
          │   └── shared/ (our shared components)
          ├── lib/
          │   ├── utils.ts (shadcn cn utility)
          │   └── constants.ts (status enums, color maps)
          ├── hooks/
          └── types/

          Set up the root layout.tsx with Inter font from next/font/google,
          global CSS importing Tailwind, and a clean body wrapper.

          The root page.tsx should just render a "NEXUS" heading for now.
        expected_files:
          - "package.json"
          - "tsconfig.json"
          - "tailwind.config.ts"
          - "next.config.ts"
          - "src/app/layout.tsx"
          - "src/app/page.tsx"
          - "components.json"
        done_check: "test -f package.json && test -f tsconfig.json && test -f next.config.ts"

      - id: "p1-prisma"
        name: "Prisma schema + database setup"
        model: "opus"
        depends_on: ["p1-init"]
        estimated_minutes: 15
        context_sources:
          - alias: "spec"
            sections: ["3.1 Core Entities", "3.2 Module-Specific Entities"]
        prompt: |
          Set up Prisma ORM with PostgreSQL in this Next.js project.

          Install: prisma, @prisma/client
          Run: npx prisma init

          Create the COMPLETE Prisma schema in prisma/schema.prisma with ALL
          V1 tables. Use UUID for all primary keys (@default(uuid())).
          Use @updatedAt for updated_at fields. Use @map for snake_case table names.

          CORE TABLES (used across modules):

          User:
            id, email (unique), name, role (enum: ADMIN, TEAM, CLIENT),
            avatar (optional), capacity (optional Int), skills (String[]),
            authMethod (enum: PASSWORD, MAGIC_LINK), clientId (optional, references Client),
            passwordHash (optional String), createdAt, updatedAt

          Client:
            id, name, logo (optional), industry (optional),
            packageTier (optional), monthlyValue (Decimal, default 0),
            lifetimeValue (Decimal, default 0),
            primaryContactId (optional, references User),
            healthStatus (enum: HEALTHY, AT_RISK, CHURNED, default HEALTHY),
            renewalDate (optional DateTime), r2BucketPath (optional),
            createdAt, updatedAt

          ContentAsset:
            id, clientId (references Client), projectId (optional, references Project),
            generationJobId (optional String for future V2 reference),
            type (enum: SOCIAL_POST, BLOG, VIDEO, ILLUSTRATION, CAROUSEL, STORY, REEL, OTHER),
            fileUrl, thumbnailUrl (optional),
            internalStatus (enum: DRAFT, QA_PASSED, SENT_TO_CLIENT, default DRAFT),
            clientStatus (enum: PENDING, APPROVED, REVISION_REQUESTED, DONE, default PENDING),
            version (Int, default 1), parentAssetId (optional self-reference),
            metadata (Json, optional),
            createdAt, updatedAt

          ActivityLog:
            id, timestamp (default now), actorId (references User),
            module (enum: LEAD_ENGINE, OPS_DESK, CONTENT_ENGINE, CLIENT_PORTAL,
                    PROPOSALS, ANALYTICS, WEBSITE, SYSTEM),
            action (String), entityType (String), entityId (String),
            metadata (Json, optional)

          OPS DESK TABLES:

          Project:
            id, clientId (references Client), title, brief (optional Text),
            status (enum: BRIEFING, ASSET_PREP, IN_PRODUCTION, INTERNAL_REVIEW,
                    CLIENT_REVIEW, REVISION, APPROVED, DELIVERED, default BRIEFING),
            deadline (optional DateTime), assignedToId (optional, references User),
            templateId (optional String), timeTrackedMinutes (Int, default 0),
            createdAt, updatedAt

          Deliverable:
            id, projectId (references Project), title,
            status (enum: PENDING_D, IN_PROGRESS_D, DONE_D, default PENDING_D),
            order (Int), contentAssetId (optional, references ContentAsset),
            createdAt, updatedAt

          Comment:
            id, entityType (enum: PROJECT, CONTENT_ASSET, PROPOSAL, BRAND_PROFILE, CLIENT_MESSAGE),
            entityId (String), authorId (references User),
            body (Text), parentId (optional self-reference for threading),
            createdAt

          Invoice:
            id, clientId (references Client), projectId (optional, references Project),
            amount (Decimal), status (enum: DRAFT_I, SENT_I, PAID, OVERDUE, CANCELLED, default DRAFT_I),
            dueDate (DateTime), paidAt (optional DateTime),
            paymongoPaymentLinkId (optional), paymongoPaymentLinkUrl (optional),
            paymongoPaymentId (optional),
            lineItems (Json), notes (optional Text),
            createdAt, updatedAt

          Add appropriate indexes:
          - Client: healthStatus
          - Project: clientId, status, assignedToId, deadline
          - Invoice: clientId, status, dueDate
          - ActivityLog: timestamp (descending), entityType+entityId, module
          - ContentAsset: clientId, internalStatus, clientStatus
          - Comment: entityType+entityId
          - User: role, clientId

          Set up proper cascade deletes where appropriate (deliverables when project deleted).
          Use onDelete: SetNull for optional references.

          Create src/lib/db.ts exporting a singleton PrismaClient instance.

          Run: npx prisma migrate dev --name init
          This will create the migration and generate the client.

          Create prisma/seed.ts that creates a demo admin user:
          - email: admin@nexus.local
          - name: Admin User
          - role: ADMIN
          - authMethod: PASSWORD
          - passwordHash: bcrypt hash of "admin123" (install bcryptjs)

          Add prisma seed script to package.json.
          Run: npx prisma db seed
        expected_files:
          - "prisma/schema.prisma"
          - "src/lib/db.ts"
          - "prisma/seed.ts"
        done_check: "test -f prisma/schema.prisma && npx prisma validate"

      - id: "p1-auth"
        name: "NextAuth.js authentication"
        model: "opus"
        depends_on: ["p1-prisma"]
        estimated_minutes: 12
        context_sources:
          - alias: "spec"
            sections: ["4. Authentication & Authorization"]
        prompt: |
          Set up NextAuth.js v5 (next-auth@beta) in this Next.js project.
          Read prisma/schema.prisma and src/lib/db.ts first.

          Install: next-auth@beta @auth/prisma-adapter bcryptjs @types/bcryptjs

          Create:

          1. src/lib/auth.ts — NextAuth configuration:
             - CredentialsProvider for email+password login (internal users)
               - Validate against User table, compare bcrypt hash
               - Only allow ADMIN and TEAM roles
             - EmailProvider for magic link (client users) — stub for now,
               just configure the provider structure
             - JWT session strategy
             - Session callback: include user.id, user.role, user.clientId in session
             - Authorized callback: return true for all (we handle in middleware)

          2. src/app/api/auth/[...nextauth]/route.ts — the NextAuth route handler

          3. src/middleware.ts — Edge middleware:
             - Paths starting with /(platform)/* require auth with role ADMIN or TEAM
             - Paths starting with /(portal)/* require auth with role CLIENT
             - Paths starting with /(auth)/* are public
             - Paths starting with /(website)/* are public
             - Paths starting with /api/auth/* are public
             - Paths starting with /api/webhooks/* are public
             - All other /api/* paths require auth
             - Redirect unauthenticated users to /login

          4. src/lib/auth-guard.ts — Server-side helper:
             - withAuth(handler, options?: { roles?: Role[] }) — wraps API route handlers
             - getRequiredSession() — gets session or throws 401
             - getClientSession() — gets session and extracts clientId, throws if not client role

          5. src/types/next-auth.d.ts — Module augmentation:
             - Add role, clientId to Session.user
             - Add role, clientId to JWT

          Create a .env.example file with:
          DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, and placeholder values
          for all services (PayMongo, R2, Resend, etc.)

          Create .env.local with working values for DATABASE_URL, NEXTAUTH_URL=http://localhost:3000,
          and a generated NEXTAUTH_SECRET.
        expected_files:
          - "src/lib/auth.ts"
          - "src/app/api/auth/[...nextauth]/route.ts"
          - "src/middleware.ts"
          - "src/lib/auth-guard.ts"
          - "src/types/next-auth.d.ts"
          - ".env.example"
        done_check: "test -f src/middleware.ts && test -f src/lib/auth.ts"

      - id: "p1-layout"
        name: "Platform layout shell"
        model: "sonnet"
        depends_on: ["p1-auth"]
        estimated_minutes: 12
        context_sources:
          - alias: "spec"
            sections: ["5. Next.js Route Group Structure"]
        prompt: |
          Read the existing project structure, src/lib/auth.ts, and src/middleware.ts.

          Build the platform layout shell:

          1. src/app/(auth)/login/page.tsx
             - Clean login form: email + password fields, "Sign In" button
             - Use shadcn Card, Input, Button, Label components
             - Call signIn("credentials", { email, password, redirect: false })
             - On success redirect to /war-room
             - Show error message on failure
             - Centered on page with NEXUS logo/text above

          2. src/app/(auth)/layout.tsx
             - Minimal layout — centered content, no sidebar

          3. src/app/(platform)/layout.tsx
             - Left sidebar (240px, collapsible to 64px icon-only):
               - NEXUS logo at top
               - Module links with icons (use lucide-react):
                 - War Room (LayoutDashboard icon) — /war-room
                 - Lead Engine (Zap icon) — /lead-engine (show "Coming Soon" badge)
                 - Ops Desk (Briefcase icon) — /ops-desk
                 - Content Engine (Palette icon) — /content-engine (Coming Soon)
                 - Proposals (FileText icon) — /proposals (Coming Soon)
                 - Analytics (BarChart3 icon) — /analytics (Coming Soon)
               - Divider
               - Settings (Settings icon) — /settings
               - Active state: highlighted background on current module
             - Top bar:
               - Breadcrumb area (left)
               - User avatar + name + dropdown with "Sign Out" (right)
             - Main content area with padding

          4. src/app/(platform)/war-room/page.tsx
             - Placeholder: "War Room — Coming in V7" with EmptyState component

          5. src/app/(portal)/layout.tsx
             - Simpler layout for clients — top nav only, no sidebar
             - Logo + "Client Portal" text
             - Placeholder page.tsx: "Portal coming in V4"

          6. Update src/app/page.tsx to redirect:
             - If authenticated + admin/team → /war-room
             - If authenticated + client → /portal
             - If not authenticated → /login

          Make the sidebar responsive: on screens < 768px, collapse to icon-only
          by default, with a hamburger toggle. Use React state and Tailwind responsive classes.

          Install and add these shadcn components if not already present:
          card, input, button, label, avatar, dropdown-menu, badge, separator, tooltip
        expected_files:
          - "src/app/(auth)/login/page.tsx"
          - "src/app/(auth)/layout.tsx"
          - "src/app/(platform)/layout.tsx"
          - "src/app/(platform)/war-room/page.tsx"
          - "src/app/(portal)/layout.tsx"
          - "src/app/(portal)/page.tsx"
        done_check: "test -f src/app/(platform)/layout.tsx && test -f src/app/(auth)/login/page.tsx"

      - id: "p1-shared-ui"
        name: "Shared UI components"
        model: "sonnet"
        depends_on: ["p1-init"]
        estimated_minutes: 15
        context_sources:
          - alias: "spec"
            sections: ["10. Shared UI Component Library"]
        prompt: |
          Read the project structure and package.json.

          Create these shared components in src/components/shared/:

          1. data-table.tsx — Reusable data table built on @tanstack/react-table + shadcn Table:
             - Props: columns (ColumnDef[]), data, searchKey (optional), searchPlaceholder
             - Features: column sorting, text search filter, pagination (10/20/50 per page)
             - Responsive: horizontal scroll on mobile
             - Export as DataTable<T> generic component

          2. status-badge.tsx — Colored badge for entity statuses:
             - Props: status (string), variant (map of status→color)
             - Predefined variants for: project statuses, invoice statuses, health statuses
             - Uses shadcn Badge with custom colors

          3. metric-card.tsx — Dashboard metric card:
             - Props: title, value, description (optional), trend (optional: { value, direction: up|down })
             - Card with large value, small title, optional trend arrow with color

          4. empty-state.tsx — Friendly empty state:
             - Props: icon (LucideIcon), title, description, action (optional: { label, onClick })
             - Centered layout with muted icon, text, and optional CTA button

          5. confirm-dialog.tsx — Confirmation modal for destructive actions:
             - Props: title, description, onConfirm, onCancel, confirmText, variant (danger|default)
             - Uses shadcn AlertDialog

          6. activity-feed.tsx — Chronological activity entries:
             - Props: activities (array of { id, actor, module, action, entityType, entityId, timestamp, metadata })
             - Renders: avatar, "Actor performed action on entityType", relative time
             - Uses date-fns formatDistanceToNow

          7. comment-thread.tsx — Threaded comments:
             - Props: comments (array), onSubmit (callback), entityType, entityId
             - Renders existing comments with author, timestamp, body
             - Text input at bottom with submit button
             - Sorted by createdAt ascending

          8. file-uploader.tsx — File upload dropzone:
             - Props: onUpload (callback receiving File[]), accept (mime types), maxSize
             - Drag-and-drop zone with click fallback
             - Progress indicator during upload
             - Preview thumbnails for images

          Install shadcn components needed: table, badge, alert-dialog, dialog, textarea, skeleton

          Also create src/components/shared/index.ts re-exporting all components.
        expected_files:
          - "src/components/shared/data-table.tsx"
          - "src/components/shared/status-badge.tsx"
          - "src/components/shared/metric-card.tsx"
          - "src/components/shared/empty-state.tsx"
          - "src/components/shared/confirm-dialog.tsx"
          - "src/components/shared/activity-feed.tsx"
          - "src/components/shared/comment-thread.tsx"
          - "src/components/shared/file-uploader.tsx"
          - "src/components/shared/index.ts"
        done_check: "test -f src/components/shared/data-table.tsx && test -f src/components/shared/index.ts"

      - id: "p1-utils"
        name: "Shared utilities"
        model: "sonnet"
        depends_on: ["p1-prisma"]
        estimated_minutes: 8
        context_sources:
          - alias: "spec"
            sections: ["3.1 Core Entities"]
        prompt: |
          Read prisma/schema.prisma and src/lib/db.ts.

          Create shared utility functions:

          1. src/lib/activity.ts — Activity logging helper:
             - logActivity({ actorId, module, action, entityType, entityId, metadata? })
             - Wraps prisma.activityLog.create with proper types
             - Module and action are typed strings matching Prisma enums

          2. src/lib/r2.ts — Cloudflare R2 file helpers:
             - Install: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
             - getUploadUrl(key: string, contentType: string): Promise<string>
               — generates presigned PUT URL (15 min expiry)
             - getDownloadUrl(key: string): Promise<string>
               — generates presigned GET URL (1 hour expiry)
             - deleteFile(key: string): Promise<void>
             - Use env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

          3. src/lib/format.ts — Formatting utilities:
             - formatCurrency(amount: number): string — "$1,234.56"
             - formatDate(date: Date | string): string — "Mar 15, 2026"
             - formatRelative(date: Date | string): string — "2 hours ago"
             - formatPercent(value: number): string — "42.5%"

          4. src/lib/constants.ts — Status maps and constants:
             - PROJECT_STATUSES: array of { value, label, color } for each project status
             - INVOICE_STATUSES: same pattern
             - HEALTH_STATUSES: same pattern
             - MODULE_LABELS: map of module enum → display name
             - Export type-safe enums matching Prisma enums

          5. src/lib/validations.ts — Zod schemas for API validation:
             - clientSchema (create/update)
             - projectSchema (create/update)
             - invoiceSchema (create/update)
             - deliverableSchema
             - commentSchema
             - Export all schemas

          6. src/lib/env.ts — Environment variable validation:
             - Use zod to validate all required env vars at startup
             - Export typed env object
             - Throw clear error if required vars missing
        expected_files:
          - "src/lib/activity.ts"
          - "src/lib/r2.ts"
          - "src/lib/format.ts"
          - "src/lib/constants.ts"
          - "src/lib/validations.ts"
          - "src/lib/env.ts"
        done_check: "test -f src/lib/activity.ts && test -f src/lib/r2.ts && test -f src/lib/validations.ts"

  # ============================================================
  # PHASE 2: CLIENT MANAGEMENT
  # ============================================================
  - id: "phase-2"
    name: "Client Management"
    description: "Full CRUD for clients — the data foundation everything depends on"
    phase_check: "npx tsc --noEmit"

    tasks:
      - id: "p2-client-api"
        name: "Client API routes"
        model: "opus"
        depends_on: ["p1-prisma", "p1-auth", "p1-utils"]
        estimated_minutes: 12
        context_sources:
          - alias: "spec"
            sections: ["3.1 Core Entities"]
        prompt: |
          Read prisma/schema.prisma, src/lib/db.ts, src/lib/auth-guard.ts,
          src/lib/validations.ts, and src/lib/activity.ts.

          Create the Client API routes:

          1. src/app/api/ops-desk/clients/route.ts
             - GET: List clients with search (name, industry), filter by healthStatus,
               pagination (page, limit query params), sort by name or monthlyValue.
               Include counts: _count of projects and invoices per client.
               Protected: ADMIN, TEAM roles.
             - POST: Create client. Validate body with clientSchema from validations.ts.
               Log activity (module: OPS_DESK, action: 'created', entityType: 'client').
               Return created client with 201 status.
               Protected: ADMIN role only.

          2. src/app/api/ops-desk/clients/[id]/route.ts
             - GET: Get single client by ID. Include related data:
               recent projects (last 5), invoice summary (total amount, paid amount,
               outstanding count), primary contact user.
               Return 404 if not found.
             - PATCH: Update client fields. Validate with clientSchema.partial().
               Log activity (action: 'updated').
               Protected: ADMIN role.
             - DELETE: Soft-delete by setting healthStatus to CHURNED (don't actually delete).
               Log activity (action: 'archived').
               Protected: ADMIN role.

          All routes use withAuth from auth-guard.ts.
          Return consistent JSON: { data } on success, { error, message } on failure.
          Use try/catch with proper HTTP status codes.
        expected_files:
          - "src/app/api/ops-desk/clients/route.ts"
          - "src/app/api/ops-desk/clients/[id]/route.ts"
        done_check: "test -f src/app/api/ops-desk/clients/route.ts"

      - id: "p2-client-list"
        name: "Client list page"
        model: "sonnet"
        depends_on: ["p2-client-api", "p1-shared-ui", "p1-layout"]
        estimated_minutes: 10
        prompt: |
          Read src/app/api/ops-desk/clients/route.ts to understand the API shape.
          Read src/components/shared/data-table.tsx and src/components/shared/status-badge.tsx.
          Read src/lib/constants.ts for status color maps.
          Read src/lib/format.ts for currency formatting.

          Create src/app/(platform)/ops-desk/clients/page.tsx:

          - Title "Clients" with "New Client" button (links to /ops-desk/clients/new)
          - DataTable with columns:
            - Name (linked to /ops-desk/clients/[id])
            - Industry
            - Package Tier
            - Monthly Value (formatted as currency)
            - Health Status (StatusBadge component)
            - Projects (count)
            - Renewal Date (formatted, red if within 30 days)
          - Search by name
          - Filter dropdown for health status (All, Healthy, At Risk, Churned)
          - Fetch data from /api/ops-desk/clients on page load (server component or
            use React Query — prefer server component with searchParams for SSR)

          Also create src/app/(platform)/ops-desk/layout.tsx:
          - Sub-navigation for Ops Desk module:
            Clients, Projects, Invoices, Team, Calendar
          - Active state on current sub-page
          - Render children below sub-nav

          Also create src/app/(platform)/ops-desk/page.tsx:
          - Placeholder: "Ops Desk Dashboard — Coming soon" with link to /ops-desk/clients
        expected_files:
          - "src/app/(platform)/ops-desk/clients/page.tsx"
          - "src/app/(platform)/ops-desk/layout.tsx"
          - "src/app/(platform)/ops-desk/page.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/clients/page.tsx"

      - id: "p2-client-forms"
        name: "Client create and edit forms"
        model: "sonnet"
        depends_on: ["p2-client-api", "p1-shared-ui", "p1-layout"]
        estimated_minutes: 10
        prompt: |
          Read src/app/api/ops-desk/clients/route.ts and src/app/api/ops-desk/clients/[id]/route.ts.
          Read src/lib/validations.ts for the client schema.
          Read src/components/shared/file-uploader.tsx.

          Create:

          1. src/app/(platform)/ops-desk/clients/new/page.tsx — Client creation form:
             - Title: "New Client"
             - Fields: name (required), logo (file upload via FileUploader), industry (text),
               packageTier (select: Starter, Growth, Enterprise, Custom),
               monthlyValue (number input with $ prefix), healthStatus (select),
               renewalDate (date picker)
             - Use shadcn form components: Form, FormField, FormItem, FormLabel, FormControl, Select
             - Client-side validation with zod (matching server schema)
             - Submit → POST /api/ops-desk/clients
             - On success: redirect to /ops-desk/clients/[newId] with success toast
             - On error: show error messages inline
             - Cancel button → back to client list

          2. src/components/shared/client-form.tsx — Shared form component:
             - Used by both create and edit
             - Props: defaultValues (optional for edit), onSubmit, isLoading
             - Renders all fields
             - Returns form data on submit

          Install shadcn: form, select, popover, calendar (for date picker), toast, sonner
        expected_files:
          - "src/app/(platform)/ops-desk/clients/new/page.tsx"
          - "src/components/shared/client-form.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/clients/new/page.tsx"

      - id: "p2-client-detail"
        name: "Client detail page"
        model: "sonnet"
        depends_on: ["p2-client-api", "p1-shared-ui", "p1-layout"]
        estimated_minutes: 12
        prompt: |
          Read src/app/api/ops-desk/clients/[id]/route.ts for the API shape.
          Read src/components/shared/ for available components.
          Read src/lib/format.ts and src/lib/constants.ts.

          Create src/app/(platform)/ops-desk/clients/[id]/page.tsx:

          - Fetch client data from GET /api/ops-desk/clients/[id]
          - Header section:
            - Client logo (or placeholder icon if no logo)
            - Client name (large)
            - Health status badge
            - Package tier badge
            - Monthly value (formatted currency)
            - "Edit" button (opens edit modal or navigates to edit page)
            - "Archive" button with ConfirmDialog
          - Tab navigation (use shadcn Tabs): Overview, Projects, Invoices, Activity
          - Overview tab:
            - Key metrics row: Monthly Value, Lifetime Value, Total Projects, Outstanding Invoices
            - Renewal date with countdown if within 60 days
            - Primary contact info
          - Projects tab:
            - List of related projects (title, status badge, deadline, assigned to)
            - "New Project" button linking to /ops-desk/projects/new?clientId=[id]
            - Empty state if no projects
          - Invoices tab:
            - List of invoices (amount, status, due date, paid date)
            - "New Invoice" button
            - Empty state if no invoices
          - Activity tab:
            - ActivityFeed component filtered to this client's entities

          Install shadcn: tabs

          Also create a reusable src/components/shared/page-header.tsx component:
          - Props: title, subtitle (optional), actions (ReactNode for buttons)
          - Consistent page header used across all detail pages
        expected_files:
          - "src/app/(platform)/ops-desk/clients/[id]/page.tsx"
          - "src/components/shared/page-header.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/clients/[id]/page.tsx"

  # ============================================================
  # PHASE 3: PROJECT MANAGEMENT
  # ============================================================
  - id: "phase-3"
    name: "Project Management"
    description: "Kanban board, project detail, deliverables, and comments"
    phase_check: "npx tsc --noEmit"

    tasks:
      - id: "p3-project-api"
        name: "Project and deliverable API routes"
        model: "opus"
        depends_on: ["p1-prisma", "p1-auth", "p1-utils"]
        estimated_minutes: 15
        context_sources:
          - alias: "spec"
            sections: ["3.2 Module-Specific Entities"]
        prompt: |
          Read prisma/schema.prisma, src/lib/db.ts, src/lib/auth-guard.ts,
          src/lib/validations.ts, and src/lib/activity.ts.

          Create:

          1. src/app/api/ops-desk/projects/route.ts
             - GET: List projects. Filter by: status, clientId, assignedToId.
               Include: client name, assignedTo name. Pagination. Sort by deadline or createdAt.
             - POST: Create project. Validate with projectSchema. Log activity.

          2. src/app/api/ops-desk/projects/[id]/route.ts
             - GET: Single project with all related data: client, assignedTo user,
               deliverables (ordered), comments (with author), content assets.
             - PATCH: Update project (including status changes for Kanban drag).
               Log activity with old and new status in metadata.
             - DELETE: Delete project. Cascade deletes deliverables. Log activity.

          3. src/app/api/ops-desk/projects/[id]/status/route.ts
             - PATCH: Dedicated status update endpoint for Kanban.
               Body: { status: ProjectStatus }
               This is separate so the Kanban can call it with minimal payload.
               Log activity with status transition.

          4. src/app/api/ops-desk/deliverables/route.ts
             - GET: List by projectId (query param)
             - POST: Create deliverable for a project. Auto-set order to max+1.
             - PATCH (via /api/ops-desk/deliverables/[id]): Update title, status, order
             - DELETE (via /api/ops-desk/deliverables/[id]): Remove deliverable

          5. src/app/api/ops-desk/deliverables/[id]/route.ts
             - PATCH and DELETE handlers

          6. src/app/api/ops-desk/comments/route.ts
             - GET: List comments by entityType and entityId (query params).
               Include author (name, avatar). Order by createdAt ascending.
             - POST: Create comment. Body: { entityType, entityId, body, parentId? }
               Log activity.

          All routes use withAuth. Consistent error handling.
        expected_files:
          - "src/app/api/ops-desk/projects/route.ts"
          - "src/app/api/ops-desk/projects/[id]/route.ts"
          - "src/app/api/ops-desk/projects/[id]/status/route.ts"
          - "src/app/api/ops-desk/deliverables/route.ts"
          - "src/app/api/ops-desk/deliverables/[id]/route.ts"
          - "src/app/api/ops-desk/comments/route.ts"
        done_check: "test -f src/app/api/ops-desk/projects/route.ts && test -f src/app/api/ops-desk/comments/route.ts"

      - id: "p3-kanban"
        name: "Project Kanban board"
        model: "opus"
        depends_on: ["p3-project-api", "p1-shared-ui", "p1-layout"]
        estimated_minutes: 18
        prompt: |
          Read src/app/api/ops-desk/projects/route.ts and
          src/app/api/ops-desk/projects/[id]/status/route.ts for the API shape.
          Read src/lib/constants.ts for PROJECT_STATUSES.
          Read package.json to confirm @hello-pangea/dnd is installed.

          Create src/app/(platform)/ops-desk/projects/page.tsx — the Kanban board:

          This is a CLIENT COMPONENT ("use client" at top).

          Layout:
          - Title bar: "Projects" with filter dropdowns (Client, Assigned To) and "New Project" button
          - Horizontal scrollable board with 8 columns, one per project status:
            Briefing, Asset Prep, In Production, Internal Review,
            Client Review, Revision, Approved, Delivered
          - Each column: header with status name + count, then cards stacked vertically

          Kanban card:
          - Project title (bold, linked to /ops-desk/projects/[id])
          - Client name (small text)
          - Deadline (if set — red text if overdue, amber if within 3 days)
          - Assigned user avatar (small circle, or initials placeholder)

          Drag and drop:
          - Use @hello-pangea/dnd: DragDropContext, Droppable (one per column), Draggable (one per card)
          - On drag end: optimistically update local state, then PATCH /api/ops-desk/projects/[id]/status
          - On API error: revert the optimistic update and show toast error

          Data fetching:
          - Fetch all projects on mount (GET /api/ops-desk/projects?limit=200)
          - Group by status client-side
          - Refetch when filters change

          Responsive:
          - On mobile (<768px): show columns as a vertical list or horizontal scroll

          Create helper: src/components/shared/kanban-board.tsx — the generic DnD board component
          so it can be reused for Lead Engine pipeline in V3.
          Props: columns (id, title, color), items (id, columnId, content: ReactNode), onMove callback
        expected_files:
          - "src/app/(platform)/ops-desk/projects/page.tsx"
          - "src/components/shared/kanban-board.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/projects/page.tsx && test -f src/components/shared/kanban-board.tsx"

      - id: "p3-project-detail"
        name: "Project detail page"
        model: "sonnet"
        depends_on: ["p3-project-api", "p1-shared-ui"]
        estimated_minutes: 15
        prompt: |
          Read src/app/api/ops-desk/projects/[id]/route.ts for the API shape.
          Read src/components/shared/ for all available components (especially
          comment-thread.tsx, file-uploader.tsx, status-badge.tsx, activity-feed.tsx, page-header.tsx).
          Read src/lib/constants.ts and src/lib/format.ts.

          Create src/app/(platform)/ops-desk/projects/[id]/page.tsx:

          - PageHeader: project title, client name (linked), status badge, "Edit" button
          - Info bar: deadline (formatted, with urgency color), assigned to (name + avatar),
            time tracked (formatted hours:minutes)
          - Status selector: dropdown to change status (calls PATCH .../status endpoint)

          Sections (use shadcn Tabs or accordion):

          1. Brief tab:
             - Display project.brief as formatted text
             - "Edit Brief" button → inline editor (textarea with save/cancel)

          2. Deliverables tab:
             - Checklist-style list: checkbox + title for each deliverable
             - Checking off → PATCH deliverable status to DONE_D
             - "Add Deliverable" input at bottom (type + Enter to add)
             - Drag to reorder (simple up/down, not full DnD — just move buttons)
             - Each deliverable shows linked content_asset if any

          3. Files tab:
             - FileUploader for new uploads
             - Grid of uploaded files with thumbnails (images) or icons (other types)
             - Files are stored as R2 URLs — create a simple file tracking system:
               either use a metadata JSON on the project or (simpler) store file
               references in deliverables or comments

          4. Comments tab:
             - CommentThread component
             - Fetches from GET /api/ops-desk/comments?entityType=PROJECT&entityId=[id]
             - Submit posts to POST /api/ops-desk/comments

          5. Activity tab:
             - ActivityFeed showing all activity for this project
        expected_files:
          - "src/app/(platform)/ops-desk/projects/[id]/page.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/projects/[id]/page.tsx"

      - id: "p3-project-create"
        name: "Project create and edit"
        model: "sonnet"
        depends_on: ["p3-project-api", "p1-layout"]
        estimated_minutes: 8
        prompt: |
          Read src/app/api/ops-desk/projects/route.ts for the API shape.
          Read src/lib/validations.ts for projectSchema.
          Read src/app/(platform)/ops-desk/clients/new/page.tsx as an example of form pattern.

          Create src/app/(platform)/ops-desk/projects/new/page.tsx:

          - Title: "New Project"
          - Form fields:
            - Title (required text)
            - Client (select dropdown — fetch clients from /api/ops-desk/clients)
            - Brief (textarea, optional)
            - Deadline (date picker, optional)
            - Assigned To (select dropdown — fetch team members from /api/ops-desk/team)
            - Status (select, defaults to BRIEFING)
          - If URL has ?clientId=X, pre-select that client
          - Submit → POST /api/ops-desk/projects
          - Success → redirect to /ops-desk/projects/[newId]
          - Cancel → back to projects Kanban
        expected_files:
          - "src/app/(platform)/ops-desk/projects/new/page.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/projects/new/page.tsx"

  # ============================================================
  # PHASE 4: INVOICING
  # ============================================================
  - id: "phase-4"
    name: "Invoicing & Payments"
    description: "Invoice management with PayMongo payment links"
    phase_check: "npx tsc --noEmit"

    tasks:
      - id: "p4-invoice-api"
        name: "Invoice API routes"
        model: "opus"
        depends_on: ["p1-prisma", "p1-auth", "p1-utils"]
        estimated_minutes: 12
        context_sources:
          - alias: "spec"
            sections: ["3.2 Module-Specific Entities", "7. Cross-Module Integration Flows"]
        prompt: |
          Read prisma/schema.prisma, src/lib/db.ts, src/lib/auth-guard.ts,
          src/lib/validations.ts, src/lib/activity.ts.

          Create:

          1. src/lib/paymongo.ts
             - Initialize PayMongo client using PAYMONGO_SECRET_KEY env var.
             - Export helper: createPaymentLink({ amount, description, remarks })
               that calls PayMongo's Create a Link endpoint (POST /v1/links).
               amount is in centavos (multiply PHP amount by 100).
               Return { id, checkout_url }.
             - Export helper: verifyWebhookSignature(payload, sigHeader, webhookSecret)
               that verifies the PayMongo webhook signature using HMAC-SHA256.

          2. src/app/api/ops-desk/invoices/route.ts
             - GET: List invoices. Filter by: clientId, status. Pagination.
               Include: client name. Sort by dueDate or createdAt.
             - POST: Create invoice. Validate with invoiceSchema.
               lineItems is a JSON array of { description, quantity, unitPrice }.
               Auto-calculate amount from lineItems if not provided.
               Log activity.

          3. src/app/api/ops-desk/invoices/[id]/route.ts
             - GET: Single invoice with client data.
             - PATCH: Update invoice (change status, update line items, add notes).
               Log activity with status transition in metadata.
             - DELETE: Only allow deleting DRAFT invoices. Log activity.

          4. src/app/api/ops-desk/invoices/[id]/send/route.ts
             - POST: Generate PayMongo payment link using the createPaymentLink helper.
               Pass amount (in centavos) and invoice description.
               Store paymongoPaymentLinkId and paymongoPaymentLinkUrl on the invoice.
               Set status to SENT_I. Log activity.

          5. src/app/api/webhooks/paymongo/route.ts
             - POST: Handle PayMongo webhooks.
             - Verify webhook signature using verifyWebhookSignature helper
               with PAYMONGO_WEBHOOK_SECRET env var.
             - Handle event type: "link.payment.paid"
               → Extract link_id from the event data
               → Find invoice by paymongoPaymentLinkId matching the link_id
               → Set status to PAID, paidAt to now
               → Log activity (module: OPS_DESK, action: 'paid')
             - Return 200 OK for all events (don't fail on unhandled events).
             - This route is PUBLIC (no auth — PayMongo calls it).

          All non-webhook routes use withAuth. ADMIN and TEAM can read, ADMIN can create/update/delete.
        expected_files:
          - "src/lib/paymongo.ts"
          - "src/app/api/ops-desk/invoices/route.ts"
          - "src/app/api/ops-desk/invoices/[id]/route.ts"
          - "src/app/api/ops-desk/invoices/[id]/send/route.ts"
          - "src/app/api/webhooks/paymongo/route.ts"
        done_check: "test -f src/app/api/ops-desk/invoices/route.ts && test -f src/app/api/webhooks/paymongo/route.ts && test -f src/lib/paymongo.ts"

      - id: "p4-invoice-list"
        name: "Invoice list page"
        model: "sonnet"
        depends_on: ["p4-invoice-api", "p1-shared-ui", "p1-layout"]
        estimated_minutes: 8
        prompt: |
          Read src/app/api/ops-desk/invoices/route.ts for the API shape.
          Read src/components/shared/data-table.tsx and src/components/shared/status-badge.tsx.
          Read src/lib/format.ts for formatCurrency and formatDate.

          Create src/app/(platform)/ops-desk/invoices/page.tsx:

          - Title "Invoices" with "New Invoice" button
          - DataTable with columns:
            - Client name (linked to client detail)
            - Amount (formatted currency)
            - Status (StatusBadge — color-coded: draft=gray, sent=blue, paid=green, overdue=red, cancelled=gray)
            - Due Date (formatted, red if overdue)
            - Paid Date (formatted, or "—" if not paid)
            - Actions: View button
          - Filter by status (All, Draft, Sent, Paid, Overdue)
          - Filter by client (dropdown)
          - Summary row at bottom: Total Outstanding, Total Paid This Month

          Fetch from GET /api/ops-desk/invoices with search params.
        expected_files:
          - "src/app/(platform)/ops-desk/invoices/page.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/invoices/page.tsx"

      - id: "p4-invoice-detail-create"
        name: "Invoice detail and create pages"
        model: "sonnet"
        depends_on: ["p4-invoice-api", "p1-shared-ui", "p1-layout"]
        estimated_minutes: 12
        prompt: |
          Read src/app/api/ops-desk/invoices/[id]/route.ts and
          src/app/api/ops-desk/invoices/[id]/send/route.ts for the API shape.
          Read src/lib/validations.ts for invoiceSchema.

          Create:

          1. src/app/(platform)/ops-desk/invoices/[id]/page.tsx — Invoice detail:
             - PageHeader: "Invoice #[short-id]" with status badge
             - Client info section: name, address (if available)
             - Line items table: Description, Quantity, Unit Price, Line Total
             - Totals: Subtotal, Total
             - Notes section (if any)
             - Status info: Due Date, Paid At (if paid)
             - Actions based on status:
               - DRAFT: "Send Invoice" button (calls /send endpoint), "Edit" button, "Delete" button
               - SENT: "Mark as Paid" button (manual override), "Resend" button
               - OVERDUE: "Mark as Paid" button, "Send Reminder" (future)
               - PAID: "View Receipt" (shows payment link/ID)
             - PayMongo Payment Link: if generated, show copyable link

          2. src/app/(platform)/ops-desk/invoices/new/page.tsx — Create invoice:
             - Client selector (dropdown, pre-selected if ?clientId=X in URL)
             - Project selector (optional, filtered by selected client)
             - Due date picker
             - Dynamic line items:
               - Each row: Description (text), Quantity (number), Unit Price (number input with $)
               - "Add Line Item" button
               - Remove button per row
               - Auto-calculate line totals and grand total
             - Notes textarea (optional)
             - Submit → POST /api/ops-desk/invoices
             - Success → redirect to invoice detail
        expected_files:
          - "src/app/(platform)/ops-desk/invoices/[id]/page.tsx"
          - "src/app/(platform)/ops-desk/invoices/new/page.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/invoices/[id]/page.tsx && test -f src/app/(platform)/ops-desk/invoices/new/page.tsx"

  # ============================================================
  # PHASE 5: TEAM MANAGEMENT & DASHBOARD
  # ============================================================
  - id: "phase-5"
    name: "Team, Dashboard & Calendar"
    description: "Team management, Ops dashboard, and calendar view"
    phase_check: "npm run build"

    tasks:
      - id: "p5-team-api"
        name: "Team management API"
        model: "sonnet"
        depends_on: ["p1-prisma", "p1-auth", "p1-utils"]
        estimated_minutes: 10
        prompt: |
          Read prisma/schema.prisma, src/lib/db.ts, src/lib/auth-guard.ts.

          Create:

          1. src/app/api/ops-desk/team/route.ts
             - GET: List all users with role ADMIN or TEAM. Include:
               count of assigned projects (where status not DELIVERED),
               total capacity hours. Sort by name.
             - Protected: ADMIN, TEAM.

          2. src/app/api/auth/invite/route.ts
             - POST: Invite a new team member. Body: { email, name, role }.
               - Create user with role, authMethod=PASSWORD, random temporary password
               - In a real system, you'd email them a password-set link. For V1,
                 just return the temporary password in the response (to be shown once).
               - Log activity (module: SYSTEM, action: 'user_invited')
             - Protected: ADMIN only.

          3. src/app/api/ops-desk/team/[id]/route.ts
             - GET: User detail with assigned projects list, capacity.
             - PATCH: Update capacity, skills, role. Protected: ADMIN.
        expected_files:
          - "src/app/api/ops-desk/team/route.ts"
          - "src/app/api/auth/invite/route.ts"
          - "src/app/api/ops-desk/team/[id]/route.ts"
        done_check: "test -f src/app/api/ops-desk/team/route.ts && test -f src/app/api/auth/invite/route.ts"

      - id: "p5-team-pages"
        name: "Team management pages"
        model: "sonnet"
        depends_on: ["p5-team-api", "p1-shared-ui", "p1-layout"]
        estimated_minutes: 10
        prompt: |
          Read src/app/api/ops-desk/team/route.ts for the API shape.
          Read src/components/shared/ for available components.

          Create:

          1. src/app/(platform)/ops-desk/team/page.tsx — Team list + workload:
             - Title "Team" with "Invite Member" button
             - Cards layout (not table) — one card per member:
               - Avatar + name + role badge
               - Assigned projects count vs capacity
               - Progress bar: projects / capacity ratio
               - Skills tags
               - Click → navigate to member detail
             - Workload overview: simple bar chart or visual indicator showing
               who is overloaded vs has capacity

          2. src/app/(platform)/ops-desk/team/[id]/page.tsx — Member detail:
             - Profile: avatar, name, email, role, capacity, skills
             - Assigned projects list (linked)
             - Activity feed for this user

          3. src/app/(platform)/settings/team/page.tsx — Invite flow:
             - "Invite Team Member" form: email, name, role (ADMIN or TEAM)
             - Submit → POST /api/auth/invite
             - Show temporary password once on success (with copy button)
             - List of existing team members with ability to change role or deactivate

          Also create src/app/(platform)/settings/layout.tsx — Settings sub-nav:
          Team, Billing (placeholder), Integrations (placeholder)
        expected_files:
          - "src/app/(platform)/ops-desk/team/page.tsx"
          - "src/app/(platform)/ops-desk/team/[id]/page.tsx"
          - "src/app/(platform)/settings/team/page.tsx"
          - "src/app/(platform)/settings/layout.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/team/page.tsx && test -f src/app/(platform)/settings/team/page.tsx"

      - id: "p5-dashboard"
        name: "Ops Desk dashboard"
        model: "opus"
        depends_on: ["p2-client-api", "p2-client-list", "p3-project-api", "p4-invoice-api", "p1-shared-ui"]
        estimated_minutes: 12
        prompt: |
          Read all API routes in src/app/api/ops-desk/ to understand available data.
          Read src/components/shared/ for MetricCard, ActivityFeed, StatusBadge.
          Read src/lib/format.ts for formatCurrency.
          Read prisma/schema.prisma and src/lib/db.ts.

          Replace the placeholder src/app/(platform)/ops-desk/page.tsx with a real dashboard:

          This should be a SERVER COMPONENT that queries Prisma directly (no API calls needed
          for a dashboard — direct DB access is more efficient).

          Layout:
          - Top row: 4 MetricCards
            - MRR: SUM of monthlyValue from clients WHERE healthStatus != CHURNED
            - Active Projects: COUNT of projects WHERE status NOT IN [APPROVED, DELIVERED]
            - Overdue Invoices: COUNT of invoices WHERE status = OVERDUE
            - Team Utilization: AVG of (assigned projects / capacity) across team members

          - Middle row (2 columns):
            - Left (2/3): "Projects by Stage" — horizontal bar chart or compact Kanban summary
              showing count of projects per status. Use colored blocks.
              Click any stage → links to /ops-desk/projects?status=X
            - Right (1/3): "Deadlines This Week" — list of projects with deadlines
              in the next 7 days. Show title, client, days remaining.

          - Bottom row:
            - Recent Activity feed (last 20 items from activity_log WHERE module = OPS_DESK)

          Use Prisma queries directly (import db from @/lib/db).
          Use Promise.all to fetch all data in parallel.
        expected_files:
          - "src/app/(platform)/ops-desk/page.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/page.tsx"

      - id: "p5-calendar"
        name: "Calendar view"
        model: "sonnet"
        depends_on: ["p3-project-api", "p1-layout"]
        estimated_minutes: 10
        prompt: |
          Read src/app/api/ops-desk/projects/route.ts for the project API.
          Read package.json to confirm react-big-calendar is installed.

          Create src/app/(platform)/ops-desk/calendar/page.tsx:

          This is a CLIENT COMPONENT.

          - Install react-big-calendar type defs if needed: @types/react-big-calendar
          - Import Calendar from react-big-calendar with date-fns localizer
          - Fetch all projects with deadlines from GET /api/ops-desk/projects
          - Map projects to calendar events:
            - Title: project title + " — " + client name
            - Start/End: deadline date (single-day event)
            - Color: based on project status (use constants from src/lib/constants.ts)
          - Month view by default, with week and day view options
          - Click event → navigate to /ops-desk/projects/[id]
          - Style the calendar with Tailwind (the library needs CSS — include
            react-big-calendar/lib/css/react-big-calendar.css in the component or layout)
          - Add filter: show/hide by client
        expected_files:
          - "src/app/(platform)/ops-desk/calendar/page.tsx"
        done_check: "test -f src/app/(platform)/ops-desk/calendar/page.tsx"

  # ============================================================
  # PHASE 6: V1 VALIDATION
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
    This is V1 of the NEXUS platform: Foundation + Ops Desk module.

    Pay special attention to:

    1. AUTH & MIDDLEWARE:
       - Verify middleware.ts correctly protects (platform) routes and rejects unauthenticated users
       - Verify all API routes use withAuth correctly
       - Verify session includes role and clientId

    2. CROSS-PAGE CONSISTENCY:
       - Sidebar active states match current route
       - All internal links use correct paths (e.g., /ops-desk/clients/[id])
       - Breadcrumbs or page headers are consistent

    3. API ROUTE QUALITY:
       - All routes return consistent JSON shapes ({ data } or { error, message })
       - All mutations log to activity_log
       - Proper HTTP status codes (201 for create, 404 for not found, etc.)
       - Zod validation on all POST/PATCH bodies

    4. KANBAN BOARD:
       - Drag and drop updates the database
       - Optimistic updates revert on API failure
       - All 8 status columns render correctly

    5. DATA INTEGRITY:
       - Invoice amount calculation from line items is correct
       - Client monthlyValue is Decimal, not Float
       - Foreign key relationships are correct (cascades, setNull)

    6. UI QUALITY:
       - All DataTable instances paginate correctly
       - Empty states show on all list pages when no data
       - Form validation shows inline errors
       - Toast notifications on successful create/update/delete
       - Loading states while fetching data

    7. IMPORTS & TYPES:
       - No unused imports
       - No `any` types
       - Prisma client is imported from @/lib/db consistently
       - All shared components are imported from @/components/shared

    Fix any TypeScript errors, missing imports, broken links, or
    inconsistencies you find. Run `npm run build` after each fix
    to verify the fix doesn't break something else.
```

---

## Human-Readable Summary

### Dependency Graph

```
p1-init ─────┬──→ p1-prisma ──→ p1-auth ──→ p1-layout
             │        │                         │
             │        ├──→ p1-utils             │
             │        │                         │
             │        ├──→ p2-client-api ──┬──→ p2-client-list
             │        │                    ├──→ p2-client-forms
             │        │                    └──→ p2-client-detail
             │        │
             │        ├──→ p3-project-api ─┬──→ p3-kanban
             │        │                    ├──→ p3-project-detail
             │        │                    └──→ p3-project-create
             │        │
             │        ├──→ p4-invoice-api ─┬──→ p4-invoice-list
             │        │                    └──→ p4-invoice-detail-create
             │        │
             │        └──→ p5-team-api ────→ p5-team-pages
             │
             └──→ p1-shared-ui ──→ (used by all page tasks)

p5-dashboard depends on: p2-client-api, p3-project-api, p4-invoice-api
p5-calendar depends on: p3-project-api
```

### Parallelism Opportunities

After `p1-prisma` completes, these can run simultaneously on separate instances:
- `p1-auth` (→ then `p1-layout`)
- `p1-utils`
- `p2-client-api`
- `p3-project-api`
- `p4-invoice-api`
- `p5-team-api`

After the API routes are done, all page tasks can run in parallel:
- `p2-client-list`, `p2-client-forms`, `p2-client-detail` (parallel)
- `p3-kanban`, `p3-project-detail`, `p3-project-create` (parallel)
- `p4-invoice-list`, `p4-invoice-detail-create` (parallel)
- `p5-team-pages`, `p5-dashboard`, `p5-calendar` (parallel)

### Model Assignment Summary

| Task | Model | Rationale |
|------|-------|-----------|
| p1-init | Sonnet | Standard scaffolding |
| p1-prisma | **Opus** | Complex schema design with 8 tables, relationships, indexes |
| p1-auth | **Opus** | Security-critical: auth, middleware, session, role guards |
| p1-layout | Sonnet | Standard UI layout work |
| p1-shared-ui | Sonnet | Well-known component patterns |
| p1-utils | Sonnet | Standard utility functions |
| p2-client-api | **Opus** | Sets the pattern for all other API routes |
| p2-client-list | Sonnet | Standard page implementation |
| p2-client-forms | Sonnet | Standard form work |
| p2-client-detail | Sonnet | Standard page implementation |
| p3-project-api | **Opus** | Complex: 6 route files, status transitions, deliverables, comments |
| p3-kanban | **Opus** | Complex: drag-and-drop, optimistic updates, reusable board component |
| p3-project-detail | Sonnet | Standard page with multiple sections |
| p3-project-create | Sonnet | Standard form |
| p4-invoice-api | **Opus** | PayMongo integration, webhook handling, payment flow |
| p4-invoice-list | Sonnet | Standard list page |
| p4-invoice-detail-create | Sonnet | Standard pages |
| p5-team-api | Sonnet | Simpler CRUD |
| p5-team-pages | Sonnet | Standard pages |
| p5-dashboard | **Opus** | Complex aggregation queries, data-driven layout |
| p5-calendar | Sonnet | Library integration, standard mapping |

**Split: 8 Opus (36%) / 14 Sonnet (64%)**

### Estimated Timeline

| Phase | Critical Path | Wall Clock (with parallelism) |
|-------|--------------|-------------------------------|
| Phase 1: Scaffolding | p1-init → p1-prisma → p1-auth → p1-layout | ~45 min |
| Phase 2: Clients | p2-client-api → p2-client-detail | ~22 min |
| Phase 3: Projects | p3-project-api → p3-kanban | ~33 min |
| Phase 4: Invoices | p4-invoice-api → p4-invoice-detail-create | ~24 min |
| Phase 5: Team + Dashboard | p5-dashboard (after P2-4 APIs) | ~12 min |
| Phase 6: Validation | ~15–30 min with fix cycles |
| **Total estimated** | | **~2.5–4 hours** |
