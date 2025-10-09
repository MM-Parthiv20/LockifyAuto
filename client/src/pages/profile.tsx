import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { PasswordRecord } from "@shared/schema";
import { Loader2, CircleCheck, CircleX, ArrowLeft, LogOut, Trash, Pencil, UserX, Play, Key, Moon, Sun, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AvatarPickerDialog from "@/components/avatar-picker-dialog";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { useTheme } from "@/components/theme-provider";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, logout, updateProfileImage, updateOnboardingStatus } = useAuth();
  const { data: records = [] } = useQuery<PasswordRecord[]>({ queryKey: ["/api/records"] });
  const { toast } = useToast();
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const stats = useMemo(() => ({
    total: (records as any[]).filter((r) => !r.isDeleted).length,
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
    <div className="min-h-screen bg-background">
      {/* Header/Navbar */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
              <div className="flex items-center space-x-2">
                <div className="bg-primary/10 rounded-lg text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="141" height="166" viewBox="0 0 141 166" className="w-9 h-9 text-primary" fill="currentColor">
                <path xmlns="http://www.w3.org/2000/svg" d="M70 46L70.5 83L101 101.5V148L69.5 166L0 125V41L31.5 23L70 46ZM8 120L69.5 156.263V120L38.5 102V64L8 46.5V120Z"/>
                <path xmlns="http://www.w3.org/2000/svg" d="M140.5 125L108.5 143.5V60.5L39 18.5L70 0L140.5 42V125Z"/>
                </svg>
                </div>
                <h1 className="text-xl font-semibold text-foreground">Lumora</h1>
            </div>
              </Link>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2"
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>

              {/* User avatar and username */}
              {user && (
                <div className="flex items-center gap-2 pr-1 cursor-pointer" onClick={() => setLocation("/profile")}>
                  <div className="relative w-7 h-7">
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-full">
                        <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className={`w-7 h-7 rounded-full border ${loading ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={() => setLoading(false)}
                      onError={() => setLoading(false)}
                    />
                  </div>
                  <span className="hidden sm:inline text-sm text-foreground">{user.username}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 flex items-center gap-2">
          <ArrowLeft
            className="w-8 h-8 rounded-md bg-primary/10 p-1 cursor-pointer"
            onClick={() => setLocation("/")}
          />
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-foreground">Profile</h2>
          </div>
        </div>

        {/* Profile Card */}
        <div className="flex justify-center">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-2xl">
            <div className="p-6 flex flex-col items-center">
              
              {/* Avatar with loader */}
              <div className="w-28 h-28 rounded-full shadow-md flex items-center justify-center bg-muted relative">
                {loading && <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />}
                <img
                  className={`w-28 h-28 rounded-full border-4 border-border shadow-md absolute ${loading ? "opacity-0" : "opacity-100"}`}
                  src={avatarUrl}
                  alt="User Avatar"
                  onLoad={() => setLoading(false)}
                  onError={() => setLoading(false)}
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
                  <div className="font-medium flex items-center gap-2">
                    {user.hasCompletedOnboarding ? (
                      <div className="bg-green-500 bg-opacity-20 rounded-md p-1 px-2 flex items-center gap-1">
                        <CircleCheck className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Completed</span>
                      </div>
                    ) : (
                      <div className="bg-red-500 bg-opacity-20 rounded-md p-1 px-2 flex items-center gap-1">
                        <CircleX className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">Not Completed</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex py-3 gap-2 text-sm justify-between border-b border-border">
                  <div className="text-muted-foreground">Total Records</div>
                  <div className="font-medium">{stats.total}</div>
                </div>

                {/* Complete Onboarding Button - only show if incomplete */}
                {!user.hasCompletedOnboarding && (
                  <div className="mt-4">
                    <Button 
                      onClick={() => setIsOnboardingOpen(true)} 
                      className="w-full" 
                      data-testid="button-complete-onboarding"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Complete Onboarding
                    </Button>
                  </div>
                )}

                <div className="flex mt-4 gap-2 text-sm justify-center">
                  <Link href="/history" className="w-1/2">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 p-2 w-full"
                      data-testid="button-profile-go-history"
                      title="View your activity history"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M3 3v5h5" />
                        <path d="M3.05 13A9 9 0 1 0 7 4.6L3 8" />
                        <path d="M12 7v5l4 2" />
                      </svg>
                      <span className="inline">History</span>
                    </Button>
                  </Link>
                  <Link href="/trash" className="w-1/2">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 p-2 w-full" 
                      data-testid="button-profile-go-trash"
                      title="Open Trash"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                      <span className="inline">Trash</span>
                    </Button>
                  </Link>
                </div>

                {/* Delete All Records */}
                <div className="mt-2">
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
                          disabled={isDeletingAll}
                          onClick={async () => {
                            if (isDeletingAll) return;
                            setIsDeletingAll(true);
                            try {
                              const res = await apiRequest("GET", "/api/records");
                              const list = (await res.json()) as Array<{ id: string }>;
                              let success = 0;
                              let failed = 0;
                              for (const r of list) {
                                try {
                                  await apiRequest("DELETE", `/api/records/${r.id}`);
                                  success += 1;
                                } catch {
                                  failed += 1;
                                }
                              }
                              await queryClient.invalidateQueries({ queryKey: ["/api/records"] });
                              if (failed === 0) {
                                toast({ title: "All records deleted" });
                              } else if (success > 0) {
                                toast({ title: `Deleted ${success} records`, description: `${failed} failed`, variant: "destructive" });
                              } else {
                                toast({ title: "Failed to delete records", description: "No records were deleted", variant: "destructive" });
                              }
                              setIsDeleteAllOpen(false);
                            } catch (e: any) {
                              toast({ title: "Failed to delete records", description: e?.message || "", variant: "destructive" });
                            } finally {
                              setIsDeletingAll(false);
                            }
                          }}
                        >
                          {isDeletingAll ? "Deleting..." : "Delete"}
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
                  <Button variant="destructive" className="flex-1" onClick={logout}>
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs */}
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

            await updateProfileImage(url);
            toast({ title: "Avatar updated" });
          } catch (e: any) {
            toast({ title: "Failed to update avatar", description: e?.message || "", variant: "destructive" });
          }
        }}
      />
      
      <OnboardingGuide
        isOpen={isOnboardingOpen}
        onComplete={async () => {
          setIsOnboardingOpen(false);
          await updateOnboardingStatus(true);
          toast({ title: "Onboarding completed!" });
        }}
      />
    </div>
  );
}
