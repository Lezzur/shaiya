import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OpsDeskPage() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900">Ops Desk Dashboard</h1>
        <p className="mt-2 text-lg text-zinc-600">Coming soon</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/ops-desk/clients">Go to Clients</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
