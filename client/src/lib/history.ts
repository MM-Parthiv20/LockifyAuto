type HistoryEventType =
  | "login"
  | "logout"
  | "register"
  | "record: create"
  | "record: update"
  | "record: delete"
  | "record: restore"
  | "record: toggleStar"
  | "trash: empty"
  | "trash: autoDelete";

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  timestamp: number;
  summary: string;
  details?: Record<string, unknown>;
  userId?: string;
}

const MAX_EVENTS = 300;
const HISTORY_API_URL = "https://677537fa92222241481aee8e.mockapi.io/history";

// In-memory cache
let eventsCache: HistoryEvent[] = [];
let lastSyncAt = 0;
const SYNC_INTERVAL_MS = 10000; // 10 seconds
let syncInProgress = false;

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

function generateId(): string {
  // short unique id for client-side logs
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function dispatchUpdate(): void {
  try {
    window.dispatchEvent(new Event('lockify-history-updated' as any));
  } catch {}
}

// Parse MockAPI history event format
function parseHistoryEvent(raw: any): HistoryEvent {
  return {
    id: raw.id,
    type: raw.type as HistoryEventType,
    timestamp: Number(raw.timestamp) || Date.now(),
    summary: raw.summary,
    details: (() => {
      if (!raw.details) return undefined;
      if (typeof raw.details === 'string') {
        try { return JSON.parse(raw.details); } catch { return { raw: raw.details }; }
      }
      return raw.details;
    })(),
    userId: raw.userId
  };
}

// Fetch history from MockAPI
async function fetchFromAPI(): Promise<HistoryEvent[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];
  
  try {
    const url = `${HISTORY_API_URL}?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(parseHistoryEvent) : [];
  } catch {
    return [];
  }
}

export const history = {
  add(event: Omit<HistoryEvent, "id" | "timestamp"> & { timestamp?: number }): HistoryEvent {
    const userId = getCurrentUserId();
    const newEvent: HistoryEvent = {
      id: generateId(),
      timestamp: event.timestamp ?? Date.now(),
      type: event.type,
      summary: event.summary,
      details: event.details,
      userId: userId || undefined,
    };
    
    // Update cache optimistically
    eventsCache = [...eventsCache, newEvent].slice(-MAX_EVENTS);
    dispatchUpdate();
    
    // Send to MockAPI (fire-and-forget)
    if (userId) {
      fetch(HISTORY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: newEvent.type,
          timestamp: newEvent.timestamp,
          summary: newEvent.summary,
          details: newEvent.details ? JSON.stringify(newEvent.details) : "",
          createdAt: String(newEvent.timestamp),
          updatedAt: String(newEvent.timestamp),
        })
      }).catch(() => {});
    }
    
    return newEvent;
  },

  list(): HistoryEvent[] {
    // Background sync (throttled)
    const now = Date.now();
    if (now - lastSyncAt >= SYNC_INTERVAL_MS && !syncInProgress) {
      lastSyncAt = now;
      syncInProgress = true;
      fetchFromAPI().then(events => {
        eventsCache = events.slice(-MAX_EVENTS);
        dispatchUpdate();
      }).catch(() => {}).finally(() => {
        syncInProgress = false;
      });
    }
    
    return [...eventsCache].sort((a, b) => b.timestamp - a.timestamp);
  },

  async refresh(): Promise<void> {
    const events = await fetchFromAPI();
    eventsCache = events.slice(-MAX_EVENTS);
    lastSyncAt = Date.now();
    dispatchUpdate();
  },

  clear(): void {
    eventsCache = [];
    dispatchUpdate();
    
    // Delete from MockAPI
    const userId = getCurrentUserId();
    if (userId) {
      const url = `${HISTORY_API_URL}?userId=${encodeURIComponent(userId)}`;
      fetch(url)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then((rows: Array<{ id: string }>) => {
          const ids = Array.isArray(rows) ? rows.map(r => r.id) : [];
          ids.forEach(id => {
            fetch(`${HISTORY_API_URL}/${encodeURIComponent(id)}`, { 
              method: 'DELETE' 
            }).catch(() => {});
          });
        })
        .catch(() => {});
    }
  },
};

export type { HistoryEventType };




