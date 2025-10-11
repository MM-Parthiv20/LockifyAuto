import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

type AvatarPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
};

function AvatarGrid({ rangeStart, rangeEnd, onPick, loaded, setLoaded }: { rangeStart: number; rangeEnd: number; onPick: (url: string) => void; loaded: Record<number, boolean>; setLoaded: React.Dispatch<React.SetStateAction<Record<number, boolean>>> }) {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const items = useMemo(() => Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i), [rangeStart, rangeEnd]);

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 overflow-y-auto overflow-x-hidden max-h-80">
      {items.map((i) => {
        const url = `https://avatar.iran.liara.run/public/${i}`;
        const isLoading = loadingIndex === i || !loaded[i];
        return (
          <button
            key={i}
            className="relative w-auto aspect-square rounded-full overflow-hidden border border-border hover:ring-2 hover:ring-primary transition"
            onClick={() => onPick(url)}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={url}
              alt={`Avatar ${i}`}
              className={`w-full h-full object-cover ${isLoading ? "opacity-0" : "opacity-100"}`}
              onLoad={() => setLoaded((s) => ({ ...s, [i]: true }))}
              onError={() => setLoaded((s) => ({ ...s, [i]: true }))}
              onMouseDown={() => setLoadingIndex(i)}
              onMouseUp={() => setLoadingIndex(null)}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function AvatarPickerDialog({ open, onOpenChange, onSelect }: AvatarPickerDialogProps) {
  // Persist loaded-state across tab switches so images don't show loaders again
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl px-2 py-4 sm:p-4">
        <DialogHeader>
          <DialogTitle>Select your avatar</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="male" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="male">Male</TabsTrigger>
            <TabsTrigger value="female">Female</TabsTrigger>
          </TabsList>
          <TabsContent value="male" forceMount className="space-y-4">
            <AvatarGrid rangeStart={1} rangeEnd={50} loaded={loadedMap} setLoaded={setLoadedMap} onPick={(url) => { onSelect(url); onOpenChange(false); }} />
          </TabsContent>
          <TabsContent value="female" forceMount className="space-y-4">
            <AvatarGrid rangeStart={51} rangeEnd={100} loaded={loadedMap} setLoaded={setLoadedMap} onPick={(url) => { onSelect(url); onOpenChange(false); }} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


