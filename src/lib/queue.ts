import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';

/**
 * Redis connection singleton for BullMQ
 * maxRetriesPerRequest: null is required for BullMQ compatibility
 */
export const redis = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

/**
 * Generation queue for content generation jobs
 */
export const generationQueue = new Queue('generation', {
  connection: redis,
});

/**
 * Payload type for generation jobs
 */
export interface GenerationJobPayload {
  jobId: string;
  pipelineId: string;
  clientId: string;
  brandProfileId: string;
  params: Record<string, unknown>;
}

/**
 * Enqueue a generation job for processing
 * @param payload - The job payload containing jobId, pipelineId, clientId, brandProfileId, and params
 * @returns The created BullMQ job
 */
export async function enqueueGenerationJob(
  payload: GenerationJobPayload
): Promise<Job<GenerationJobPayload>> {
  return generationQueue.add(payload.jobId, payload, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}
