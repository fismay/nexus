"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CalendarDays, ListTodo,
  Menu, X, Hexagon, Inbox, Network, Users,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/tasks", label: "Задачи", icon: ListTodo },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
];

const DRAWER_ITEMS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/tasks", label: "Задачи", icon: ListTodo },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/nexus-map", label: "NexusMap", icon: Network },
  { href: "/friends", label: "Друзья", icon: Users },
  { href: "/inbox", label: "Входящие", icon: Inbox },
];

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card/90 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Hexagon className="w-6 h-6 text-accent" />
          <span className="text-lg font-bold tracking-tight">Nexus</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Bottom navigation — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-xl border-t border-border z-50 flex items-center justify-around lg:hidden safe-area-bottom">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Hexagon className="w-6 h-6 text-accent" />
                <span className="text-lg font-bold">Nexus</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
              {DRAWER_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
