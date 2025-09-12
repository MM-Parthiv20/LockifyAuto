type HistoryEventType =
  | "login"
  | "logout"
  | "register"
  | "record:create"
  | "record:update"
  | "record:delete"
  | "record:restore"
  | "record:toggleStar"
  | "trash:empty"
  | "trash:autoDelete";

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  timestamp: number;
  summary: string;
  details?: Record<string, unknown>;
}

const STORAGE_KEY = "lockify-history";
const MAX_EVENTS = 300;

function readAll(): HistoryEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as HistoryEvent[]) : [];
    if (!Array.isArray(list)) return [];
    return list;
  } catch {
    return [];
  }
}

function writeAll(events: HistoryEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {}
}

function generateId(): string {
  // short unique id for client-side logs
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const history = {
  add(event: Omit<HistoryEvent, "id" | "timestamp"> & { timestamp?: number }): HistoryEvent {
    const newEvent: HistoryEvent = {
      id: generateId(),
      timestamp: event.timestamp ?? Date.now(),
      type: event.type,
      summary: event.summary,
      details: event.details,
    };
    const all = readAll();
    all.push(newEvent);
    writeAll(all);
    try {
      window.dispatchEvent(new CustomEvent("lockify-history-updated"));
    } catch {}
    return newEvent;
  },

  list(): HistoryEvent[] {
    return readAll().sort((a, b) => b.timestamp - a.timestamp);
  },

  clear(): void {
    writeAll([]);
    try {
      window.dispatchEvent(new CustomEvent("lockify-history-updated"));
    } catch {}
  },
};

export type { HistoryEventType };




