"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Briefcase, Target, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFeed, Activity } from "@/components/shared/activity-feed";
import { getInitials, formatDate } from "@/lib/format";

interface Project {
  id: string;
  title: string;
  status: string;
  deadline?: string | null;
  client: {
    id: string;
    name: string;
  };
}

interface TeamMemberDetail {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  capacity: number;
  skills: string[];
  assignedProjects: Project[];
  createdAt: string;
  updatedAt: string;
}

export default function TeamMemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<TeamMemberDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberDetails();
    fetchActivities();
  }, [memberId]);

  const fetchMemberDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ops-desk/users/${memberId}`);
      if (!response.ok) throw new Error("Failed to fetch member details");
      const data = await response.json();
      setMember(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(
        `/api/ops-desk/activity?entityType=user&entityId=${memberId}`
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(
          data.map((a: { id: string; actor: { name: string }; module: string; action: string; entityType: string; entityId: string; timestamp: string; metadata: Record<string, unknown> }) => ({
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "TEAM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "CLIENT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "ACTIVE":
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="text-center py-12 text-muted-foreground">Loading member details...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/ops-desk/team")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Team Member</h1>
        </div>
        <div className="text-center py-12 text-red-600">
          {error || "Member not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/ops-desk/team")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{member.name}</h1>
            <p className="text-muted-foreground">Team Member Details</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-zinc-900 text-white text-2xl">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold">{member.name}</h2>
                  <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{member.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Projects</p>
                  <p className="text-lg font-semibold">{member.assignedProjects.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="text-lg font-semibold">{member.capacity} projects</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Skills</p>
                  <p className="text-lg font-semibold">{member.skills.length}</p>
                </div>
              </div>
            </div>

            {/* Skills */}
            {member.skills && member.skills.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {member.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">
            Assigned Projects ({member.assignedProjects.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assigned Projects</h3>
            {member.assignedProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No projects assigned yet
              </div>
            ) : (
              <div className="space-y-3">
                {member.assignedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/ops-desk/projects/${project.id}`}
                    className="block p-4 rounded-lg border hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{project.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Client: {project.client.name}
                        </p>
                        {project.deadline && (
                          <p className="text-sm text-muted-foreground">
                            Deadline: {formatDate(project.deadline)}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={getProjectStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
