import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { UserRole, ActivityModule, GenerationJobStatus } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import { generationQueue } from '@/lib/queue';

/**
 * GET /api/content-engine/jobs/[id]
 * Get single generation job by ID with full details
 * Protected: ADMIN, TEAM roles
 *
 * Includes:
 * - Job details
 * - Client info
 * - Pipeline info
 * - Associated ContentAssets
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Job ID is required' },
          { status: 400 }
        );
      }

      // Fetch job with all related data
      const job = await db.generationJob.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
          pipeline: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
            },
          },
          brandProfile: {
            select: {
              id: true,
              colors: true,
              typography: true,
              toneOfVoice: true,
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
              metadata: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!job) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Generation job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: job });
    } catch (error) {
      console.error('Error fetching generation job:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch generation job' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/content-engine/jobs/[id]
 * Cancel a generation job
 * Protected: ADMIN, TEAM roles
 *
 * Requirements:
 * - Only allows cancellation if status is QUEUED
 * - Returns 409 if job is already PROCESSING
 * - Updates status to CANCELLED
 * - Attempts to cancel job in BullMQ (wrapped in try/catch)
 * - Logs activity: CONTENT_ENGINE, 'cancelled', 'generation_job'
 */
export const PATCH = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Job ID is required' },
          { status: 400 }
        );
      }

      // Check if job exists and get current status
      const existingJob = await db.generationJob.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              name: true,
            },
          },
          pipeline: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!existingJob) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Generation job not found' },
          { status: 404 }
        );
      }

      // Check if job is already processing
      if (existingJob.status === GenerationJobStatus.PROCESSING) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Job is already processing and cannot be cancelled' },
          { status: 409 }
        );
      }

      // Check if job can be cancelled (only QUEUED jobs)
      if (existingJob.status !== GenerationJobStatus.QUEUED) {
        return NextResponse.json(
          {
            error: 'BadRequest',
            message: `Job with status ${existingJob.status} cannot be cancelled. Only QUEUED jobs can be cancelled.`,
          },
          { status: 400 }
        );
      }

      // Update job status to CANCELLED
      const updatedJob = await db.generationJob.update({
        where: { id },
        data: {
          status: GenerationJobStatus.CANCELLED,
          completedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
          pipeline: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      // Attempt to cancel job in BullMQ
      // This is wrapped in try/catch because the job may have already been dequeued
      try {
        const bullJob = await generationQueue.getJob(id);
        if (bullJob) {
          await bullJob.remove();
          console.log(`Successfully removed job ${id} from BullMQ queue`);
        } else {
          console.warn(`Job ${id} not found in BullMQ queue - may have already been dequeued`);
        }
      } catch (bullMQError) {
        // Log warning but don't fail the operation
        console.warn(`Failed to remove job ${id} from BullMQ queue:`, bullMQError);
        console.warn('Database status has been updated to CANCELLED, but BullMQ removal failed');
      }

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'cancelled',
          entityType: 'generation_job',
          entityId: updatedJob.id,
          metadata: {
            clientName: existingJob.client.name,
            pipelineName: existingJob.pipeline.name,
            previousStatus: existingJob.status,
          },
        });
      }

      return NextResponse.json({ data: updatedJob });
    } catch (error) {
      console.error('Error cancelling generation job:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to cancel generation job' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);
