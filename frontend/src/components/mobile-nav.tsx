"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CalendarDays, ListTodo,
  Menu, X, Hexagon, Inbox, Network, Users, Tag, LogOut,
} from "lucide-react";
import { useContextTag } from "@/lib/context-tag-provider";
import { useAuth } from "@/lib/auth-context";
import { CONTEXT_TAGS } from "@/lib/types";

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
  const { activeTag, toggleTag } = useContextTag();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Top bar — phone & tablet (< lg) */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between min-h-14 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top,0px)] bg-card/90 backdrop-blur-xl border-b border-border lg:hidden">
        <div className="flex items-center gap-2">
          <Hexagon className="w-6 h-6 text-accent" />
          <span className="text-lg font-bold tracking-tight">Nexus</span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="p-2.5 min-h-11 min-w-11 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors flex items-center justify-center"
          aria-label="Открыть меню"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Bottom navigation — phone & tablet */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around gap-0.5 min-h-[3.75rem] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] pt-1 bg-card/90 backdrop-blur-xl border-t border-border lg:hidden safe-area-bottom">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 max-w-[5.5rem] py-1.5 px-1 rounded-xl transition-colors active:scale-[0.98] ${
                isActive ? "text-accent bg-accent/10" : "text-muted"
              }`}
            >
              <Icon className="w-[22px] h-[22px] shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-medium truncate w-full text-center leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Закрыть меню"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(20rem,88vw)] max-w-[100vw] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] bg-card border-r border-border flex flex-col animate-slide-in-left shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Hexagon className="w-6 h-6 text-accent" />
                <span className="text-lg font-bold">Nexus</span>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-2 min-h-11 min-w-11 rounded-lg hover:bg-white/10 text-muted flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto overscroll-contain">
              {DRAWER_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 min-h-12 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-3 border-t border-border">
              <div className="flex items-center gap-2 px-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-muted" />
                <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Контекст</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONTEXT_TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTag === tag.value ? tag.color : "text-muted bg-white/5"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-3 py-3 border-t border-border mt-auto">
              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{user.display_name || user.username}</div>
                    <div className="text-[10px] text-muted truncate">{user.email}</div>
                  </div>
                  <button type="button" onClick={() => { logout(); setDrawerOpen(false); }} className="p-2 rounded-lg text-muted hover:text-red-400 shrink-0" title="Выйти">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setDrawerOpen(false)} className="block text-center py-2.5 rounded-xl text-sm font-medium text-accent bg-accent/10">
                  Войти
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
