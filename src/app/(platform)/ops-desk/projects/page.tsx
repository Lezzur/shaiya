"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { KanbanBoard, KanbanColumn, KanbanItem } from "@/components/shared/kanban-board";
import { PROJECT_STATUSES } from "@/lib/constants";
import { ProjectStatus } from "@/generated/prisma";
import { formatDate, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  deadline?: string | null;
  client: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface ErrorToast {
  id: number;
  message: string;
}

export default function ProjectsKanbanPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorToasts, setErrorToasts] = useState<ErrorToast[]>([]);

  // Filter state
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");

  const showError = useCallback((message: string) => {
    const id = Date.now();
    setErrorToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setErrorToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ limit: "200" });
      if (clientFilter && clientFilter !== "all") {
        params.set("clientId", clientFilter);
      }
      if (assignedToFilter && assignedToFilter !== "all") {
        params.set("assignedToId", assignedToFilter);
      }

      const response = await fetch(`/api/ops-desk/projects?${params}`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.data);
    } catch {
      showError("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [clientFilter, assignedToFilter, showError]);

  const fetchFiltersData = useCallback(async () => {
    try {
      const [clientsRes, usersRes] = await Promise.all([
        fetch("/api/ops-desk/clients?limit=100"),
        fetch("/api/ops-desk/users?limit=100"),
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.data || []);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data || []);
      }
    } catch {
      console.error("Failed to fetch filter data");
    }
  }, []);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleMove = async (
    projectId: string,
    _sourceColumnId: string,
    destinationColumnId: string
  ) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === destinationColumnId) return;

    const previousProjects = [...projects];

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, status: destinationColumnId as ProjectStatus } : p
      )
    );

    try {
      const response = await fetch(`/api/ops-desk/projects/${projectId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destinationColumnId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }
    } catch {
      // Revert optimistic update
      setProjects(previousProjects);
      showError("Failed to update project status");
    }
  };

  const getDeadlineStyle = (deadline?: string | null): { className: string; label: string } => {
    if (!deadline) return { className: "text-muted-foreground", label: "" };

    const daysUntil = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) {
      return { className: "text-red-600 font-medium", label: formatDate(deadline) };
    }
    if (daysUntil <= 3) {
      return { className: "text-amber-600 font-medium", label: formatDate(deadline) };
    }
    return { className: "text-muted-foreground", label: formatDate(deadline) };
  };

  const columns: KanbanColumn[] = PROJECT_STATUSES.map((status) => ({
    id: status.value,
    title: status.label,
    color: status.color,
  }));

  const items: KanbanItem[] = projects.map((project) => {
    const deadlineStyle = getDeadlineStyle(project.deadline);

    return {
      id: project.id,
      columnId: project.status,
      content: (
        <Card className="p-3 bg-white cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
          <Link
            href={`/ops-desk/projects/${project.id}`}
            className="font-medium text-sm hover:underline block"
            onClick={(e) => e.stopPropagation()}
          >
            {project.title}
          </Link>
          <p className="text-xs text-muted-foreground mt-1">{project.client.name}</p>
          <div className="flex items-center justify-between mt-2">
            {project.deadline ? (
              <span className={cn("text-xs", deadlineStyle.className)}>
                {deadlineStyle.label}
              </span>
            ) : (
              <span />
            )}
            {project.assignedTo ? (
              <Avatar className="h-6 w-6">
                {project.assignedTo.avatar ? (
                  <AvatarImage src={project.assignedTo.avatar} alt={project.assignedTo.name} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {getInitials(project.assignedTo.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30" />
            )}
          </div>
        </Card>
      ),
    };
  });

  return (
    <div className="p-6 space-y-4">
      {/* Error Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {errorToasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-red-600 text-white px-4 py-2 rounded-md shadow-lg animate-in slide-in-from-top-2"
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assigned</SelectItem>
              <SelectItem value="null">Unassigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild>
            <Link href="/ops-desk/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading projects...</div>
        </div>
      ) : (
        <KanbanBoard columns={columns} items={items} onMove={handleMove} />
      )}
    </div>
  );
}
