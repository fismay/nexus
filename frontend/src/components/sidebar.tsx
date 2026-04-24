"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CalendarDays, ListTodo,
  Hexagon, Inbox, Tag, Network, Users, LogOut, Search,
} from "lucide-react";
import { useContextTag } from "@/lib/context-tag-provider";
import { useAuth } from "@/lib/auth-context";
import { CONTEXT_TAGS } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/tasks", label: "Задачи", icon: ListTodo },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/nexus-map", label: "NexusMap", icon: Network },
  { href: "/friends", label: "Друзья", icon: Users },
  { href: "/inbox", label: "Входящие", icon: Inbox },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeTag, toggleTag } = useContextTag();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40 border-r border-border bg-surface rounded-none shadow-none">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border-subtle">
        <Hexagon className="w-7 h-7 text-accent" />
        <span className="text-xl font-bold tracking-tight text-foreground">Nexus</span>
      </div>

      {/* Cmd+K hint */}
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
        className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-surface-hover text-foreground-muted hover:text-foreground-secondary text-xs transition-colors border border-border-subtle"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Поиск...</span>
        <kbd className="text-[10px] bg-border-subtle px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-subtle text-accent border-l-2 border-accent pl-[10px]"
                  : "text-foreground-muted hover:text-foreground-secondary hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Context Tags */}
      <div className="px-3 py-3 border-t border-border-subtle space-y-2">
        <div className="flex items-center gap-2 px-3">
          <Tag className="w-3.5 h-3.5 text-foreground-muted" />
          <span className="text-[10px] text-foreground-muted font-medium uppercase tracking-wider">Контекст</span>
        </div>
        <div className="space-y-0.5">
          {CONTEXT_TAGS.map((tag) => (
            <button
              key={tag.value}
              onClick={() => toggleTag(tag.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTag === tag.value 
                  ? "bg-accent-subtle text-accent" 
                  : "text-foreground-muted hover:text-foreground-secondary hover:bg-surface-hover"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeTag === tag.value ? "bg-accent" : "bg-border"}`} />
              {tag.label}
            </button>
          ))}
          {activeTag && (
            <button onClick={() => toggleTag(activeTag)} className="w-full text-xs text-foreground-muted hover:text-foreground-secondary px-3 py-1 transition-colors">
              Сбросить фильтр
            </button>
          )}
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-border-subtle">
        {user ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-surface-hover">
            <div className="min-w-0">
              <div className="text-xs font-medium truncate text-foreground">{user.display_name || user.username}</div>
              <div className="text-[10px] text-foreground-muted truncate">{user.email}</div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-md text-foreground-muted hover:text-error hover:bg-error/10 transition-colors flex-shrink-0" title="Выйти">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link href="/login" className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-accent bg-accent-subtle hover:bg-accent/20 transition-colors border border-accent/30">
            Войти / Регистрация
          </Link>
        )}
        <div className="text-[10px] text-foreground-muted/60 text-center mt-2">Nexus v0.5.0</div>
      </div>
    </aside>
  );
}
