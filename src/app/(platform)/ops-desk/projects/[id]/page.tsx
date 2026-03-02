"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Edit,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  FileIcon,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { CommentThread } from "@/components/shared/comment-thread";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { FileUploader } from "@/components/shared/file-uploader";
import { formatDate, formatDuration, getInitials } from "@/lib/format";
import { PROJECT_STATUSES, DELIVERABLE_STATUSES, getProjectStatus } from "@/lib/constants";
import { ProjectStatus, DeliverableStatus } from "@/generated/prisma";
import type { Activity } from "@/components/shared/activity-feed";
import type { Comment } from "@/components/shared/comment-thread";

interface Deliverable {
  id: string;
  title: string;
  status: DeliverableStatus;
  order: number;
  contentAsset?: {
    id: string;
    type: string;
    fileUrl: string;
    thumbnailUrl?: string;
  } | null;
}

interface ContentAsset {
  id: string;
  type: string;
  fileUrl: string;
  thumbnailUrl?: string;
  version: number;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  brief?: string | null;
  status: ProjectStatus;
  deadline?: string | null;
  timeTrackedMinutes: number;
  client: {
    id: string;
    name: string;
    logo?: string | null;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  deliverables: Deliverable[];
  contentAssets: ContentAsset[];
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      avatar?: string | null;
    };
  }>;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Brief editing state
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefValue, setBriefValue] = useState("");

  // Deliverable adding state
  const [newDeliverableTitle, setNewDeliverableTitle] = useState("");
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchActivities();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ops-desk/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      const data = await response.json();
      setProject(data);
      setBriefValue(data.brief || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(
        `/api/ops-desk/activity?entityType=project&entityId=${projectId}`
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(
          data.map((a: any) => ({
            id: a.id,
            actor: a.actor.name,
            module: a.module,
            action: a.action,
            entityType: a.entityType,
            entityId: a.entityId,
            timestamp: a.timestamp,
            metadata: a.metadata,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  };

  const updateProjectStatus = async (status: ProjectStatus) => {
    if (!project) return;
    try {
      const response = await fetch(`/api/ops-desk/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      await fetchProject();
      await fetchActivities();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const saveBrief = async () => {
    if (!project) return;
    try {
      const response = await fetch(`/api/ops-desk/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: briefValue }),
      });
      if (!response.ok) throw new Error("Failed to save brief");
      await fetchProject();
      setIsEditingBrief(false);
    } catch (err) {
      console.error("Failed to save brief:", err);
    }
  };

  const toggleDeliverableStatus = async (deliverableId: string, currentStatus: DeliverableStatus) => {
    const newStatus = currentStatus === DeliverableStatus.DONE_D
      ? DeliverableStatus.PENDING_D
      : DeliverableStatus.DONE_D;

    try {
      const response = await fetch(`/api/ops-desk/deliverables/${deliverableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update deliverable");
      await fetchProject();
    } catch (err) {
      console.error("Failed to update deliverable:", err);
    }
  };

  const addDeliverable = async () => {
    if (!newDeliverableTitle.trim() || !project) return;

    setIsAddingDeliverable(true);
    try {
      const response = await fetch("/api/ops-desk/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: newDeliverableTitle,
          status: DeliverableStatus.PENDING_D,
        }),
      });
      if (!response.ok) throw new Error("Failed to add deliverable");
      await fetchProject();
      setNewDeliverableTitle("");
    } catch (err) {
      console.error("Failed to add deliverable:", err);
    } finally {
      setIsAddingDeliverable(false);
    }
  };

  const moveDeliverable = async (deliverableId: string, direction: "up" | "down") => {
    if (!project) return;

    const deliverables = [...project.deliverables].sort((a, b) => a.order - b.order);
    const index = deliverables.findIndex((d) => d.id === deliverableId);
    if (index === -1) return;

    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === deliverables.length - 1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const currentOrder = deliverables[index].order;
    const swapOrder = deliverables[swapIndex].order;

    try {
      await fetch(`/api/ops-desk/deliverables/${deliverables[index].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: swapOrder }),
      });

      await fetch(`/api/ops-desk/deliverables/${deliverables[swapIndex].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: currentOrder }),
      });

      await fetchProject();
    } catch (err) {
      console.error("Failed to reorder deliverable:", err);
    }
  };

  const deleteDeliverable = async (deliverableId: string) => {
    try {
      const response = await fetch(`/api/ops-desk/deliverables/${deliverableId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete deliverable");
      await fetchProject();
    } catch (err) {
      console.error("Failed to delete deliverable:", err);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    console.log("Uploading files:", files);
    // TODO: Implement R2 upload flow
    // For now, this is a placeholder
  };

  const handleCommentSubmit = async (body: string) => {
    if (!project) return;

    try {
      const response = await fetch("/api/ops-desk/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "PROJECT",
          entityId: project.id,
          body,
        }),
      });
      if (!response.ok) throw new Error("Failed to post comment");
      await fetchProject();
      await fetchActivities();
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const getDeadlineColor = (deadline?: string | null) => {
    if (!deadline) return "text-muted-foreground";
    const daysUntil = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) return "text-red-600 font-semibold";
    if (daysUntil <= 3) return "text-orange-600 font-semibold";
    if (daysUntil <= 7) return "text-yellow-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">
          {error || "Project not found"}
        </div>
      </div>
    );
  }

  const statusConfig = getProjectStatus(project.status);
  const comments: Comment[] = project.comments.map((c) => ({
    id: c.id,
    author: c.author.name,
    authorAvatar: c.author.avatar || undefined,
    body: c.body,
    createdAt: c.createdAt,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/ops-desk/projects")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">{project.title}</h1>
          </div>
          <div className="flex items-center gap-3 ml-12">
            <Link
              href={`/ops-desk/clients/${project.client.id}`}
              className="text-muted-foreground hover:underline"
            >
              {project.client.name}
            </Link>
            <StatusBadge status={statusConfig?.label || project.status} />
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Info Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Deadline:</span>
            <span className={`text-sm ${getDeadlineColor(project.deadline)}`}>
              {project.deadline ? formatDate(project.deadline) : "Not set"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Assigned to:</span>
            {project.assignedTo ? (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  {project.assignedTo.avatar ? (
                    <img
                      src={project.assignedTo.avatar}
                      alt={project.assignedTo.name}
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-medium">
                      {getInitials(project.assignedTo.name)}
                    </span>
                  )}
                </div>
                <span className="text-sm">{project.assignedTo.name}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Time tracked:</span>
            <span className="text-sm">
              {formatDuration(project.timeTrackedMinutes)}
            </span>
          </div>
        </div>
      </Card>

      {/* Status Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Change Status:</span>
          <Select
            value={project.status}
            onValueChange={(value) => updateProjectStatus(value as ProjectStatus)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="brief" className="space-y-4">
        <TabsList>
          <TabsTrigger value="brief">Brief</TabsTrigger>
          <TabsTrigger value="deliverables">
            Deliverables ({project.deliverables.length})
          </TabsTrigger>
          <TabsTrigger value="files">
            Files ({project.contentAssets.length})
          </TabsTrigger>
          <TabsTrigger value="comments">
            Comments ({project.comments.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Brief Tab */}
        <TabsContent value="brief">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Project Brief</h3>
                {!isEditingBrief && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingBrief(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Brief
                  </Button>
                )}
              </div>
              {isEditingBrief ? (
                <div className="space-y-3">
                  <Textarea
                    value={briefValue}
                    onChange={(e) => setBriefValue(e.target.value)}
                    className="min-h-[200px]"
                    placeholder="Enter project brief..."
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveBrief}>Save</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBriefValue(project.brief || "");
                        setIsEditingBrief(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose max-w-none">
                  {project.brief ? (
                    <p className="whitespace-pre-wrap">{project.brief}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No brief provided</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Deliverables</h3>
              <div className="space-y-2">
                {project.deliverables
                  .sort((a, b) => a.order - b.order)
                  .map((deliverable, index) => (
                    <div
                      key={deliverable.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <input
                        type="checkbox"
                        checked={deliverable.status === DeliverableStatus.DONE_D}
                        onChange={() =>
                          toggleDeliverableStatus(deliverable.id, deliverable.status)
                        }
                        className="h-4 w-4 rounded"
                      />
                      <span
                        className={`flex-1 ${
                          deliverable.status === DeliverableStatus.DONE_D
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {deliverable.title}
                      </span>
                      {deliverable.contentAsset && (
                        <span className="text-xs text-muted-foreground">
                          Linked: {deliverable.contentAsset.type}
                        </span>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveDeliverable(deliverable.id, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveDeliverable(deliverable.id, "down")}
                          disabled={index === project.deliverables.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600"
                          onClick={() => deleteDeliverable(deliverable.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add new deliverable..."
                  value={newDeliverableTitle}
                  onChange={(e) => setNewDeliverableTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDeliverable();
                  }}
                />
                <Button
                  onClick={addDeliverable}
                  disabled={!newDeliverableTitle.trim() || isAddingDeliverable}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Project Files</h3>

              <FileUploader onUpload={handleFileUpload} />

              {project.contentAssets.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Uploaded Files</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {project.contentAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        {asset.thumbnailUrl || asset.type.includes("IMAGE") ? (
                          <div className="aspect-square bg-muted rounded flex items-center justify-center overflow-hidden">
                            {asset.thumbnailUrl ? (
                              <img
                                src={asset.thumbnailUrl}
                                alt={asset.type}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                        ) : (
                          <div className="aspect-square bg-muted rounded flex items-center justify-center">
                            <FileIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium truncate">{asset.type}</p>
                          <p className="text-xs text-muted-foreground">
                            v{asset.version} • {formatDate(asset.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Comments</h3>
            <CommentThread
              comments={comments}
              onSubmit={handleCommentSubmit}
              entityType="PROJECT"
              entityId={project.id}
            />
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
            <ActivityFeed activities={activities} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
