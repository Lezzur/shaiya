import { db } from './db';
import { ActivityModule, Prisma } from '@/generated/prisma';

/**
 * Activity logging helper
 * Wraps Prisma activity log creation with proper types
 */

interface LogActivityParams {
  actorId: string;
  module: ActivityModule;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity to the activity_log table
 *
 * @example
 * await logActivity({
 *   actorId: user.id,
 *   module: 'OPS_DESK',
 *   action: 'created',
 *   entityType: 'project',
 *   entityId: project.id,
 *   metadata: { projectTitle: project.title }
 * });
 */
export async function logActivity({
  actorId,
  module,
  action,
  entityType,
  entityId,
  metadata,
}: LogActivityParams) {
  return db.activityLog.create({
    data: {
      actorId,
      module,
      action,
      entityType,
      entityId,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

/**
 * Batch log multiple activities (for performance)
 * Useful when you need to log multiple related actions at once
 */
export async function logActivities(activities: LogActivityParams[]) {
  return db.activityLog.createMany({
    data: activities.map((activity) => ({
      actorId: activity.actorId,
      module: activity.module,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      metadata: activity.metadata ? (activity.metadata as Prisma.InputJsonValue) : undefined,
    })),
  });
}

/**
 * Get recent activity for an entity
 */
export async function getEntityActivity(
  entityType: string,
  entityId: string,
  limit = 50
) {
  return db.activityLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

/**
 * Get recent activity for a specific module
 */
export async function getModuleActivity(
  module: ActivityModule,
  limit = 100
) {
  return db.activityLog.findMany({
    where: {
      module,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}
