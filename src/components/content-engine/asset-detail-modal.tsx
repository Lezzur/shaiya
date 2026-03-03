"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CommentThread, Comment } from "@/components/shared";
import {
  getInternalStatus,
  getClientStatus,
  getContentAssetType,
  INTERNAL_STATUSES,
} from "@/lib/constants";
import { ContentAssetType, InternalStatus, CommentEntityType } from "@/generated/prisma";
import { format } from "date-fns";
import {
  Download,
  Calendar,
  Hash,
  Briefcase,
  Cog,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  logo?: string | null;
}

interface ContentAsset {
  id: string;
  type: ContentAssetType;
  fileUrl: string;
  thumbnailUrl?: string | null;
  internalStatus: InternalStatus;
  clientStatus: string;
  createdAt: string;
  version: number;
  client: Client;
  project?: {
    id: string;
    title: string;
    status?: string;
  } | null;
  generationJob?: {
    id: string;
    status: string;
    completedAt?: string | null;
  } | null;
  metadata?: any;
}

interface AssetDetailModalProps {
  asset: ContentAsset;
  open: boolean;
  onClose: () => void;
  onUpdate: (updatedAsset: ContentAsset) => void;
}

const INTERNAL_STATUS_COLORS: Record<InternalStatus, string> = {
  [InternalStatus.DRAFT]: "bg-gray-100 text-gray-800 border-gray-200",
  [InternalStatus.QA_PASSED]: "bg-blue-100 text-blue-800 border-blue-200",
  [InternalStatus.SENT_TO_CLIENT]: "bg-green-100 text-green-800 border-green-200",
};

const STATUS_TRANSITIONS: Record<InternalStatus, InternalStatus | null> = {
  [InternalStatus.DRAFT]: InternalStatus.QA_PASSED,
  [InternalStatus.QA_PASSED]: InternalStatus.SENT_TO_CLIENT,
  [InternalStatus.SENT_TO_CLIENT]: null, // Terminal state
};

export function AssetDetailModal({
  asset: initialAsset,
  open,
  onClose,
  onUpdate,
}: AssetDetailModalProps) {
  const [asset, setAsset] = useState(initialAsset);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    setAsset(initialAsset);
  }, [initialAsset]);

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, asset.id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const response = await fetch(
        `/api/ops-desk/comments?entityType=${CommentEntityType.CONTENT_ASSET}&entityId=${asset.id}`
      );
      if (response.ok) {
        const data = await response.json();
        // Transform comments to match CommentThread interface
        const transformedComments = (data.data || []).map((comment: any) => ({
          id: comment.id,
          author: comment.author?.name || "Unknown",
          authorAvatar: comment.author?.avatar,
          body: comment.body,
          createdAt: comment.createdAt,
        }));
        setComments(transformedComments);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async (body: string) => {
    try {
      const response = await fetch("/api/ops-desk/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: CommentEntityType.CONTENT_ASSET,
          entityId: asset.id,
          body,
        }),
      });

      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };

  const handleStatusUpdate = async () => {
    const nextStatus = STATUS_TRANSITIONS[asset.internalStatus];
    if (!nextStatus) return;

    // Optimistic update
    const optimisticAsset = { ...asset, internalStatus: nextStatus };
    setAsset(optimisticAsset);
    onUpdate(optimisticAsset);

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/content-engine/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalStatus: nextStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setAsset(data.data);
        onUpdate(data.data);
      } else {
        // Revert on error
        setAsset(asset);
        onUpdate(asset);
        const errorData = await response.json();
        alert(errorData.message || "Failed to update status");
      }
    } catch (error) {
      // Revert on error
      setAsset(asset);
      onUpdate(asset);
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const assetType = getContentAssetType(asset.type);
  const internalStatusConfig = getInternalStatus(asset.internalStatus);
  const clientStatusConfig = getClientStatus(asset.clientStatus as any);
  const nextStatus = STATUS_TRANSITIONS[asset.internalStatus];

  const isVideo =
    asset.type === ContentAssetType.VIDEO ||
    asset.type === ContentAssetType.REEL;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Asset Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 p-6 pt-0 lg:grid-cols-2">
          {/* Left: Asset Preview */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border bg-muted">
              {isVideo ? (
                <video
                  src={asset.fileUrl}
                  controls
                  className="h-auto w-full"
                  poster={asset.thumbnailUrl || undefined}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={asset.fileUrl}
                  alt={assetType?.label || "Asset"}
                  className="h-auto w-full object-contain"
                  onError={(e) => {
                    // Fallback to thumbnail if main file fails
                    if (asset.thumbnailUrl) {
                      e.currentTarget.src = asset.thumbnailUrl;
                    }
                  }}
                />
              )}
            </div>

            {/* Download Button */}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.open(asset.fileUrl, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Asset
            </Button>
          </div>

          {/* Right: Metadata and Actions */}
          <div className="space-y-6">
            {/* Asset Metadata */}
            <div className="space-y-3">
              <h3 className="font-semibold">Asset Information</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{asset.client.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="secondary">{assetType?.label || asset.type}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Cog className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-medium">v{asset.version}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {format(new Date(asset.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>

                {asset.project && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-medium">{asset.project.title}</span>
                  </div>
                )}

                {asset.generationJob && (
                  <div className="flex items-start gap-2">
                    <Cog className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Generation Job:</span>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{asset.generationJob.id}</span>
                      <Badge variant="outline" className="mt-1 w-fit text-xs">
                        {asset.generationJob.status}
                      </Badge>
                    </div>
                  </div>
                )}

                {asset.metadata?.caption && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Caption:</span>
                    <p className="rounded-md bg-muted p-2 text-sm">
                      {asset.metadata.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Internal Status Management */}
            <div className="space-y-3">
              <h3 className="font-semibold">Internal Status</h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-sm", INTERNAL_STATUS_COLORS[asset.internalStatus])}
                >
                  {internalStatusConfig?.label || asset.internalStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {internalStatusConfig?.description}
                </span>
              </div>

              {nextStatus && (
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus}
                  className="w-full"
                  size="sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {updatingStatus
                    ? "Updating..."
                    : `Mark as ${getInternalStatus(nextStatus)?.label}`}
                </Button>
              )}

              {!nextStatus && (
                <p className="text-xs text-muted-foreground">
                  This asset has reached the final internal status.
                </p>
              )}
            </div>

            <Separator />

            {/* Client Status (Read-only) */}
            <div className="space-y-3">
              <h3 className="font-semibold">Client Status</h3>
              <Badge variant="outline">
                {clientStatusConfig?.label || asset.clientStatus}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Client-controlled status. Update via client portal.
              </p>
            </div>

            <Separator />

            {/* Comments Thread */}
            <div className="space-y-3">
              <h3 className="font-semibold">Comments</h3>
              {loadingComments ? (
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              ) : (
                <CommentThread
                  comments={comments}
                  onSubmit={handleCommentSubmit}
                  entityType={CommentEntityType.CONTENT_ASSET}
                  entityId={asset.id}
                  placeholder="Add a comment about this asset..."
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
