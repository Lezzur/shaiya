import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import { MetricCard } from "@/components/shared/metric-card";

async function getModelDetails(id: string) {
  const model = await db.modelRegistry.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          apiUsageLogs: true,
        },
      },
      apiUsageLogs: {
        select: {
          cost: true,
          timestamp: true,
          tokensUsed: true,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 100,
      },
    },
  });

  if (!model) {
    return null;
  }

  const totalCost = model.apiUsageLogs.reduce(
    (sum, log) => sum + Number(log.cost ?? 0),
    0
  );

  const totalTokens = model.apiUsageLogs.reduce(
    (sum, log) => sum + (log.tokensUsed ?? 0),
    0
  );

  const lastUsed = model.apiUsageLogs[0]?.timestamp ?? null;

  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    endpoint: model.endpoint,
    costPerUnit: Number(model.costPerUnit),
    unitType: model.unitType,
    qualityBenchmark: model.qualityBenchmark ? Number(model.qualityBenchmark) : null,
    isActive: model.isActive,
    totalCalls: model._count.apiUsageLogs,
    totalCost,
    totalTokens,
    lastUsed,
  };
}

export default async function ModelDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await getModelDetails(id);

  if (!model) {
    notFound();
  }

  const qualityPercentage = model.qualityBenchmark
    ? Math.round(model.qualityBenchmark * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/content-engine/models">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-zinc-900">{model.name}</h1>
            {model.isActive ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Provider: {model.provider}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Calls"
          value={formatNumber(model.totalCalls)}
          description="All time"
        />
        <MetricCard
          title="Total Cost"
          value={formatCurrency(model.totalCost)}
          description="All time"
        />
        <MetricCard
          title="Total Tokens"
          value={formatNumber(model.totalTokens)}
          description="All time"
        />
        <MetricCard
          title="Last Used"
          value={model.lastUsed ? formatDate(model.lastUsed) : "Never"}
          description="Most recent call"
        />
      </div>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Cost per Unit
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatCurrency(model.costPerUnit)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Unit Type
              </dt>
              <dd className="mt-1 text-lg font-semibold">{model.unitType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Quality Benchmark
              </dt>
              <dd className="mt-1">
                {qualityPercentage !== null ? (
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-32 rounded-full bg-zinc-200">
                      <div
                        className={`h-3 rounded-full ${
                          qualityPercentage >= 80
                            ? "bg-green-500"
                            : qualityPercentage >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${qualityPercentage}%` }}
                      />
                    </div>
                    <span className="text-lg font-semibold">
                      {qualityPercentage}%
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Endpoint
              </dt>
              <dd className="mt-1 text-sm">
                {model.endpoint ? (
                  <code className="rounded bg-zinc-100 px-2 py-1">
                    {model.endpoint}
                  </code>
                ) : (
                  <span className="text-muted-foreground">Not configured</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Average Cost Calculation */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Average Cost per Call
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {model.totalCalls > 0
                  ? formatCurrency(model.totalCost / model.totalCalls)
                  : formatCurrency(0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Average Tokens per Call
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {model.totalCalls > 0
                  ? formatNumber(Math.round(model.totalTokens / model.totalCalls))
                  : "0"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Cost per 1K Tokens
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {model.totalTokens > 0
                  ? formatCurrency((model.totalCost / model.totalTokens) * 1000)
                  : formatCurrency(0)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
