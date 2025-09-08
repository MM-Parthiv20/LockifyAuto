import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { PasswordRecord } from "@shared/schema";
import { Loader2, CircleCheck, CircleX, ArrowLeft, LogOut, Trash, Pencil, UserX } from "lucide-react"; // spinner icon
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AvatarPickerDialog from "@/components/avatar-picker-dialog";

type ProfileProps = { onBack?: () => void };

export default function Profile({ onBack }: ProfileProps) {
  const [, setLocation] = useLocation();
  const { user, logout, updateProfileImage } = useAuth();
  const { data: records = [] } = useQuery<PasswordRecord[]>({ queryKey: ["/api/records"] });
  const { toast } = useToast();
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);

  const stats = useMemo(() => ({
    total: records.length,
  }), [records]);

  // Prefer API-saved profile image; fallback to deterministic avatar
  const avatarUrl = useMemo(() => {
    if (user?.profileimage) return user.profileimage;
    const seed = (user?.id || user?.username || "1").length % 100 || 1;
    return `https://avatar.iran.liara.run/public/${seed}`;
  }, [user?.id, user?.username, user?.profileimage]);

  // ✅ Image loading state
  const [loading, setLoading] = useState(true);

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="bg-background flex justify-center relative">
      <ArrowLeft className="w-8 h-8 absolute top-0 left-0 rounded-md bg-primary/10 p-1 cursor-pointer" onClick={() => (onBack ? onBack() : setLocation("/"))} />
      <div className="rounded-lg border mt-24 bg-card text-card-foreground shadow-sm w-full max-w-lg">
        <div className="p-6 -mt-24 flex flex-col items-center">
          
          {/* Avatar with loader */}
          <div className="w-28 h-28 rounded-full shadow-md flex items-center justify-center bg-muted relative">
            {loading && <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />}
            <img
              className={`w-28 h-28 rounded-full border-4 border-border shadow-md absolute ${loading ? "opacity-0" : "opacity-100"}`}
              src={avatarUrl}
              alt="User Avatar"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)} // stop loader even if image fails
            />
            <Button size="icon" variant="secondary" className="absolute -bottom-0 -right-0 rounded-full h-8 w-8" onClick={() => setIsAvatarOpen(true)} data-testid="button-edit-avatar">
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="mt-2 mb-4 text-2xl font-semibold">{user.username}</h2>
          
          <CardContent className="p-0 w-full">
            <div className="flex py-3 gap-2 text-sm justify-between border-b border-border">
              <div className="text-muted-foreground">Username</div>
              <div className="font-medium">{user.username}</div>
            </div>
            <div className="flex py-3 gap-2 text-sm justify-between border-b border-border">
              <div className="text-muted-foreground">Onboarding</div>
              <div className="font-medium ">
                {user.hasCompletedOnboarding ? (
                    <div className="bg-green-500 bg-opacity-20 rounded-md p-1 px-2 flex items-center gap-1">
                    <CircleCheck className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">Completed</span>
                    </div>
                ) : (
                    <div className="bg-red-500 bg-opacity-20 rounded-md p-1 px-2 flex items-center gap-1">
                    <CircleX className="w-4 h-4 text-red-500" />
                    <span className="text-red-500">Pending</span>
                    </div>
                )}
                </div>

            </div>
            <div className="flex py-3 gap-2 text-sm justify-between border-b border-border">
              <div className="text-muted-foreground">Total records</div>
              <div className="font-medium">{stats.total}</div>
            </div>

               {/* Delete All Records */}
               <div className="mt-4">
              <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" data-testid="button-delete-all">
                    <Trash className="w-4 h-4" />
                    Delete all records
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all records?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your password records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          const res = await apiRequest("GET", "/api/records");
                          const list = (await res.json()) as Array<{ id: string }>;
                          await Promise.all(list.map((r) => apiRequest("DELETE", `/api/records/${r.id}`)));
                          await queryClient.invalidateQueries({ queryKey: ["/api/records"] });
                          toast({ title: "All records deleted" });
                        } catch (e: any) {
                          toast({ title: "Failed to delete records", description: e?.message || "", variant: "destructive" });
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

              {/* Delete Account */}
              <div className="mt-2">
              <AlertDialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" data-testid="button-delete-account">
                    <UserX className="w-4 h-4" />
                    Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          if (!user?.id) throw new Error("Missing user id");
                          await apiRequest("DELETE", `/api/users/${user.id}`);
                          toast({ title: "Account deleted" });
                          logout();
                        } catch (e: any) {
                          toast({ title: "Failed to delete account", description: e?.message || "", variant: "destructive" });
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex mt-2">
              {/* <Button variant="outline" className="flex-1" onClick={() => (onBack ? onBack() : setLocation("/"))}>Back</Button> */}
              <Button variant="destructive" className="flex-1" onClick={logout}>
                <LogOut className="w-4 h-4" />
                Logout</Button>
            </div>



         
          </CardContent>
        </div>
      </div>
      <AvatarPickerDialog
        open={isAvatarOpen}
        onOpenChange={setIsAvatarOpen}
        onSelect={async (url) => {
          try {
            setLoading(true);
            const img = new Image();
            img.onload = () => setLoading(false);
            img.onerror = () => setLoading(false);
            img.src = url;

            // Persist and update auth state so UI updates everywhere immediately
            await updateProfileImage(url);
            toast({ title: "Avatar updated" });
          } catch (e: any) {
            toast({ title: "Failed to update avatar", description: e?.message || "", variant: "destructive" });
          }
        }}
      />
    </div>
  );
}

