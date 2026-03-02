"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Edit,
  Archive,
  Plus,
  FolderOpen,
  FileText,
  Activity as ActivityIcon,
  Mail,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { MetricCard } from "@/components/shared/metric-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFeed, Activity } from "@/components/shared/activity-feed";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { getHealthStatus, getProjectStatus, getInvoiceStatus } from "@/lib/constants";
import { HealthStatus, ProjectStatus, InvoiceStatus } from "@/generated/prisma";

interface PrimaryContact {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
}

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  deadline: string | null;
  createdAt: string;
}

interface InvoiceSummary {
  totalAmount: number;
  paidAmount: number;
  outstandingCount: number;
}

interface Client {
  id: string;
  name: string;
  logo: string | null;
  industry: string | null;
  packageTier: string | null;
  monthlyValue: number;
  lifetimeValue: number;
  healthStatus: HealthStatus;
  renewalDate: string | null;
  primaryContact: PrimaryContact | null;
  projects: Project[];
  invoiceSummary: InvoiceSummary;
  createdAt: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchClient();
    fetchActivities();
  }, [params.id]);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/ops-desk/clients/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      const json = await res.json();
      setClient(json.data);
    } catch (error) {
      console.error("Error fetching client:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    // TODO: Implement activity fetching filtered by client
    // For now, using empty array
    setActivities([]);
  };

  const handleArchive = async () => {
    try {
      const res = await fetch(`/api/ops-desk/clients/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to archive client");
      router.push("/ops-desk/clients");
    } catch (error) {
      console.error("Error archiving client:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Client not found</h2>
          <Button className="mt-4" onClick={() => router.push("/ops-desk/clients")}>
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const healthStatusConfig = getHealthStatus(client.healthStatus);
  const daysUntilRenewal = client.renewalDate
    ? Math.ceil(
        (new Date(client.renewalDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;
  const showRenewalCountdown = daysUntilRenewal !== null && daysUntilRenewal <= 60;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4 border-b pb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
          {client.logo ? (
            <img
              src={client.logo}
              alt={client.name}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {healthStatusConfig && (
                <StatusBadge
                  status={healthStatusConfig.label}
                  variant="health"
                />
              )}
              {client.packageTier && (
                <StatusBadge status={client.packageTier} />
              )}
              <div className="text-sm text-muted-foreground">
                {formatCurrency(client.monthlyValue)}/mo
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveDialogOpen(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">
            Projects ({client.projects.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({client.invoiceSummary.outstandingCount})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Monthly Value"
              value={formatCurrency(client.monthlyValue)}
            />
            <MetricCard
              title="Lifetime Value"
              value={formatCurrency(client.lifetimeValue)}
            />
            <MetricCard
              title="Total Projects"
              value={client.projects.length}
            />
            <MetricCard
              title="Outstanding Invoices"
              value={client.invoiceSummary.outstandingCount}
            />
          </div>

          {/* Renewal Date */}
          {client.renewalDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Renewal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Next Renewal</p>
                    <p className="text-lg font-medium">
                      {formatDate(client.renewalDate)}
                    </p>
                  </div>
                  {showRenewalCountdown && (
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        daysUntilRenewal <= 30
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      <p className="text-2xl font-bold">{daysUntilRenewal}</p>
                      <p className="text-xs">days remaining</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Primary Contact */}
          {client.primaryContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Primary Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    {client.primaryContact.avatar ? (
                      <img
                        src={client.primaryContact.avatar}
                        alt={client.primaryContact.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-medium">
                        {client.primaryContact.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{client.primaryContact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.primaryContact.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {client.primaryContact.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                router.push(`/ops-desk/projects/new?clientId=${client.id}`)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          {client.projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              description="Create your first project for this client to get started."
              action={{
                label: "New Project",
                onClick: () =>
                  router.push(`/ops-desk/projects/new?clientId=${client.id}`),
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {client.projects.map((project) => {
                    const statusConfig = getProjectStatus(project.status);
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          router.push(`/ops-desk/projects/${project.id}`)
                        }
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{project.title}</h3>
                          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                            {project.deadline && (
                              <span>Due {formatDate(project.deadline)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {statusConfig && (
                            <StatusBadge
                              status={statusConfig.label}
                              variant="project"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>

          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Invoice data will appear here when available."
            action={{
              label: "New Invoice",
              onClick: () => {
                // TODO: Navigate to invoice creation
              },
            }}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={activities} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive Client"
        description={`Are you sure you want to archive ${client.name}? This will mark the client as churned.`}
        onConfirm={handleArchive}
        confirmText="Archive"
        variant="danger"
      />
    </div>
  );
}
