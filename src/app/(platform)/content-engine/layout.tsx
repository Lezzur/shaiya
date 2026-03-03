"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Zap, FileCode, ListTodo, Image, DollarSign } from "lucide-react";

const subNavItems = [
  {
    name: "Overview",
    href: "/content-engine",
    icon: LayoutDashboard,
  },
  {
    name: "Brand Profiles",
    href: "/content-engine/brand-profiles",
    icon: Users,
  },
  {
    name: "Pipelines",
    href: "/content-engine/pipelines",
    icon: Zap,
  },
  {
    name: "Prompt Library",
    href: "/content-engine/prompt-library",
    icon: FileCode,
  },
  {
    name: "Queue",
    href: "/content-engine/queue",
    icon: ListTodo,
  },
  {
    name: "Gallery",
    href: "/content-engine/gallery",
    icon: Image,
  },
  {
    name: "Cost Tracker",
    href: "/content-engine/cost-tracker",
    icon: DollarSign,
  },
];

export default function ContentEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="border-b bg-white">
        <nav className="flex gap-6 px-1">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
