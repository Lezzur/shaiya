import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession, handleAuthError, AuthError } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { ActivityModule, DeliverableStatus } from '@/generated/prisma';

// Validation schema for creating a deliverable (order is auto-set)
const createDeliverableSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, 'Deliverable title is required'),
  status: z.nativeEnum(DeliverableStatus).default(DeliverableStatus.PENDING_D),
  contentAssetId: z.string().uuid().optional(),
});

/**
 * GET /api/ops-desk/deliverables
 * List deliverables by projectId
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const deliverables = await db.deliverable.findMany({
      where: { projectId },
      include: {
        contentAsset: {
          select: {
            id: true,
            type: true,
            fileUrl: true,
            thumbnailUrl: true,
            internalStatus: true,
            clientStatus: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json({ data: deliverables });
  } catch (error) {
    console.error('Error fetching deliverables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliverables' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/ops-desk/deliverables
 * Create a new deliverable for a project
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const session = await getRequiredSession();
    const body = await req.json();

    // Validate request body
    const validationResult = createDeliverableSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: data.projectId },
      select: { id: true, title: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
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

    // Get max order for the project
    const maxOrderResult = await db.deliverable.aggregate({
      where: { projectId: data.projectId },
      _max: { order: true },
    });
    const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

    // Create deliverable
    const deliverable = await db.deliverable.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        status: data.status,
        order: nextOrder,
        contentAssetId: data.contentAssetId,
      },
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

    // Log activity
    await logActivity({
      actorId: session.user.id,
      module: ActivityModule.OPS_DESK,
      action: 'created',
      entityType: 'deliverable',
      entityId: deliverable.id,
      metadata: {
        deliverableTitle: deliverable.title,
        projectId: data.projectId,
        projectTitle: project.title,
      },
    });

    return NextResponse.json(deliverable, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error creating deliverable:', error);
    return NextResponse.json(
      { error: 'Failed to create deliverable' },
      { status: 500 }
    );
  }
});
