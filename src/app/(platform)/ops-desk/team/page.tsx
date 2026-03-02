"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { getInitials } from "@/lib/format";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  capacity: number;
  skills: string[];
  assignedProjectsCount: number;
}

export default function TeamPage() {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/ops-desk/team");
      if (!response.ok) throw new Error("Failed to fetch team members");
      const data = await response.json();
      setTeamMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkloadStatus = (projectsCount: number, capacity: number) => {
    if (capacity === 0) return { label: "No capacity set", color: "text-muted-foreground", icon: null };
    const ratio = projectsCount / capacity;

    if (ratio >= 1) {
      return { label: "Overloaded", color: "text-red-600", icon: AlertCircle };
    } else if (ratio >= 0.8) {
      return { label: "At capacity", color: "text-orange-600", icon: AlertCircle };
    } else {
      return { label: "Available", color: "text-green-600", icon: CheckCircle };
    }
  };

  const getProgressPercentage = (projectsCount: number, capacity: number) => {
    if (capacity === 0) return 0;
    return Math.min((projectsCount / capacity) * 100, 100);
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

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">Loading team members...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team</h1>
        </div>
        <div className="text-center py-12 text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team</h1>
        <Button onClick={() => router.push("/settings/team")}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Workload Overview */}
      {teamMembers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Workload Overview</h3>
          <div className="space-y-3">
            {teamMembers.map((member) => {
              const percentage = getProgressPercentage(member.assignedProjectsCount, member.capacity);
              const status = getWorkloadStatus(member.assignedProjectsCount, member.capacity);
              const StatusIcon = status.icon;

              return (
                <div key={member.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{member.name}</span>
                    <div className="flex items-center gap-2">
                      {StatusIcon && <StatusIcon className={`h-4 w-4 ${status.color}`} />}
                      <span className={status.color}>
                        {member.assignedProjectsCount} / {member.capacity}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        percentage >= 100
                          ? "bg-red-500"
                          : percentage >= 80
                          ? "bg-orange-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Team Members Grid */}
      {teamMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members"
          description="Get started by inviting your first team member."
          action={{
            label: "Invite Member",
            onClick: () => router.push("/settings/team"),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => {
            const status = getWorkloadStatus(member.assignedProjectsCount, member.capacity);
            const StatusIcon = status.icon;

            return (
              <Card
                key={member.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/ops-desk/team/${member.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-zinc-900 text-white">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{member.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                      {member.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Workload */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Workload</span>
                      <div className="flex items-center gap-1">
                        {StatusIcon && <StatusIcon className={`h-3 w-3 ${status.color}`} />}
                        <span className={`font-medium ${status.color}`}>
                          {member.assignedProjectsCount} / {member.capacity}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          getProgressPercentage(member.assignedProjectsCount, member.capacity) >= 100
                            ? "bg-red-500"
                            : getProgressPercentage(member.assignedProjectsCount, member.capacity) >= 80
                            ? "bg-orange-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${getProgressPercentage(member.assignedProjectsCount, member.capacity)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Skills */}
                  {member.skills && member.skills.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {member.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{member.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
