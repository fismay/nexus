"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ChatMessage } from "@/lib/types";

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api")
  .replace(/\/api$/, "")
  .replace(/^http/, "ws");

interface Props {
  roomId: string;
  roomLabel: string;
  open: boolean;
  onClose: () => void;
}

export function ChatDrawer({ roomId, roomLabel, open, onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!open || !roomId) return;
    api.getChatMessages(roomId).then(setMessages).catch(() => {});
  }, [open, roomId]);

  useEffect(() => {
    if (!open || !roomId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/chat/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg: ChatMessage = JSON.parse(e.data);
        setMessages((prev) => [...prev, msg]);
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [open, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const send = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      sender_id: user?.id || "",
      sender_username: user?.username || "anon",
      content: input.trim(),
    }));
    setInput("");
  };

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-96 max-w-[calc(100vw-4rem)] bg-card/95 backdrop-blur-xl border-l border-border z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-sm font-semibold truncate">{roomLabel}</span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? "bg-green-400" : "bg-red-400"}`} />
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted text-center py-8">Нет сообщений</p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                isMe
                  ? "bg-accent/20 text-foreground"
                  : "bg-white/5 text-foreground"
              }`}>
                {!isMe && (
                  <div className="text-[10px] text-accent font-medium mb-0.5">
                    {m.sender_username || "?"}
                  </div>
                )}
                <p className="break-words">{m.content}</p>
              </div>
              <span className="text-[9px] text-muted mt-0.5 px-1">
                {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Сообщение..."
            className="flex-1 bg-white/5 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
