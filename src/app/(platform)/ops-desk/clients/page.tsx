import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getHealthStatus } from "@/lib/constants";
import { HealthStatus } from "@/generated/prisma";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  packageTier: string | null;
  monthlyValue: number;
  healthStatus: HealthStatus;
  renewalDate: Date | null;
  _count: {
    projects: number;
  };
}

async function getClients(searchParams: {
  search?: string;
  healthStatus?: string;
}): Promise<{ data: Client[] }> {
  const params = new URLSearchParams();

  if (searchParams.search) {
    params.append("search", searchParams.search);
  }

  if (searchParams.healthStatus && searchParams.healthStatus !== "all") {
    params.append("healthStatus", searchParams.healthStatus);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/ops-desk/clients?${params.toString()}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch clients");
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { data: [] };
  }
}

function isRenewalSoon(renewalDate: Date | null): boolean {
  if (!renewalDate) return false;
  const date = new Date(renewalDate);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays >= 0;
}

const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      return (
        <Link
          href={`/ops-desk/clients/${row.original.id}`}
          className="font-medium text-zinc-900 hover:underline"
        >
          {row.getValue("name")}
        </Link>
      );
    },
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) => {
      const industry = row.getValue("industry") as string | null;
      return <span className="text-zinc-600">{industry || "—"}</span>;
    },
  },
  {
    accessorKey: "packageTier",
    header: "Package Tier",
    cell: ({ row }) => {
      const tier = row.getValue("packageTier") as string | null;
      return <span className="text-zinc-600">{tier || "—"}</span>;
    },
  },
  {
    accessorKey: "monthlyValue",
    header: "Monthly Value",
    cell: ({ row }) => {
      const value = row.getValue("monthlyValue") as number;
      return (
        <span className="font-medium text-zinc-900">
          {formatCurrency(value)}
        </span>
      );
    },
  },
  {
    accessorKey: "healthStatus",
    header: "Health Status",
    cell: ({ row }) => {
      const status = row.getValue("healthStatus") as HealthStatus;
      const statusConfig = getHealthStatus(status);

      return (
        <StatusBadge
          status={statusConfig?.label || status}
          variant="health"
        />
      );
    },
  },
  {
    accessorKey: "_count.projects",
    header: "Projects",
    cell: ({ row }) => {
      const count = row.original._count.projects;
      return <span className="text-zinc-600">{count}</span>;
    },
  },
  {
    accessorKey: "renewalDate",
    header: "Renewal Date",
    cell: ({ row }) => {
      const renewalDate = row.getValue("renewalDate") as Date | null;
      if (!renewalDate) {
        return <span className="text-zinc-400">—</span>;
      }

      const isUpcoming = isRenewalSoon(renewalDate);

      return (
        <span className={isUpcoming ? "font-medium text-red-600" : "text-zinc-600"}>
          {formatDate(renewalDate)}
        </span>
      );
    },
  },
];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { search?: string; healthStatus?: string };
}) {
  const { data: clients } = await getClients(searchParams);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Clients</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage your client relationships and accounts
          </p>
        </div>
        <Button asChild>
          <Link href="/ops-desk/clients/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Client
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <form>
            <input
              type="search"
              name="search"
              placeholder="Search by name..."
              defaultValue={searchParams.search}
              className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </form>
        </div>

        <div className="w-48">
          <Select
            defaultValue={searchParams.healthStatus || "all"}
            name="healthStatus"
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value={HealthStatus.HEALTHY}>Healthy</SelectItem>
              <SelectItem value={HealthStatus.AT_RISK}>At Risk</SelectItem>
              <SelectItem value={HealthStatus.CHURNED}>Churned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={clients}
        searchKey="name"
        searchPlaceholder="Search clients..."
      />
    </div>
  );
}
