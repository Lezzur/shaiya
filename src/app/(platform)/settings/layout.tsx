"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, CreditCard, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const settingsNav = [
  {
    name: "Team",
    href: "/settings/team",
    icon: Users,
    comingSoon: false,
  },
  {
    name: "Billing",
    href: "/settings/billing",
    icon: CreditCard,
    comingSoon: true,
  },
  {
    name: "Integrations",
    href: "/settings/integrations",
    icon: Plug,
    comingSoon: true,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto space-y-6">
      {/* Settings Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b">
        {settingsNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.comingSoon ? "#" : item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-zinc-900 text-zinc-900"
                  : item.comingSoon
                  ? "border-transparent text-muted-foreground cursor-not-allowed"
                  : "border-transparent text-muted-foreground hover:text-zinc-900 hover:border-zinc-300"
              )}
              onClick={(e) => {
                if (item.comingSoon) {
                  e.preventDefault();
                }
              }}
            >
              <Icon className="h-4 w-4" />
              {item.name}
              {item.comingSoon && (
                <Badge variant="secondary" className="text-xs">
                  Soon
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
