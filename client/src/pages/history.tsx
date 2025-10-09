import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { history, HistoryEvent } from "@/lib/history";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<HistoryEvent[]>(() => history.list());
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const refresh = () => setEvents(history.list());
    window.addEventListener("lockify-history-updated" as any, refresh as any);
    // Fetch data from API on mount
    history.refresh().catch(() => {});
    return () => window.removeEventListener("lockify-history-updated" as any, refresh as any);
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      e.summary.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    );
  }, [events, filter]);

  const formatTime = (ts: number) => new Date(ts).toLocaleString();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLocation("/")}> 
              <ArrowLeft className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-xl font-semibold">Activity History</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search history..."
              className="h-9 px-3 rounded-md border bg-background text-foreground text-sm outline-none"
            />
            <Button
              variant="destructive"
              onClick={() => history.clear()}
              disabled={events.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Clear All</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No activity yet</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm break-words">{e.summary}</div>
                    <div className="text-xs text-muted-foreground mt-1">{formatTime(e.timestamp)}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">{e.type}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


