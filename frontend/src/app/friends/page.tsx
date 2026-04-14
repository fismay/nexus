"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Search, Check, X, CalendarDays, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MiniCalendarPicker } from "@/components/mini-calendar-picker";

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Array<Record<string, unknown>>>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; display_name: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [sharedDate, setSharedDate] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [sharedData, setSharedData] = useState<Record<string, unknown> | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);

  const load = () => {
    api.listFriends()
      .then(setFriends)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSearch = async () => {
    if (searchQ.length < 2) return;
    try {
      setSearchResults(await api.searchUsers(searchQ));
    } catch { setSearchResults([]); }
  };

  const sendRequest = async (username: string) => {
    await api.sendFriendRequest(username);
    setSearchResults([]);
    setSearchQ("");
    load();
  };

  const accept = async (id: string) => { await api.acceptFriend(id); load(); };
  const decline = async (id: string) => { await api.declineFriend(id); load(); };

  const loadShared = async () => {
    if (!selectedFriend || !sharedDate) return;
    setSharedLoading(true);
    try {
      setSharedData(await api.sharedSchedule(selectedFriend, sharedDate));
    } catch { setSharedData(null); }
    setSharedLoading(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted">Войдите в аккаунт чтобы видеть друзей</p>
      </div>
    );
  }

  const acceptedFriends = friends.filter((f) => (f.status as string) === "accepted");
  const pendingIncoming = friends.filter(
    (f) => (f.status as string) === "pending" && ((f.addressee as Record<string, unknown>)?.id as string) === user.id
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users className="w-7 h-7 sm:w-8 sm:h-8 text-accent shrink-0" />
          Друзья
        </h1>
        <p className="text-muted text-sm sm:text-base mt-1">Совместное расписание учитывает пары из календаря и ваши запланированные задачи.</p>
      </div>

      {/* Search users */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />Найти пользователя
        </h3>
        <div className="flex gap-2">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="username..."
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <button onClick={handleSearch} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Search className="w-4 h-4" />
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-1">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                <span className="text-sm">{u.username} {u.display_name && <span className="text-muted">({u.display_name})</span>}</span>
                <button onClick={() => sendRequest(u.username)} className="text-xs bg-accent/15 text-accent px-3 py-1 rounded-lg hover:bg-accent/25">
                  Добавить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingIncoming.length > 0 && (
        <div className="bg-card border border-amber-500/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Входящие запросы</h3>
          {pendingIncoming.map((f) => (
            <div key={f.id as string} className="flex items-center justify-between bg-background rounded-lg px-3 py-2 mb-1">
              <span className="text-sm">{(f.requester as Record<string, unknown>)?.username as string}</span>
              <div className="flex gap-1">
                <button onClick={() => accept(f.id as string)} className="p-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => decline(f.id as string)} className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Друзья ({acceptedFriends.length})</h3>
        {acceptedFriends.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">Пока нет друзей</p>
        ) : (
          <div className="space-y-1">
            {acceptedFriends.map((f) => {
              const friend = (f.requester as Record<string, unknown>)?.id === user.id
                ? (f.addressee as Record<string, unknown>)
                : (f.requester as Record<string, unknown>);
              return (
                <div key={f.id as string} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                  <span className="text-sm">{friend?.username as string}</span>
                  <button
                    onClick={() => setSelectedFriend(friend?.id as string)}
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />Расписание
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared schedule */}
      {selectedFriend && (
        <div className="bg-card/80 backdrop-blur-xl border border-accent/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" />Совместное расписание
          </h3>
          <div className="flex items-end gap-3 mb-4">
            <MiniCalendarPicker value={sharedDate} onChange={setSharedDate} label="Дата" />
            <button
              onClick={loadShared}
              disabled={!sharedDate || sharedLoading}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {sharedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Показать"}
            </button>
          </div>
          {sharedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <h4 className="text-xs text-muted font-medium mb-1.5">Мои события (включая пары)</h4>
                  {((sharedData.my_events as Array<Record<string, unknown>>) || []).length === 0 ? (
                    <p className="text-xs text-muted/80">Нет событий</p>
                  ) : (
                    ((sharedData.my_events as Array<Record<string, unknown>>) || []).map((e, i) => (
                      <div key={i} className="text-xs bg-blue-500/10 rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 border-blue-500 break-words">
                        <span className="font-medium">{e.title as string}</span>
                        {Boolean(e.start_time) && Boolean(e.end_time) ? (
                          <span className="block text-[10px] text-muted mt-0.5">
                            {new Date(String(e.start_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(String(e.end_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs text-muted font-medium mb-1.5">События друга</h4>
                  {((sharedData.friend_events as Array<Record<string, unknown>>) || []).length === 0 ? (
                    <p className="text-xs text-muted/80">Нет событий</p>
                  ) : (
                    ((sharedData.friend_events as Array<Record<string, unknown>>) || []).map((e, i) => (
                      <div key={i} className="text-xs bg-purple-500/10 rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 border-purple-500 break-words">
                        <span className="font-medium">{e.title as string}</span>
                        {Boolean(e.start_time) && Boolean(e.end_time) ? (
                          <span className="block text-[10px] text-muted mt-0.5">
                            {new Date(String(e.start_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(String(e.end_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <h4 className="text-xs text-amber-400/90 font-medium mb-1.5">Мои задачи в календаре</h4>
                  {((sharedData.my_scheduled_tasks as Array<Record<string, unknown>>) || []).length === 0 ? (
                    <p className="text-xs text-muted/80">Нет запланированных задач</p>
                  ) : (
                    ((sharedData.my_scheduled_tasks as Array<Record<string, unknown>>) || []).map((t, i) => (
                      <div key={i} className="text-xs bg-amber-500/10 rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 border-amber-500 break-words">
                        {t.title as string}
                        {Boolean(t.start_time) && Boolean(t.end_time) ? (
                          <span className="block text-[10px] text-muted mt-0.5">
                            {new Date(String(t.start_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(String(t.end_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs text-amber-400/90 font-medium mb-1.5">Задачи друга в календаре</h4>
                  {((sharedData.friend_scheduled_tasks as Array<Record<string, unknown>>) || []).length === 0 ? (
                    <p className="text-xs text-muted/80">Нет запланированных задач</p>
                  ) : (
                    ((sharedData.friend_scheduled_tasks as Array<Record<string, unknown>>) || []).map((t, i) => (
                      <div key={i} className="text-xs bg-amber-500/10 rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 border-amber-500 break-words">
                        {t.title as string}
                        {Boolean(t.start_time) && Boolean(t.end_time) ? (
                          <span className="block text-[10px] text-muted mt-0.5">
                            {new Date(String(t.start_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(String(t.end_time)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
              {((sharedData.conflicts as Array<Record<string, unknown>>) || []).length > 0 && (
                <div>
                  <h4 className="text-xs text-red-400 font-medium mb-1">Конфликты (оба заняты)</h4>
                  {((sharedData.conflicts as Array<Record<string, unknown>>)).map((c, i) => (
                    <div key={i} className="text-xs bg-red-500/10 rounded px-2 py-1 mb-1 border-l-2 border-red-500">
                      {new Date(c.start as string).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} –{" "}
                      {new Date(c.end as string).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  ))}
                </div>
              )}
              <div>
                <h4 className="text-xs text-green-400 font-medium mb-1">Свободные слоты (оба свободны)</h4>
                {((sharedData.mutual_free_slots as Array<Record<string, unknown>>) || []).map((s, i) => (
                  <div key={i} className="text-xs bg-green-500/10 rounded px-2 py-1 mb-1 border-l-2 border-green-500">
                    {new Date(s.start as string).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {new Date(s.end as string).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
