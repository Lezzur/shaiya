import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession, handleAuthError, AuthError } from '@/lib/auth-guard';
import { createProjectSchema, paginationSchema, sortSchema } from '@/lib/validations';
import { logActivity } from '@/lib/activity';
import { ActivityModule, ProjectStatus } from '@/generated/prisma';

/**
 * GET /api/ops-desk/projects
 * List projects with filtering, pagination, and sorting
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    // Parse pagination
    const paginationResult = paginationSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    const { page, limit } = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 20 };

    // Parse sorting
    const sortResult = sortSchema.safeParse({
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });
    const { sortBy, sortOrder } = sortResult.success
      ? sortResult.data
      : { sortBy: 'createdAt', sortOrder: 'desc' as const };

    // Parse filters
    const status = searchParams.get('status') as ProjectStatus | null;
    const clientId = searchParams.get('clientId');
    const assignedToId = searchParams.get('assignedToId');

    // Build where clause
    const where: {
      status?: ProjectStatus;
      clientId?: string;
      assignedToId?: string | null;
    } = {};

    if (status && Object.values(ProjectStatus).includes(status)) {
      where.status = status;
    }
    if (clientId) {
      where.clientId = clientId;
    }
    if (assignedToId) {
      where.assignedToId = assignedToId === 'null' ? null : assignedToId;
    }

    // Determine sort field
    const validSortFields = ['deadline', 'createdAt', 'updatedAt', 'title'];
    const orderByField = validSortFields.includes(sortBy || '')
      ? sortBy
      : 'createdAt';

    // Execute query with count
    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
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
        orderBy: {
          [orderByField!]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.project.count({ where }),
    ]);

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/ops-desk/projects
 * Create a new project
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const session = await getRequiredSession();
    const body = await req.json();

    // Validate request body
    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify client exists
    const client = await db.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
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

    // Create project
    const project = await db.project.create({
      data: {
        clientId: data.clientId,
        title: data.title,
        brief: data.brief,
        status: data.status,
        deadline: data.deadline,
        assignedToId: data.assignedToId,
        templateId: data.templateId,
        timeTrackedMinutes: data.timeTrackedMinutes,
      },
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

    // Log activity
    await logActivity({
      actorId: session.user.id,
      module: ActivityModule.OPS_DESK,
      action: 'created',
      entityType: 'project',
      entityId: project.id,
      metadata: {
        projectTitle: project.title,
        clientName: project.client.name,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
});
