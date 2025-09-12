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

// Remote persistence (MockAPI)
const HISTORY_API_URL = "https://677537fa92222241481aee8e.mockapi.io/history";

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('lockify-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.user?.id || parsed?.user?.username || null;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

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
    // Fire-and-forget remote persist
    try {
      const userId = getCurrentUserId();
      if (userId) {
        fetch(HISTORY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newEvent.id,
            userId,
            type: newEvent.type,
            timestamp: newEvent.timestamp,
            summary: newEvent.summary,
            details: newEvent.details ? JSON.stringify(newEvent.details) : "",
          }),
        }).catch(() => {});
      }
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent("lockify-history-updated"));
    } catch {}
    return newEvent;
  },

  list(): HistoryEvent[] {
    // Kick off background sync from API (non-blocking)
    try {
      const userId = getCurrentUserId();
      if (userId) {
        const url = `${HISTORY_API_URL}?userId=${encodeURIComponent(userId)}`;
        fetch(url, { method: 'GET' })
          .then((res) => res.ok ? res.json() : Promise.reject())
          .then((rows: Array<{ id: string; userId: string; type: string; timestamp: number; summary: string; details?: string }>) => {
            if (!Array.isArray(rows)) return;
            const fromApi: HistoryEvent[] = rows.map((r) => ({
              id: r.id,
              type: r.type as HistoryEventType,
              timestamp: Number(r.timestamp) || Date.now(),
              summary: r.summary,
              details: (() => {
                if (!r.details) return undefined;
                try { return JSON.parse(r.details); } catch { return { raw: r.details }; }
              })(),
            }));
            writeAll(fromApi);
            try { window.dispatchEvent(new CustomEvent('lockify-history-updated')); } catch {}
          })
          .catch(() => {});
      }
    } catch {}
    return readAll().sort((a, b) => b.timestamp - a.timestamp);
  },

  clear(): void {
    writeAll([]);
    // Remote delete for current user
    try {
      const userId = getCurrentUserId();
      if (userId) {
        const url = `${HISTORY_API_URL}?userId=${encodeURIComponent(userId)}`;
        fetch(url)
          .then((res) => res.ok ? res.json() : Promise.reject())
          .then((rows: Array<{ id: string }>) => {
            const ids = Array.isArray(rows) ? rows.map((r) => r.id) : [];
            ids.forEach((id) => {
              fetch(`${HISTORY_API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
            });
          })
          .catch(() => {});
      }
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent("lockify-history-updated"));
    } catch {}
  },
};

export type { HistoryEventType };




