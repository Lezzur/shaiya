import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession, handleAuthError, AuthError } from '@/lib/auth-guard';
import { updateProjectSchema } from '@/lib/validations';
import { logActivity } from '@/lib/activity';
import { ActivityModule } from '@/generated/prisma';

interface RouteContext {
  params?: Promise<{ id: string }>;
}

/**
 * GET /api/ops-desk/projects/[id]
 * Get a single project with all related data
 */
export const GET = withAuth(async (req: NextRequest, context?: RouteContext) => {
  try {
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        deliverables: {
          orderBy: {
            order: 'asc',
          },
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
        },
        contentAssets: {
          select: {
            id: true,
            type: true,
            fileUrl: true,
            thumbnailUrl: true,
            internalStatus: true,
            clientStatus: true,
            version: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch comments separately (as they use a polymorphic entityType/entityId pattern)
    const comments = await db.comment.findMany({
      where: {
        entityType: 'PROJECT',
        entityId: id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      ...project,
      comments,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/ops-desk/projects/[id]
 * Update a project (including status changes for Kanban drag)
 */
export const PATCH = withAuth(async (req: NextRequest, context?: RouteContext) => {
  try {
    const session = await getRequiredSession();
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate request body
    const validationResult = updateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Fetch existing project for comparison
    const existingProject = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        title: true,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify assignedTo user exists if provided
    if (data.assignedToId) {
      const assignedUser = await db.user.findUnique({
        where: { id: data.assignedToId },
      });
      if (!assignedUser) {
        return NextResponse.json(
          { error: 'Assigned user not found' },
          { status: 404 }
        );
      }
    }

    // Update project
    const project = await db.project.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Build metadata for activity log
    const metadata: Record<string, unknown> = {
      projectTitle: project.title,
    };

    // Track status change if applicable
    if (data.status && data.status !== existingProject.status) {
      metadata.oldStatus = existingProject.status;
      metadata.newStatus = data.status;
    }

    // Log activity
    await logActivity({
      actorId: session.user.id,
      module: ActivityModule.OPS_DESK,
      action: 'updated',
      entityType: 'project',
      entityId: project.id,
      metadata,
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/ops-desk/projects/[id]
 * Delete a project (cascades to deliverables)
 */
export const DELETE = withAuth(async (req: NextRequest, context?: RouteContext) => {
  try {
    const session = await getRequiredSession();
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch project before deletion for activity log
    const project = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        clientId: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project (cascades to deliverables via Prisma schema)
    await db.project.delete({
      where: { id },
    });

    // Log activity
    await logActivity({
      actorId: session.user.id,
      module: ActivityModule.OPS_DESK,
      action: 'deleted',
      entityType: 'project',
      entityId: id,
      metadata: {
        projectTitle: project.title,
        clientName: project.client.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
});
