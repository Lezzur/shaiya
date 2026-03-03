# PROJECT_MANIFEST_shaiya
---
document_type: project_manifest
standard_version: "1.0"
project: shaiya
generated_by: as_built
generated_at: 2026-03-03
---
> This document is optimized for AI agent consumption.

## Table of Contents
- [1. Project Overview](#1-project-overview)
- [2. Tech Stack & Dependencies](#2-tech-stack--dependencies)
- [3. Architecture](#3-architecture)
- [4. Directory Map](#4-directory-map)
- [5. Data Model](#5-data-model)
- [6. API Surface](#6-api-surface)
- [7. Core Modules](#7-core-modules)
- [8. Authentication & Authorization](#8-authentication--authorization)
- [9. Configuration & Environment](#9-configuration--environment)
- [10. Conventions](#10-conventions)
- [11. Integration Points](#11-integration-points)
- [12. Error Handling](#12-error-handling)
- [13. Current State](#13-current-state)
- [14. Change History](#14-change-history)
- [15. Security Notes](#15-security-notes)
- [16. Terminology](#16-terminology)

## 1. Project Overview

The `shaiya` project, codenamed NEXUS, is a Next.js 14 application aiming to be a monolithic platform for agency management. Currently, it establishes a foundational architecture including user authentication, core data models for clients, projects, invoices, and activity logging, and the full "Ops Desk" module for operational management. Its primary output is an interactive web application providing dashboards, data tables, and forms for internal agency users to manage clients, projects, and team members. Other modules are present as placeholders.

## 2. Tech Stack & Dependencies

| Category | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | 14.2.35 | React framework for server-side rendering and API routes |
| **Language** | TypeScript | 5.x (inferred) | Type-safe JavaScript |
| **ORM** | Prisma | 7.4.2 | PostgreSQL ORM for type-safe database access and migrations |
| **Database Adapter** | `@prisma/adapter-pg` | 7.4.2 | PostgreSQL adapter for Prisma |
| **Authentication** | Next-Auth | 5.0.0-beta.30 | Flexible authentication library for Next.js applications |
| **Auth Adapter** | `@auth/prisma-adapter` | 2.11.1 | Prisma adapter for Next-Auth |
| **Styling** | Tailwind CSS | 3.4.1 (inferred) | Utility-first CSS framework |
| **UI Components** | shadcn/ui | N/A (component library) | Reusable UI components built with Radix UI and Tailwind CSS |
| **UI Primitive (Dialog)** | `@radix-ui/react-alert-dialog` | 1.1.15 | Radix UI component for alert dialogs |
| **UI Primitive (Avatar)** | `@radix-ui/react-avatar` | 1.1.11 | Radix UI component for avatars |
| **UI Primitive (Dialog)** | `@radix-ui/react-dialog` | 1.1.15 | Radix UI component for dialogs |
| **UI Primitive (Dropdown)** | `@radix-ui/react-dropdown-menu` | 2.1.16 | Radix UI component for dropdown menus |
| **UI Primitive (Label)** | `@radix-ui/react-label` | 2.1.8 | Radix UI component for labels |
| **UI Primitive (Select)** | `@radix-ui/react-select` | 2.2.6 | Radix UI component for select inputs |
| **UI Primitive (Separator)** | `@radix-ui/react-separator` | 1.1.8 | Radix UI component for separators |
| **UI Primitive (Slot)** | `@radix-ui/react-slot` | 1.2.4 | Radix UI component for polymorphic components |
| **UI Primitive (Tabs)** | `@radix-ui/react-tabs` | 1.1.13 | Radix UI component for tabbed interfaces |
| **UI Primitive (Tooltip)** | `@radix-ui/react-tooltip` | 1.2.8 | Radix UI component for tooltips |
| **Drag & Drop** | `@hello-pangea/dnd` | 18.0.1 | Drag and drop library for React |
| **Table Library** | `@tanstack/react-table` | 8.21.3 | Headless UI for building powerful tables |
| **Date Utilities** | `date-fns` | 4.1.0 | Date parsing, formatting, manipulation |
| **Form Management** | `react-hook-form` | 7.71.2 | Flexible forms with validation |
| **Form Resolvers** | `@hookform/resolvers` | 5.2.2 | Integration for schema-based form validation |
| **Validation** | `zod` | 4.3.6 | TypeScript-first schema declaration and validation library |
| **Password Hashing** | `bcryptjs` | 3.0.3 | Password hashing for secure authentication |
| **Cloud Storage** | `@aws-sdk/client-s3` | 3.1000.0 | AWS SDK client for S3-compatible storage (Cloudflare R2) |
| **Presigned URLs** | `@aws-sdk/s3-request-presigner` | 3.1000.0 | Generates presigned URLs for S3 operations |
| **Icons** | `lucide-react` | 0.576.0 | Open-source icon library for React |
| **CSS Utility** | `class-variance-authority` | 0.7.1 | Utility for creating variant-based components |
| **CSS Utility** | `clsx` | 2.1.1 | Utility for conditionally joining CSS class names |
| **CSS Utility** | `tailwind-merge` | 3.5.0 | Merges Tailwind CSS classes without style conflicts |
| **CSS Animation** | `tailwindcss-animate` | 1.0.7 | Tailwind CSS plugin for animations |
| **UUID Generation** | `uuid` | 13.0.0 | Generates RFC-compliant UUIDs |
| **Payment Gateway** | `paymongo-node` | 10.17.0 | SDK for PayMongo payment gateway integration |
| **PostgreSQL Driver** | `pg` | 8.19.0 | Node.js native PostgreSQL client |
| **Calendar UI** | `react-big-calendar` | 1.19.4 | A calendar component built with React |
| **Environment** | `dotenv` | 17.3.1 | Loads environment variables from a .env file |
| **Email Transport** | `nodemailer` | 7.0.13 | Module for sending emails (currently unused in auth) |

## 3. Architecture

The application follows a monolithic architecture built with Next.js 14 App Router, leveraging server components for data fetching and API routes for backend interactions.

**Architectural Layers:**
- **Client Components (UI):** Interactive UI elements built with React, consuming data from server components or API routes. Uses Shadcn UI components.
- **Server Components (Data Fetching/Rendering):** Next.js Server Components fetch data directly from the database or external services and render UI. They handle initial page loads and can pass data to client components.
- **API Routes (Backend Logic):** Next.js API Routes (`src/app/api/*`) act as the backend API. They handle HTTP requests, perform authentication/authorization checks, interact with the service layer, and return JSON responses.
- **Middleware (Global Auth/Routing):** `middleware.ts` intercepts requests to enforce authentication and role-based access control based on route groups (`(platform)`, `(portal)`, `(auth)`).
- **Service Layer (Business Logic / Utilities):** Resides in `src/lib/`. Contains core functionalities like database access (`db.ts`), activity logging (`activity.ts`), authentication utilities (`auth-guard.ts`, `auth.ts`), file storage (`r2.ts`), payment gateway integration (`paymongo.ts`), and validation (`validations.ts`).
- **Database (Persistence):** PostgreSQL, accessed via Prisma ORM (`src/lib/db.ts`).
- **External Services:** PayMongo (for payments), Cloudflare R2 (for file storage).

**Primary Data Flow (Internal User: Ops Desk Module Example):**
```mermaid
graph TD
    A[User (Browser)] --> B(Next.js Client Component e.g., Projects Kanban)
    B --> C{User Action: Drag Project Card}
    C -- Optimistic UI Update --> B
    C --> D[Next.js API Route: PATCH /api/ops-desk/projects/[id]/status]
    D -- Auth Guard (withAuth) --> E(Service Layer: src/lib/db.ts, src/lib/activity.ts)
    E -- Prisma ORM --> F[PostgreSQL Database: projects table]
    F -- Write Success --> E
    E -- Log Activity --> G[PostgreSQL Database: activity_log table]
    G -- Log Success --> E
    E -- API Response (200 OK) --> D
    D --> B
    B --> H[UI Update (Final)]
```

**Secondary Data Flow (Webhook for Payments):**
```mermaid
graph TD
    A[PayMongo Webhook Service] --> B(Public Next.js API Route: POST /api/webhooks/paymongo)
    B -- Signature Verification --> C{Event Type: link.payment.paid}
    C -- Service Layer (src/lib/db.ts, src/lib/activity.ts) --> D[PostgreSQL Database: invoices table]
    D -- Update Invoice Status --> D
    D -- Log Activity --> E[PostgreSQL Database: activity_log table]
    E -- Success (200 OK) --> B
```

## 4. Directory Map

-   `.env.example`: Template for required environment variables.
-   `.eslintrc.json`: ESLint configuration for code quality.
-   `.gitignore`: Specifies intentionally untracked files to ignore.
-   `.prettierrc`: Prettier configuration for code formatting.
-   `CLAUDE.md`: Development note regarding local port usage.
-   `components.json`: Shadcn UI configuration file.
-   `next.config.mjs`: Next.js configuration, including security headers.
-   `package-lock.json`: Records exact dependency versions.
-   `package.json`: Project metadata and dependency list.
-   `postcss.config.mjs`: PostCSS configuration for Tailwind CSS.
-   `prisma.config.ts`: Prisma configuration for migrations and datasource.
-   `prisma/`: Contains Prisma schema and database migrations.
    -   `migrations/`: Stores database migration files.
        -   `20260302082741_init/`: Initial migration snapshot.
            -   `migration.sql`: SQL script for the initial database schema.
        -   `migration_lock.toml`: Lock file for Prisma migrations.
    -   `schema.prisma`: Defines the application's data model and database schema.
    -   `seed.ts`: Script to populate the database with initial data (e.g., admin user).
-   `src/`: Main application source code.
    -   `app/`: Next.js App Router routes and pages.
        -   `(auth)/`: Authentication-related pages (login).
            -   `layout.tsx`: Layout for authentication pages (minimal).
            -   `login/`: Login page for internal users.
                -   `actions.ts`: Server action for handling login form submission.
                -   `page.tsx`: Client component for the login form.
        -   `(platform)/`: Route group for authenticated internal users (admin, team).
            -   `layout.tsx`: Main platform layout with sidebar navigation, top bar, and user menu.
            -   `ops-desk/`: Ops Desk module pages.
                -   `calendar/`: Calendar view for projects.
                    -   `page.tsx`: Displays project deadlines using `react-big-calendar`.
                -   `clients/`: Client management pages.
                    -   `[id]/`: Client detail page.
                        -   `page.tsx`: Displays client overview, projects, invoices, and activity.
                    -   `clients-table.tsx`: Reusable table component for client listings.
                    -   `new/`: New client creation page.
                        -   `page.tsx`: Form for creating a new client.
                    -   `page.tsx`: Client list page with filters and table.
                -   `invoices/`: Invoice management pages.
                    -   `[id]/`: Invoice detail page.
                        -   `page.tsx`: Displays invoice details, line items, status, and payment link.
                        -   `send/`: API endpoint to send an invoice.
                            -   `route.ts`: Handles generating PayMongo payment link and updating invoice status.
                    -   `new/`: New invoice creation page.
                        -   `page.tsx`: Form for creating a new invoice with dynamic line items.
                    -   `page.tsx`: Invoice list page with filters and summary.
                -   `layout.tsx`: Sub-navigation for the Ops Desk module.
                -   `page.tsx`: Ops Desk dashboard, aggregating key metrics.
                -   `projects/`: Project management pages.
                    -   `[id]/`: Project detail page.
                        -   `page.tsx`: Displays project brief, deliverables, files, comments, and activity.
                        -   `status/`: API endpoint for updating project status.
                            -   `route.ts`: Handles updating project status (e.g., for Kanban drag-and-drop).
                    -   `new/`: New project creation page.
                        -   `page.tsx`: Form for creating a new project.
                    -   `page.tsx`: Project Kanban board for visualizing project statuses.
                -   `team/`: Team member management (read-only for non-admins).
                    -   `[id]/`: Team member detail page.
                        -   `page.tsx`: Displays member profile and assigned projects.
                    -   `page.tsx`: List of team members with workload overview.
            -   `settings/`: Platform settings pages.
                -   `layout.tsx`: Sub-navigation for settings.
                -   `team/`: Team settings page (invite members).
                    -   `page.tsx`: Form to invite new team members and list existing ones.
            -   `war-room/`: Placeholder for the War Room dashboard.
                -   `page.tsx`: Displays a "Coming in V7" message.
        -   `(portal)/`: Route group for authenticated client users.
            -   `layout.tsx`: Client portal layout (simpler navigation).
            -   `page.tsx`: Placeholder for the client dashboard.
        -   `(website)/`: Placeholder for public website pages.
        -   `api/`: Backend API routes.
            -   `auth/`: Authentication API routes.
                -   `[...nextauth]/`: NextAuth.js catch-all route.
                    -   `route.ts`: NextAuth.js handler.
                -   `invite/`: Team member invitation API.
                    -   `route.ts`: Handles creating new users and generating temporary passwords.
            -   `ops-desk/`: API routes for the Ops Desk module.
                -   `activity/`: Activity log API.
                    -   `route.ts`: Fetches activity logs for entities.
                -   `clients/`: Client management API.
                    -   `[id]/`: Specific client API.
                        -   `route.ts`: GET, PATCH, DELETE for a single client.
                    -   `route.ts`: GET (list), POST (create) clients.
                -   `comments/`: Comment management API.
                    -   `route.ts`: GET (list), POST (create) comments.
                -   `deliverables/`: Deliverable management API.
                    -   `[id]/`: Specific deliverable API.
                        -   `route.ts`: PATCH, DELETE for a single deliverable.
                    -   `route.ts`: GET (list), POST (create) deliverables.
                -   `invoices/`: Invoice management API.
                    -   `[id]/`: Specific invoice API.
                        -   `page.tsx`: [UNCERTAIN] This is a UI page, not an API route. It seems miscategorized in the directory map but its content is a UI component. The file is `src/app/(platform)/ops-desk/invoices/[id]/page.tsx`, which implies UI.
                        -   `route.ts`: GET, PATCH, DELETE for a single invoice.
                        -   `send/`: API to send an invoice.
                            -   `route.ts`: Handles sending invoices via PayMongo.
                    -   `route.ts`: GET (list), POST (create) invoices.
                -   `projects/`: Project management API.
                    -   `[id]/`: Specific project API.
                        -   `route.ts`: GET, PATCH, DELETE for a single project.
                        -   `status/`: API to update project status.
                            -   `route.ts`: Handles updating project status for Kanban.
                    -   `route.ts`: GET (list), POST (create) projects.
                -   `team/`: Team member API (list internal users).
                    -   `[id]/`: Specific team member API (update capacity/skills/role).
                        -   `route.ts`: GET, PATCH for a single user.
                    -   `route.ts`: GET (list) team members.
                -   `users/`: User API (read-only for specific user details).
                    -   `[id]/`: Specific user API.
                        -   `route.ts`: GET for a single user (used by team member detail).
            -   `webhooks/`: Webhook handlers.
                -   `paymongo/`: PayMongo webhook handler.
                    -   `route.ts`: Processes PayMongo payment events.
        -   `globals.css`: Global CSS styles, including Tailwind and Shadcn variables.
        -   `layout.tsx`: Root layout for the entire application.
        -   `page.tsx`: Root page, handles redirects based on authentication status.
    -   `components/`: Reusable React components.
        -   `providers.tsx`: Provides context for Next-Auth sessions.
        -   `shared/`: Custom shared UI components.
            -   `activity-feed.tsx`: Displays a chronological list of activities.
            -   `client-form.tsx`: Reusable form for creating/editing clients.
            -   `comment-thread.tsx`: Component for displaying and adding comments.
            -   `confirm-dialog.tsx`: Generic confirmation modal.
            -   `data-table.tsx`: Generic data table component with sorting, filtering, pagination.
            -   `empty-state.tsx`: Generic component for displaying empty states.
            -   `file-uploader.tsx`: Drag-and-drop file upload component.
            -   `index.ts`: Barrel file for re-exporting shared components.
            -   `kanban-board.tsx`: Generic Kanban board component with drag-and-drop.
            -   `metric-card.tsx`: Card component for displaying key metrics.
            -   `page-header.tsx`: Generic page header component.
            -   `status-badge.tsx`: Colored badge for displaying various statuses.
        -   `ui/`: Shadcn UI components (generated).
    -   `hooks/`: Custom React hooks (empty, placeholder).
    -   `lib/`: Utility functions, helpers, and configurations.
        -   `activity.ts`: Functions for logging and retrieving activity entries.
        -   `auth-guard.ts`: Middleware and helpers for API route authentication and authorization.
        -   `auth.config.ts`: NextAuth.js configuration for session and JWT.
        -   `auth.ts`: NextAuth.js setup with Credentials provider.
        -   `constants.ts`: Defines various status enums, labels, and color maps.
        -   `db.ts`: Singleton instance of PrismaClient for database access.
        -   `env.ts`: Environment variable validation and access functions.
        -   `format.ts`: Utility functions for formatting dates, currency, numbers, etc.
        -   `paymongo.ts`: PayMongo API client for creating payment links and webhook verification.
        -   `r2.ts`: Cloudflare R2 client for generating presigned URLs and file operations.
        -   `toast.ts`: Simple client-side toast notification utility.
        -   `utils.ts`: General utility functions (e.g., `cn` for Tailwind class merging).
        -   `validations.ts`: Zod schemas for input validation across APIs.
    -   `types/`: TypeScript type definitions.
        -   `index.ts`: Shared types (User, Module).
        -   `next-auth.d.ts`: NextAuth.js module augmentation for custom session/JWT types.
-   `tailwind.config.ts`: Tailwind CSS configuration file.
-   `tsconfig.json`: TypeScript compiler configuration.

## 5. Data Model

The data model is defined in `prisma/schema.prisma` and implemented in the PostgreSQL database. UUIDs are used for all primary keys.

**Enums:**

```typescript
enum UserRole {
  ADMIN
  TEAM
  CLIENT
}

enum AuthMethod {
  PASSWORD
  MAGIC_LINK
}

enum HealthStatus {
  HEALTHY
  AT_RISK
  CHURNED
}

enum ContentAssetType {
  SOCIAL_POST
  BLOG
  VIDEO
  ILLUSTRATION
  CAROUSEL
  STORY
  REEL
  OTHER
}

enum InternalStatus {
  DRAFT
  QA_PASSED
  SENT_TO_CLIENT
}

enum ClientStatus {
  PENDING
  APPROVED
  REVISION_REQUESTED
  DONE
}

enum ActivityModule {
  LEAD_ENGINE
  OPS_DESK
  CONTENT_ENGINE
  CLIENT_PORTAL
  PROPOSALS
  ANALYTICS
  WEBSITE
  SYSTEM
}

enum ProjectStatus {
  BRIEFING
  ASSET_PREP
  IN_PRODUCTION
  INTERNAL_REVIEW
  CLIENT_REVIEW
  REVISION
  APPROVED
  DELIVERED
}

enum DeliverableStatus {
  PENDING_D // PENDING clashed with ClientStatus.PENDING, so suffixed
  IN_PROGRESS_D
  DONE_D
}

enum CommentEntityType {
  PROJECT
  CONTENT_ASSET
  PROPOSAL
  BRAND_PROFILE
  CLIENT_MESSAGE
}

enum InvoiceStatus {
  DRAFT_I // DRAFT clashed with InternalStatus.DRAFT, so suffixed
  SENT_I
  PAID
  OVERDUE
  CANCELLED
}
```

**Models:**

### `User` (`users` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the user.
- **email**: `String` (`@unique`) - User's email address, must be unique.
- **name**: `String` - User's full name.
- **role**: `UserRole` - Role of the user (ADMIN, TEAM, CLIENT).
- **avatar**: `String?` - URL to user's avatar image (nullable).
- **capacity**: `Int?` - Weekly capacity in hours (nullable, for internal users).
- **skills**: `String[]` - Array of strings representing user's skills.
- **authMethod**: `AuthMethod` (`auth_method` column) - Authentication method (PASSWORD, MAGIC_LINK).
- **passwordHash**: `String?` (`password_hash` column) - Hashed password (nullable, for PASSWORD auth method).
- **clientId**: `String?` (`client_id` column, `UUID` from `Client`) - Foreign key to `Client` table for CLIENT role users (nullable).
- **createdAt**: `DateTime` (`created_at` column, default `now()`) - Timestamp of creation.
- **updatedAt**: `DateTime` (`updated_at` column, `@updatedAt`) - Timestamp of last update.
- **Relations**:
    - `client`: `Client?` (`@relation("UserClient")`) - The client associated with this user (if `CLIENT` role).
    - `primaryContactFor`: `Client[]` (`@relation("ClientPrimaryContact")`) - Clients for which this user is the primary contact.
    - `assignedProjects`: `Project[]` (`@relation("ProjectAssignee")`) - Projects assigned to this user.
    - `authoredComments`: `Comment[]` (`@relation("CommentAuthor")`) - Comments authored by this user.
- **Indexes**: `role`, `clientId`

### `Client` (`clients` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the client.
- **name**: `String` - Client's name.
- **logo**: `String?` - URL to client's logo (R2 URL, nullable).
- **industry**: `String?` - Client's industry.
- **packageTier**: `String?` (`package_tier` column) - The service package tier subscribed by the client.
- **monthlyValue**: `Decimal` (`monthly_value` column, default `0`, `db.Decimal(10, 2)`) - Monthly recurring revenue value.
- **lifetimeValue**: `Decimal` (`lifetime_value` column, default `0`, `db.Decimal(10, 2)`) - Lifetime value of the client.
- **primaryContactId**: `String?` (`primary_contact_id` column, `UUID` from `User`) - Foreign key to the `User` who is the primary contact.
- **healthStatus**: `HealthStatus` (`health_status` column, default `HEALTHY`) - Current health status of the client.
- **renewalDate**: `DateTime?` (`renewal_date` column) - Date of contract renewal (nullable).
- **r2BucketPath**: `String?` (`r2_bucket_path` column) - R2 storage path prefix for client-specific assets (nullable).
- **createdAt**: `DateTime` (`created_at` column, default `now()`) - Timestamp of creation.
- **updatedAt**: `DateTime` (`updated_at` column, `@updatedAt`) - Timestamp of last update.
- **Relations**:
    - `primaryContact`: `User?` (`@relation("ClientPrimaryContact")`) - The user designated as primary contact.
    - `users`: `User[]` (`@relation("UserClient")`) - Users associated with this client (CLIENT role).
    - `contentAssets`: `ContentAsset[]` (`@relation("ClientContentAssets")`) - Content assets belonging to this client.
    - `projects`: `Project[]` (`@relation("ClientProjects")`) - Projects for this client.
    - `invoices`: `Invoice[]` (`@relation("ClientInvoices")`) - Invoices for this client.
- **Indexes**: `healthStatus`

### `ContentAsset` (`content_assets` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the content asset.
- **clientId**: `String` (`client_id` column, `UUID` from `Client`) - Foreign key to the `Client` who owns this asset.
- **projectId**: `String?` (`project_id` column, `UUID` from `Project`) - Foreign key to the `Project` this asset belongs to (nullable).
- **generationJobId**: `String?` (`generation_job_id` column) - ID of the generation job that created this asset (nullable).
- **type**: `ContentAssetType` - Type of content (SOCIAL_POST, BLOG, VIDEO, etc.).
- **fileUrl**: `String` (`file_url` column) - URL to the asset file in R2.
- **thumbnailUrl**: `String?` (`thumbnail_url` column) - URL to asset thumbnail in R2 (nullable).
- **internalStatus**: `InternalStatus` (`internal_status` column, default `DRAFT`) - Internal team's workflow status for the asset.
- **clientStatus**: `ClientStatus` (`client_status` column, default `PENDING`) - Client's approval status for the asset.
- **version**: `Int` (default `1`) - Version number of the asset.
- **parentAssetId**: `String?` (`parent_asset_id` column, `UUID` from `ContentAsset`) - Self-referencing foreign key for version history (nullable).
- **metadata**: `Json?` - JSONB field for various metadata (dimensions, duration, caption).
- **createdAt**: `DateTime` (`created_at` column, default `now()`) - Timestamp of creation.
- **updatedAt**: `DateTime` (`updated_at` column, `@updatedAt`) - Timestamp of last update.
- **Relations**:
    - `client`: `Client` (`@relation("ClientContentAssets")`) - The client owner of this asset.
    - `project`: `Project?` (`@relation("ProjectContentAssets")`) - The project this asset is part of.
    - `parentAsset`: `ContentAsset?` (`@relation("AssetVersions")`) - The parent asset in a version chain.
    - `childAssets`: `ContentAsset[]` (`@relation("AssetVersions")`) - Child assets in a version chain.
    - `deliverables`: `Deliverable[]` (`@relation("DeliverableAsset")`) - Deliverables linked to this asset.
- **Indexes**: `clientId`, `internalStatus`, `clientStatus`

### `ActivityLog` (`activity_log` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the activity log entry.
- **timestamp**: `DateTime` (default `now()`) - Timestamp of the activity.
- **actorId**: `String` (`actor_id` column, `UUID` from `User`) - Foreign key to the `User` who performed the action.
- **module**: `ActivityModule` - The module where the activity occurred.
- **action**: `String` - Description of the action (e.g., 'created', 'updated').
- **entityType**: `String` (`entity_type` column) - Type of entity affected (e.g., 'project', 'client').
- **entityId**: `String` (`entity_id` column) - ID of the entity affected.
- **metadata**: `Json?` - JSONB field for action-specific details.
- **Relations**:
    - `actor`: `User` (`@relation("ActivityActor")`) - The user who performed the activity.
- **Indexes**: `timestamp` (descending), `entityType`, `entityId`, `module`

### `Project` (`projects` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the project.
- **clientId**: `String` (`client_id` column, `UUID` from `Client`) - Foreign key to the `Client` this project belongs to.
- **title**: `String` - Project title.
- **brief**: `String?` (`db.Text`) - Detailed project brief (nullable).
- **status**: `ProjectStatus` (default `BRIEFING`) - Current status of the project.
- **deadline**: `DateTime?` - Project deadline (nullable).
- **assignedToId**: `String?` (`assigned_to_id` column, `UUID` from `User`) - Foreign key to the `User` assigned to this project (nullable).
- **templateId**: `String?` (`template_id` column) - ID of the project template used (nullable).
- **timeTrackedMinutes**: `Int` (`time_tracked_minutes` column, default `0`) - Total minutes tracked on the project.
- **createdAt**: `DateTime` (`created_at` column, default `now()`) - Timestamp of creation.
- **updatedAt**: `DateTime` (`updated_at` column, `@updatedAt`) - Timestamp of last update.
- **Relations**:
    - `client`: `Client` (`@relation("ClientProjects")`) - The client owning this project.
    - `assignedTo`: `User?` (`@relation("ProjectAssignee")`) - The user assigned to this project.
    - `contentAssets`: `ContentAsset[]` (`@relation("ProjectContentAssets")`) - Content assets associated with this project.
    - `deliverables`: `Deliverable[]` (`@relation("ProjectDeliverables")`) - Deliverables for this project.
    - `invoices`: `Invoice[]` (`@relation("ProjectInvoices")`) - Invoices associated with this project.
- **Indexes**: `clientId`, `status`, `assignedToId`, `deadline`

### `Deliverable` (`deliverables` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the deliverable.
- **projectId**: `String` (`project_id` column, `UUID` from `Project`) - Foreign key to the `Project` this deliverable belongs to.
- **title**: `String` - Deliverable title.
- **status**: `DeliverableStatus` (default `PENDING_D`) - Current status of the deliverable.
- **order**: `Int` - Order of the deliverable within a project.
- **contentAssetId**: `String?` (`content_asset_id` column, `UUID` from `ContentAsset`) - Foreign key to a `ContentAsset` if this deliverable is a generated asset (nullable).
- **createdAt**: `DateTime` (`created_at` column, default `now()`) - Timestamp of creation.
- **updatedAt**: `DateTime` (`updated_at` column, `@updatedAt`) - Timestamp of last update.
- **Relations**:
    - `project`: `Project` (`@relation("ProjectDeliverables")`) - The project this deliverable is part of.
    - `contentAsset`: `ContentAsset?` (`@relation("DeliverableAsset")`) - The content asset linked to this deliverable.

### `Comment` (`comments` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the comment.
- **entityType**: `CommentEntityType` (`entity_type` column) - Type of entity being commented on (PROJECT, CONTENT_ASSET, etc.).
- **entityId**: `String` (`entity_id` column, `UUID`) - ID of the entity being commented on.
- **authorId**: `String` (`author_id` column, `UUID` from `User`) - Foreign key to the `User` who authored the comment.
- **body**: `String` (`db.Text`) - The content of the comment.
- **parentId**: `String?` (`parent_id` column, `UUID` from `Comment`) - Self-referencing foreign key for threaded replies (nullable).
- **createdAt**: `DateTime` (`created_at` column, default `now()`) - Timestamp of creation.
- **Relations**:
    - `author`: `User` (`@relation("CommentAuthor")`) - The user who authored the comment.
    - `parentComment`: `Comment?` (`@relation("CommentReplies")`) - The parent comment if this is a reply.
    - `replies`: `Comment[]` (`@relation("CommentReplies")`) - Replies to this comment.
- **Indexes**: `entityType`, `entityId`

### `Invoice` (`invoices` table)
- **id**: `String` (UUID, Primary Key, default `uuid()`) - Unique identifier for the invoice.
- **clientId**: `String` (`client_id` column, `UUID` from `Client`) - Foreign key to the `Client` this invoice belongs to.
- **projectId**: `String?` (`project_id` column, `UUID` from `Project`) - Foreign key to the `Project` this invoice is for (nullable).
- **amount**: `Decimal` (`db.Decimal(10, 2)`) - Total amount of the invoice.
- **status**: `InvoiceStatus` (default `DRAFT_I`) - Current status of the invoice.
- **dueDate**: `DateTime` (`due_date` column) - Date when the invoice is due.
- **paidAt**: `DateTime?` (`paid_at` column) - Timestamp when the invoice was paid (nullable).
- **paymongoPaymentLinkId**: `String?` (`paymongo_payment_link_id` column) - ID of the PayMongo payment link (nullable).
- **paymongoPaymentLinkUrl**: `String?` (`paymongo_payment_link_url` column) - URL of the PayMongo payment link (nullable).
- **paymongoPaymentId**: `String?` (`paymongo_payment_id` column) - ID of the PayMongo payment transaction (nullable).
- **lineItems**: `Json` (`line_items` column) - JSONB array of line item objects (`{ description: string, quantity: number, unitPrice: number }`).
- **notes**: `String?` (`db.Text`) - Additional notes or payment terms (nullable).
- **createdAt**: `DateTime` (`created_at` column, default `now()`) - Timestamp of creation.
- **updatedAt**: `DateTime` (`updated_at` column, `@updatedAt`) - Timestamp of last update.
- **Relations**:
    - `client`: `Client` (`@relation("ClientInvoices")`) - The client associated with this invoice.
    - `project`: `Project?` (`@relation("ProjectInvoices")`) - The project associated with this invoice.
- **Indexes**: `clientId`, `status`, `dueDate`

## 6. API Surface

### `GET /api/auth/[...nextauth]` — NextAuth.js API route handler
- **Auth**: Public (handled by NextAuth.js internally)
- **Params**: N/A
- **Body**: N/A
- **Response**: NextAuth.js internal response (e.g., session data, callback redirects)
- **Errors**: Handled by NextAuth.js
- **File**: `src/app/api/auth/[...nextauth]/route.ts`

### `POST /api/auth/[...nextauth]` — NextAuth.js API route handler
- **Auth**: Public (handled by NextAuth.js internally)
- **Params**: N/A
- **Body**: NextAuth.js internal body (e.g., credentials for login)
- **Response**: NextAuth.js internal response
- **Errors**: Handled by NextAuth.js
- **File**: `src/app/api/auth/[...nextauth]/route.ts`

### `POST /api/auth/invite` — Invite new team member
- **Auth**: required (roles: `ADMIN`)
- **Params**: N/A
- **Body**: `{ email: string, name: string, role: "ADMIN" | "TEAM" }`
- **Response**: `{ user: { id: string, email: string, name: string, role: string, createdAt: DateTime }, tempPassword: string, message: string }` (201 Created)
- **Errors**: 400 (Missing fields, Invalid role), 409 (User exists), 500 (Internal Server Error)
- **File**: `src/app/api/auth/invite/route.ts`

### `GET /api/ops-desk/activity` — Get activity logs for an entity
- **Auth**: required (roles: `ADMIN`, `TEAM`, `CLIENT`) [UNCERTAIN: `withAuth` is used, but specific roles are not passed. Implies all authenticated roles, but client should only see their own. `getEntityActivity` is not scoped by client ID. This could be a security vulnerability for CLIENT role users if not handled at a higher level.]
- **Params**: `{ entityType: string, entityId: string, limit?: number }` (query parameters)
- **Body**: N/A
- **Response**: `ActivityLog[]` (array of activity log objects, including actor details)
- **Errors**: 400 (Missing entityType/entityId), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/activity/route.ts`

### `GET /api/ops-desk/clients` — List clients
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ page?: number, limit?: number, sortBy?: string, sortOrder?: "asc" | "desc", search?: string, healthStatus?: "HEALTHY" | "AT_RISK" | "CHURNED" }` (query parameters)
- **Body**: N/A
- **Response**: `{ data: Client[], pagination: { page: number, limit: number, total: number, totalPages: number } }`
- **Errors**: 400 (Invalid pagination/sort/filter params), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/clients/route.ts`

### `POST /api/ops-desk/clients` — Create a new client
- **Auth**: required (roles: `ADMIN`)
- **Params**: N/A
- **Body**: `{ name: string, logo?: string, industry?: string, packageTier?: string, monthlyValue?: number, lifetimeValue?: number, primaryContactId?: string, healthStatus?: HealthStatus, renewalDate?: Date, r2BucketPath?: string }` (validated by `createClientSchema`)
- **Response**: `{ data: Client }` (201 Created)
- **Errors**: 400 (Validation failed), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/clients/route.ts`

### `GET /api/ops-desk/clients/[id]` — Get single client by ID
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `{ data: Client & { projects: Project[], invoiceSummary: { totalAmount: number, paidAmount: number, outstandingCount: number } } }`
- **Errors**: 400 (Client ID missing), 404 (Client not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/clients/[id]/route.ts`

### `PATCH /api/ops-desk/clients/[id]` — Update client fields
- **Auth**: required (roles: `ADMIN`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: `{ name?: string, logo?: string, industry?: string, packageTier?: string, monthlyValue?: number, lifetimeValue?: number, primaryContactId?: string, healthStatus?: HealthStatus, renewalDate?: Date, r2BucketPath?: string }` (validated by `updateClientSchema`)
- **Response**: `{ data: Client }`
- **Errors**: 400 (Client ID missing, Validation failed), 404 (Client not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/clients/[id]/route.ts`

### `DELETE /api/ops-desk/clients/[id]` — Soft-delete client
- **Auth**: required (roles: `ADMIN`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `{ data: Client }` (Client with `healthStatus` set to `CHURNED`)
- **Errors**: 400 (Client ID missing), 404 (Client not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/clients/[id]/route.ts`

### `GET /api/ops-desk/comments` — List comments by entity
- **Auth**: required (roles: `ADMIN`, `TEAM`, `CLIENT`) [UNCERTAIN: `withAuth` is used, but specific roles are not passed. Implies all authenticated roles, but client should only see their own. `getEntityActivity` is not scoped by client ID. This could be a security vulnerability for CLIENT role users if not handled at a higher level.]
- **Params**: `{ entityType: CommentEntityType, entityId: string }` (query parameters)
- **Body**: N/A
- **Response**: `{ data: Comment[] }` (array of comments, including author details and replies)
- **Errors**: 400 (Missing entityType/entityId, Invalid entityType), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/comments/route.ts`

### `POST /api/ops-desk/comments` — Create a new comment
- **Auth**: required (roles: `ADMIN`, `TEAM`, `CLIENT`)
- **Params**: N/A
- **Body**: `{ entityType: CommentEntityType, entityId: string, body: string, parentId?: string }` (validated by `createCommentSchema`)
- **Response**: `Comment` (201 Created, including author details)
- **Errors**: 400 (Validation failed, Parent comment does not belong to same entity), 401 (Unauthorized), 404 (Parent comment not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/comments/route.ts`

### `GET /api/ops-desk/deliverables` — List deliverables by project
- **Auth**: required (roles: `ADMIN`, `TEAM`, `CLIENT`) [UNCERTAIN: `withAuth` is used, but specific roles are not passed. Implies all authenticated roles, but client should only see their own. `getEntityActivity` is not scoped by client ID. This could be a security vulnerability for CLIENT role users if not handled at a higher level.]
- **Params**: `{ projectId: string }` (query parameter)
- **Body**: N/A
- **Response**: `{ data: Deliverable[] }` (array of deliverables, including linked `contentAsset` details)
- **Errors**: 400 (Missing projectId), 404 (Project not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/deliverables/route.ts`

### `POST /api/ops-desk/deliverables` — Create a new deliverable
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: N/A
- **Body**: `{ projectId: string, title: string, status?: DeliverableStatus, contentAssetId?: string }` (validated by `createDeliverableSchema`, `order` is auto-set)
- **Response**: `Deliverable` (201 Created, including linked `contentAsset` details)
- **Errors**: 400 (Validation failed), 401 (Unauthorized), 404 (Project not found, Content asset not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/deliverables/route.ts`

### `PATCH /api/ops-desk/deliverables/[id]` — Update a deliverable
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: `{ title?: string, status?: DeliverableStatus, order?: number, contentAssetId?: string }` (validated by `updateDeliverableSchema`)
- **Response**: `Deliverable` (updated deliverable, including linked `contentAsset` details)
- **Errors**: 400 (Deliverable ID missing, Validation failed), 401 (Unauthorized), 404 (Deliverable not found, Content asset not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/deliverables/[id]/route.ts`

### `DELETE /api/ops-desk/deliverables/[id]` — Delete a deliverable
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `{ success: boolean }`
- **Errors**: 400 (Deliverable ID missing), 401 (Unauthorized), 404 (Deliverable not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/deliverables/[id]/route.ts`

### `GET /api/ops-desk/invoices` — List invoices
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ clientId?: string, status?: InvoiceStatus, sortBy?: "dueDate" | "createdAt", sortOrder?: "asc" | "desc", page?: number, limit?: number }` (query parameters)
- **Body**: N/A
- **Response**: `{ data: Invoice[], pagination: { page: number, limit: number, total: number, totalPages: number } }`
- **Errors**: 400 (Invalid parameters), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/invoices/route.ts`

### `POST /api/ops-desk/invoices` — Create a new invoice
- **Auth**: required (roles: `ADMIN`)
- **Params**: N/A
- **Body**: `{ clientId: string, projectId?: string, amount?: number, status?: InvoiceStatus, dueDate: Date, lineItems: { description: string, quantity: number, unitPrice: number, amount: number }[], notes?: string }` (validated by `createInvoiceSchema`, `amount` can be auto-calculated)
- **Response**: `{ data: Invoice }` (201 Created)
- **Errors**: 400 (Validation failed), 404 (Client not found, Project not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/invoices/route.ts`

### `GET /api/ops-desk/invoices/[id]` — Get single invoice by ID
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `{ data: Invoice & { client: { id: string, name: string, logo?: string, industry?: string }, project?: { id: string, title: string, status: string } } }`
- **Errors**: 400 (Invoice ID missing), 404 (Invoice not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/invoices/[id]/route.ts`

### `PATCH /api/ops-desk/invoices/[id]` — Update an invoice
- **Auth**: required (roles: `ADMIN`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: `{ status?: InvoiceStatus, lineItems?: { description: string, quantity: number, unitPrice: number, amount: number }[], amount?: number, notes?: string, dueDate?: Date, projectId?: string }` (validated by `updateInvoiceSchema`)
- **Response**: `{ data: Invoice }`
- **Errors**: 400 (Invoice ID missing, Validation failed), 404 (Invoice not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/invoices/[id]/route.ts`

### `DELETE /api/ops-desk/invoices/[id]` — Delete an invoice
- **Auth**: required (roles: `ADMIN`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `{ success: boolean }`
- **Errors**: 400 (Invoice ID missing, Only draft invoices can be deleted), 404 (Invoice not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/invoices/[id]/route.ts`

### `POST /api/ops-desk/invoices/[id]/send` — Generate PayMongo payment link and mark invoice as sent
- **Auth**: required (roles: `ADMIN`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `{ data: Invoice, paymentLink: { id: string, checkoutUrl: string } }`
- **Errors**: 400 (Invoice ID missing, Only draft invoices can be sent), 404 (Invoice not found), 500 (Internal Server Error, PayMongo API error)
- **File**: `src/app/api/ops-desk/invoices/[id]/send/route.ts`

### `GET /api/ops-desk/projects` — List projects
- **Auth**: required (roles: `ADMIN`, `TEAM`, `CLIENT`) [UNCERTAIN: `withAuth` is used, but specific roles are not passed. Implies all authenticated roles, but client should only see their own. `getEntityActivity` is not scoped by client ID. This could be a security vulnerability for CLIENT role users if not handled at a higher level.]
- **Params**: `{ page?: number, limit?: number, sortBy?: string, sortOrder?: "asc" | "desc", status?: ProjectStatus, clientId?: string, assignedToId?: string | "null" }` (query parameters)
- **Body**: N/A
- **Response**: `{ data: Project[], pagination: { page: number, limit: number, total: number, totalPages: number } }`
- **Errors**: 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/projects/route.ts`

### `POST /api/ops-desk/projects` — Create a new project
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: N/A
- **Body**: `{ clientId: string, title: string, brief?: string, status?: ProjectStatus, deadline?: Date, assignedToId?: string, templateId?: string, timeTrackedMinutes?: number }` (validated by `createProjectSchema`)
- **Response**: `Project` (201 Created)
- **Errors**: 400 (Validation failed), 401 (Unauthorized), 404 (Client not found, Assigned user not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/projects/route.ts`

### `GET /api/ops-desk/projects/[id]` — Get single project by ID
- **Auth**: required (roles: `ADMIN`, `TEAM`, `CLIENT`) [UNCERTAIN: `withAuth` is used, but specific roles are not passed. Implies all authenticated roles, but client should only see their own. `getEntityActivity` is not scoped by client ID. This could be a security vulnerability for CLIENT role users if not handled at a higher level.]
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `Project & { comments: Comment[] }` (Project with client, assignedTo, deliverables, contentAssets, and comments)
- **Errors**: 400 (Project ID missing), 404 (Project not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/projects/[id]/route.ts`

### `PATCH /api/ops-desk/projects/[id]` — Update project fields
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: `{ title?: string, brief?: string, status?: ProjectStatus, deadline?: Date, assignedToId?: string, templateId?: string, timeTrackedMinutes?: number }` (validated by `updateProjectSchema`)
- **Response**: `Project` (updated project)
- **Errors**: 400 (Project ID missing, Validation failed), 401 (Unauthorized), 404 (Project not found, Assigned user not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/projects/[id]/route.ts`

### `DELETE /api/ops-desk/projects/[id]` — Delete a project
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `{ success: boolean }`
- **Errors**: 400 (Project ID missing), 401 (Unauthorized), 404 (Project not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/projects/[id]/route.ts`

### `PATCH /api/ops-desk/projects/[id]/status` — Update project status (for Kanban)
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: `{ status: ProjectStatus }` (validated by `updateStatusSchema`)
- **Response**: `{ id: string, title: string, status: ProjectStatus, updatedAt: DateTime }`
- **Errors**: 400 (Project ID missing, Validation failed), 401 (Unauthorized), 404 (Project not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/projects/[id]/status/route.ts`

### `GET /api/ops-desk/team` — List team members
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: N/A
- **Body**: N/A
- **Response**: `TeamMember[]` (array of users with roles ADMIN or TEAM, including assigned project counts)
- **Errors**: 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/team/route.ts`

### `GET /api/ops-desk/team/[id]` — Get team member details
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `TeamMemberDetail` (user details with assigned projects)
- **Errors**: 400 (User ID missing), 404 (User not found or not ADMIN/TEAM role), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/team/[id]/route.ts`

### `PATCH /api/ops-desk/team/[id]` — Update team member (capacity, skills, role)
- **Auth**: required (roles: `ADMIN`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: `{ capacity?: number, skills?: string[], role?: UserRole }`
- **Response**: `User` (updated user profile)
- **Errors**: 400 (User ID missing, Invalid capacity/skills/role), 404 (User not found or not ADMIN/TEAM role), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/team/[id]/route.ts`

### `GET /api/ops-desk/users/[id]` — Get user details
- **Auth**: required (roles: `ADMIN`, `TEAM`)
- **Params**: `{ id: string }` (path parameter)
- **Body**: N/A
- **Response**: `User` (user details with assigned projects)
- **Errors**: 400 (User ID missing), 404 (User not found), 500 (Internal Server Error)
- **File**: `src/app/api/ops-desk/users/[id]/route.ts`

### `POST /api/webhooks/paymongo` — Handle PayMongo webhook events
- **Auth**: Public (signature verification only)
- **Params**: N/A
- **Body**: Raw JSON payload from PayMongo
- **Response**: `{ received: boolean }` (200 OK)
- **Errors**: 400 (Missing signature header), 401 (Invalid signature), 500 (Webhook secret not configured)
- **File**: `src/app/api/webhooks/paymongo/route.ts`

## 7. Core Modules

### `src/lib/activity.ts`
- **Purpose**: Provides functions for logging activities and retrieving activity history.
- **Exports**:
    - `logActivity(params: LogActivityParams): Promise<ActivityLog>`
    - `logActivities(activities: LogActivityParams[]): Promise<Prisma.BatchPayload>`
    - `getEntityActivity(entityType: string, entityId: string, limit?: number): Promise<ActivityLog[]>`
    - `getModuleActivity(module: ActivityModule, limit?: number): Promise<ActivityLog[]>`
- **Dependencies**: `@/lib/db`, `@/generated/prisma`
- **Used by**: All API routes performing mutations (`POST`, `PATCH`, `DELETE` for clients, projects, invoices, comments, team invites, PayMongo webhook).
- Key behavior notes: Uses `db.activityLog` for persistence. `metadata` is a JSONB field.

### `src/lib/auth-guard.ts`
- **Purpose**: Provides server-side utilities for authenticating and authorizing API route handlers and retrieving session information.
- **Exports**:
    - `withAuth(handler: RouteHandler, options?: WithAuthOptions): RouteHandler`
    - `getRequiredSession(): Promise<Session>`
    - `getClientSession(): Promise<{ session: Session, clientId: string }>`
    - `AuthError` (class)
    - `handleAuthError(error: unknown): NextResponse`
- **Dependencies**: `next/server`, `next-auth`, `@/lib/auth`, `@/generated/prisma`
- **Used by**: All API routes in `src/app/api/` except public webhooks.
- Key behavior notes: `withAuth` wraps route handlers to check `session.user` and `session.user.role`. `getRequiredSession` throws `AuthError(401)` if no session. `getClientSession` throws `AuthError(403)` if not `CLIENT` role or `clientId` missing.

### `src/lib/auth.config.ts`
- **Purpose**: Defines the core configuration object for NextAuth.js, including session strategy, pages, and callbacks.
- **Exports**:
    - `authConfig`: `NextAuthConfig` object.
- **Dependencies**: `next-auth`
- **Used by**: `@/lib/auth.ts`, `src/middleware.ts`
- Key behavior notes: Configures `jwt` session strategy. Custom `jwt` and `session` callbacks to inject `id`, `role`, `clientId`, and `rememberMe` into JWT and session. `authorized` callback always returns `true` as authorization is handled by `middleware.ts`. Session `maxAge` is 30 days, but `jwt` callback shortens to 24 hours if `rememberMe` is false.

### `src/lib/auth.ts`
- **Purpose**: Initializes and exports NextAuth.js handlers, sign-in/sign-out functions, and the `auth` utility.
- **Exports**:
    - `handlers` (from NextAuth)
    - `signIn` (from NextAuth)
    - `signOut` (from NextAuth)
    - `auth` (from NextAuth)
- **Dependencies**: `next-auth`, `bcryptjs`, `@/lib/db`, `@/generated/prisma`, `@/lib/auth.config`
- **Used by**: `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/actions.ts`, `src/app/(platform)/layout.tsx`, `src/app/(portal)/layout.tsx`, `src/app/page.tsx`, `src/lib/auth-guard.ts`.
- Key behavior notes: Implements a `Credentials` provider for `ADMIN` and `TEAM` roles using email and bcrypt-hashed passwords. A `TODO` exists to add `Nodemailer` for magic link.

### `src/lib/constants.ts`
- **Purpose**: Centralizes status enums, labels, and color mappings for consistent UI rendering and data interpretation.
- **Exports**:
    - `PROJECT_STATUSES`, `INVOICE_STATUSES`, `HEALTH_STATUSES`, `DELIVERABLE_STATUSES`, `INTERNAL_STATUSES`, `CLIENT_STATUSES`, `CONTENT_ASSET_TYPES`, `USER_ROLES`, `MODULE_LABELS`, `COMMENT_ENTITY_TYPES` (all as `const` arrays/objects).
    - Helper functions: `getProjectStatus`, `getInvoiceStatus`, `getHealthStatus`, `getDeliverableStatus`, `getInternalStatus`, `getClientStatus`, `getContentAssetType`, `getUserRole`, `getModuleLabel`.
- **Dependencies**: `@/generated/prisma`
- **Used by**: UI components (e.g., `status-badge.tsx`, `kanban-board.tsx`), API routes (for status validation), client-side pages (for filters, display logic).
- Key behavior notes: Provides a consistent source of truth for all status and type enumerations.

### `src/lib/db.ts`
- **Purpose**: Exports a singleton instance of `PrismaClient` configured to connect to PostgreSQL.
- **Exports**:
    - `db`: `PrismaClient` instance.
- **Dependencies**: `@/generated/prisma`, `@prisma/adapter-pg`, `dotenv`
- **Used by**: All API routes and server components that interact directly with the database.
- Key behavior notes: Uses `@prisma/adapter-pg` for direct PostgreSQL connection. Implements a global singleton pattern to prevent multiple `PrismaClient` instances in development. Logs queries in development. Uses `DIRECT_DATABASE_URL` preference over `DATABASE_URL`.

### `src/lib/env.ts`
- **Purpose**: Provides Zod-based validation and access to environment variables, ensuring all required configurations are present and correctly typed at runtime.
- **Exports**:
    - `Env` (type inferred from schema)
    - `getEnv()`: Returns validated environment variables.
    - `validateEnv()`: Function to be called at app startup to check env.
    - `isFeatureEnabled(feature: keyof Pick<Env, 'ENABLE_ANALYTICS' | 'ENABLE_EMAIL_NOTIFICATIONS'>): boolean`
    - `getDatabaseUrl()`: Returns the database URL, preferring `DIRECT_DATABASE_URL`.
    - `isR2Configured()`: Checks if Cloudflare R2 environment variables are set.
    - `isPayMongoConfigured()`: Checks if PayMongo environment variables are set.
    - `isEmailConfigured()`: Checks if SMTP environment variables are set.
    - `getAppUrl()`: Returns the public application URL.
    - `isProduction()`, `isDevelopment()`, `isTest()`: Environment checks.
- **Dependencies**: `zod`
- **Used by**: `src/lib/db.ts`, `src/lib/r2.ts`, `src/lib/paymongo.ts`, `prisma.config.ts`, `prisma/seed.ts`
- Key behavior notes: Fails fast on startup if critical environment variables are missing or invalid.

### `src/lib/format.ts`
- **Purpose**: Provides a collection of utility functions for common data formatting needs across the application's UI.
- **Exports**:
    - `formatCurrency(amount: number): string`
    - `formatDate(date: Date | string): string`
    - `formatDateTime(date: Date | string): string`
    - `formatRelative(date: Date | string): string`
    - `formatPercent(value: number, decimals?: number): string`
    - `formatNumber(value: number): string`
    - `formatFileSize(bytes: number): string`
    - `formatDuration(minutes: number): string`
    - `truncate(text: string, maxLength?: number): string`
    - `getInitials(name: string): string`
- **Dependencies**: `date-fns`
- **Used by**: Various UI components and pages (`client-detail.tsx`, `clients-table.tsx`, `invoice-detail.tsx`, `invoices-page.tsx`, `project-detail.tsx`, `projects-kanban.tsx`, `team-detail.tsx`, `team-page.tsx`).
- Key behavior notes: Ensures consistent display of data throughout the UI.

### `src/lib/paymongo.ts`
- **Purpose**: Provides client-side integration with the PayMongo API for creating payment links and server-side verification of PayMongo webhooks.
- **Exports**:
    - `createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse>`
    - `verifyWebhookSignature(payload: string, sigHeader: string, webhookSecret: string): boolean`
- **Dependencies**: `crypto`
- **Used by**: `src/app/api/ops-desk/invoices/[id]/send/route.ts`, `src/app/api/webhooks/paymongo/route.ts`.
- Key behavior notes: Uses basic authentication with `PAYMONGO_SECRET_KEY`. Verifies webhook signatures using HMAC-SHA256 for security.

### `src/lib/r2.ts`
- **Purpose**: Provides utilities for interacting with Cloudflare R2 storage, compatible with the AWS S3 SDK.
- **Exports**:
    - `getUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>`
    - `getDownloadUrl(key: string, expiresIn?: number): Promise<string>`
    - `deleteFile(key: string): Promise<void>`
    - `getClientPath(clientId: string, subPath?: string): string`
    - `getProjectPath(clientId: string, projectId: string, subPath?: string): string`
    - `getAssetPath(clientId: string, assetId: string, filename: string): string`
- **Dependencies**: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- **Used by**: `src/app/(platform)/ops-desk/projects/[id]/page.tsx` (FileUploader), and potentially other modules for file storage.
- Key behavior notes: Lazily initializes `S3Client`. Requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` environment variables. Generates presigned URLs for secure, temporary access.

### `src/lib/toast.ts`
- **Purpose**: Implements a simple client-side toast notification system for displaying temporary messages to the user.
- **Exports**:
    - `toast`: An instance of `ToastManager` with `success`, `error`, `info` methods.
- **Dependencies**: N/A (pure DOM manipulation)
- **Used by**: Client-side pages and components (e.g., `src/app/(platform)/ops-desk/clients/new/page.tsx`).
- Key behavior notes: Manually creates and appends DOM elements for toasts. Includes basic animations and auto-removal.

### `src/lib/utils.ts`
- **Purpose**: Provides general utility functions for the frontend.
- **Exports**:
    - `cn(...inputs: ClassValue[]): string`
- **Dependencies**: `clsx`, `tailwind-merge`
- **Used by**: Most React components for conditional CSS class merging.
- Key behavior notes: Simplifies combining Tailwind CSS classes.

### `src/lib/validations.ts`
- **Purpose**: Defines Zod schemas for validating API request bodies and query parameters, ensuring data integrity and type safety.
- **Exports**: Numerous Zod schemas for `User`, `Client`, `Project`, `Deliverable`, `Invoice`, `ContentAsset`, `Comment`, `ActivityLog`, `FileUploadRequest`, `Pagination`, `Sort`, `Filter`, and their inferred TypeScript types.
- **Dependencies**: `zod`, `@/generated/prisma`
- **Used by**: All API routes (`GET`, `POST`, `PATCH`) for input validation. Client-side forms (`client-form.tsx`, `new-client.tsx`, `new-project.tsx`, `new-invoice.tsx`) also use these schemas for client-side validation.
- Key behavior notes: Enforces data structure, types, and constraints (e.g., min length, UUID format, number ranges) at the API boundary.

### `src/middleware.ts`
- **Purpose**: Next.js Edge Middleware for global authentication and route group authorization.
- **Exports**:
    - Default function (`auth` middleware)
    - `config`: `matcher` object.
- **Dependencies**: `next-auth`, `@/lib/auth.config`, `next/server`
- **Used by**: Next.js runtime.
- Key behavior notes: Intercepts all requests (except static assets). Redirects unauthenticated users to `/login`. Enforces `ADMIN`/`TEAM` roles for `(platform)` routes and `CLIENT` role for `(portal)` routes. All other `/api` routes require any authentication.

### `src/components/shared/data-table.tsx`
- **Purpose**: Generic and reusable data table component with features like sorting, filtering, and pagination.
- **Exports**: `DataTable<TData, TValue>`
- **Dependencies**: `@tanstack/react-table`, Shadcn `Table`, `Button`, `Input`, `Select`.
- **Used by**: `src/app/(platform)/ops-desk/clients/clients-table.tsx`, `src/app/(platform)/ops-desk/invoices/page.tsx`.
- Key behavior notes: Client-side component. Takes `columns` (Tanstack format) and `data`. Includes local state for sorting, filtering by `searchKey`, and pagination.

### `src/components/shared/kanban-board.tsx`
- **Purpose**: Generic Kanban board component providing drag-and-drop functionality for items across columns.
- **Exports**: `KanbanBoard`, `KanbanColumn` interface, `KanbanItem` interface.
- **Dependencies**: `@hello-pangea/dnd`, `@/lib/utils`.
- **Used by**: `src/app/(platform)/ops-desk/projects/page.tsx`.
- Key behavior notes: Client-side component. Handles drag and drop logic. `onMove` callback is triggered when an item is moved between columns. Uses Tailwind for styling with dynamic color classes based on column data.

## 8. Authentication & Authorization

-   **Mechanism**: NextAuth.js (version 5.0.0-beta.30) is the primary authentication solution. It uses a JWT session strategy.
-   **Providers**:
    -   **Credentials Provider**: Implemented for internal users (`ADMIN`, `TEAM` roles). It validates email and bcrypt-hashed passwords against the `User` table in the database (`src/lib/auth.ts:16`).
    -   **Email Provider (Magic Link)**: Explicitly marked as `TODO` in `src/lib/auth.ts:58`. Not yet implemented.
-   **Session Storage**: JWTs (JSON Web Tokens) are used for stateless sessions. The JWT contains `id`, `role`, and `clientId` (`src/lib/auth.config.ts:11`). Sessions have a `maxAge` of 30 days, but can be shortened to 24 hours if "Remember Me" is not selected.
-   **User Roles**: Defined by the `UserRole` enum in `prisma/schema.prisma` (`ADMIN`, `TEAM`, `CLIENT`).
-   **Authorization Flow**:
    -   **Middleware**: `src/middleware.ts` is an Edge middleware that runs on every request.
        -   It redirects unauthenticated users to `/login`.
        -   For `(platform)` route group paths (e.g., `/war-room`, `/ops-desk`), it enforces `ADMIN` or `TEAM` roles.
        -   For `(portal)` route group paths, it enforces the `CLIENT` role.
        -   Public paths (e.g., `/login`, `/api/auth`, `/api/webhooks`) are excluded from these checks.
    -   **API Route Guards**: `src/lib/auth-guard.ts` provides server-side helpers for API routes:
        -   `withAuth(handler, { roles })`: Wraps an API route handler to check for authentication and specific `UserRole`s. Returns 401 (Unauthorized) or 403 (Forbidden) if checks fail (`src/lib/auth-guard.ts:20`).
        -   `getRequiredSession()`: Fetches the session and throws an `AuthError(401)` if no authenticated user (`src/lib/auth-guard.ts:47`).
        -   `getClientSession()`: Fetches the session, ensures the user is `CLIENT` role, and has a `clientId`. Throws `AuthError(403)` otherwise (`src/lib/auth-guard.ts:60`).
-   **Invitation Flow**: `POST /api/auth/invite` (`src/app/api/auth/invite/route.ts`) allows `ADMIN` users to invite new `ADMIN` or `TEAM` members. It creates a new `User` record with a temporary password (bcrypt hashed) and returns the plain-text temporary password in the response for a one-time display. Emailing the password-set link is a `TODO`.
-   **Client Data Isolation**: The PRD specifies that Client Portal queries MUST filter by the authenticated client's `client_id`. This is explicitly called out in `src/lib/auth-guard.ts`'s `getClientSession` function, which is designed to provide this `clientId`.
-   **Password Management**: `bcryptjs` is used for hashing and comparing passwords (`src/lib/auth.ts:24`). Temporary passwords are randomly generated using `crypto` in the invite flow (`src/app/api/auth/invite/route.ts:56`).

## 9. Configuration & Environment

**Environment Variables:**
The `src/lib/env.ts` file defines a Zod schema for environment variables and validates them at runtime. The `.env.example` file lists all potential variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Node.js environment: `development`, `production`, `test` |
| `DIRECT_DATABASE_URL` | No | `postgres://postgres:postgres@localhost:51214/template1?sslmode=disable` | Direct PostgreSQL connection string (preferred for performance) |
| `DATABASE_URL` | No | (falls back to `DIRECT_DATABASE_URL`'s default) | Primary PostgreSQL connection string |
| `R2_ACCOUNT_ID` | No | N/A | Cloudflare R2 Account ID |
| `R2_ACCESS_KEY_ID` | No | N/A | Cloudflare R2 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | No | N/A | Cloudflare R2 Secret Access Key |
| `R2_BUCKET_NAME` | No | N/A | Cloudflare R2 Bucket Name for assets |
| `NEXTAUTH_URL` | No | N/A | Base URL for NextAuth.js (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | No | N/A | Secret key for NextAuth.js session encryption (min 32 chars) |
| `SMTP_HOST` | No | N/A | SMTP server host for email sending |
| `SMTP_PORT` | No | N/A | SMTP server port for email sending |
| `SMTP_USER` | No | N/A | SMTP username for email sending |
| `SMTP_PASSWORD` | No | N/A | SMTP password for email sending |
| `SMTP_FROM` | No | N/A | Email address for "from" field in sent emails |
| `PAYMONGO_SECRET_KEY` | No | N/A | PayMongo API Secret Key |
| `PAYMONGO_PUBLIC_KEY` | No | N/A | PayMongo API Public Key |
| `PAYMONGO_WEBHOOK_SECRET` | No | N/A | PayMongo Webhook Secret for signature verification |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL of the application |
| `NEXT_PUBLIC_API_URL` | No | N/A | Public API URL of the application |
| `ENABLE_ANALYTICS` | No | `false` | Feature flag to enable/disable analytics |
| `ENABLE_EMAIL_NOTIFICATIONS` | No | `false` | Feature flag to enable/disable email notifications |

**Note**: Several `PAYMONGO_` variables are used and implicitly required by `src/lib/paymongo.ts` and `src/app/api/webhooks/paymongo/route.ts` if PayMongo functionality is to work, though `src/lib/env.ts` marks them as optional. `PAYMONGO_SECRET_KEY` is explicitly checked in `createPaymentLink`. `PAYMONGO_WEBHOOK_SECRET` is checked in `POST /api/webhooks/paymongo`.

**Setup Steps (from `SETUP.md` and `package.json`):**
1.  **Install dependencies**: `npm install` (or `yarn`, `pnpm`, `bun`).
2.  **Database Setup**:
    *   Ensure a PostgreSQL database is running and accessible via `DATABASE_URL` (or `DIRECT_DATABASE_URL`).
    *   Run Prisma migrations: `npm run db:migrate` (which runs `prisma migrate dev`).
    *   Seed the database with initial data (e.g., an admin user): `npm run db:seed`.
3.  **Environment Variables**: Create a `.env` file in the root directory and populate it with necessary values based on `.env.example`.
4.  **Development Server**: `npm run dev` to start the Next.js development server (typically on `http://localhost:3000`). `CLAUDE.md` suggests `npx next dev -p 3001` for local usage, implying default port `3000` might be in use.

**Build and Deployment:**
-   **Build Command**: `npm run build` (`next build`).
-   **Start Production Server**: `npm run start` (`next start`).
-   **Deployment Configuration**:
    *   `next.config.mjs` includes security headers (`Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`).
    *   The `README.md` suggests deployment on Vercel.
    *   `SETUP.md` refers to setting up database, NextAuth, Redis+BullMQ, Cloudflare R2, and `.env` as next steps, implying these are external services or setup requirements for a full deployment.

## 10. Conventions

-   **Naming Patterns**:
    *   **File Naming**: Kebab-case for page/route directories (`ops-desk`, `clients`, `new`). Kebab-case for some shared components (`data-table.tsx`, `kanban-board.tsx`).
    *   **Variable/Function Naming**: CamelCase for JavaScript/TypeScript variables and functions (e.g., `handleLogin`, `fetchClients`).
    *   **Component Naming**: PascalCase for React components (e.g., `DataTable`, `LoginPage`).
    *   **Prisma Models**: PascalCase for model names (e.g., `User`, `Client`). Snake_case for database table and column names (`@map("users")`, `@map("auth_method")`).
    *   **Enums**: PascalCase with uppercase values (e.g., `UserRole.ADMIN`, `ProjectStatus.BRIEFING`).
-   **File Organization**:
    *   **Next.js App Router**: Uses route groups (e.g., `(auth)`, `(platform)`, `(portal)`) for logical separation of routes based on authentication state and module.
    *   **API Routes**: Grouped by module under `src/app/api/`. Individual `[id]` dynamic routes are used for specific entity operations.
    *   **Components**: Divided into `src/components/ui/` (for Shadcn components) and `src/components/shared/` (for custom reusable components).
    *   **Utilities/Libs**: Grouped under `src/lib/` by function (e.g., `auth.ts`, `db.ts`, `format.ts`, `validations.ts`).
    *   **Prisma**: Schema and migrations are in the root `prisma/` directory.
-   **Import Patterns**:
    *   **Path Aliases**: Uses `@/` to refer to the `src/` directory (e.g., `import { signIn } from "@/lib/auth";`). This is configured in `tsconfig.json` and `components.json`.
    *   **Relative Imports**: Used for files within the same or closely related directories.
    *   **Barrel Files**: `src/components/shared/index.ts` is used to re-export shared components for cleaner imports.
-   **Shared Utilities**: The `src/lib/` directory is a central hub for shared logic including database access, authentication, activity logging, file storage, payment gateway integration, environment variable management, formatting, and validation.
-   **Code Style**:
    *   **Formatting**: Enforced by Prettier (`.prettierrc`) with `semi: true`, `trailingComma: "es5"`, `singleQuote: false`, `printWidth: 80`, `tabWidth: 2`. Integrates `prettier-plugin-tailwindcss`.
    *   **Linting**: Enforced by ESLint (`.eslintrc.json`) extending `next/core-web-vitals`, `next/typescript`, and `prettier`. Includes a rule to error on unused variables (`@typescript-eslint/no-unused-vars`).
    *   **TypeScript Strictness**: `strict: true` is enabled in `tsconfig.json`.

## 11. Integration Points

| Module A | Module B | Interface | Direction | Blast Radius | Notes |
|---|---|---|---|---|---|
| **UI Components (Client/Server)** | **API Routes** | HTTP (GET, POST, PATCH, DELETE) | Uni-directional (UI calls API) | High: UI depends on API shape; API changes break UI. | All client-side pages and server actions fetch/mutate data via Next.js API routes. Examples: `src/app/(platform)/ops-desk/clients/page.tsx` calls `GET /api/ops-desk/clients`. |
| **API Routes** | **`src/lib/auth-guard.ts`** | `withAuth`, `getRequiredSession` | Uni-directional (API routes use guard) | High: Auth changes impact all protected API routes. | All protected API routes are wrapped with `withAuth` to enforce authentication and authorization. |
| **API Routes** | **`src/lib/db.ts` (Prisma Client)** | Prisma ORM API calls (`db.model.findMany`, `db.model.create`, `db.model.update`, `db.model.delete`) | Uni-directional (API routes use DB) | High: DB schema changes impact all API routes. | API routes and server components directly interact with the PostgreSQL database via `db` instance. |
| **API Routes** | **`src/lib/activity.ts` (`logActivity`)** | Function call | Uni-directional (API routes log activity) | Medium: Changes to logging impact all mutation API routes. | All mutating API routes (`POST`, `PATCH`, `DELETE`) log activities for auditing and historical tracking. |
| **`src/lib/db.ts`** | **PostgreSQL** | Prisma connection string, SQL queries (generated by Prisma) | Bi-directional (connects, queries, receives data) | Critical: DB outage breaks entire app. | The application connects to a PostgreSQL database using Prisma. |
| **`src/app/api/auth/invite/route.ts`** | **`bcryptjs`** | `bcrypt.hash` | Uni-directional (invite route uses bcrypt) | Low: Password hashing logic for new users. | Used to hash temporary passwords for invited team members. |
| **`src/app/(auth)/login/actions.ts`** | **`bcryptjs`** | `bcrypt.compare` | Uni-directional (login action uses bcrypt) | Low: Password verification logic. | Used to compare user-provided password with stored hash during login. |
| **`src/lib/paymongo.ts`** | **PayMongo API** | HTTP (REST API) | Bi-directional (app calls API, receives response) | Medium: PayMongo API changes break payment link generation. | Used to create payment links for invoices. |
| **`src/app/api/ops-desk/invoices/[id]/send/route.ts`** | **`src/lib/paymongo.ts`** | `createPaymentLink` | Uni-directional (invoice send route uses PayMongo helper) | Medium: If PayMongo integration changes, this route breaks. | Generates a payment link and updates invoice with its details. |
| **`src/app/api/webhooks/paymongo/route.ts`** | **PayMongo Webhook** | HTTP (POST) | Uni-directional (webhook calls app) | High: Incorrect webhook processing can lead to data inconsistencies. | Receives payment confirmation webhooks from PayMongo and updates invoice status. |
| **`src/app/api/webhooks/paymongo/route.ts`** | **`src/lib/paymongo.ts`** | `verifyWebhookSignature` | Uni-directional (webhook route uses PayMongo helper) | Critical: Webhook security relies on this. | Verifies the authenticity of incoming PayMongo webhooks. |
| **`src/components/shared/file-uploader.tsx`** | **`src/lib/r2.ts`** | `getUploadUrl`, `getDownloadUrl`, `deleteFile` (TODO) | Uni-directional (uploader uses R2 helpers) | Medium: File storage changes impact file uploads/downloads. | Placeholder for actual R2 upload logic; currently creates local URLs. The `r2.ts` module is designed for this integration. |
| **`src/lib/env.ts`** | **Node.js `process.env`** | Direct access | Uni-directional (env module reads system env) | Critical: Missing env vars prevent app startup. | Centralized validation and access to environment variables. |
| **`src/app/(platform)/ops-desk/calendar/page.tsx`** | **`react-big-calendar`** | React component props, event handlers | Bi-directional (page uses component, component emits events) | Low: Calendar library-specific integration. | Displays project deadlines on a calendar. |
| **`src/app/(platform)/ops-desk/projects/page.tsx`** | **`@hello-pangea/dnd`** | React component props, event handlers (`onDragEnd`) | Bi-directional (page uses component, component emits events) | Medium: D&D library changes could break Kanban. | Implements drag-and-drop for the Kanban board. |
| **NextAuth.js** | **Nodemailer** | Configuration for EmailProvider | Uni-directional (NextAuth *can* use Nodemailer) | N/A (Currently a `TODO` in `src/lib/auth.ts`) | Planned for magic link authentication. |

## 12. Error Handling

-   **API Route `try/catch`**: All API routes use `try/catch` blocks to handle errors gracefully, logging the error and returning a `NextResponse.json` with an `error` message and appropriate HTTP status code (e.g., 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Internal Server Error).
    -   Example: `src/app/api/auth/invite/route.ts:80`
-   **Zod Validation Errors**: Input validation is performed using Zod schemas (`src/lib/validations.ts`). If validation fails, API routes return a 400 status code with specific error messages, often detailing the validation issues (`src/app/api/ops-desk/clients/route.ts:98`).
-   **Authentication/Authorization Errors**:
    -   `src/lib/auth-guard.ts` defines an `AuthError` class (`src/lib/auth-guard.ts:40`) and a `handleAuthError` helper (`src/lib/auth-guard.ts:54`) to standardize error responses (401, 403) from protected API routes.
    -   The `middleware.ts` handles redirects to `/login` for unauthenticated or unauthorized access to entire route groups.
-   **User-Facing Error Messages**:
    -   Client-side components display error messages received from API responses (e.g., login errors in `src/app/(auth)/login/page.tsx:28`).
    -   Form validation errors are shown inline using `react-hook-form` and Shadcn `FormMessage` components (e.g., `src/components/shared/client-form.tsx:109`).
    -   A simple client-side `toast` utility (`src/lib/toast.ts`) provides ephemeral notifications for success or error states (e.g., `toast.success`, `toast.error` in `src/app/(platform)/ops-desk/clients/new/page.tsx:42`).
    -   `src/app/(platform)/ops-desk/invoices/page.tsx` includes an `EmptyState` component with a retry button for fetching invoices if an error occurs (`src/app/(platform)/ops-desk/invoices/page.tsx:206`).
-   **Optimistic Updates with Reversion**: The Kanban board in `src/app/(platform)/ops-desk/projects/page.tsx` implements optimistic UI updates for project status changes. If the API call fails, the UI state is reverted to its previous state, and an error toast is shown (`src/app/(platform)/ops-desk/projects/page.tsx:179`).
-   **Environment Variable Validation**: `src/lib/env.ts` performs strict validation of environment variables at startup. If critical variables are missing or invalid, it throws a detailed error, preventing the application from running with misconfigured settings (`src/lib/env.ts:39`).
-   **"Not Found" Handling**: API routes return 404 for resources not found (e.g., `src/app/api/ops-desk/clients/[id]/route.ts:46`). UI pages also handle null data with specific "not found" messages or empty states (e.g., `src/app/(platform)/ops-desk/clients/[id]/page.tsx:84`).
-   **Graceful Degradation**: Where external services (like R2) are not configured, relevant `lib` functions (`src/lib/r2.ts:16`) throw errors, but the application attempts to continue functioning without those specific features. The `FileUploader` component has a `TODO` for actual R2 upload, currently providing a temporary URL.

## 13. Current State

-   **Working**:
    -   **Project Scaffolding**: Next.js 14 App Router setup, TypeScript strict mode, Tailwind CSS, Shadcn UI, ESLint, Prettier, path aliases. (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `.eslintrc.json`, `components.json`)
    -   **Prisma & Database**: PostgreSQL database integration with Prisma ORM. Complete Prisma schema for `User`, `Client`, `ContentAsset`, `ActivityLog`, `Project`, `Deliverable`, `Comment`, `Invoice`. Initial migration (`prisma/migrations/20260302082741_init/migration.sql`) and seeding with an admin user (`prisma/seed.ts`). (`prisma/schema.prisma`, `src/lib/db.ts`)
    -   **Authentication**: NextAuth.js configured with Credentials Provider for email/password login for `ADMIN` and `TEAM` users. JWT session strategy. Middleware (`src/middleware.ts`) for global route protection and role-based access. API route guards (`src/lib/auth-guard.ts`). Admin invitation flow (`/api/auth/invite`). (`src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(platform)/settings/team/page.tsx`)
    -   **Platform Layout**: Main application shell with a collapsible sidebar navigation for modules, top bar with user menu. (`src/app/(platform)/layout.tsx`)
    -   **Ops Desk Module**:
        -   **Client Management**: Full CRUD API for clients (`/api/ops-desk/clients`, `/api/ops-desk/clients/[id]`). List (`/ops-desk/clients`), create (`/ops-desk/clients/new`), and detail (`/ops-desk/clients/[id]`) pages. Client detail page shows related projects and invoice summaries.
        -   **Project Management**: Full CRUD API for projects and deliverables (`/api/ops-desk/projects`, `/api/ops-desk/deliverables`, `/api/ops-desk/comments`). Project Kanban board (`/ops-desk/projects`) with drag-and-drop status updates (`/api/ops-desk/projects/[id]/status`). Project detail page (`/ops-desk/projects/[id]`) with brief, deliverables checklist, comments thread, and file uploads (placeholder). Create new project page (`/ops-desk/projects/new`).
        -   **Invoicing**: Full CRUD API for invoices (`/api/ops-desk/invoices`, `/api/ops-desk/invoices/[id]`). List (`/ops-desk/invoices`), create (`/ops-desk/invoices/new`), and detail (`/ops-desk/invoices/[id]`) pages. Integration with PayMongo for generating payment links (`/api/ops-desk/invoices/[id]/send`). PayMongo webhook handler (`/api/webhooks/paymongo`) for processing payments.
        -   **Team Management**: API to list team members (`/api/ops-desk/team`) and fetch/update individual member details (`/api/ops-desk/team/[id]`). Team list page (`/ops-desk/team`) and member detail page (`/ops-desk/team/[id]`).
        -   **Dashboard**: Ops Desk dashboard (`/ops-desk`) showing MRR, active projects, overdue invoices, team utilization, projects by stage, and upcoming deadlines.
        -   **Calendar View**: Project calendar (`/ops-desk/calendar`) displaying project deadlines using `react-big-calendar`.
    -   **Shared UI Components**: `DataTable`, `StatusBadge`, `MetricCard`, `EmptyState`, `ConfirmDialog`, `ActivityFeed`, `CommentThread`, `FileUploader`, `KanbanBoard`, `PageHeader`. (`src/components/shared/`)
    -   **Shared Utilities**: Activity logging (`src/lib/activity.ts`), R2 helpers (configured, but file-uploader uses placeholder), formatting (`src/lib/format.ts`), constants (`src/lib/constants.ts`), validation schemas (`src/lib/validations.ts`), environment validation (`src/lib/env.ts`), PayMongo client (`src/lib/paymongo.ts`).

-   **Stubbed, Partially Built, or Behind Feature Flags**:
    -   **War Room**: `/war-room` page is a placeholder ("Coming in V7"). (`src/app/(platform)/war-room/page.tsx`)
    -   **Lead Engine, Content Engine, Proposals, Analytics Modules**: Exist as sidebar links with "Coming Soon" badges in the platform layout, but their routes and APIs are not implemented beyond their listing in `src/lib/constants.ts` enums.
    -   **Client Portal**: `/portal` page is a placeholder ("Coming in V4"). The `(portal)` route group layout exists. (`src/app/(portal)/page.tsx`)
    -   **Website**: `(website)` route group is a placeholder (empty `.gitkeep`).
    -   **Magic Link Authentication**: `TODO` in `src/lib/auth.ts`.
    -   **R2 File Uploads**: `src/components/shared/file-uploader.tsx` has a `TODO` for actual R2 upload logic, currently using temporary `URL.createObjectURL` for previews. The `src/lib/r2.ts` module is implemented for R2 interaction, but not fully integrated into the UI upload flow yet.
    -   **Client Portal Messaging**: `src/lib/constants.ts` includes `CommentEntityType.CLIENT_MESSAGE` and the PRD's "Gap Patch: Client Portal Messaging" suggests a dedicated `messages` table (Option B) or reusing `comments` (Option A). The current schema reuses `comments`.
    -   **Stripe Integration**: The provided PRD mentions Stripe in some sections, but the code implements PayMongo. The `package.json` includes `paymongo-node`, but also `paymongo-node`. The `src/app/api/webhooks/paymongo` route is implemented, and `src/app/(platform)/ops-desk/invoices/[id]/send` uses `createPaymentLink` from `src/lib/paymongo.ts`. There is no actual Stripe implementation in the current code, but PayMongo is fully active.
    -   **Notifications**: The PRD outlines a "Notification system" in Phase 11, but no code for this exists yet beyond the simple `src/lib/toast.ts`.
    -   **Team Capacity Management**: `User` model has `capacity` field (`prisma/schema.prisma:50`) and `src/app/api/ops-desk/team/[id]/route.ts` can update it, and `src/app/(platform)/ops-desk/team/page.tsx` displays it. However, the `Project` model does not have a field to link to `User.capacity` for workload calculation, and the `p5-dashboard` uses `assigned projects / capacity` as a calculation for "Team Utilization", implying `User.capacity` likely refers to project capacity, not hours.
    -   **Client Edit**: The "Edit" button on `src/app/(platform)/ops-desk/clients/[id]/page.tsx` is not yet implemented to open an edit modal/page.
    -   **Invoice Edit**: The "Edit" button on `src/app/(platform)/ops-desk/invoices/[id]/page.tsx` is not implemented to open an edit modal/page.
    -   **Activity Feed for Client Detail**: `src/app/(platform)/ops-desk/clients/[id]/page.tsx` includes an `ActivityFeed` component but `fetchActivities` is a `TODO` and sets an empty array.

-   **TODOs**:
    -   `src/lib/auth.ts:58`: `// TODO: Add Nodemailer provider for magic link when email is configured`
    -   `src/app/(platform)/ops-desk/clients/[id]/page.tsx:70`: `// TODO: Implement activity fetching filtered by client` (currently returns empty array)
    -   `src/app/(platform)/ops-desk/clients/[id]/page.tsx:392`: `// TODO: Navigate to invoice creation` (for "New Invoice" button)
    -   `src/components/shared/file-uploader.tsx:206`: `// TODO: Implement actual R2 upload` (for `handleFileUpload`)

-   **Dead Code**:
    -   `nodemailer` is installed (`package.json`) but not referenced in the analyzed code. It's likely intended for the magic link `TODO`.
    -   `@auth/prisma-adapter` is installed (`package.json`) but not explicitly used in `src/lib/auth.ts` which is using the NextAuth v5 `NextAuth` import.
    -   `src/app/api/ops-desk/users/[id]/route.ts` is defined but does not appear to be directly referenced by any UI page or other API. `src/app/api/ops-desk/team/[id]/route.ts` serves the same purpose and is used by `src/app/(platform)/ops-desk/team/[id]/page.tsx`. This suggests `src/app/api/ops-desk/users/[id]/route.ts` might be dead or a duplicate.

## 14. Change History

| Date | Change | Author |
|---|---|---|
| 2026-03-03 | Initial scan — baseline established | as_built |

## 15. Security Notes

-   **Authentication**:
    -   NextAuth.js v5 with JWT session strategy is used (`src/lib/auth.config.ts`).
    -   Passwords are hashed using `bcryptjs` with a salt round of 10 (`prisma/seed.ts`, `src/app/(auth)/login/actions.ts`, `src/app/api/auth/invite/route.ts`, `src/lib/auth.ts`).
    -   **CRITICAL**: The `POST /api/auth/invite` endpoint (`src/app/api/auth/invite/route.ts`) generates a random temporary password for new team members and *returns it in the API response*. While the UI instructs to share it securely, this is a security concern as it exposes a plain-text password directly over the API, even if temporary. A more secure approach would be to send a password-reset link to the invited user's email (as noted in `src/lib/auth.ts` `TODO` and PRD).
-   **Authorization**:
    -   Role-Based Access Control (RBAC) is implemented via Next.js middleware (`src/middleware.ts`) for route groups (`(platform)`, `(portal)`) and `withAuth` wrappers for API routes (`src/lib/auth-guard.ts`).
    -   **Potential Vulnerability [UNCERTAIN]**: Several GET API routes for `activity`, `comments`, `deliverables`, `projects` (`src/app/api/ops-desk/activity/route.ts`, `src/app/api/ops-desk/comments/route.ts`, `src/app/api/ops-desk/deliverables/route.ts`, `src/app/api/ops-desk/projects/route.ts`) use `withAuth` but do not specify roles. This defaults to "any authenticated user." If a `CLIENT` user can access these endpoints without further `clientId` filtering, they could potentially view data for other clients. This needs explicit data isolation at the query level or more granular role checks for `CLIENT` access. The `getClientSession` helper in `src/lib/auth-guard.ts` exists to facilitate this, but its usage is not universally enforced for all client-related data access.
-   **Secrets Management**:
    -   Environment variables are used for sensitive keys like `DATABASE_URL`, `NEXTAUTH_SECRET`, `PAYMONGO_SECRET_KEY`, `R2_ACCESS_KEY_ID`, etc. (`.env.example`, `src/lib/env.ts`).
    -   `src/lib/env.ts` provides validation for these variables at startup.
-   **Data Storage**:
    -   PostgreSQL database. The `prisma/schema.prisma` defines fields that would store sensitive data (e.g., `User.email`, `User.passwordHash`, client details).
    -   Cloudflare R2 is used for file storage (`src/lib/r2.ts`). Presigned URLs with expiration are used for temporary upload/download access, which is a good security practice.
-   **Input Validation**: Zod schemas (`src/lib/validations.ts`) are used extensively for validating incoming API requests, mitigating common vulnerabilities like SQL injection (handled by Prisma) and ensuring data integrity.
-   **HTTP Security Headers**: `next.config.mjs` includes `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Content-Security-Policy`. This enhances browser-level security against various attacks like XSS, clickjacking, and data leakage.
-   **Webhook Security**: The PayMongo webhook handler (`src/app/api/webhooks/paymongo/route.ts`) includes signature verification using `src/lib/paymongo.ts:verifyWebhookSignature` to ensure the authenticity of incoming webhook payloads. `PAYMONGO_WEBHOOK_SECRET` is used for this verification.

## 16. Terminology

-   **NEXUS**: The codename for the overall unified platform project.
-   **App Router**: Next.js 14's new routing and data fetching paradigm.
-   **Monolith**: An architectural style where all modules of an application are combined into a single codebase and deployed as a single unit.
-   **Route Group**: A Next.js feature (e.g., `(platform)`, `(auth)`) that allows organizing routes without affecting the URL path.
-   **Ops Desk**: The module responsible for client and project management, invoicing, and team workload.
-   **War Room**: The platform's home screen, intended as a cross-module aggregation dashboard. (Currently a placeholder)
-   **Client Portal**: The client-facing module for review, approvals, and communication. (Currently a placeholder)
-   **Lead Engine**: Module for lead generation, outreach, and sales pipeline. (Currently a placeholder)
-   **Content Engine**: Module for AI content generation pipeline management. (Currently a placeholder)
-   **Proposals**: Module for proposal creation, tracking, e-acceptance, and auto-onboarding. (Currently a placeholder)
-   **Analytics Hub**: Module for content performance data, scoring, AI insights, and reports. (Currently a placeholder)
-   **R2**: Cloudflare R2, an S3-compatible object storage service used for file storage.
-   **PayMongo**: The payment gateway integrated into the platform for invoice payments.
-   **Prisma**: An ORM (Object-Relational Mapper) used for interacting with the PostgreSQL database in a type-safe manner.
-   **Shadcn UI**: A collection of reusable UI components based on Radix UI and Tailwind CSS.
-   **Zod**: A TypeScript-first schema declaration and validation library, used for API input validation.
-   **`UserRole`**: Enum defining user roles: `ADMIN`, `TEAM`, `CLIENT`.
-   **`ProjectStatus`**: Enum defining project workflow states: `BRIEFING`, `ASSET_PREP`, `IN_PRODUCTION`, `INTERNAL_REVIEW`, `CLIENT_REVIEW`, `REVISION`, `APPROVED`, `DELIVERED`.
-   **`InvoiceStatus`**: Enum defining invoice states: `DRAFT_I`, `SENT_I`, `PAID`, `OVERDUE`, `CANCELLED`.
-   **`HealthStatus`**: Enum defining client health states: `HEALTHY`, `AT_RISK`, `CHURNED`.
-   **`ActivityModule`**: Enum for the source module of an activity log entry: `LEAD_ENGINE`, `OPS_DESK`, `CONTENT_ENGINE`, `CLIENT_PORTAL`, `PROPOSALS`, `ANALYTICS`, `WEBSITE`, `SYSTEM`.
-   **`CommentEntityType`**: Enum for the type of entity a comment is attached to: `PROJECT`, `CONTENT_ASSET`, `PROPOSAL`, `BRAND_PROFILE`, `CLIENT_MESSAGE`.
-   **`DeliverableStatus`**: Enum defining deliverable states: `PENDING_D`, `IN_PROGRESS_D`, `DONE_D`.
-   **`ContentAssetType`**: Enum defining types of content assets: `SOCIAL_POST`, `BLOG`, `VIDEO`, etc.

---