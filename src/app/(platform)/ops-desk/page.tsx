import Link from "next/link";
import { db } from "@/lib/db";
import { ProjectStatus, InvoiceStatus, HealthStatus, ActivityModule } from "@/generated/prisma";
import { MetricCard } from "@/components/shared/metric-card";
import { ActivityFeed, Activity } from "@/components/shared/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { differenceInDays } from "date-fns";

// Project status colors for the bar chart
const statusColors: Record<ProjectStatus, string> = {
  BRIEFING: "bg-slate-400",
  ASSET_PREP: "bg-blue-400",
  IN_PRODUCTION: "bg-indigo-500",
  INTERNAL_REVIEW: "bg-yellow-500",
  CLIENT_REVIEW: "bg-orange-500",
  REVISION: "bg-red-400",
  APPROVED: "bg-emerald-400",
  DELIVERED: "bg-green-600",
};

// Human-readable status labels
const statusLabels: Record<ProjectStatus, string> = {
  BRIEFING: "Briefing",
  ASSET_PREP: "Asset Prep",
  IN_PRODUCTION: "In Production",
  INTERNAL_REVIEW: "Internal Review",
  CLIENT_REVIEW: "Client Review",
  REVISION: "Revision",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
};

// Active statuses (not APPROVED or DELIVERED)
const activeStatuses = [
  ProjectStatus.BRIEFING,
  ProjectStatus.ASSET_PREP,
  ProjectStatus.IN_PRODUCTION,
  ProjectStatus.INTERNAL_REVIEW,
  ProjectStatus.CLIENT_REVIEW,
  ProjectStatus.REVISION,
];

async function getDashboardData() {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    mrrResult,
    activeProjectsCount,
    overdueInvoicesCount,
    teamMembers,
    projectsByStatus,
    upcomingDeadlines,
    recentActivity,
  ] = await Promise.all([
    // MRR: SUM of monthlyValue from clients WHERE healthStatus != CHURNED
    db.client.aggregate({
      _sum: { monthlyValue: true },
      where: { healthStatus: { not: HealthStatus.CHURNED } },
    }),

    // Active Projects: COUNT of projects WHERE status NOT IN [APPROVED, DELIVERED]
    db.project.count({
      where: { status: { in: activeStatuses } },
    }),

    // Overdue Invoices: COUNT of invoices WHERE status = OVERDUE
    db.invoice.count({
      where: { status: InvoiceStatus.OVERDUE },
    }),

    // Team members with capacity and assigned projects for utilization
    db.user.findMany({
      where: {
        role: { in: ["ADMIN", "TEAM"] },
        capacity: { not: null },
      },
      select: {
        id: true,
        capacity: true,
        _count: {
          select: {
            assignedProjects: {
              where: { status: { in: activeStatuses } },
            },
          },
        },
      },
    }),

    // Projects by status (all statuses for the chart)
    db.project.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Deadlines this week
    db.project.findMany({
      where: {
        deadline: {
          gte: now,
          lte: nextWeek,
        },
        status: { in: activeStatuses },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        client: {
          select: { name: true },
        },
      },
      orderBy: { deadline: "asc" },
      take: 10,
    }),

    // Recent activity (last 20 items from OPS_DESK module)
    db.activityLog.findMany({
      where: { module: ActivityModule.OPS_DESK },
      include: {
        actor: {
          select: { name: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),
  ]);

  // Calculate MRR
  const mrr = mrrResult._sum.monthlyValue
    ? Number(mrrResult._sum.monthlyValue)
    : 0;

  // Calculate team utilization
  let teamUtilization = 0;
  if (teamMembers.length > 0) {
    const totalUtilization = teamMembers.reduce((sum, member) => {
      const capacity = member.capacity || 1;
      const assigned = member._count.assignedProjects;
      return sum + Math.min(assigned / capacity, 1);
    }, 0);
    teamUtilization = totalUtilization / teamMembers.length;
  }

  // Convert projects by status to a map
  const statusCounts = new Map<ProjectStatus, number>();
  for (const status of Object.values(ProjectStatus)) {
    statusCounts.set(status, 0);
  }
  for (const group of projectsByStatus) {
    statusCounts.set(group.status, group._count.id);
  }

  // Transform activity for the feed
  const activities: Activity[] = recentActivity.map((log) => ({
    id: log.id,
    actor: log.actor.name,
    module: log.module,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    timestamp: log.timestamp,
    metadata: log.metadata as Record<string, unknown> | undefined,
  }));

  return {
    mrr,
    activeProjectsCount,
    overdueInvoicesCount,
    teamUtilization,
    statusCounts,
    upcomingDeadlines,
    activities,
  };
}

export default async function OpsDeskPage() {
  const {
    mrr,
    activeProjectsCount,
    overdueInvoicesCount,
    teamUtilization,
    statusCounts,
    upcomingDeadlines,
    activities,
  } = await getDashboardData();

  // Calculate max count for bar chart scaling
  const maxCount = Math.max(...Array.from(statusCounts.values()), 1);

  return (
    <div className="space-y-6">
      {/* Top row: 4 MetricCards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(mrr)}
          description="Active clients"
        />
        <MetricCard
          title="Active Projects"
          value={activeProjectsCount}
          description="In progress"
        />
        <MetricCard
          title="Overdue Invoices"
          value={overdueInvoicesCount}
          description="Needs attention"
        />
        <MetricCard
          title="Team Utilization"
          value={`${Math.round(teamUtilization * 100)}%`}
          description="Avg workload"
        />
      </div>

      {/* Middle row: Projects by Stage (2/3) + Deadlines This Week (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Projects by Stage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.values(ProjectStatus).map((status) => {
                const count = statusCounts.get(status) || 0;
                const percentage = (count / maxCount) * 100;
                return (
                  <Link
                    key={status}
                    href={`/ops-desk/projects?status=${status}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-28 text-sm text-muted-foreground group-hover:text-foreground truncate">
                        {statusLabels[status]}
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full ${statusColors[status]} transition-all group-hover:opacity-80`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-sm font-medium text-right">
                        {count}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Deadlines This Week */}
        <Card>
          <CardHeader>
            <CardTitle>Deadlines This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming deadlines
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((project) => {
                  const daysRemaining = project.deadline
                    ? differenceInDays(project.deadline, new Date())
                    : 0;
                  return (
                    <Link
                      key={project.id}
                      href={`/ops-desk/projects/${project.id}`}
                      className="block group"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium group-hover:text-primary truncate">
                          {project.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.client.name}
                        </p>
                        <p
                          className={`text-xs font-medium ${
                            daysRemaining <= 1
                              ? "text-red-600"
                              : daysRemaining <= 3
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {daysRemaining === 0
                            ? "Due today"
                            : daysRemaining === 1
                              ? "Due tomorrow"
                              : `${daysRemaining} days remaining`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}
