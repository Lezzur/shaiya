import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { updatePipelineSchema } from '@/lib/validations';
import { UserRole, ActivityModule, GenerationJobStatus } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/pipelines/[id]
 * Get single pipeline by ID with job counts
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Pipeline ID is required' },
          { status: 400 }
        );
      }

      // Fetch pipeline with job counts
      const pipeline = await db.pipeline.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              generationJobs: true,
            },
          },
        },
      });

      if (!pipeline) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Pipeline not found' },
          { status: 404 }
        );
      }

      // Calculate job counts for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const jobsLast30Days = await db.generationJob.count({
        where: {
          pipelineId: id,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Structure response
      const response = {
        ...pipeline,
        jobCounts: {
          allTime: pipeline._count.generationJobs,
          last30Days: jobsLast30Days,
        },
      };

      return NextResponse.json({ data: response });
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch pipeline' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/content-engine/pipelines/[id]
 * Update pipeline fields including status
 * Protected: ADMIN, TEAM roles
 */
export const PATCH = withAuth(
  async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Pipeline ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();

      // Validate request body
      const validationResult = updatePipelineSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      // Check if pipeline exists
      const existing = await db.pipeline.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Pipeline not found' },
          { status: 404 }
        );
      }

      const data = validationResult.data;

      // Update pipeline
      const pipeline = await db.pipeline.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          webhookUrl: data.webhookUrl,
          config: data.config as object | undefined,
          status: data.status,
        },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'updated',
          entityType: 'pipeline',
          entityId: pipeline.id,
          metadata: { pipelineName: pipeline.name },
        });
      }

      return NextResponse.json({ data: pipeline });
    } catch (error) {
      console.error('Error updating pipeline:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to update pipeline' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * DELETE /api/content-engine/pipelines/[id]
 * Delete pipeline (blocks if active jobs exist)
 * Protected: ADMIN role only
 */
export const DELETE = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Pipeline ID is required' },
          { status: 400 }
        );
      }

      // Check if pipeline exists
      const existing = await db.pipeline.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Pipeline not found' },
          { status: 404 }
        );
      }

      // Check for active jobs (QUEUED or PROCESSING)
      const activeJobsCount = await db.generationJob.count({
        where: {
          pipelineId: id,
          status: {
            in: [GenerationJobStatus.QUEUED, GenerationJobStatus.PROCESSING],
          },
        },
      });

      if (activeJobsCount > 0) {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: `Cannot delete pipeline with ${activeJobsCount} active job(s). Please wait for jobs to complete or cancel them first.`,
          },
          { status: 409 }
        );
      }

      // Delete the pipeline
      await db.pipeline.delete({
        where: { id },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'deleted',
          entityType: 'pipeline',
          entityId: id,
          metadata: { pipelineName: existing.name },
        });
      }

      return NextResponse.json({ data: { id, deleted: true } });
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to delete pipeline' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
