import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { HealthStatus, Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { ClientsTable } from "./clients-table";

async function getClients(searchParams: {
  search?: string;
  healthStatus?: string;
}) {
  try {
    const where: Prisma.ClientWhereInput = {};

    if (searchParams.search) {
      where.name = { contains: searchParams.search, mode: "insensitive" };
    }

    if (searchParams.healthStatus && searchParams.healthStatus !== "all") {
      where.healthStatus = searchParams.healthStatus as HealthStatus;
    }

    const clients = await db.client.findMany({
      where,
      include: {
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: clients.map((c) => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        packageTier: c.packageTier,
        monthlyValue: Number(c.monthlyValue),
        healthStatus: c.healthStatus,
        renewalDate: c.renewalDate ? c.renewalDate.toISOString() : null,
        _count: c._count,
      })),
    };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { data: [] };
  }
}

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
      <ClientsTable data={clients} />
    </div>
  );
}
