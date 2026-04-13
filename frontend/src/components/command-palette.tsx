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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
        <Command
          label="Command Palette"
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted flex-shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Поиск задач, проектов, команд..."
              className="flex-1 py-3.5 bg-transparent text-sm outline-none placeholder:text-muted"
            />
            <kbd className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted">
              Ничего не найдено
            </Command.Empty>

            <Command.Group heading="Навигация">
              <Command.Item onSelect={() => go("/")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                <LayoutDashboard className="w-4 h-4" />Дашборд
              </Command.Item>
              <Command.Item onSelect={() => go("/projects")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                <FolderKanban className="w-4 h-4" />Проекты
              </Command.Item>
              <Command.Item onSelect={() => go("/tasks")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                <ListTodo className="w-4 h-4" />Задачи
              </Command.Item>
              <Command.Item onSelect={() => go("/calendar")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                <CalendarDays className="w-4 h-4" />Календарь
              </Command.Item>
              <Command.Item onSelect={() => go("/nexus-map")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                <Network className="w-4 h-4" />NexusMap (Граф)
              </Command.Item>
              <Command.Item onSelect={() => go("/inbox")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                <Inbox className="w-4 h-4" />Входящие
              </Command.Item>
            </Command.Group>

            {projects.length > 0 && (
              <Command.Group heading="Проекты">
                {projects.map((p) => (
                  <Command.Item key={p.id} value={p.title} onSelect={() => go(`/projects/${p.id}`)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                    <FolderKanban className="w-4 h-4 text-muted" />{p.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {tasks.length > 0 && (
              <Command.Group heading="Задачи">
                {tasks.map((t) => (
                  <Command.Item key={t.id} value={t.title} onSelect={() => go("/tasks")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                    <ListTodo className="w-4 h-4 text-muted" />{t.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {user && (
              <Command.Group heading="Аккаунт">
                <Command.Item onSelect={() => go("/friends")} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                  <User className="w-4 h-4" />Друзья
                </Command.Item>
                <Command.Item onSelect={() => { logout(); setOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer text-red-400 data-[selected=true]:bg-red-500/15">
                  <LogOut className="w-4 h-4" />Выйти
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted">
            <span>↑↓ навигация · Enter выбрать · Esc закрыть</span>
            <span>Ctrl+K</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
