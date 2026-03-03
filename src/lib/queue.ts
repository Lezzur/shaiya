import { Queue } from 'bullmq';

/**
 * BullMQ queue for generation jobs
 * Handles asynchronous content generation tasks
 */

// Initialize BullMQ connection
// Note: This should be configured with Redis connection details from env vars
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
};

// Create queue instance for generation jobs
const generationQueue = new Queue('generation-jobs', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5s delay, exponentially increase
    },
  },
});

interface EnqueueGenerationJobParams {
  jobId: string;
  pipelineId: string;
  clientId: string;
  brandProfileId: string;
  webhookUrl: string;
  params: Record<string, unknown>;
}

/**
 * Enqueue a generation job to BullMQ
 *
 * @throws Error if enqueue fails
 */
export async function enqueueGenerationJob({
  jobId,
  pipelineId,
  clientId,
  brandProfileId,
  webhookUrl,
  params,
}: EnqueueGenerationJobParams) {
  try {
    await generationQueue.add(
      'generate-content',
      {
        jobId,
        pipelineId,
        clientId,
        brandProfileId,
        webhookUrl,
        params,
      },
      {
        jobId, // Use our job ID as the BullMQ job ID for easy tracking
      }
    );
  } catch (error) {
    console.error('Failed to enqueue generation job:', error);
    throw new Error('Failed to enqueue generation job');
  }
}

/**
 * Get queue instance for advanced operations
 */
export function getGenerationQueue() {
  return generationQueue;
}
