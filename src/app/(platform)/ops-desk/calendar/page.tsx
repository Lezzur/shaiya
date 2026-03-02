"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES, getProjectStatus } from "@/lib/constants";
import { ProjectStatus } from "@/generated/prisma";

// Configure date-fns localizer
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  deadline?: string | null;
  client: {
    id: string;
    name: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    projectId: string;
    clientId: string;
    clientName: string;
    status: ProjectStatus;
    color: string;
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");
  const [selectedClient, setSelectedClient] = useState<string>("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      // Fetch all projects without pagination
      const response = await fetch("/api/ops-desk/projects?limit=1000");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique clients for filter dropdown
  const clients = useMemo(() => {
    const clientMap = new Map<string, string>();
    projects.forEach((project) => {
      clientMap.set(project.client.id, project.client.name);
    });
    return Array.from(clientMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [projects]);

  // Transform projects to calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    return projects
      .filter((project) => {
        // Filter out projects without deadlines
        if (!project.deadline) return false;
        // Filter by selected client
        if (selectedClient !== "all" && project.client.id !== selectedClient) {
          return false;
        }
        return true;
      })
      .map((project) => {
        const deadline = new Date(project.deadline!);
        const statusConfig = getProjectStatus(project.status);

        return {
          id: project.id,
          title: `${project.title} — ${project.client.name}`,
          start: deadline,
          end: deadline,
          resource: {
            projectId: project.id,
            clientId: project.client.id,
            clientName: project.client.name,
            status: project.status,
            color: statusConfig?.color || "gray",
          },
        };
      });
  }, [projects, selectedClient]);

  const handleEventClick = (event: CalendarEvent) => {
    router.push(`/ops-desk/projects/${event.resource.projectId}`);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  // Custom event style based on project status
  const eventStyleGetter = (event: CalendarEvent) => {
    const colorMap: Record<string, string> = {
      gray: "#6b7280",
      blue: "#3b82f6",
      purple: "#a855f7",
      yellow: "#eab308",
      orange: "#f97316",
      red: "#ef4444",
      green: "#22c55e",
    };

    const backgroundColor = colorMap[event.resource.color] || "#6b7280";

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
        fontSize: "0.875rem",
        padding: "2px 4px",
      },
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View all project deadlines at a glance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Client Filter */}
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Status Legend:</span>
          {PROJECT_STATUSES.map((status) => {
            const colorMap: Record<string, string> = {
              gray: "bg-gray-500",
              blue: "bg-blue-500",
              purple: "bg-purple-500",
              yellow: "bg-yellow-500",
              orange: "bg-orange-500",
              red: "bg-red-500",
              green: "bg-green-500",
            };
            return (
              <div key={status.value} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded ${colorMap[status.color] || "bg-gray-500"}`}
                />
                <span className="text-sm">{status.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-6">
        <div style={{ height: "700px" }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={handleViewChange}
            views={["month", "week", "day"]}
            onSelectEvent={handleEventClick}
            eventPropGetter={eventStyleGetter}
            popup
            tooltipAccessor={(event) =>
              `${event.title}\nStatus: ${getProjectStatus(event.resource.status)?.label || event.resource.status}`
            }
          />
        </div>
      </Card>

      {/* Stats */}
      <Card className="p-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="font-medium">Total Projects: </span>
            <span className="text-muted-foreground">{projects.length}</span>
          </div>
          <div>
            <span className="font-medium">With Deadlines: </span>
            <span className="text-muted-foreground">
              {projects.filter((p) => p.deadline).length}
            </span>
          </div>
          <div>
            <span className="font-medium">Filtered: </span>
            <span className="text-muted-foreground">{events.length}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
