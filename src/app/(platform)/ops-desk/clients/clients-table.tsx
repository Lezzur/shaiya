"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getHealthStatus } from "@/lib/constants";
import { HealthStatus } from "@/generated/prisma";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  packageTier: string | null;
  monthlyValue: number;
  healthStatus: HealthStatus;
  renewalDate: string | null;
  _count: {
    projects: number;
  };
}

function isRenewalSoon(renewalDate: string | null): boolean {
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
      const renewalDate = row.getValue("renewalDate") as string | null;
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

export function ClientsTable({ data }: { data: Client[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search clients..."
    />
  );
}
