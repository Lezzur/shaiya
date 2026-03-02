"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard,
  Zap,
  Briefcase,
  Palette,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const modules = [
  {
    name: "War Room",
    icon: LayoutDashboard,
    href: "/war-room",
    comingSoon: false,
  },
  {
    name: "Lead Engine",
    icon: Zap,
    href: "/lead-engine",
    comingSoon: true,
  },
  {
    name: "Ops Desk",
    icon: Briefcase,
    href: "/ops-desk",
    comingSoon: false,
  },
  {
    name: "Content Engine",
    icon: Palette,
    href: "/content-engine",
    comingSoon: true,
  },
  {
    name: "Proposals",
    icon: FileText,
    href: "/proposals",
    comingSoon: true,
  },
  {
    name: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    comingSoon: true,
  },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;

  function getInitials(name?: string | null) {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function handleSignOut() {
    signOut({ callbackUrl: "/login" });
  }

  // Sidebar component
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b px-4">
        <h1 className={cn("text-2xl font-bold", sidebarCollapsed && "hidden md:block")}>
          NEXUS
        </h1>
        {sidebarCollapsed && (
          <div className="hidden text-2xl font-bold md:block">N</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = pathname?.startsWith(module.href);

          return (
            <Link
              key={module.href}
              href={module.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                sidebarCollapsed && "md:justify-center md:px-2"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className={cn(sidebarCollapsed && "md:hidden")}>
                {module.name}
              </span>
              {module.comingSoon && (
                <Badge variant="secondary" className={cn("ml-auto text-xs", sidebarCollapsed && "md:hidden")}>
                  Soon
                </Badge>
              )}
            </Link>
          );
        })}

        <Separator className="my-4" />

        {/* Settings */}
        <Link
          href="/settings"
          onClick={() => setMobileSidebarOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname?.startsWith("/settings")
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            sidebarCollapsed && "md:justify-center md:px-2"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span className={cn(sidebarCollapsed && "md:hidden")}>Settings</span>
        </Link>
      </nav>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden border-r bg-white transition-all duration-300 md:flex md:flex-col",
          sidebarCollapsed ? "md:w-16" : "md:w-60"
        )}
      >
        <SidebarContent />

        {/* Collapse toggle - Desktop only */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full"
          >
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-white transition-transform duration-300 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4">
          {/* Left - Mobile menu toggle + Breadcrumb area */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-sm text-zinc-600">
              {/* Breadcrumb placeholder - can be enhanced later */}
              <span className="font-medium text-zinc-900">
                {modules.find((m) => pathname?.startsWith(m.href))?.name || "NEXUS"}
              </span>
            </div>
          </div>

          {/* Right - User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-zinc-900 text-xs text-white">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline-block">
                  {user?.name || user?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
