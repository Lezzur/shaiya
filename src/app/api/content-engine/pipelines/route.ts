import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { createPipelineSchema } from '@/lib/validations';
import { UserRole, ActivityModule, PipelineStatus } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/pipelines
 * List all pipelines with optional status filter
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const statusParam = searchParams.get('status');

      // Build where clause
      const where: { status?: PipelineStatus } = {};

      if (statusParam) {
        // Validate status enum
        if (Object.values(PipelineStatus).includes(statusParam as PipelineStatus)) {
          where.status = statusParam as PipelineStatus;
        }
      }

      // Fetch pipelines
      const pipelines = await db.pipeline.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              generationJobs: true,
            },
          },
        },
      });

      return NextResponse.json({ data: pipelines });
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch pipelines' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * POST /api/content-engine/pipelines
 * Create a new pipeline
 * Protected: ADMIN role only
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const validationResult = createPipelineSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      const data = validationResult.data;

      // Create the pipeline
      const pipeline = await db.pipeline.create({
        data: {
          name: data.name,
          type: data.type,
          webhookUrl: data.webhookUrl,
          config: data.config,
          status: data.status,
        },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'created',
          entityType: 'pipeline',
          entityId: pipeline.id,
          metadata: { pipelineName: pipeline.name, pipelineType: pipeline.type },
        });
      }

      return NextResponse.json({ data: pipeline }, { status: 201 });
    } catch (error) {
      console.error('Error creating pipeline:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to create pipeline' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
