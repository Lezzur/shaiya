import Link from "next/link";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Zap, ListTodo, CheckCircle, XCircle } from "lucide-react";

async function getContentEngineData() {
  const [
    brandProfilesCount,
    activePipelinesCount,
    queuedJobsCount,
    completedJobsCount,
    failedJobsCount,
  ] = await Promise.all([
    // Total brand profiles
    db.brandProfile.count(),

    // Active pipelines count
    db.pipeline.count({
      where: { status: "ACTIVE" },
    }),

    // Jobs this month - queued
    db.generationJob.count({
      where: {
        status: "QUEUED",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),

    // Jobs this month - completed
    db.generationJob.count({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),

    // Jobs this month - failed
    db.generationJob.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return {
    brandProfilesCount,
    activePipelinesCount,
    queuedJobsCount,
    completedJobsCount,
    failedJobsCount,
  };
}

export default async function ContentEnginePage() {
  const {
    brandProfilesCount,
    activePipelinesCount,
    queuedJobsCount,
    completedJobsCount,
    failedJobsCount,
  } = await getContentEngineData();

  const totalJobsThisMonth = queuedJobsCount + completedJobsCount + failedJobsCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Content Engine</h1>
        <p className="mt-1 text-sm text-zinc-600">
          AI-powered content generation and brand management
        </p>
      </div>

      {/* Top row: Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Brand Profiles"
          value={brandProfilesCount}
          description="Total configured"
        />
        <MetricCard
          title="Active Pipelines"
          value={activePipelinesCount}
          description="Ready to generate"
        />
        <MetricCard
          title="Jobs This Month"
          value={totalJobsThisMonth}
          description={`${completedJobsCount} completed, ${failedJobsCount} failed`}
        />
        <MetricCard
          title="Queue"
          value={queuedJobsCount}
          description="Awaiting processing"
        />
      </div>

      {/* Job Stats Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Job Statistics (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <ListTodo className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{queuedJobsCount}</p>
                <p className="text-sm text-muted-foreground">Queued</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedJobsCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedJobsCount}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/content-engine/brand-profiles">
              <Button variant="outline" className="h-auto w-full justify-start p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-zinc-600" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Brand Profiles</p>
                    <p className="text-xs text-muted-foreground">
                      Manage client brand assets and guidelines
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Button>
            </Link>

            <Link href="/content-engine/pipelines">
              <Button variant="outline" className="h-auto w-full justify-start p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-zinc-600" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Pipelines</p>
                    <p className="text-xs text-muted-foreground">
                      Configure generation workflows
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Button>
            </Link>

            <Link href="/content-engine/prompt-library">
              <Button variant="outline" className="h-auto w-full justify-start p-4">
                <div className="flex items-start gap-3">
                  <ListTodo className="h-5 w-5 text-zinc-600" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Prompt Library</p>
                    <p className="text-xs text-muted-foreground">
                      Manage reusable prompt templates
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Button>
            </Link>

            <Link href="/content-engine/queue">
              <Button variant="outline" className="h-auto w-full justify-start p-4">
                <div className="flex items-start gap-3">
                  <ListTodo className="h-5 w-5 text-zinc-600" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Queue</p>
                    <p className="text-xs text-muted-foreground">
                      View generation jobs and status
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Button>
            </Link>

            <Link href="/content-engine/gallery">
              <Button variant="outline" className="h-auto w-full justify-start p-4">
                <div className="flex items-start gap-3">
                  <ListTodo className="h-5 w-5 text-zinc-600" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Gallery</p>
                    <p className="text-xs text-muted-foreground">
                      Browse generated content assets
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Button>
            </Link>

            <Link href="/content-engine/cost-tracker">
              <Button variant="outline" className="h-auto w-full justify-start p-4">
                <div className="flex items-start gap-3">
                  <ListTodo className="h-5 w-5 text-zinc-600" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Cost Tracker</p>
                    <p className="text-xs text-muted-foreground">
                      Monitor API usage and costs
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
