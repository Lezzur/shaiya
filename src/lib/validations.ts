import { z } from 'zod';
import {
  UserRole,
  AuthMethod,
  HealthStatus,
  ProjectStatus,
  DeliverableStatus,
  InvoiceStatus,
  ContentAssetType,
  InternalStatus,
  ClientStatus,
  CommentEntityType,
  ActivityModule,
  PipelineStatus,
} from '@/generated/prisma';

/**
 * Zod validation schemas for API request validation
 * These schemas ensure type safety and data validation at runtime
 */

// =============================================================================
// SHARED / REUSABLE SCHEMAS
// =============================================================================

const uuidSchema = z.string().uuid();
const emailSchema = z.string().email();
const urlSchema = z.string().url();
const dateSchema = z.coerce.date();
const _positiveNumberSchema = z.number().positive();
const nonNegativeNumberSchema = z.number().min(0);

// =============================================================================
// USER SCHEMAS
// =============================================================================

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole),
  avatar: urlSchema.optional(),
  capacity: z.number().int().positive().optional(),
  skills: z.array(z.string()).optional(),
  authMethod: z.nativeEnum(AuthMethod),
  passwordHash: z.string().optional(),
  clientId: uuidSchema.optional(),
});

export const updateUserSchema = createUserSchema.partial();

// =============================================================================
// CLIENT SCHEMAS
// =============================================================================

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  logo: urlSchema.optional(),
  industry: z.string().optional(),
  packageTier: z.string().optional(),
  monthlyValue: z.number().min(0).default(0),
  lifetimeValue: z.number().min(0).default(0),
  primaryContactId: uuidSchema.optional(),
  healthStatus: z.nativeEnum(HealthStatus).default(HealthStatus.HEALTHY),
  renewalDate: dateSchema.optional(),
  r2BucketPath: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const createProjectSchema = z.object({
  clientId: uuidSchema,
  title: z.string().min(1, 'Project title is required'),
  brief: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.BRIEFING),
  deadline: dateSchema.optional(),
  assignedToId: uuidSchema.optional(),
  templateId: uuidSchema.optional(),
  timeTrackedMinutes: nonNegativeNumberSchema.default(0),
});

export const updateProjectSchema = createProjectSchema.partial().omit({
  clientId: true,
});

// =============================================================================
// DELIVERABLE SCHEMAS
// =============================================================================

export const createDeliverableSchema = z.object({
  projectId: uuidSchema,
  title: z.string().min(1, 'Deliverable title is required'),
  status: z.nativeEnum(DeliverableStatus).default(DeliverableStatus.PENDING_D),
  order: z.number().int().min(0),
  contentAssetId: uuidSchema.optional(),
});

export const updateDeliverableSchema = createDeliverableSchema.partial().omit({
  projectId: true,
});

// Bulk update deliverable order
export const updateDeliverableOrderSchema = z.object({
  deliverables: z.array(
    z.object({
      id: uuidSchema,
      order: z.number().int().min(0),
    })
  ),
});

// =============================================================================
// INVOICE SCHEMAS
// =============================================================================

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  clientId: uuidSchema,
  projectId: uuidSchema.optional(),
  amount: z.number().min(0),
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.DRAFT_I),
  dueDate: dateSchema,
  paidAt: dateSchema.optional(),
  paymongoPaymentLinkId: z.string().optional(),
  paymongoPaymentLinkUrl: urlSchema.optional(),
  paymongoPaymentId: z.string().optional(),
  lineItems: z.array(lineItemSchema),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().omit({
  clientId: true,
});

// Invoice status update (for payment webhooks)
export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  paidAt: dateSchema.optional(),
  paymongoPaymentId: z.string().optional(),
});

// =============================================================================
// CONTENT ASSET SCHEMAS
// =============================================================================

export const createContentAssetSchema = z.object({
  clientId: uuidSchema,
  projectId: uuidSchema.optional(),
  generationJobId: uuidSchema.optional(),
  type: z.nativeEnum(ContentAssetType),
  fileUrl: urlSchema,
  thumbnailUrl: urlSchema.optional(),
  internalStatus: z.nativeEnum(InternalStatus).default(InternalStatus.DRAFT),
  clientStatus: z.nativeEnum(ClientStatus).default(ClientStatus.PENDING),
  version: z.number().int().positive().default(1),
  parentAssetId: uuidSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateContentAssetSchema = createContentAssetSchema.partial().omit({
  clientId: true,
  version: true,
});

// Create manual content asset (without generationJobId)
export const createManualContentAssetSchema = createContentAssetSchema.omit({
  generationJobId: true,
});

// Update internal status (team only)
export const updateInternalStatusSchema = z.object({
  internalStatus: z.nativeEnum(InternalStatus),
});

// Update client status (client or team)
export const updateClientStatusSchema = z.object({
  clientStatus: z.nativeEnum(ClientStatus),
});

// Create new version of asset
export const createAssetVersionSchema = z.object({
  parentAssetId: uuidSchema,
  fileUrl: urlSchema,
  thumbnailUrl: urlSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// COMMENT SCHEMAS
// =============================================================================

export const createCommentSchema = z.object({
  entityType: z.nativeEnum(CommentEntityType),
  entityId: uuidSchema,
  authorId: uuidSchema,
  body: z.string().min(1, 'Comment body is required'),
  parentId: uuidSchema.optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
});

// =============================================================================
// ACTIVITY LOG SCHEMAS
// =============================================================================

export const createActivityLogSchema = z.object({
  actorId: uuidSchema,
  module: z.nativeEnum(ActivityModule),
  action: z.string().min(1, 'Action is required'),
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: uuidSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// FILE UPLOAD SCHEMAS
// =============================================================================

export const fileUploadRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.string().min(1, 'Content type is required'),
  fileSize: z.number().positive(),
  clientId: uuidSchema,
  projectId: uuidSchema.optional(),
  assetId: uuidSchema.optional(),
});

export const fileUploadResponseSchema = z.object({
  uploadUrl: urlSchema,
  fileKey: z.string(),
  expiresIn: z.number(),
});

// =============================================================================
// PAGINATION SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const filterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  clientId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  assignedToId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

// =============================================================================
// PIPELINE SCHEMAS
// =============================================================================

export const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(200, 'Pipeline name must be 200 characters or less'),
  type: z.string().min(1, 'Pipeline type is required'),
  webhookUrl: z.string().url('Webhook URL must be a valid URL').refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'Webhook URL must start with http:// or https://'
  ),
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.nativeEnum(PipelineStatus).default(PipelineStatus.ACTIVE),
});

export const updatePipelineSchema = createPipelineSchema.partial();

export const triggerPipelineSchema = z.object({
  clientId: uuidSchema,
  brandProfileId: uuidSchema,
  params: z.record(z.string(), z.unknown()),
});

// =============================================================================
// BRAND PROFILE SCHEMAS
// =============================================================================

export const createBrandProfileSchema = z.object({
  clientId: uuidSchema,
  colors: z.record(z.string(), z.unknown()).optional(),
  typography: z.record(z.string(), z.unknown()).optional(),
  toneOfVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  exampleUrls: z.array(z.string().url()).optional(),
  styleRefUrls: z.array(z.string().url()).optional(),
  characterSheets: z.record(z.string(), z.unknown()).optional(),
});

export const updateBrandProfileSchema = createBrandProfileSchema.partial().omit({
  clientId: true,
});

// =============================================================================
// TYPE EXPORTS (inferred from schemas)
// =============================================================================

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type CreateDeliverable = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverable = z.infer<typeof updateDeliverableSchema>;
export type CreateInvoice = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;
export type CreateContentAsset = z.infer<typeof createContentAssetSchema>;
export type UpdateContentAsset = z.infer<typeof updateContentAssetSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type UpdateComment = z.infer<typeof updateCommentSchema>;
export type FileUploadRequest = z.infer<typeof fileUploadRequestSchema>;
export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type CreatePipeline = z.infer<typeof createPipelineSchema>;
export type UpdatePipeline = z.infer<typeof updatePipelineSchema>;
export type TriggerPipeline = z.infer<typeof triggerPipelineSchema>;
export type CreateBrandProfile = z.infer<typeof createBrandProfileSchema>;
export type UpdateBrandProfile = z.infer<typeof updateBrandProfileSchema>;
