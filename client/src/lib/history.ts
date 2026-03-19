import type { HistoryEvent as BackendHistoryEvent } from "@shared/schema";
import { apiRequest } from "./queryClient";

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
    window.dispatchEvent(new Event("lockify-history-updated" as any));
  } catch {}
}

export const history = {
  async add(event: Omit<HistoryEvent, "id" | "timestamp"> & { timestamp?: number }): Promise<HistoryEvent | null> {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    const timestamp = event.timestamp ?? Date.now();
    
    try {
      const res = await apiRequest("POST", "/api/history", {
        userId,
        type: event.type,
        summary: event.summary,
        details: event.details ? JSON.stringify(event.details) : undefined,
        timestamp: new Date(timestamp).toISOString(),
      });

      if (!res.ok) throw new Error("Failed to save history");

      const saved = (await res.json()) as BackendHistoryEvent;
      const newEvent: HistoryEvent = {
        id: saved.id,
        type: saved.type as HistoryEventType,
        timestamp: new Date(saved.timestamp as unknown as string).getTime(),
        summary: saved.summary,
        details: saved.details ? JSON.parse(String(saved.details)) : undefined,
        userId: saved.userId,
      };
      
      // Notify listeners that history was updated
      dispatchUpdate();
      
      return newEvent;
    } catch (error) {
      console.error("Failed to save history:", error);
      return null;
    }
  },

  async list(): Promise<HistoryEvent[]> {
    const userId = getCurrentUserId();
    if (!userId) return [];

    try {
      const res = await apiRequest("GET", "/api/history");
      if (!res.ok) return [];
      const data = (await res.json()) as BackendHistoryEvent[];
      const events: HistoryEvent[] = data.map((raw) => ({
        id: raw.id,
        type: raw.type as HistoryEventType,
        timestamp: new Date(raw.timestamp as unknown as string).getTime(),
        summary: raw.summary,
        details: raw.details ? JSON.parse(String(raw.details)) : undefined,
        userId: raw.userId,
      }));
      return events.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  },

  async clear(): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    try {
      const res = await apiRequest("DELETE", "/api/history");
      if (!res.ok) throw new Error("Failed to clear history");
      
      // Notify listeners
      dispatchUpdate();
    } catch (error) {
      console.error("Failed to clear history:", error);
      throw error;
    }
  },
};

export type { HistoryEventType };




