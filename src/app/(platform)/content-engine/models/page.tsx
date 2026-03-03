import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ModelActiveToggle } from "./model-active-toggle";

async function getModels() {
  const models = await db.modelRegistry.findMany({
    orderBy: { name: "asc" },
  });

  return models.map((model) => ({
    id: model.id,
    name: model.name,
    provider: model.provider,
    costPerUnit: Number(model.costPerUnit),
    unitType: model.unitType,
    qualityBenchmark: model.qualityBenchmark ? Number(model.qualityBenchmark) : null,
    isActive: model.isActive,
  }));
}

export default async function ModelsPage() {
  const models = await getModels();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Model Registry</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage AI models and their configurations
          </p>
        </div>
        <Button asChild>
          <Link href="/content-engine/models/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Model
          </Link>
        </Button>
      </div>

      {/* Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Models</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Unit Type</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No models registered. Click &quot;Add Model&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.provider}</TableCell>
                    <TableCell>{formatCurrency(model.costPerUnit)}</TableCell>
                    <TableCell>{model.unitType}</TableCell>
                    <TableCell>
                      {model.qualityBenchmark !== null ? (
                        <QualityBar value={model.qualityBenchmark} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ModelActiveToggle
                        modelId={model.id}
                        isActive={model.isActive}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/content-engine/models/${model.id}`}
                        className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
                      >
                        View Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function QualityBar({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const barColor =
    percentage >= 80
      ? "bg-green-500"
      : percentage >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-zinc-200">
        <div
          className={`h-2 rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{percentage}%</span>
    </div>
  );
}
