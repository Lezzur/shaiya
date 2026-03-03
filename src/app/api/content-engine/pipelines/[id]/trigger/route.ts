import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { triggerPipelineSchema } from '@/lib/validations';
import { UserRole, ActivityModule, PipelineStatus, GenerationJobStatus } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import { enqueueGenerationJob } from '@/lib/queue';

/**
 * POST /api/content-engine/pipelines/[id]/trigger
 * Trigger a generation job on this pipeline
 * Protected: ADMIN, TEAM roles
 */
export const POST = withAuth(
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
      const validationResult = triggerPipelineSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      const { clientId, brandProfileId, params } = validationResult.data;

      // Fetch pipeline
      const pipeline = await db.pipeline.findUnique({
        where: { id },
      });

      if (!pipeline) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Pipeline not found' },
          { status: 404 }
        );
      }

      // Check pipeline status
      if (pipeline.status === PipelineStatus.INACTIVE) {
        return NextResponse.json(
          {
            error: 'UnprocessableEntity',
            message: 'Pipeline is inactive. Please activate it before triggering jobs.',
          },
          { status: 422 }
        );
      }

      if (pipeline.status === PipelineStatus.ERROR) {
        return NextResponse.json(
          {
            error: 'UnprocessableEntity',
            message: 'Pipeline is in error state. Please fix the errors before triggering jobs.',
          },
          { status: 422 }
        );
      }

      // Verify client exists
      const client = await db.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Client not found' },
          { status: 400 }
        );
      }

      // Verify brand profile exists and belongs to client
      const brandProfile = await db.brandProfile.findUnique({
        where: { id: brandProfileId },
      });

      if (!brandProfile) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Brand profile not found' },
          { status: 400 }
        );
      }

      if (brandProfile.clientId !== clientId) {
        return NextResponse.json(
          {
            error: 'BadRequest',
            message: 'Brand profile does not belong to the specified client',
          },
          { status: 400 }
        );
      }

      // Use transaction to ensure atomicity
      let jobId: string;

      try {
        const result = await db.$transaction(async (tx) => {
          // Create GenerationJob record
          const job = await tx.generationJob.create({
            data: {
              pipelineId: id,
              clientId,
              brandProfileId,
              params: params as object,
              status: GenerationJobStatus.QUEUED,
            },
          });

          // Enqueue to BullMQ
          await enqueueGenerationJob({
            jobId: job.id,
            pipelineId: id,
            clientId,
            brandProfileId,
            params: params as Record<string, unknown>,
          });

          // Update pipeline statistics
          await tx.pipeline.update({
            where: { id },
            data: {
              lastRun: new Date(),
              totalProcessed: {
                increment: 1,
              },
            },
          });

          return job;
        });

        jobId = result.id;
      } catch (enqueueError) {
        // If BullMQ enqueue fails, transaction will rollback automatically
        console.error('Error enqueuing generation job:', enqueueError);
        return NextResponse.json(
          {
            error: 'InternalServerError',
            message: 'Failed to enqueue generation job. Please try again.',
          },
          { status: 500 }
        );
      }

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'triggered',
          entityType: 'pipeline',
          entityId: id,
          metadata: {
            pipelineName: pipeline.name,
            jobId,
            clientId,
            brandProfileId,
          },
        });
      }

      return NextResponse.json({
        data: {
          jobId,
          status: 'QUEUED',
        },
      });
    } catch (error) {
      console.error('Error triggering pipeline:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to trigger pipeline' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);
