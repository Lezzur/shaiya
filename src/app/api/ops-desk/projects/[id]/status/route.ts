import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession, handleAuthError, AuthError } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { ActivityModule, ProjectStatus } from '@/generated/prisma';

interface RouteContext {
  params?: Promise<Record<string, string>>;
}

// Validation schema for status update
const updateStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
});

/**
 * PATCH /api/ops-desk/projects/[id]/status
 * Dedicated status update endpoint for Kanban board
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
    const validationResult = updateStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status: newStatus } = validationResult.data;

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

    const oldStatus = existingProject.status;

    // Skip update if status hasn't changed
    if (oldStatus === newStatus) {
      return NextResponse.json({
        id: existingProject.id,
        status: newStatus,
        message: 'Status unchanged',
      });
    }

    // Update project status
    const project = await db.project.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    // Log activity with status transition
    await logActivity({
      actorId: session.user.id,
      module: ActivityModule.OPS_DESK,
      action: 'status_changed',
      entityType: 'project',
      entityId: project.id,
      metadata: {
        projectTitle: project.title,
        oldStatus,
        newStatus,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    );
  }
});
