const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

let _token: string | null = null;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  setToken: (t: string | null) => { _token = t; },

  // Auth
  login: (username: string, password: string) =>
    request<{ access_token: string; user: Record<string, unknown> }>("/auth/login", {
      method: "POST", body: JSON.stringify({ username, password }),
    }),
  register: (username: string, email: string, password: string) =>
    request<{ access_token: string; user: Record<string, unknown> }>("/auth/register", {
      method: "POST", body: JSON.stringify({ username, email, password }),
    }),
  getMe: () => request<Record<string, unknown>>("/auth/me"),
  searchUsers: (q: string) => request<Array<{ id: string; username: string; display_name: string | null }>>(`/auth/search?q=${encodeURIComponent(q)}`),

  // Friends
  listFriends: () => request<Array<Record<string, unknown>>>("/friends/"),
  sendFriendRequest: (username: string) =>
    request<Record<string, unknown>>("/friends/request", {
      method: "POST", body: JSON.stringify({ addressee_username: username }),
    }),
  acceptFriend: (id: string) => request<Record<string, unknown>>(`/friends/${id}/accept`, { method: "POST" }),
  declineFriend: (id: string) => request<Record<string, unknown>>(`/friends/${id}/decline`, { method: "POST" }),
  sharedSchedule: (friendId: string, date: string) =>
    request<Record<string, unknown>>(`/friends/shared-schedule?friend_id=${friendId}&date=${date}`),

  // AI Brief
  getAiBrief: () => request<{ insights: Array<Record<string, unknown>>; total: number; ai_summary: string | null }>("/ai-brief/"),

  // Graph
  getGraph: () => request<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }>("/graph/"),

  // Geo
  suggestSlot: (date: string, lat: number, lon: number, duration?: number) =>
    request<Record<string, unknown>>(`/geo/suggest-slot?date=${date}&lat=${lat}&lon=${lon}&duration_min=${duration || 60}`),

  // Projects
  listProjects: () => request<import("./types").ProjectCard[]>("/projects/"),
  getProject: (id: string) => request<import("./types").Project>(`/projects/${id}`),
  createProject: (data: Record<string, unknown>) =>
    request<import("./types").Project>("/projects/", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: Record<string, unknown>) =>
    request<import("./types").Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),

  // BOM
  listBOMItems: (projectId: string) => request<import("./types").BOMItem[]>(`/bom-items/by-project/${projectId}`),
  createBOMItem: (data: Record<string, unknown>) =>
    request<import("./types").BOMItem>("/bom-items/", { method: "POST", body: JSON.stringify(data) }),
  updateBOMItem: (id: string, data: Record<string, unknown>) =>
    request<import("./types").BOMItem>(`/bom-items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBOMItem: (id: string) => request<void>(`/bom-items/${id}`, { method: "DELETE" }),

  // Phases
  createPhase: (data: Record<string, unknown>) =>
    request<import("./types").Phase>("/phases/", { method: "POST", body: JSON.stringify(data) }),
  updatePhase: (id: string, data: Record<string, unknown>) =>
    request<import("./types").Phase>(`/phases/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePhase: (id: string) => request<void>(`/phases/${id}`, { method: "DELETE" }),

  // Tasks
  listTasks: (params?: { projectId?: string; contextTag?: string; status?: string; unscheduled?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("project_id", params.projectId);
    if (params?.contextTag) qs.set("context_tag", params.contextTag);
    if (params?.status) qs.set("status", params.status);
    if (params?.unscheduled) qs.set("unscheduled", "true");
    const q = qs.toString() ? `?${qs.toString()}` : "";
    return request<import("./types").Task[]>(`/tasks/${q}`);
  },
  createTask: (data: Record<string, unknown>) =>
    request<import("./types").Task>("/tasks/", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: string, data: Record<string, unknown>) =>
    request<import("./types").Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
  timeboxTask: (id: string, startTime: string, endTime: string) =>
    request<import("./types").Task>(`/tasks/${id}/timebox`, { method: "POST", body: JSON.stringify({ start_time: startTime, end_time: endTime }) }),
  unscheduleTask: (id: string) => request<import("./types").Task>(`/tasks/${id}/unschedule`, { method: "POST" }),

  // Events
  listEvents: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<import("./types").CalendarEvent[]>(`/events/${qs}`);
  },
  createEvent: (data: Record<string, unknown>) =>
    request<import("./types").CalendarEvent>("/events/", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (id: string, data: Record<string, unknown>) =>
    request<import("./types").CalendarEvent>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEvent: (id: string) => request<void>(`/events/${id}`, { method: "DELETE" }),
  checkConflict: (startTime: string, endTime: string) =>
    request<import("./types").ConflictWarning>(
      `/events/check-conflict?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`
    ),

  // Schedule (iCal)
  previewIcal: (data: { url?: string; raw_text?: string; semester_start?: string }) =>
    request<import("./types").ICalImportResponse>("/schedule/preview", { method: "POST", body: JSON.stringify(data) }),
  confirmIcalImport: (events: import("./types").ICalPreviewEvent[]) =>
    request<import("./types").CalendarEvent[]>("/schedule/import", { method: "POST", body: JSON.stringify({ events }) }),

  // Prompts
  listPrompts: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : "";
    return request<import("./types").Prompt[]>(`/prompts/${qs}`);
  },
  createPrompt: (data: Record<string, unknown>) =>
    request<import("./types").Prompt>("/prompts/", { method: "POST", body: JSON.stringify(data) }),
  updatePrompt: (id: string, data: Record<string, unknown>) =>
    request<import("./types").Prompt>(`/prompts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePrompt: (id: string) => request<void>(`/prompts/${id}`, { method: "DELETE" }),

  // Inbox
  listInbox: (processed = false) => request<import("./types").InboxItem[]>(`/inbox/?processed=${processed}`),
  createInboxItem: (data: Record<string, unknown>) =>
    request<import("./types").InboxItem>("/inbox/", { method: "POST", body: JSON.stringify(data) }),
  processInboxItem: (id: string, action: string) =>
    request<Record<string, unknown>>(`/inbox/${id}/process`, { method: "POST", body: JSON.stringify({ action }) }),
  deleteInboxItem: (id: string) => request<void>(`/inbox/${id}`, { method: "DELETE" }),

  // Chat
  getChatMessages: (roomId: string, limit = 50) =>
    request<import("./types").ChatMessage[]>(`/chat/${roomId}?limit=${limit}`),

  // Project Members
  addProjectMember: (projectId: string, userId: string, role = "viewer") =>
    request<import("./types").ProjectMember>(`/projects/${projectId}/members`, {
      method: "POST", body: JSON.stringify({ user_id: userId, role }),
    }),
  listProjectMembers: (projectId: string) =>
    request<import("./types").ProjectMember[]>(`/projects/${projectId}/members`),

  // AI Schedule (Stones & Sand)
  aiSchedule: (date?: string) =>
    request<import("./types").AiScheduleResponse>(`/ai-schedule${date ? `?date=${encodeURIComponent(date)}` : ""}`, { method: "POST" }),
};
