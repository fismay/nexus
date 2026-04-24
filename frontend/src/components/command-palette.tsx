"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Search, FolderKanban, ListTodo, CalendarDays, Inbox,
  LayoutDashboard, Network, Brain, User, LogOut,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    Promise.all([api.listTasks(), api.listProjects()])
      .then(([t, p]) => {
        setTasks(t.slice(0, 20).map((x) => ({ id: x.id, title: x.title })));
        setProjects(p.slice(0, 10).map((x) => ({ id: x.id, title: x.title })));
      })
      .catch(() => {});
  }, [open]);

  const go = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[max(1rem,env(safe-area-inset-top))] sm:pt-[12vh] px-3 pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={() => setOpen(false)}
      />
      <div className="relative z-[101] w-full max-w-lg max-h-[min(85dvh,32rem)] mt-2 sm:mt-0 bg-surface border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
        <Command
          label="Command Palette"
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="w-4 h-4 text-foreground-muted flex-shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Поиск задач, проектов, команд..."
              className="flex-1 py-3.5 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
            />
            <kbd className="text-[10px] text-foreground-muted bg-border-subtle px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          <Command.List className="max-h-[min(60dvh,20rem)] sm:max-h-80 overflow-y-auto p-2 overscroll-contain">
            <Command.Empty className="py-6 text-center text-sm text-foreground-muted">
              Ничего не найдено
            </Command.Empty>

            <Command.Group heading="Навигация">
              <Command.Item onSelect={() => go("/")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                <LayoutDashboard className="w-4 h-4" />Дашборд
              </Command.Item>
              <Command.Item onSelect={() => go("/projects")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                <FolderKanban className="w-4 h-4" />Проекты
              </Command.Item>
              <Command.Item onSelect={() => go("/tasks")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                <ListTodo className="w-4 h-4" />Задачи
              </Command.Item>
              <Command.Item onSelect={() => go("/calendar")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                <CalendarDays className="w-4 h-4" />Календарь
              </Command.Item>
              <Command.Item onSelect={() => go("/nexus-map")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                <Network className="w-4 h-4" />NexusMap (Граф)
              </Command.Item>
              <Command.Item onSelect={() => go("/inbox")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                <Inbox className="w-4 h-4" />Входящие
              </Command.Item>
            </Command.Group>

            {projects.length > 0 && (
              <Command.Group heading="Проекты">
                {projects.map((p) => (
                  <Command.Item key={p.id} value={p.title} onSelect={() => go(`/projects/${p.id}`)} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                    <FolderKanban className="w-4 h-4 text-foreground-muted" />{p.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {tasks.length > 0 && (
              <Command.Group heading="Задачи">
                {tasks.map((t) => (
                  <Command.Item key={t.id} value={t.title} onSelect={() => go("/tasks")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                    <ListTodo className="w-4 h-4 text-foreground-muted" />{t.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {user && (
              <Command.Group heading="Аккаунт">
                <Command.Item onSelect={() => go("/friends")} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground-muted data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent data-[selected=true]:font-medium transition-colors">
                  <User className="w-4 h-4" />Друзья
                </Command.Item>
                <Command.Item onSelect={() => { logout(); setOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-error data-[selected=true]:bg-error/15 data-[selected=true]:text-error data-[selected=true]:font-medium transition-colors">
                  <LogOut className="w-4 h-4" />Выйти
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-foreground-muted">
            <span>↑↓ навигация · Enter выбрать · Esc закрыть</span>
            <span>Ctrl+K</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
