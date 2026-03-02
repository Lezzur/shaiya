import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession, handleAuthError, AuthError } from '@/lib/auth-guard';
import { updateDeliverableSchema } from '@/lib/validations';
import { logActivity } from '@/lib/activity';
import { ActivityModule } from '@/generated/prisma';

interface RouteContext {
  params?: Promise<{ id: string }>;
}

/**
 * PATCH /api/ops-desk/deliverables/[id]
 * Update a deliverable (title, status, order)
 */
export const PATCH = withAuth(async (req: NextRequest, context?: RouteContext) => {
  try {
    const session = await getRequiredSession();
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Deliverable ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate request body
    const validationResult = updateDeliverableSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Fetch existing deliverable
    const existingDeliverable = await db.deliverable.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!existingDeliverable) {
      return NextResponse.json(
        { error: 'Deliverable not found' },
        { status: 404 }
      );
    }

    // Verify content asset exists if provided
    if (data.contentAssetId) {
      const contentAsset = await db.contentAsset.findUnique({
        where: { id: data.contentAssetId },
        select: { id: true },
      });
      if (!contentAsset) {
        return NextResponse.json(
          { error: 'Content asset not found' },
          { status: 404 }
        );
      }
    }

    // Update deliverable
    const deliverable = await db.deliverable.update({
      where: { id },
      data,
      include: {
        contentAsset: {
          select: {
            id: true,
            type: true,
            fileUrl: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    // Build metadata for activity log
    const metadata: Record<string, unknown> = {
      deliverableTitle: deliverable.title,
      projectId: existingDeliverable.project.id,
      projectTitle: existingDeliverable.project.title,
    };

    if (data.status && data.status !== existingDeliverable.status) {
      metadata.oldStatus = existingDeliverable.status;
      metadata.newStatus = data.status;
    }

    // Log activity
    await logActivity({
      actorId: session.user.id,
      module: ActivityModule.OPS_DESK,
      action: 'updated',
      entityType: 'deliverable',
      entityId: deliverable.id,
      metadata,
    });

    return NextResponse.json(deliverable);
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error updating deliverable:', error);
    return NextResponse.json(
      { error: 'Failed to update deliverable' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/ops-desk/deliverables/[id]
 * Delete a deliverable
 */
export const DELETE = withAuth(async (req: NextRequest, context?: RouteContext) => {
  try {
    const session = await getRequiredSession();
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Deliverable ID is required' },
        { status: 400 }
      );
    }

    // Fetch deliverable before deletion for activity log
    const deliverable = await db.deliverable.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json(
        { error: 'Deliverable not found' },
        { status: 404 }
      );
    }

    // Delete deliverable
    await db.deliverable.delete({
      where: { id },
    });

    // Log activity
    await logActivity({
      actorId: session.user.id,
      module: ActivityModule.OPS_DESK,
      action: 'deleted',
      entityType: 'deliverable',
      entityId: id,
      metadata: {
        deliverableTitle: deliverable.title,
        projectId: deliverable.project.id,
        projectTitle: deliverable.project.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error deleting deliverable:', error);
    return NextResponse.json(
      { error: 'Failed to delete deliverable' },
      { status: 500 }
    );
  }
});
