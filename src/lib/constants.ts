import {
  ProjectStatus,
  InvoiceStatus,
  HealthStatus,
  ActivityModule,
  UserRole,
  ContentAssetType,
  InternalStatus,
  ClientStatus,
  DeliverableStatus,
  CommentEntityType,
} from '@/generated/prisma';

/**
 * Status maps and constants for UI display
 * Each status includes value, label, and color for consistent rendering
 */

// =============================================================================
// PROJECT STATUSES
// =============================================================================

export const PROJECT_STATUSES = [
  {
    value: ProjectStatus.BRIEFING,
    label: 'Briefing',
    color: 'gray',
    description: 'Gathering requirements',
  },
  {
    value: ProjectStatus.ASSET_PREP,
    label: 'Asset Prep',
    color: 'blue',
    description: 'Preparing assets',
  },
  {
    value: ProjectStatus.IN_PRODUCTION,
    label: 'In Production',
    color: 'purple',
    description: 'Actively working on deliverables',
  },
  {
    value: ProjectStatus.INTERNAL_REVIEW,
    label: 'Internal Review',
    color: 'yellow',
    description: 'QA review in progress',
  },
  {
    value: ProjectStatus.CLIENT_REVIEW,
    label: 'Client Review',
    color: 'orange',
    description: 'Awaiting client feedback',
  },
  {
    value: ProjectStatus.REVISION,
    label: 'Revision',
    color: 'red',
    description: 'Implementing revisions',
  },
  {
    value: ProjectStatus.APPROVED,
    label: 'Approved',
    color: 'green',
    description: 'Approved by client',
  },
  {
    value: ProjectStatus.DELIVERED,
    label: 'Delivered',
    color: 'green',
    description: 'Completed and delivered',
  },
] as const;

// =============================================================================
// INVOICE STATUSES
// =============================================================================

export const INVOICE_STATUSES = [
  {
    value: InvoiceStatus.DRAFT_I,
    label: 'Draft',
    color: 'gray',
    description: 'Not yet sent',
  },
  {
    value: InvoiceStatus.SENT_I,
    label: 'Sent',
    color: 'blue',
    description: 'Sent to client',
  },
  {
    value: InvoiceStatus.PAID,
    label: 'Paid',
    color: 'green',
    description: 'Payment received',
  },
  {
    value: InvoiceStatus.OVERDUE,
    label: 'Overdue',
    color: 'red',
    description: 'Payment overdue',
  },
  {
    value: InvoiceStatus.CANCELLED,
    label: 'Cancelled',
    color: 'gray',
    description: 'Invoice cancelled',
  },
] as const;

// =============================================================================
// HEALTH STATUSES (CLIENT)
// =============================================================================

export const HEALTH_STATUSES = [
  {
    value: HealthStatus.HEALTHY,
    label: 'Healthy',
    color: 'green',
    description: 'Client relationship is good',
  },
  {
    value: HealthStatus.AT_RISK,
    label: 'At Risk',
    color: 'yellow',
    description: 'Potential issues detected',
  },
  {
    value: HealthStatus.CHURNED,
    label: 'Churned',
    color: 'red',
    description: 'Client has left',
  },
] as const;

// =============================================================================
// DELIVERABLE STATUSES
// =============================================================================

export const DELIVERABLE_STATUSES = [
  {
    value: DeliverableStatus.PENDING_D,
    label: 'Pending',
    color: 'gray',
    description: 'Not started',
  },
  {
    value: DeliverableStatus.IN_PROGRESS_D,
    label: 'In Progress',
    color: 'blue',
    description: 'Currently working',
  },
  {
    value: DeliverableStatus.DONE_D,
    label: 'Done',
    color: 'green',
    description: 'Completed',
  },
] as const;

// =============================================================================
// CONTENT ASSET - INTERNAL STATUSES
// =============================================================================

export const INTERNAL_STATUSES = [
  {
    value: InternalStatus.DRAFT,
    label: 'Draft',
    color: 'gray',
    description: 'Work in progress',
  },
  {
    value: InternalStatus.QA_PASSED,
    label: 'QA Passed',
    color: 'blue',
    description: 'Internal QA approved',
  },
  {
    value: InternalStatus.SENT_TO_CLIENT,
    label: 'Sent to Client',
    color: 'green',
    description: 'Delivered to client',
  },
] as const;

// =============================================================================
// CONTENT ASSET - CLIENT STATUSES
// =============================================================================

export const CLIENT_STATUSES = [
  {
    value: ClientStatus.PENDING,
    label: 'Pending',
    color: 'gray',
    description: 'Awaiting review',
  },
  {
    value: ClientStatus.APPROVED,
    label: 'Approved',
    color: 'green',
    description: 'Client approved',
  },
  {
    value: ClientStatus.REVISION_REQUESTED,
    label: 'Revision Requested',
    color: 'orange',
    description: 'Changes requested',
  },
  {
    value: ClientStatus.DONE,
    label: 'Done',
    color: 'green',
    description: 'Finalized',
  },
] as const;

// =============================================================================
// CONTENT ASSET TYPES
// =============================================================================

export const CONTENT_ASSET_TYPES = [
  {
    value: ContentAssetType.SOCIAL_POST,
    label: 'Social Post',
    icon: 'MessageSquare',
  },
  { value: ContentAssetType.BLOG, label: 'Blog', icon: 'FileText' },
  { value: ContentAssetType.VIDEO, label: 'Video', icon: 'Video' },
  { value: ContentAssetType.ILLUSTRATION, label: 'Illustration', icon: 'Image' },
  { value: ContentAssetType.CAROUSEL, label: 'Carousel', icon: 'Images' },
  { value: ContentAssetType.STORY, label: 'Story', icon: 'Smartphone' },
  { value: ContentAssetType.REEL, label: 'Reel', icon: 'Film' },
  { value: ContentAssetType.OTHER, label: 'Other', icon: 'File' },
] as const;

// =============================================================================
// USER ROLES
// =============================================================================

export const USER_ROLES = [
  {
    value: UserRole.ADMIN,
    label: 'Admin',
    description: 'Full system access',
  },
  {
    value: UserRole.TEAM,
    label: 'Team',
    description: 'Internal team member',
  },
  {
    value: UserRole.CLIENT,
    label: 'Client',
    description: 'Client portal access',
  },
] as const;

// =============================================================================
// ACTIVITY MODULES
// =============================================================================

export const MODULE_LABELS: Record<ActivityModule, string> = {
  [ActivityModule.LEAD_ENGINE]: 'Lead Engine',
  [ActivityModule.OPS_DESK]: 'Ops Desk',
  [ActivityModule.CONTENT_ENGINE]: 'Content Engine',
  [ActivityModule.CLIENT_PORTAL]: 'Client Portal',
  [ActivityModule.PROPOSALS]: 'Proposals',
  [ActivityModule.ANALYTICS]: 'Analytics',
  [ActivityModule.WEBSITE]: 'Website',
  [ActivityModule.SYSTEM]: 'System',
};

// =============================================================================
// COMMENT ENTITY TYPES
// =============================================================================

export const COMMENT_ENTITY_TYPES = [
  { value: CommentEntityType.PROJECT, label: 'Project' },
  { value: CommentEntityType.CONTENT_ASSET, label: 'Content Asset' },
  { value: CommentEntityType.PROPOSAL, label: 'Proposal' },
  { value: CommentEntityType.BRAND_PROFILE, label: 'Brand Profile' },
  { value: CommentEntityType.CLIENT_MESSAGE, label: 'Client Message' },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get status configuration by value
 */
export function getProjectStatus(status: ProjectStatus) {
  return PROJECT_STATUSES.find((s) => s.value === status);
}

export function getInvoiceStatus(status: InvoiceStatus) {
  return INVOICE_STATUSES.find((s) => s.value === status);
}

export function getHealthStatus(status: HealthStatus) {
  return HEALTH_STATUSES.find((s) => s.value === status);
}

export function getDeliverableStatus(status: DeliverableStatus) {
  return DELIVERABLE_STATUSES.find((s) => s.value === status);
}

export function getInternalStatus(status: InternalStatus) {
  return INTERNAL_STATUSES.find((s) => s.value === status);
}

export function getClientStatus(status: ClientStatus) {
  return CLIENT_STATUSES.find((s) => s.value === status);
}

export function getContentAssetType(type: ContentAssetType) {
  return CONTENT_ASSET_TYPES.find((t) => t.value === type);
}

export function getUserRole(role: UserRole) {
  return USER_ROLES.find((r) => r.value === role);
}

/**
 * Get module display name
 */
export function getModuleLabel(module: ActivityModule): string {
  return MODULE_LABELS[module];
}
