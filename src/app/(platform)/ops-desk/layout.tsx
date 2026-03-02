"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, FolderKanban, Receipt, Users2, Calendar } from "lucide-react";

const subNavItems = [
  {
    name: "Clients",
    href: "/ops-desk/clients",
    icon: Users,
  },
  {
    name: "Projects",
    href: "/ops-desk/projects",
    icon: FolderKanban,
  },
  {
    name: "Invoices",
    href: "/ops-desk/invoices",
    icon: Receipt,
  },
  {
    name: "Team",
    href: "/ops-desk/team",
    icon: Users2,
  },
  {
    name: "Calendar",
    href: "/ops-desk/calendar",
    icon: Calendar,
  },
];

export default function OpsDeskLayout({
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
