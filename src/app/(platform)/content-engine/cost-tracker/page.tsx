import Link from "next/link";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CostByClientChart } from "./cost-by-client-chart";

type DateRange = "this_month" | "last_30_days" | "last_90_days";

function getDateRange(range: DateRange): { from: Date; to: Date } {
  const now = new Date();
  const to = now;

  let from: Date;
  switch (range) {
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_30_days":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last_90_days":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from, to };
}

async function getCostTrackerData(range: DateRange) {
  const { from, to } = getDateRange(range);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    totalAiSpendResult,
    jobsCompletedThisMonth,
    costByClientRaw,
    modelUsageData,
    mostExpensiveModelResult,
  ] = await Promise.all([
    // Total AI spend this month
    db.apiUsageLog.aggregate({
      where: {
        timestamp: {
          gte: monthStart,
          lte: new Date(),
        },
      },
      _sum: {
        cost: true,
      },
    }),

    // Jobs completed this month
    db.generationJob.count({
      where: {
        status: "COMPLETED",
        completedAt: {
          gte: monthStart,
          lte: new Date(),
        },
      },
    }),

    // Cost by client for the selected range
    db.apiUsageLog.groupBy({
      by: ["jobId"],
      where: {
        timestamp: {
          gte: from,
          lte: to,
        },
        jobId: { not: null },
      },
      _sum: {
        cost: true,
      },
    }),

    // Model usage breakdown
    db.modelRegistry.findMany({
      include: {
        _count: {
          select: {
            apiUsageLogs: true,
          },
        },
        apiUsageLogs: {
          select: {
            cost: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),

    // Most expensive model this month
    db.apiUsageLog.groupBy({
      by: ["modelName"],
      where: {
        timestamp: {
          gte: monthStart,
          lte: new Date(),
        },
      },
      _sum: {
        cost: true,
      },
      orderBy: {
        _sum: {
          cost: "desc",
        },
      },
      take: 1,
    }),
  ]);

  // Get job IDs with their costs for client aggregation
  const jobIds = costByClientRaw
    .filter((r) => r.jobId !== null)
    .map((r) => r.jobId as string);

  // Fetch jobs with client info
  const jobsWithClients = jobIds.length > 0
    ? await db.generationJob.findMany({
        where: {
          id: { in: jobIds },
        },
        select: {
          id: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    : [];

  // Create a map of jobId -> client
  const jobClientMap = new Map<string, { id: string; name: string }>();
  for (const job of jobsWithClients) {
    jobClientMap.set(job.id, job.client);
  }

  // Create a map of jobId -> cost
  const jobCostMap = new Map<string, number>();
  for (const r of costByClientRaw) {
    if (r.jobId) {
      jobCostMap.set(r.jobId, Number(r._sum.cost ?? 0));
    }
  }

  // Aggregate costs by client
  const clientCostMap = new Map<string, { id: string; name: string; cost: number }>();
  for (const [jobId, client] of jobClientMap.entries()) {
    if (!client) continue;
    const cost = jobCostMap.get(jobId) ?? 0;
    const existing = clientCostMap.get(client.id);
    if (existing) {
      existing.cost += cost;
    } else {
      clientCostMap.set(client.id, { id: client.id, name: client.name, cost });
    }
  }

  // Sort by cost desc and take top 10
  const costByClient = Array.from(clientCostMap.values())
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  // Calculate model stats
  const modelUsage = modelUsageData.map((model) => {
    const totalCost = model.apiUsageLogs.reduce(
      (sum, log) => sum + Number(log.cost ?? 0),
      0
    );
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      costPerUnit: Number(model.costPerUnit),
      unitType: model.unitType,
      qualityBenchmark: model.qualityBenchmark ? Number(model.qualityBenchmark) : null,
      isActive: model.isActive,
      totalCalls: model._count.apiUsageLogs,
      totalCost,
    };
  }).sort((a, b) => b.totalCost - a.totalCost);

  const totalAiSpend = Number(totalAiSpendResult._sum.cost ?? 0);
  const averageCostPerJob = jobsCompletedThisMonth > 0
    ? totalAiSpend / jobsCompletedThisMonth
    : 0;
  const mostExpensiveModel = mostExpensiveModelResult[0]?.modelName ?? "N/A";

  return {
    totalAiSpend,
    jobsCompletedThisMonth,
    averageCostPerJob,
    mostExpensiveModel,
    costByClient,
    modelUsage,
  };
}

export default async function CostTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = (params.range as DateRange) || "this_month";

  // Validate range - clamp to maximum 90 days
  const validRange: DateRange = ["this_month", "last_30_days", "last_90_days"].includes(range)
    ? range
    : "this_month";

  const {
    totalAiSpend,
    jobsCompletedThisMonth,
    averageCostPerJob,
    mostExpensiveModel,
    costByClient,
    modelUsage,
  } = await getCostTrackerData(validRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Cost Tracker</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Monitor AI API usage and costs across the platform
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total AI Spend"
          value={formatCurrency(totalAiSpend)}
          description="This month"
        />
        <MetricCard
          title="Jobs Completed"
          value={formatNumber(jobsCompletedThisMonth)}
          description="This month"
        />
        <MetricCard
          title="Avg Cost/Job"
          value={formatCurrency(averageCostPerJob)}
          description="This month"
        />
        <MetricCard
          title="Top Model"
          value={mostExpensiveModel}
          description="Most expensive this month"
        />
      </div>

      {/* Cost by Client Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cost by Client</CardTitle>
          <div className="flex gap-2">
            <Link
              href="/content-engine/cost-tracker?range=this_month"
              className={`rounded-md px-3 py-1 text-sm ${
                validRange === "this_month"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              This Month
            </Link>
            <Link
              href="/content-engine/cost-tracker?range=last_30_days"
              className={`rounded-md px-3 py-1 text-sm ${
                validRange === "last_30_days"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Last 30 Days
            </Link>
            <Link
              href="/content-engine/cost-tracker?range=last_90_days"
              className={`rounded-md px-3 py-1 text-sm ${
                validRange === "last_90_days"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Last 90 Days
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {costByClient.length > 0 ? (
            <CostByClientChart data={costByClient} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No cost data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Usage Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Unit Type</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead className="text-right">Total Calls</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelUsage.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No models registered
                  </TableCell>
                </TableRow>
              ) : (
                modelUsage.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <Link
                        href={`/content-engine/models/${model.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {model.name}
                      </Link>
                      {!model.isActive && (
                        <Badge variant="secondary" className="ml-2">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{model.provider}</TableCell>
                    <TableCell>{formatCurrency(model.costPerUnit)}</TableCell>
                    <TableCell>{model.unitType}</TableCell>
                    <TableCell>
                      {model.qualityBenchmark !== null ? (
                        <QualityBar value={model.qualityBenchmark} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(model.totalCalls)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(model.totalCost)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function QualityBar({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const barColor =
    percentage >= 80
      ? "bg-green-500"
      : percentage >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-zinc-200">
        <div
          className={`h-2 rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{percentage}%</span>
    </div>
  );
}
