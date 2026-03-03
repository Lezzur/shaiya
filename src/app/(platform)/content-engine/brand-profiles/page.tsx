import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { db } from "@/lib/db";
import { BrandProfilesTable } from "./brand-profiles-table";

async function getBrandProfiles() {
  try {
    const brandProfiles = await db.brandProfile.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      data: brandProfiles.map((bp) => ({
        id: bp.id,
        clientId: bp.clientId,
        createdAt: bp.createdAt.toISOString(),
        updatedAt: bp.updatedAt.toISOString(),
        client: bp.client,
      })),
    };
  } catch (error) {
    console.error("Error fetching brand profiles:", error);
    return { data: [] };
  }
}

export default async function BrandProfilesPage() {
  const { data: brandProfiles } = await getBrandProfiles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Brand Profiles</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage client brand guidelines and content generation parameters
          </p>
        </div>
        <Button asChild>
          <Link href="/content-engine/brand-profiles/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Brand Profile
          </Link>
        </Button>
      </div>

      {/* Table */}
      <BrandProfilesTable data={brandProfiles} />
    </div>
  );
}
