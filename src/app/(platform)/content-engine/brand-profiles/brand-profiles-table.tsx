"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";

type BrandProfile = {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  };
};

type BrandProfilesTableProps = {
  data: BrandProfile[];
};

export function BrandProfilesTable({ data }: BrandProfilesTableProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No brand profiles"
        description="Create your first brand profile to get started with content generation."
      />
    );
  }

  const columns = [
    {
      header: "Client",
      accessor: "client.name" as const,
      render: (row: BrandProfile) => (
        <Link
          href={`/content-engine/brand-profiles/${row.id}`}
          className="font-medium hover:text-zinc-900 hover:underline"
        >
          {row.client.name}
        </Link>
      ),
    },
    {
      header: "Created",
      accessor: "createdAt" as const,
      render: (row: BrandProfile) => (
        <span className="text-sm text-zinc-600">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      header: "Last Updated",
      accessor: "updatedAt" as const,
      render: (row: BrandProfile) => (
        <span className="text-sm text-zinc-600">
          {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
