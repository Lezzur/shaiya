import { db } from './db';
import { ApiUsageLog } from '@/generated/prisma';

/**
 * Logs API usage for tracking costs and consumption.
 * This function never throws - all errors are caught and logged as warnings
 * to ensure logging failures don't break calling code.
 */
export async function logApiUsage(params: {
  jobId?: string;
  modelId?: string;
  modelName: string;
  tokensUsed?: number;
  cost: number;
  module: string;
}): Promise<ApiUsageLog | null> {
  try {
    // Validate cost is a non-negative finite number
    const validCost =
      typeof params.cost === 'number' &&
      isFinite(params.cost) &&
      params.cost >= 0
        ? params.cost
        : 0;

    const log = await db.apiUsageLog.create({
      data: {
        jobId: params.jobId,
        modelId: params.modelId,
        modelName: params.modelName,
        tokensUsed: params.tokensUsed,
        cost: validCost,
        module: params.module,
      },
    });

    return log;
  } catch (error) {
    console.warn('Failed to log API usage:', error);
    return null;
  }
}

/**
 * Aggregates API usage costs for a specific client within a date range.
 * Joins ApiUsageLog → GenerationJob to link usage to clients.
 *
 * @returns Object with total cost and breakdown by model name.
 *          Returns { total: 0, byModel: {} } if no records found.
 */
export async function getCostByClient(
  clientId: string,
  from: Date,
  to: Date
): Promise<{ total: number; byModel: Record<string, number> }> {
  const logs = await db.apiUsageLog.findMany({
    where: {
      job: {
        clientId,
      },
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    select: {
      cost: true,
      modelName: true,
    },
  });

  if (logs.length === 0) {
    return { total: 0, byModel: {} };
  }

  const byModel: Record<string, number> = {};
  let total = 0;

  for (const log of logs) {
    const cost = Number(log.cost);
    total += cost;

    if (byModel[log.modelName]) {
      byModel[log.modelName] += cost;
    } else {
      byModel[log.modelName] = cost;
    }
  }

  return { total, byModel };
}

/**
 * Returns total API usage cost for a specific module within a date range.
 *
 * @returns Total cost as a number. Returns 0 if no records found.
 */
export async function getCostByModule(
  module: string,
  from: Date,
  to: Date
): Promise<number> {
  const result = await db.apiUsageLog.aggregate({
    where: {
      module,
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      cost: true,
    },
  });

  return Number(result._sum.cost ?? 0);
}
