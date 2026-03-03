"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Layers, UserCircle } from "lucide-react";

const subNavItems = [
  {
    name: "Prompt Library",
    href: "/content-engine/prompt-library",
    icon: FileText,
  },
  {
    name: "Brand Profiles",
    href: "/content-engine/brand-profiles",
    icon: UserCircle,
  },
  {
    name: "Assets",
    href: "/content-engine/assets",
    icon: Layers,
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
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);

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
