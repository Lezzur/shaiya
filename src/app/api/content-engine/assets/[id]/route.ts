import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { updateContentAssetSchema } from '@/lib/validations';
import {
  UserRole,
  ActivityModule,
  InternalStatus,
  Prisma
} from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * Valid internal status transitions
 * DRAFT → QA_PASSED → SENT_TO_CLIENT
 * Cannot go backwards
 */
const VALID_STATUS_TRANSITIONS: Record<InternalStatus, InternalStatus[]> = {
  [InternalStatus.DRAFT]: [InternalStatus.QA_PASSED],
  [InternalStatus.QA_PASSED]: [InternalStatus.SENT_TO_CLIENT],
  [InternalStatus.SENT_TO_CLIENT]: [], // Terminal state
};

/**
 * GET /api/content-engine/assets/[id]
 * Get single content asset by ID with related data
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Asset ID is required' },
          { status: 400 }
        );
      }

      // Fetch asset with related data
      const asset = await db.contentAsset.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          generationJob: {
            select: {
              id: true,
              status: true,
              completedAt: true,
            },
          },
        },
      });

      if (!asset) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Content asset not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: asset });
    } catch (error) {
      console.error('Error fetching content asset:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch content asset' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/content-engine/assets/[id]
 * Update content asset fields (especially internalStatus)
 * Protected: ADMIN, TEAM roles
 *
 * Validates status transitions:
 * - DRAFT → QA_PASSED
 * - QA_PASSED → SENT_TO_CLIENT
 * - Cannot go backwards
 */
export const PATCH = withAuth(
  async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Asset ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();

      // Validate request body
      const validationResult = updateContentAssetSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      // Check if asset exists
      const existing = await db.contentAsset.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Content asset not found' },
          { status: 404 }
        );
      }

      const data = validationResult.data;

      // Validate internalStatus transition if status is being updated
      if (data.internalStatus && data.internalStatus !== existing.internalStatus) {
        const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.internalStatus];
        if (!allowedTransitions.includes(data.internalStatus)) {
          return NextResponse.json(
            {
              error: 'ValidationError',
              message: `Invalid status transition: cannot move from ${existing.internalStatus} to ${data.internalStatus}. Valid transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'}`,
            },
            { status: 422 }
          );
        }
      }

      // Update asset
      const asset = await db.contentAsset.update({
        where: { id },
        data: {
          projectId: data.projectId,
          type: data.type,
          fileUrl: data.fileUrl,
          thumbnailUrl: data.thumbnailUrl,
          internalStatus: data.internalStatus,
          clientStatus: data.clientStatus,
          parentAssetId: data.parentAssetId,
          metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      });

      // Log activity if status changed
      const session = await auth();
      if (session?.user?.id && data.internalStatus && data.internalStatus !== existing.internalStatus) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'status_updated',
          entityType: 'content_asset',
          entityId: asset.id,
          metadata: {
            from: existing.internalStatus,
            to: data.internalStatus,
          },
        });
      }

      return NextResponse.json({ data: asset });
    } catch (error) {
      console.error('Error updating content asset:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to update content asset' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * DELETE /api/content-engine/assets/[id]
 * Delete content asset
 * Protected: ADMIN role only
 *
 * If asset is linked to deliverables, returns 200 with warnings field
 * (delete goes through but caller is informed)
 */
export const DELETE = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Asset ID is required' },
          { status: 400 }
        );
      }

      // Check if asset exists
      const existing = await db.contentAsset.findUnique({
        where: { id },
        include: {
          deliverables: {
            select: {
              id: true,
              title: true,
              projectId: true,
            },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Content asset not found' },
          { status: 404 }
        );
      }

      // Track warnings
      const warnings: string[] = [];

      // Check if asset is linked to deliverables
      if (existing.deliverables.length > 0) {
        warnings.push(
          `Asset is linked to ${existing.deliverables.length} deliverable(s): ${existing.deliverables.map((d) => d.title).join(', ')}`
        );
      }

      // Delete the asset (CASCADE will handle relations)
      await db.contentAsset.delete({
        where: { id },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'deleted',
          entityType: 'content_asset',
          entityId: id,
          metadata: {
            hadDeliverables: existing.deliverables.length > 0,
            deliverableCount: existing.deliverables.length,
          },
        });
      }

      // Return success with warnings if any
      return NextResponse.json({
        message: 'Content asset deleted successfully',
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      console.error('Error deleting content asset:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to delete content asset' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
