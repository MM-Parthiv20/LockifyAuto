import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { PasswordRecord } from "@shared/schema";
import { ArrowLeft, RefreshCcw, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Trash() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: allRecords = [], isLoading } = useQuery<PasswordRecord[]>({ queryKey: ["/api/records"] });
  const trashed = (allRecords as any[]).filter((r) => r.isDeleted);

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/records/${id}`, { isDeleted: false, deletedAt: null });
      return res.json();
    },
    onSuccess: (updated: PasswordRecord) => {
      const current = queryClient.getQueryData<PasswordRecord[]>(["/api/records"]) || [];
      const next = current.map((r) => (r.id === updated.id ? updated : r));
      queryClient.setQueryData(["/api/records"], next);
    },
  });

  const deleteForeverMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/records/${id}`);
      return res.json();
    },
    onSuccess: (_res, id) => {
      const current = queryClient.getQueryData<PasswordRecord[]>(["/api/records"]) || [];
      const next = current.filter((r) => r.id !== id);
      queryClient.setQueryData(["/api/records"], next);
    },
  });

  const hasItems = useMemo(() => trashed.length > 0, [trashed]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLocation("/")}> 
              <ArrowLeft className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-xl font-semibold">Trash</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!hasItems}
              onClick={async () => {
                const current = queryClient.getQueryData<PasswordRecord[]>(["/api/records"]) || [];
                for (const r of trashed) {
                  try {
                    const res = await apiRequest("PUT", `/api/records/${r.id}`, { isDeleted: false, deletedAt: null });
                    const updated = (await res.json()) as PasswordRecord;
                    const idx = current.findIndex((c) => c.id === updated.id);
                    if (idx !== -1) current[idx] = updated;
                  } catch {}
                }
                queryClient.setQueryData(["/api/records"], [...current]);
              }}
            >
              <RefreshCcw className="w-4 h-4 sm:hidden" />
              <span className="ml-2 hidden sm:inline">Restore All</span>
            </Button>
            <Button
              variant="destructive"
              disabled={!hasItems}
              onClick={async () => {
                let current = queryClient.getQueryData<PasswordRecord[]>(["/api/records"]) || [];
                for (const r of trashed) {
                  try {
                    await apiRequest("DELETE", `/api/records/${r.id}`);
                    current = current.filter((c) => c.id !== r.id);
                  } catch {}
                }
                queryClient.setQueryData(["/api/records"], current);
              }}
            >
              <Trash2 className="w-4 h-4 sm:hidden" />
              <span className="ml-2 hidden sm:inline">Empty Trash</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {trashed.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No items in Trash</div>
            ) : (
              trashed.map((r) => (
                <div key={r.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.email}</div>
                    {r.description && <div className="text-sm text-muted-foreground truncate">{r.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button className="p-2"
                      variant="outline"
                      size="sm"
                      onClick={() => restoreMutation.mutate(r.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RefreshCcw className="w-4 h-4 sm:hidden" />
                      <span className="hidden sm:inline">Restore</span>
                    </Button>
                    <Button className="p-2"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteForeverMutation.mutate(r.id)}
                      disabled={deleteForeverMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 sm:hidden" />
                      <span className="hidden sm:inline">Delete Forever</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}


