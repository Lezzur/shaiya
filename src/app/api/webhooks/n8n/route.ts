import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { broadcastJobUpdate } from '@/lib/sse';
import {
  GenerationJobStatus,
  ContentAssetType,
  Prisma,
} from '@/generated/prisma';

/**
 * n8n webhook callback endpoint
 *
 * This is called by n8n when a generation job completes.
 * Public route - no auth, but verifies X-Nexus-Job-Id header.
 */

interface WebhookOutput {
  fileUrl: string;
  thumbnailUrl?: string;
  type: string;
  metadata?: Record<string, unknown>;
}

interface WebhookBody {
  jobId: string;
  status: 'completed' | 'failed';
  outputs?: WebhookOutput[];
  cost?: number;
  modelName?: string;
  tokensUsed?: number;
  errorMessage?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Validate Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse body
    let body: WebhookBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.jobId || typeof body.jobId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid jobId' },
        { status: 400 }
      );
    }

    if (!body.status || !['completed', 'failed'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "completed" or "failed"' },
        { status: 400 }
      );
    }

    // Verify X-Nexus-Job-Id header matches jobId
    const headerJobId = req.headers.get('X-Nexus-Job-Id');
    if (headerJobId !== body.jobId) {
      return NextResponse.json(
        { error: 'X-Nexus-Job-Id header does not match jobId in body' },
        { status: 401 }
      );
    }

    // Find the generation job
    const job = await db.generationJob.findUnique({
      where: { id: body.jobId },
      include: {
        client: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Generation job not found' },
        { status: 404 }
      );
    }

    // Handle completed status
    if (body.status === 'completed') {
      // Use a transaction for atomic updates
      await db.$transaction(async (tx) => {
        // Create content assets for each output
        if (body.outputs && body.outputs.length > 0) {
          for (const output of body.outputs) {
            // Map type string to ContentAssetType enum
            let assetType: ContentAssetType;
            try {
              assetType = output.type as ContentAssetType;
            } catch {
              assetType = ContentAssetType.OTHER;
            }

            await tx.contentAsset.create({
              data: {
                clientId: job.clientId,
                generationJobId: job.id,
                type: assetType,
                fileUrl: output.fileUrl,
                thumbnailUrl: output.thumbnailUrl,
                metadata: output.metadata as Prisma.InputJsonValue,
              },
            });
          }
        }

        // Update generation job
        await tx.generationJob.update({
          where: { id: job.id },
          data: {
            status: GenerationJobStatus.COMPLETED,
            completedAt: new Date(),
            totalCost: body.cost ?? 0,
          },
        });

        // Create API usage log if cost and model provided
        if (body.cost && body.modelName) {
          await tx.apiUsageLog.create({
            data: {
              jobId: job.id,
              modelName: body.modelName,
              tokensUsed: body.tokensUsed,
              cost: body.cost,
              module: 'content_engine',
            },
          });
        }

        // Log activity
        await tx.activityLog.create({
          data: {
            actorId: job.clientId, // Use client as actor for system actions
            module: 'CONTENT_ENGINE',
            action: 'completed',
            entityType: 'generation_job',
            entityId: job.id,
            metadata: {
              cost: body.cost,
              modelName: body.modelName,
              outputCount: body.outputs?.length ?? 0,
            } as Prisma.InputJsonValue,
          },
        });
      });

      // Fetch updated job with relations for broadcasting
      const updatedJob = await db.generationJob.findUnique({
        where: { id: job.id },
        include: {
          client: { select: { id: true, name: true } },
          pipeline: { select: { id: true, name: true } },
          brandProfile: { select: { id: true } },
          contentAssets: true,
        },
      });

      // Broadcast update to SSE listeners
      if (updatedJob) {
        broadcastJobUpdate(updatedJob);
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Handle failed status
    if (body.status === 'failed') {
      // Update job status and error message
      await db.$transaction(async (tx) => {
        await tx.generationJob.update({
          where: { id: job.id },
          data: {
            status: GenerationJobStatus.FAILED,
            errorMessage: body.errorMessage ?? 'Unknown error',
            completedAt: new Date(),
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            actorId: job.clientId,
            module: 'CONTENT_ENGINE',
            action: 'failed',
            entityType: 'generation_job',
            entityId: job.id,
            metadata: {
              errorMessage: body.errorMessage,
            } as Prisma.InputJsonValue,
          },
        });
      });

      // Fetch updated job for broadcasting
      const updatedJob = await db.generationJob.findUnique({
        where: { id: job.id },
        include: {
          client: { select: { id: true, name: true } },
          pipeline: { select: { id: true, name: true } },
          brandProfile: { select: { id: true } },
          contentAssets: true,
        },
      });

      // Broadcast update to SSE listeners
      if (updatedJob) {
        broadcastJobUpdate(updatedJob);
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Should never reach here due to validation above
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    // Log error but don't expose stack traces
    console.error('n8n webhook error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
