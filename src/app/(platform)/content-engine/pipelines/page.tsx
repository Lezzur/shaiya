"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared";
import { PlusCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Pipeline {
  id: string;
  name: string;
  type: string;
  status: "ACTIVE" | "INACTIVE" | "ERROR";
  lastRun: string | null;
  totalProcessed: number;
  createdAt: string;
  _count: {
    generationJobs: number;
  };
}

const pipelineStatusColors = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-800 border-gray-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
};

export default function PipelinesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelines();
  }, [statusFilter]);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const url = statusFilter && statusFilter !== "all"
        ? `/api/content-engine/pipelines?status=${statusFilter}`
        : "/api/content-engine/pipelines";

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch pipelines");
      const json = await res.json();
      setPipelines(json.data);
    } catch (error) {
      console.error("Error fetching pipelines:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`/content-engine/pipelines?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Pipelines</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage content generation pipelines
          </p>
        </div>
        <Button asChild>
          <Link href="/content-engine/pipelines/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Pipeline
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pipelines</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pipelines List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : pipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-zinc-600 mb-4">No pipelines found</p>
            <Button asChild>
              <Link href="/content-engine/pipelines/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create your first pipeline
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {pipelines.map((pipeline) => (
                <div
                  key={pipeline.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/content-engine/pipelines/${pipeline.id}`)}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-zinc-900">
                        {pipeline.name}
                      </h3>
                      <StatusBadge
                        status={pipeline.status}
                        customColors={pipelineStatusColors}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-600">
                      <span>Type: {pipeline.type}</span>
                      {pipeline.lastRun && (
                        <span>Last run: {formatDate(pipeline.lastRun)}</span>
                      )}
                      <span>Total processed: {pipeline.totalProcessed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
