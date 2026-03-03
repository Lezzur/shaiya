"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, AlertCircle, Loader2 } from "lucide-react";
import { StatusBadge, MetricCard, TriggerJobModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate, formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";

interface Pipeline {
  id: string;
  name: string;
  type: string;
  status: "ACTIVE" | "INACTIVE" | "ERROR";
  webhookUrl: string;
  config: Record<string, unknown>;
  lastRun: string | null;
  lastError: string | null;
  totalProcessed: number;
  createdAt: string;
  jobCounts: {
    allTime: number;
    last30Days: number;
  };
}

interface GenerationJob {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  clientId: string;
  client: {
    name: string;
  };
  createdAt: string;
  totalCost: number;
}

const pipelineStatusColors = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-800 border-gray-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
};

const jobStatusColors = {
  QUEUED: "bg-blue-100 text-blue-800 border-blue-200",
  PROCESSING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
};

export default function PipelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [recentJobs, setRecentJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);

  useEffect(() => {
    fetchPipeline();
    fetchRecentJobs();
  }, [params.id]);

  const fetchPipeline = async () => {
    try {
      const res = await fetch(`/api/content-engine/pipelines/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      const json = await res.json();
      setPipeline(json.data);
    } catch (error) {
      console.error("Error fetching pipeline:", error);
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      // Fetch recent generation jobs for this pipeline
      // Note: This assumes there's an API endpoint that supports filtering by pipelineId
      const res = await fetch(`/api/content-engine/generation-jobs?pipelineId=${params.id}&limit=10`);
      if (res.ok) {
        const json = await res.json();
        setRecentJobs(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching recent jobs:", error);
      // Don't show error toast as this is secondary data
    }
  };

  const handleStatusToggle = async (checked: boolean) => {
    if (!pipeline) return;

    const newStatus = checked ? "ACTIVE" : "INACTIVE";
    setUpdating(true);

    try {
      const response = await fetch(`/api/content-engine/pipelines/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update pipeline status");
      }

      const result = await response.json();
      setPipeline(result.data);
      toast.success(`Pipeline ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error("Error updating pipeline status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update pipeline status"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleJobSuccess = (jobId: string) => {
    // Refresh pipeline and jobs data
    fetchPipeline();
    fetchRecentJobs();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Pipeline not found</h2>
          <Button className="mt-4" onClick={() => router.push("/content-engine/pipelines")}>
            Back to Pipelines
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between border-b pb-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/content-engine/pipelines")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{pipeline.name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  status={pipeline.status}
                  customColors={pipelineStatusColors}
                />
                <span className="text-sm text-zinc-600">Type: {pipeline.type}</span>
                {pipeline.lastRun && (
                  <span className="text-sm text-zinc-600">
                    Last run: {formatDate(pipeline.lastRun)}
                  </span>
                )}
                <span className="text-sm text-zinc-600">
                  Total processed: {pipeline.totalProcessed}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Warning Banner */}
      {pipeline.status === "ERROR" && pipeline.lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Pipeline Error</AlertTitle>
          <AlertDescription>{pipeline.lastError}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Jobs"
          value={pipeline.jobCounts.allTime}
        />
        <MetricCard
          title="Jobs (30 days)"
          value={pipeline.jobCounts.last30Days}
        />
        <MetricCard
          title="Total Processed"
          value={pipeline.totalProcessed}
        />
        <MetricCard
          title="Status"
          value={pipeline.status}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <Label htmlFor="status-toggle" className="text-base font-medium">
                Pipeline Status
              </Label>
              <p className="text-sm text-zinc-600">
                {pipeline.status === "ACTIVE"
                  ? "Pipeline is active and accepting jobs"
                  : "Pipeline is inactive and not accepting jobs"}
              </p>
            </div>
            <Switch
              id="status-toggle"
              checked={pipeline.status === "ACTIVE"}
              onCheckedChange={handleStatusToggle}
              disabled={updating || pipeline.status === "ERROR"}
            />
          </CardContent>
        </Card>

        <Button
          size="lg"
          onClick={() => setTriggerModalOpen(true)}
          disabled={pipeline.status !== "ACTIVE"}
        >
          <Play className="mr-2 h-4 w-4" />
          Trigger Job
        </Button>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-center text-zinc-600 py-8">
              No jobs triggered yet
            </p>
          ) : (
            <div className="divide-y">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-zinc-600">
                        {job.id.slice(0, 8)}
                      </span>
                      <StatusBadge
                        status={job.status}
                        customColors={jobStatusColors}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-600">
                      <span>Client: {job.client.name}</span>
                      <span>{formatDate(job.createdAt)}</span>
                      {job.totalCost > 0 && (
                        <span>Cost: {formatCurrency(job.totalCost)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trigger Job Modal */}
      <TriggerJobModal
        open={triggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        pipelineId={pipeline.id}
        pipelineConfig={pipeline.config}
        onSuccess={handleJobSuccess}
      />
    </div>
  );
}
