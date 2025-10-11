import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { history, HistoryEvent } from "@/lib/history";
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await history.list();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast({
        title: "Failed to load history",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();

    const refresh = () => {
      loadHistory();
    };
    
    window.addEventListener("lockify-history-updated" as any, refresh as any);
    return () => window.removeEventListener("lockify-history-updated" as any, refresh as any);
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadHistory();
      toast({
        title: "History refreshed",
        description: "Latest history loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to refresh",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsClearing(true);
      await history.clear();
      setEvents([]);
      toast({
        title: "History cleared",
        description: "All activity history has been deleted",
      });
    } catch (error) {
      toast({
        title: "Failed to clear history",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

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
              disabled={isLoading}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={events.length === 0 || isLoading || isClearing}
            >
              <Trash2 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">{isClearing ? "Clearing..." : "Clear All"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {filter ? "No matching activity found" : "No activity yet"}
          </div>
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


