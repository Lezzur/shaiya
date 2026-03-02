import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "project" | "invoice" | "health";

const projectStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  active: "bg-blue-100 text-blue-800 border-blue-200",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
  review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const healthStatusColors: Record<string, string> = {
  excellent: "bg-green-100 text-green-800 border-green-200",
  good: "bg-blue-100 text-blue-800 border-blue-200",
  fair: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "at-risk": "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const variantMaps: Record<StatusVariant, Record<string, string>> = {
  project: projectStatusColors,
  invoice: invoiceStatusColors,
  health: healthStatusColors,
};

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  customColors?: Record<string, string>;
  className?: string;
}

export function StatusBadge({
  status,
  variant = "project",
  customColors,
  className,
}: StatusBadgeProps) {
  const colorMap = customColors || variantMaps[variant] || projectStatusColors;
  const colorClass =
    colorMap[status.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <Badge
      variant="outline"
      className={cn("capitalize", colorClass, className)}
    >
      {status}
    </Badge>
  );
}
