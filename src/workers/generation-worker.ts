import { Worker, Job } from 'bullmq';
import { redis, GenerationJobPayload } from '@/lib/queue';
import { db } from '@/lib/db';
import { GenerationJobStatus, ActivityModule } from '@/generated/prisma';

let worker: Worker<GenerationJobPayload> | null = null;

/**
 * Process a generation job
 * 1. Find the GenerationJob by jobId
 * 2. Update status to PROCESSING
 * 3. Fetch pipeline to get webhookUrl
 * 4. POST to webhook with payload
 * 5. Update status to COMPLETED on success
 * 6. Log activity
 */
async function processGenerationJob(
  job: Job<GenerationJobPayload>
): Promise<void> {
  const { jobId, clientId, brandProfileId, params } = job.data;

  // Find the GenerationJob record
  const generationJob = await db.generationJob.findUnique({
    where: { id: jobId },
    include: { pipeline: true },
  });

  // Handle case where job record was deleted
  if (!generationJob) {
    console.warn(`GenerationJob ${jobId} not found, skipping processing`);
    return;
  }

  // Update job status to PROCESSING in a transaction
  try {
    await db.$transaction(async (tx) => {
      await tx.generationJob.update({
        where: { id: jobId },
        data: {
          status: GenerationJobStatus.PROCESSING,
          startedAt: new Date(),
        },
      });
    });
  } catch (dbError) {
    const errorMessage =
      dbError instanceof Error ? dbError.message : 'Failed to update job status';
    await updateJobFailed(jobId, errorMessage);
    throw new Error(`Database error: ${errorMessage}`);
  }

  // Get webhook URL from pipeline
  const webhookUrl = generationJob.pipeline.webhookUrl;

  // Create AbortController for 30-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Job-Id': jobId,
      },
      body: JSON.stringify({
        jobId,
        clientId,
        brandProfileId,
        params,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // If webhook returns non-2xx, throw error for BullMQ to retry
    if (!response.ok) {
      throw new Error(
        `Webhook returned ${response.status}: ${response.statusText}`
      );
    }

    // Update job status to COMPLETED
    try {
      await db.generationJob.update({
        where: { id: jobId },
        data: {
          status: GenerationJobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Failed to update job to COMPLETED:', dbError);
      // Don't throw here - the webhook succeeded, just log the DB error
    }

    // Log activity
    try {
      // Find a system user or first admin to use as actor
      const systemUser = await db.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (systemUser) {
        await db.activityLog.create({
          data: {
            actorId: systemUser.id,
            module: ActivityModule.CONTENT_ENGINE,
            action: 'dispatched',
            entityType: 'generation_job',
            entityId: jobId,
            metadata: {
              pipelineId: generationJob.pipelineId,
              clientId,
              brandProfileId,
            },
          },
        });
      }
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
      // Don't throw - activity logging is not critical
    }
  } catch (fetchError) {
    clearTimeout(timeoutId);

    const errorMessage =
      fetchError instanceof Error
        ? fetchError.name === 'AbortError'
          ? 'Webhook request timed out after 30 seconds'
          : fetchError.message
        : 'Unknown fetch error';

    // Update job status to FAILED
    await updateJobFailed(jobId, errorMessage);

    // Re-throw so BullMQ can retry
    throw new Error(`Webhook failed: ${errorMessage}`);
  }
}

/**
 * Update a generation job to FAILED status
 */
async function updateJobFailed(
  jobId: string,
  errorMessage: string
): Promise<void> {
  try {
    await db.generationJob.update({
      where: { id: jobId },
      data: {
        status: GenerationJobStatus.FAILED,
        errorMessage,
      },
    });
  } catch (dbError) {
    console.error('Failed to update job to FAILED status:', dbError);
  }
}

/**
 * Start the generation worker
 * Creates a BullMQ worker that processes jobs from the 'generation' queue
 */
export function startWorker(): Worker<GenerationJobPayload> {
  if (worker) {
    return worker;
  }

  worker = new Worker<GenerationJobPayload>('generation', processGenerationJob, {
    connection: redis,
    concurrency: 5, // As per spec: content-generation queue has concurrency 5
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} (${job?.name}) failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  console.log('Generation worker started');

  return worker;
}

/**
 * Stop the generation worker gracefully
 */
export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('Generation worker stopped');
  }
}
