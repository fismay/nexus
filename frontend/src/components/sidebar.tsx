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
    <aside className="nexus-surface nexus-surface--static fixed left-0 top-0 h-screen w-64 flex flex-col z-40 rounded-none border-y-0 border-l-0 bg-card/75">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <Hexagon className="w-7 h-7 text-accent" />
        <span className="text-xl font-bold tracking-tight">Nexus</span>
      </div>

      {/* Cmd+K hint */}
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
        className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-muted hover:text-foreground text-xs transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Поиск...</span>
        <kbd className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Context Tags */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2 px-3 mb-2">
          <Tag className="w-3.5 h-3.5 text-muted" />
          <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Контекст</span>
        </div>
        <div className="space-y-0.5">
          {CONTEXT_TAGS.map((tag) => (
            <button
              key={tag.value}
              onClick={() => toggleTag(tag.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTag === tag.value ? tag.color : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTag === tag.value ? "bg-current" : "bg-muted/40"}`} />
              {tag.label}
            </button>
          ))}
          {activeTag && (
            <button onClick={() => toggleTag(activeTag)} className="w-full text-xs text-muted hover:text-foreground px-3 py-1 transition-colors">
              Сбросить фильтр
            </button>
          )}
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-border">
        {user ? (
          <div className="flex items-center justify-between px-3">
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{user.display_name || user.username}</div>
              <div className="text-[10px] text-muted truncate">{user.email}</div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Выйти">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link href="/login" className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors">
            Войти / Регистрация
          </Link>
        )}
        <div className="text-[10px] text-muted/50 text-center mt-2">Nexus v0.5.0</div>
      </div>
    </aside>
  );
}
