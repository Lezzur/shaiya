"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, EmptyState, ConfirmDialog } from "@/components/shared";
import { formatCurrency, formatRelative } from "@/lib/format";
import { GenerationJobStatus } from "@/generated/prisma";
import { RefreshCw, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  logo?: string | null;
}

interface Pipeline {
  id: string;
  name: string;
  type: string;
}

interface GenerationJob {
  id: string;
  status: GenerationJobStatus;
  totalCost: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  client: Client;
  pipeline: Pipeline;
}

interface PaginatedResponse {
  data: GenerationJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StatusSummary {
  queued: number;
  processing: number;
  completedToday: number;
  failedToday: number;
}

const JOB_STATUS_COLORS: Record<GenerationJobStatus, string> = {
  [GenerationJobStatus.QUEUED]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [GenerationJobStatus.PROCESSING]: "bg-blue-100 text-blue-800 border-blue-200",
  [GenerationJobStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [GenerationJobStatus.FAILED]: "bg-red-100 text-red-800 border-red-200",
  [GenerationJobStatus.CANCELLED]: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function QueuePage() {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({
    queued: 0,
    processing: 0,
    completedToday: 0,
    failedToday: 0,
  });

  // SSE connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cancel dialog state
  const [jobToCancel, setJobToCancel] = useState<GenerationJob | null>(null);
  const [cancellingJobs, setCancellingJobs] = useState<Set<string>>(new Set());

  // Fetch initial data
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/content-engine/jobs?limit=50");

      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setJobs(data.data);
        calculateStatusSummary(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate status summary from jobs list
  const calculateStatusSummary = (jobsList: GenerationJob[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = jobsList.reduce(
      (acc, job) => {
        if (job.status === GenerationJobStatus.QUEUED) {
          acc.queued++;
        } else if (job.status === GenerationJobStatus.PROCESSING) {
          acc.processing++;
        } else if (job.status === GenerationJobStatus.COMPLETED) {
          const completedAt = new Date(job.completedAt!);
          if (completedAt >= today) {
            acc.completedToday++;
          }
        } else if (job.status === GenerationJobStatus.FAILED) {
          const completedAt = new Date(job.completedAt!);
          if (completedAt >= today) {
            acc.failedToday++;
          }
        }
        return acc;
      },
      { queued: 0, processing: 0, completedToday: 0, failedToday: 0 }
    );

    setStatusSummary(summary);
  };

  // Connect to SSE endpoint
  const connectSSE = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const eventSource = new EventSource("/api/content-engine/queue");
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("open", () => {
        setIsConnected(true);
        setIsReconnecting(false);
        console.log("SSE connected");
      });

      eventSource.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "connected") {
            console.log("SSE connection confirmed:", data.connectionId);
          } else if (data.type === "queue_state") {
            // Initial queue state received
            console.log("Received initial queue state:", data.jobs.length, "jobs");
          } else if (data.type === "job_update") {
            // Real-time job update
            const updatedJob = data.job as GenerationJob;

            setJobs((prevJobs) => {
              const existingIndex = prevJobs.findIndex((j) => j.id === updatedJob.id);

              if (existingIndex >= 0) {
                // Update existing job in place
                const newJobs = [...prevJobs];
                newJobs[existingIndex] = updatedJob;
                calculateStatusSummary(newJobs);
                return newJobs;
              } else {
                // Prepend new job to list
                const newJobs = [updatedJob, ...prevJobs];
                calculateStatusSummary(newJobs);
                return newJobs;
              }
            });
          }
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      });

      eventSource.addEventListener("error", () => {
        setIsConnected(false);
        setIsReconnecting(true);
        eventSource.close();

        // Attempt reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect SSE...");
          connectSSE();
        }, 5000);
      });
    } catch (error) {
      console.error("Failed to connect to SSE:", error);
      setIsConnected(false);
      setIsReconnecting(true);

      // Attempt reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect SSE...");
        connectSSE();
      }, 5000);
    }
  }, []);

  // Initialize: fetch data and connect SSE
  useEffect(() => {
    fetchJobs();
    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchJobs, connectSSE]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchJobs();
  };

  // Handle cancel job
  const handleCancelJob = async (job: GenerationJob) => {
    if (cancellingJobs.has(job.id)) {
      return; // Already cancelling
    }

    try {
      // Optimistically add to cancelling set
      setCancellingJobs((prev) => new Set(prev).add(job.id));

      const response = await fetch(`/api/content-engine/jobs/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedJob = data.data as GenerationJob;

        // Update job in state using functional setState
        setJobs((prevJobs) =>
          prevJobs.map((j) => (j.id === updatedJob.id ? updatedJob : j))
        );

        // Recalculate summary
        setJobs((currentJobs) => {
          calculateStatusSummary(currentJobs);
          return currentJobs;
        });
      } else {
        const errorData = await response.json();
        console.error("Failed to cancel job:", errorData);
        alert(`Failed to cancel job: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error cancelling job:", error);
      alert("An error occurred while cancelling the job");
    } finally {
      // Remove from cancelling set
      setCancellingJobs((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      setJobToCancel(null);
    }
  };

  // Format duration from startedAt to completedAt
  const formatDuration = (job: GenerationJob): string => {
    if (!job.completedAt || !job.startedAt) {
      return "Pending";
    }

    const start = new Date(job.startedAt).getTime();
    const end = new Date(job.completedAt).getTime();
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Generation Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and manage content generation jobs in real-time
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status indicator */}
            {isReconnecting && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <div className="h-2 w-2 animate-pulse rounded-full bg-orange-600" />
                Live updates paused
              </div>
            )}
            {isConnected && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600" />
                Live
              </div>
            )}

            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Status Summary Bar */}
      <div className="border-b bg-white p-4">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-yellow-100 p-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statusSummary.queued}</p>
                  <p className="text-sm text-muted-foreground">Queued</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statusSummary.processing}</p>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statusSummary.completedToday}</p>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statusSummary.failedToday}</p>
                  <p className="text-sm text-muted-foreground">Failed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No generation jobs yet"
            description="Generation jobs will appear here when you trigger a pipeline. Head over to the Pipelines page to get started."
            action={{
              label: "Go to Pipelines",
              onClick: () => (window.location.href = "/content-engine/pipelines"),
            }}
          />
        ) : (
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.client.logo && (
                          <img
                            src={job.client.logo}
                            alt={job.client.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">{job.client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.pipeline.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.pipeline.type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={job.status}
                        customColors={JOB_STATUS_COLORS}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelative(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(job)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(job.totalCost))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {job.status === GenerationJobStatus.QUEUED && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setJobToCancel(job)}
                            disabled={cancellingJobs.has(job.id)}
                          >
                            {cancellingJobs.has(job.id) ? "Cancelling..." : "Cancel"}
                          </Button>
                        )}
                        {job.status === GenerationJobStatus.COMPLETED && (
                          <Link href={`/content-engine/gallery?jobId=${job.id}`}>
                            <Button variant="outline" size="sm">
                              View Assets
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {jobToCancel && (
        <ConfirmDialog
          open={!!jobToCancel}
          onOpenChange={(open) => !open && setJobToCancel(null)}
          title="Cancel Generation Job"
          description={`Are you sure you want to cancel the generation job for "${jobToCancel.client.name} - ${jobToCancel.pipeline.name}"? This action cannot be undone.`}
          onConfirm={() => handleCancelJob(jobToCancel)}
          confirmText="Cancel Job"
          cancelText="Keep Job"
          variant="danger"
        />
      )}
    </div>
  );
}
