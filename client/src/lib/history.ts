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
  async add(event: Omit<HistoryEvent, "id" | "timestamp"> & { timestamp?: number }): Promise<HistoryEvent | null> {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    const timestamp = event.timestamp ?? Date.now();
    
    try {
      // Send to MockAPI and wait for response
      const res = await fetch(HISTORY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: event.type,
          timestamp: timestamp,
          summary: event.summary,
          details: event.details ? JSON.stringify(event.details) : "",
          createdAt: String(timestamp),
          updatedAt: String(timestamp),
        })
      });
      
      if (!res.ok) throw new Error('Failed to save history');
      
      const saved = await res.json();
      const newEvent = parseHistoryEvent(saved);
      
      // Notify listeners that history was updated
      dispatchUpdate();
      
      return newEvent;
    } catch (error) {
      console.error('Failed to save history:', error);
      return null;
    }
  },

  async list(): Promise<HistoryEvent[]> {
    const events = await fetchFromAPI();
    return events.sort((a, b) => b.timestamp - a.timestamp);
  },

  async clear(): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    try {
      const url = `${HISTORY_API_URL}?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch history');
      
      const rows = await res.json();
      const ids = Array.isArray(rows) ? rows.map((r: any) => r.id) : [];
      
      // Delete all events for this user
      await Promise.all(
        ids.map(id => 
          fetch(`${HISTORY_API_URL}/${encodeURIComponent(id)}`, { 
            method: 'DELETE' 
          }).catch(() => {})
        )
      );
      
      // Notify listeners
      dispatchUpdate();
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw error;
    }
  },
};

export type { HistoryEventType };




