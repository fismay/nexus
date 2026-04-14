"use client";

import { useEffect, useState } from "react";
import {
  Inbox,
  CheckCircle2,
  CalendarPlus,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import type { InboxItem } from "@/lib/types";

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .listInbox(false)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const processItem = async (id: string, action: string) => {
    await api.processInboxItem(id, action);
    load();
  };

  const deleteItem = async (id: string) => {
    await api.deleteInboxItem(id);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="nexus-skeleton h-9 w-44 mb-2" />
        <div className="nexus-skeleton h-4 w-80 max-w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="nexus-surface nexus-surface--static rounded-xl p-4 min-h-[100px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="nexus-page-title-bar text-2xl sm:text-3xl font-bold tracking-tight">
          Входящие
        </h1>
        <p className="text-muted mt-2 text-sm sm:text-base">
          Сообщения из Telegram-бота, ожидающие обработки
        </p>
      </div>

      {items.length === 0 ? (
        <div className="nexus-surface nexus-surface--static rounded-xl p-16 text-center">
          <Inbox className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Входящие пусты</h3>
          <p className="text-muted text-sm">
            Отправьте сообщение Telegram-боту, и оно появится здесь
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const parsed = item.parsed_data;
            const title = (parsed.title as string) || item.raw_text;
            const deadline = parsed.deadline as string | undefined;
            const project = parsed.project as string | undefined;
            const tags = (parsed.context_tags as string[]) || [];
            const typeLabel =
              item.parsed_type === "task"
                ? "Задача"
                : item.parsed_type === "event"
                  ? "Событие"
                  : "Заметка";

            return (
              <div
                key={item.id}
                className="nexus-surface rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                        {typeLabel}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(item.created_at).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted mt-1 truncate">
                      {item.raw_text}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                      {deadline && <span>Дедлайн: {deadline}</span>}
                      {project && <span>Проект: {project}</span>}
                      {tags.map((t) => (
                        <span key={t} className="bg-white/5 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => processItem(item.id, "create_task")}
                      title="Создать задачу"
                      className="p-2 rounded-lg hover:bg-emerald-500/20 text-muted hover:text-emerald-400 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => processItem(item.id, "create_event")}
                      title="Создать событие"
                      className="p-2 rounded-lg hover:bg-blue-500/20 text-muted hover:text-blue-400 transition-colors"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      title="Удалить"
                      className="p-2 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
