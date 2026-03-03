import { Queue, Job, ConnectionOptions } from 'bullmq';

/**
 * Redis connection options for BullMQ
 * maxRetriesPerRequest: null is required for BullMQ compatibility
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
};

/**
 * Generation queue for content generation jobs
 */
export const generationQueue = new Queue('generation', {
  connection: redisConnection,
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
