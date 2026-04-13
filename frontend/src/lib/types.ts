export interface Project {
  id: string;
  title: string;
  description: string | null;
  tech_stack: string[];
  status: string;
  project_type: string;
  repository_url: string | null;
  cad_url: string | null;
  created_at: string;
  updated_at: string;
  overall_progress: number;
  phases: Phase[];
  bom_items: BOMItem[];
  tasks: TaskBrief[];
}

export interface ProjectCard {
  id: string;
  title: string;
  status: string;
  project_type: string;
  tech_stack: string[];
  overall_progress: number;
  repository_url: string | null;
  created_at: string;
}

export interface Phase {
  id: string;
  project_id: string;
  name: string;
  progress_percent: number;
  sort_order: number;
}

export interface BOMItem {
  id: string;
  project_id: string;
  item_name: string;
  quantity: number;
  status: "pending" | "ordered" | "received";
  price: number | null;
  link: string | null;
  created_at: string;
}

export interface TaskBrief {
  id: string;
  title: string;
  priority: string;
  status: string;
  is_completed: boolean;
  deadline: string | null;
  blocker_bom_item_id: string | null;
  context_tags: string[];
  start_time: string | null;
  end_time: string | null;
  energy_cost: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  is_completed: boolean;
  deadline: string | null;
  project_id: string | null;
  blocker_bom_item_id: string | null;
  context_tags: string[];
  start_time: string | null;
  end_time: string | null;
  energy_cost: number;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  color: string | null;
  project_id: string | null;
  created_at: string;
  location: string | null;
  smart_tag: string | null;
  week_parity: string | null;
  ical_uid: string | null;
  recurrence_interval: number | null;
}

export interface ICalPreviewEvent {
  title: string;
  location: string | null;
  start_time: string;
  end_time: string;
  recurrence_rule: string | null;
  week_parity: string | null;
  smart_tag: string | null;
  event_type: string;
  ical_uid: string | null;
}

export interface ICalImportResponse {
  events: ICalPreviewEvent[];
  total: number;
  numerator_count: number;
  denominator_count: number;
  weekly_count: number;
}

export interface ConflictWarning {
  has_conflict: boolean;
  warning: string | null;
  conflicting_event_id: string | null;
  conflicting_event_title: string | null;
  conflicting_event_location: string | null;
  suggested_start: string | null;
  suggested_end: string | null;
}

export interface Prompt {
  id: string;
  project_id: string | null;
  title: string;
  content: string;
  ai_model: string;
  created_at: string;
}

export interface InboxItem {
  id: string;
  raw_text: string;
  parsed_type: string;
  parsed_data: Record<string, unknown>;
  is_processed: boolean;
  source: string;
  telegram_chat_id: string | null;
  created_at: string;
}

export const STATUS_LABELS: Record<string, string> = {
  planning: "Планирование",
  active: "Активный",
  on_hold: "На паузе",
  completed: "Завершён",
  archived: "Архив",
};

export const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-500/20 text-blue-400",
  active: "bg-emerald-500/20 text-emerald-400",
  on_hold: "bg-amber-500/20 text-amber-400",
  completed: "bg-green-500/20 text-green-400",
  archived: "bg-gray-500/20 text-gray-400",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-blue-400",
  high: "text-amber-400",
  critical: "text-red-400",
};

export const BOM_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание",
  ordered: "Заказано",
  received: "Получено",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  blocked: "Заблокирована",
  done: "Готово",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-500/20 text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  blocked: "bg-red-500/20 text-red-400",
  done: "bg-green-500/20 text-green-400",
};

export const CONTEXT_TAGS = [
  { value: "@код", label: "Код", color: "bg-cyan-500/20 text-cyan-400" },
  { value: "@железо", label: "Железо", color: "bg-orange-500/20 text-orange-400" },
  { value: "@универ", label: "Универ", color: "bg-purple-500/20 text-purple-400" },
  { value: "@cad", label: "CAD", color: "bg-pink-500/20 text-pink-400" },
];

export const CONTEXT_TAG_COLORS: Record<string, string> = {
  "@код": "bg-cyan-500/20 text-cyan-400",
  "@железо": "bg-orange-500/20 text-orange-400",
  "@универ": "bg-purple-500/20 text-purple-400",
  "@cad": "bg-pink-500/20 text-pink-400",
};

export const SMART_TAG_COLORS: Record<string, string> = {
  "@theory": "bg-blue-500/30 border-blue-400",
  "@practice": "bg-amber-500/30 border-amber-400",
};

export const SMART_TAG_LABELS: Record<string, string> = {
  "@theory": "Лекция",
  "@practice": "Практика",
};

export const WEEK_PARITY_LABELS: Record<string, string> = {
  numerator: "Числитель",
  denominator: "Знаменатель",
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  general: "Общий",
  dev: "Разработка",
  music: "Музыка",
  business: "Бизнес",
  hardware: "Железо",
};

export const PROJECT_TYPE_COLORS: Record<string, string> = {
  general: "bg-gray-500/20 text-gray-400",
  dev: "bg-cyan-500/20 text-cyan-400",
  music: "bg-pink-500/20 text-pink-400",
  business: "bg-emerald-500/20 text-emerald-400",
  hardware: "bg-orange-500/20 text-orange-400",
};

export const AI_MODEL_COLORS: Record<string, string> = {
  Ollama: "bg-slate-500/20 text-slate-400",
  Suno: "bg-pink-500/20 text-pink-400",
  Claude: "bg-amber-500/20 text-amber-400",
  ChatGPT: "bg-emerald-500/20 text-emerald-400",
  Midjourney: "bg-purple-500/20 text-purple-400",
};

export const ENERGY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

export const ENERGY_COLORS: Record<number, string> = {
  1: "text-green-400",
  2: "text-amber-400",
  3: "text-red-400",
};
