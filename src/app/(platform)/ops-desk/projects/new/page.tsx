"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES } from "@/lib/constants";
import { ProjectStatus } from "@/generated/prisma";

interface Client {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId");

  // Form state
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(clientIdParam || "");
  const [brief, setBrief] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.BRIEFING);

  // Data fetching state
  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoadingClients(true);
        const response = await fetch("/api/ops-desk/clients?limit=100");
        if (!response.ok) throw new Error("Failed to fetch clients");
        const result = await response.json();
        setClients(result.data || []);
      } catch (err) {
        console.error("Error fetching clients:", err);
        setError("Failed to load clients");
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setIsLoadingTeam(true);
        const response = await fetch("/api/ops-desk/team");
        if (!response.ok) throw new Error("Failed to fetch team members");
        const data = await response.json();
        setTeamMembers(data || []);
      } catch (err) {
        console.error("Error fetching team members:", err);
        setError("Failed to load team members");
      } finally {
        setIsLoadingTeam(false);
      }
    };

    fetchTeamMembers();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!clientId) {
      setError("Client is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        clientId,
        status,
      };

      // Add optional fields if provided
      if (brief.trim()) {
        payload.brief = brief.trim();
      }

      if (deadline) {
        payload.deadline = new Date(deadline).toISOString();
      }

      if (assignedToId) {
        payload.assignedToId = assignedToId;
      }

      const response = await fetch("/api/ops-desk/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const newProject = await response.json();

      // Redirect to the new project's detail page
      router.push(`/ops-desk/projects/${newProject.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/ops-desk/projects");
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">New Project</h1>
        </div>
        <p className="text-muted-foreground ml-12">
          Create a new project for a client
        </p>
      </div>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-600">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter project title"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label htmlFor="client">
              Client <span className="text-red-600">*</span>
            </Label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              disabled={isLoadingClients || isSubmitting}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingClients && (
              <p className="text-xs text-muted-foreground">Loading clients...</p>
            )}
          </div>

          {/* Brief */}
          <div className="space-y-2">
            <Label htmlFor="brief">Brief</Label>
            <Textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Enter project brief (optional)"
              className="min-h-[120px]"
              disabled={isSubmitting}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Select
              value={assignedToId || "unassigned"}
              onValueChange={(value) => setAssignedToId(value === "unassigned" ? "" : value)}
              disabled={isLoadingTeam || isSubmitting}
            >
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder="Select team member (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingTeam && (
              <p className="text-xs text-muted-foreground">
                Loading team members...
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ProjectStatus)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((statusOption) => (
                  <SelectItem key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
