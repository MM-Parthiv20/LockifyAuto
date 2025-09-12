import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Auth removed for open app
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { PasswordRecord } from "@shared/schema";
import { PasswordRecordCard } from "@/components/password-record-card";
import { RecordModal } from "@/components/record-modal";
import { DeleteModal } from "@/components/delete-modal";

import { OnboardingGuide } from "@/components/onboarding-guide";
import { PasswordGenerator } from "@/components/password-generator";
import { Plus, Search, Filter, Moon, Sun, Key, ArrowUpDown, Calendar as CalendarIcon, User, Loader2, X, RefreshCcw, Trash2, MoreVertical, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

import Profile from "@/pages/profile";
import LoadingSpinner from "@/components/loading-spinner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { history } from "@/lib/history";

type SortOption = "newest" | "oldest" | "email" | "updated" | "starred";

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const { user, updateOnboardingStatus } = useAuth();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PasswordRecord | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [activeDateField, setActiveDateField] = useState<"from" | "to" | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [hasDescriptionOnly, setHasDescriptionOnly] = useState<boolean>(false);
  const [starredOnly, setStarredOnly] = useState<boolean>(false);
  const domainInputRef = useRef<HTMLInputElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const wasEmptyBeforeAddRef = useRef<boolean>(false);
  const avatarUrl = (() => {
    if (user?.profileimage) return user.profileimage;
    const seed = (user?.id || user?.username || "1").length % 100 || 1;
    return `https://avatar.iran.liara.run/public/${seed}`;
  })();

  const { data: records = [], isLoading } = useQuery<PasswordRecord[]>({
    queryKey: ["/api/records"],
  });

  const queryClientRQ = useQueryClient();
  const toggleStarMutation = useMutation({
    mutationFn: async (r: PasswordRecord) => {
      await apiRequest("PUT", `/api/records/${r.id}`, { starred: !r.starred });
      return { id: r.id, starred: !r.starred };
    },
    onMutate: async (r) => {
      await queryClientRQ.cancelQueries({ queryKey: ["/api/records"] });
      const previous = queryClientRQ.getQueryData<PasswordRecord[]>(["/api/records"]);
      if (previous) {
        const updated = previous.map((rec) => rec.id === r.id ? ({ ...rec, starred: !rec.starred } as any) : rec);
        queryClientRQ.setQueryData(["/api/records"], updated as any);
      }
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClientRQ.setQueryData(["/api/records"], context.previous);
    },
    onSettled: () => {
      queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
      try {
        // We cannot know final value here precisely, but summarize the toggle action
        history.add({ type: "record:toggleStar", summary: "Toggled star on a record" });
      } catch {}
    },
  });

  const toggleStar = (record: PasswordRecord) => toggleStarMutation.mutate(record);
  const isTrashView = location === "/trash";
  const isHistoryView = location === "/history";
  const trashedRecords = (records as any[]).filter((r) => r.isDeleted);
  const nonDeletedRecords = (records as any[]).filter((r) => !r.isDeleted);
  const { toast } = useToast();

  // History page state (for /history)
  const [historyEvents, setHistoryEvents] = useState(() => history.list());
  const [historyFilter, setHistoryFilter] = useState("");
  useEffect(() => {
    const refresh = () => setHistoryEvents(history.list());
    window.addEventListener('lockify-history-updated' as any, refresh as any);
    return () => window.removeEventListener('lockify-history-updated' as any, refresh as any);
  }, []);
  const filteredHistory = (() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return historyEvents;
    return historyEvents.filter(e => e.summary.toLowerCase().includes(q) || e.type.toLowerCase().includes(q));
  })();
  const formatHistoryTime = (ts: number) => new Date(ts).toLocaleString();

  // Auto-delete trashed records older than 30 days when viewing Trash
  useEffect(() => {
    if (!isTrashView || trashedRecords.length === 0) return;
    const now = Date.now();
    const cutoffMs = 30 * 24 * 60 * 60 * 1000;
    (async () => {
      let deletedCount = 0;
      for (const r of trashedRecords as any[]) {
        const deletedAtMs = r.deletedAt ? new Date(r.deletedAt as any).getTime() : undefined;
        if (deletedAtMs !== undefined && now - deletedAtMs >= cutoffMs) {
          try {
            await apiRequest("DELETE", `/api/records/${r.id}`);
            deletedCount += 1;
          } catch {}
        }
      }
      if (deletedCount > 0) {
        queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
        toast({ title: "Auto-removed old items", description: `${deletedCount} item(s) older than 30 days were deleted.` });
        try {
          history.add({ type: "trash:autoDelete", summary: `Auto-deleted ${deletedCount} item(s) from Trash` });
        } catch {}
      }
    })();
  }, [isTrashView, trashedRecords]);

  const getDaysLeft = (deletedAt?: any): number | null => {
    if (!deletedAt) return null;
    const deletedMs = new Date(deletedAt as any).getTime();
    if (Number.isNaN(deletedMs)) return null;
    const now = Date.now();
    const total = 30 * 24 * 60 * 60 * 1000;
    const elapsed = now - deletedMs;
    const remainingMs = total - elapsed;
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  };

  // Ensure profile overlay closes when navigating to Trash
  useEffect(() => {
    if (location === "/trash" && showProfile) {
      setShowProfile(false);
    }
  }, [location]);

  // Listen for a global close-profile event (emitted from Profile Trash button)
  useEffect(() => {
    const close = () => setShowProfile(false);
    window.addEventListener('lockify-close-profile' as any, close as any);
    return () => window.removeEventListener('lockify-close-profile' as any, close as any);
  }, []);

  // Open onboarding if user hasn't completed it
  useEffect(() => {
    if (user && !user.hasCompletedOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, [user]);
  useEffect(() => {
    if (filterOpen) setShowCalendar(false);
  }, [filterOpen]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const deriveDomain = (email: string) => {
    const parts = email.split("@");
    return parts.length > 1 ? parts[1].toLowerCase() : "";
  };

  const commonDomains = (() => {
    const counter = new Map<string, number>();
    for (const r of records) {
      const d = deriveDomain(r.email);
      if (!d) continue;
      counter.set(d, (counter.get(d) ?? 0) + 1);
    }
    const inferred = Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([d]) => d);
    const defaults = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
    ];
    const set = new Set<string>();
    const merged: string[] = [];
    for (const d of [...inferred, ...defaults]) {
      const dd = d.toLowerCase();
      if (dd && !set.has(dd)) {
        set.add(dd);
        merged.push(dd);
      }
      if (merged.length >= 15) break;
    }
    return merged;
  })();

  const activeFilterCount = (() => {
    let n = 0;
    if (createdDateRange?.from || createdDateRange?.to) n += 1;
    if (selectedDomains.length > 0) n += 1;
    if (hasDescriptionOnly) n += 1;
    if (starredOnly) n += 1;
    return n;
  })();

  const filteredAndSortedRecords = (() => {
    let filtered = records.filter(record => {
      if ((record as any).isDeleted) return false;
      const matchesQuery =
      record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      // Date range filter (createdAt)
      const createdTime = record.createdAt ? new Date(record.createdAt as any).getTime() : undefined;
      const fromOk = createdDateRange?.from ? (createdTime ?? 0) >= new Date(createdDateRange.from).getTime() : true;
      const toOk = createdDateRange?.to ? (createdTime ?? 0) <= new Date(createdDateRange.to).getTime() : true;

      // Domains filter
      const domain = deriveDomain(record.email);
      const domainOk = selectedDomains.length === 0 || selectedDomains.includes(domain);

      // Description filter
      const descOk = !hasDescriptionOnly || (record.description && record.description.trim().length > 0);

      // Starred filter
      const starOk = !starredOnly || Boolean((record as any).starred);

      return matchesQuery && fromOk && toOk && domainOk && descOk && starOk;
    });

    // Sort records
    switch (sortBy) {
      case "newest": {
        const getTime = (d: any) => (d ? new Date(d as any).getTime() : 0);
        filtered = [...filtered].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        break;
      }
      case "oldest": {
        const getTime = (d: any) => (d ? new Date(d as any).getTime() : 0);
        filtered = [...filtered].sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
        break;
      }
      case "email":
        filtered = [...filtered].sort((a, b) => a.email.localeCompare(b.email));
        break;
      case "updated": {
        const getTime = (d: any) => (d ? new Date(d as any).getTime() : 0);
        filtered = [...filtered].sort((a, b) => getTime(b.updatedAt) - getTime(a.updatedAt));
        break;
      }
      case "starred":
        filtered = [...filtered].sort((a, b) => Number(Boolean((b as any).starred)) - Number(Boolean((a as any).starred)));
        break;
    }

    return filtered;
  })();

  const handleAddRecord = () => {
    wasEmptyBeforeAddRef.current = records.length === 0;
    setSelectedRecord(null);
    setModalMode("add");
    setIsRecordModalOpen(true);
  };

  const handleEditRecord = (record: PasswordRecord) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = (record: PasswordRecord) => {
    setSelectedRecord(record);
    setIsDeleteModalOpen(true);
  };

  const handleOnboardingComplete = async () => {
    await updateOnboardingStatus(true);
    setIsOnboardingOpen(false);
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "newest": return "Newest First";
      case "oldest": return "Oldest First";
      case "email": return "Email A-Z";
      case "updated": return "Recently Updated";
      case "starred": return "Starred First";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <LoadingSpinner colorClassName="text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2" onClick={() => setShowProfile(false)}>
              <div className="bg-primary/10 rounded-lg text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="141" height="166" viewBox="0 0 141 166" className="w-9 h-9 text-primary" fill="currentColor">
              <path xmlns="http://www.w3.org/2000/svg" d="M70 46L70.5 83L101 101.5V148L69.5 166L0 125V41L31.5 23L70 46ZM8 120L69.5 156.263V120L38.5 102V64L8 46.5V120Z"/>
              <path xmlns="http://www.w3.org/2000/svg" d="M140.5 125L108.5 143.5V60.5L39 18.5L70 0L140.5 42V125Z"/>
              </svg>
              </div>
              <h1 className="text-xl font-semibold text-foreground">Lumora</h1>
            </div>
            
            {/* Right Side Controls */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2"
                data-testid="button-theme-toggle"
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>

              {/* Trash actions moved to content header */}

              {/* User avatar and username */}
              {user && (
                <div className="flex items-center gap-2 pr-1 cursor-pointer" onClick={() => setShowProfile(!showProfile)}>
                  {isLoading && <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />}
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-7 h-7 rounded-full border"
                    onLoad={() => setLoading(false)}
                    onError={() => setLoading(false)}
                  />
                  <span className="hidden sm:flex text-sm text-foreground">{user.username}</span>
                </div>
              )}
              
              {/* Profile Toggle */}
              <Button
                variant={showProfile ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowProfile(!showProfile)}
                className="hidden p-2 bg-primary text-primary-foreground"
                data-testid="button-profile-toggle"
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
  
              {/* History moved to Profile page */}

              {/* User Menu removed for open app */}
            </div>
          </div>
        </div>
      </nav>
      {/* Trash actions dropdown component */}
      {false && <></>}
  
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {showProfile ? (
          <Profile onBack={() => setShowProfile(false)} />
        ) : (
          <div>
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 w-full">
                  {(isTrashView || isHistoryView) && (
                    <ArrowLeft
                      className="w-8 h-8 rounded-md bg-primary/10 p-1 cursor-pointer"
                      onClick={() => {
                        // If coming from /trash, go back to main dashboard
                        window.location.href = "/";
                      }}
                      data-testid="button-back-from-trash"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {isTrashView ? "Trash" : isHistoryView ? "Activity History" : "Your Passwords"}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                      {isTrashView || isHistoryView ? "" : "Manage your email and password records securely"}
                    </p>
                 
                  </div>
                  {isTrashView && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="p-2 ms-auto" aria-label="More actions">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={trashedRecords.length === 0} onClick={async () => {
                          const count = trashedRecords.length;
                          try {
                            for (const r of trashedRecords) {
                              await apiRequest("PUT", `/api/records/${r.id}`, { isDeleted: false, deletedAt: null });
                            }
                            queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
                            toast({ title: "Restored items", description: `${count} item(s) restored from Trash.` });
                            try {
                              history.add({ type: "record:restore", summary: `Restored ${count} item(s) from Trash` });
                            } catch {}
                          } catch (e: any) {
                            toast({ title: "Restore failed", description: e?.message || "Could not restore all items.", variant: "destructive" });
                          }
                        }} data-testid="menu-restore-all">
                          <RefreshCcw className="w-4 h-4 mr-2" /> Restore All
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={trashedRecords.length === 0} onClick={async () => {
                          const count = trashedRecords.length;
                          try {
                            for (const r of trashedRecords) {
                              await apiRequest("DELETE", `/api/records/${r.id}`);
                            }
                            queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
                            toast({ title: "Trash emptied", description: `${count} item(s) permanently deleted.` });
                            try {
                              history.add({ type: "trash:empty", summary: `Emptied Trash: ${count} item(s)` });
                            } catch {}
                          } catch (e: any) {
                            toast({ title: "Empty Trash failed", description: e?.message || "Could not delete all items.", variant: "destructive" });
                          }
                        }} data-testid="menu-empty-trash">
                          <Trash2 className="w-4 h-4 mr-2" /> Empty Trash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                {/* Action Buttons */}
                {isTrashView || isHistoryView ? "" : (
                    <>
                <div className="mobile-button-group flex flex-row gap-2">
              
                      <Button 
                        onClick={() => setIsPasswordGeneratorOpen(true)}
                        variant="outline"
                        className="btn flex items-center justify-center"
                        data-testid="button-password-generator"
                      >
                        <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">
                          <span className="hidden sm:inline">Password Generator</span>
                          <span className="sm:hidden">Generate</span>
                        </span>
                      </Button>
                      <Button 
                        onClick={handleAddRecord}
                        className="btn flex items-center justify-center"
                        data-testid="button-add-record"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">Add Record</span>
                      </Button>
                 
                </div>
                   </>
                  )}
              </div>
              
              {/* Search, Sort and Filters */}
              {!isTrashView && !isHistoryView && (
              <div className="search-sort-container mt-4 sm:mt-6 flex flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by email or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 sm:pl-10 text-sm sm:text-base"
                    data-testid="input-search"
                  />
                </div>
                <div className="flex gap-2 items-stretch">
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                    <SelectTrigger className="relative w-full" data-testid="select-sort">
                      <ArrowUpDown className="w-4 h-4" />
                      <span className="ml-2 !hidden sm:!inline whitespace-nowrap">
                        <SelectValue placeholder="Sort by..." />
                      </span>
                      {sortBy !== "newest" && (
                        <span className="absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full bg-primary" />)
                      }
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest" data-testid="sort-newest">Newest First</SelectItem>
                      <SelectItem value="oldest" data-testid="sort-oldest">Oldest First</SelectItem>
                      <SelectItem value="email" data-testid="sort-email">Email A-Z</SelectItem>
                      <SelectItem value="updated" data-testid="sort-updated">Recently Updated</SelectItem>
                      <SelectItem value="starred" data-testid="sort-starred">Starred First</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="relative" data-testid="button-filters">
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="ml-2 hidden sm:inline">Filters</span>
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 min-w-4 px-1">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[540px] px-2 py-4 sm:px-6 sm:py-6" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <DialogHeader>
                        <DialogTitle>Filters</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Date range */}
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
                            <span>Created date range</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2 relative">
                            <Input
                              type="input"
                              value={
                                createdDateRange?.from
                                  ? new Date(createdDateRange.from)
                                      .toLocaleDateString("en-GB") // gives dd/mm/yyyy
                                      .replace(/\//g, "-")         // convert / to -
                                  : ""
                              }                              
                               placeholder="dd-mm-yyyy"
                              onChange={(e) => {
                                const d = e.target.value ? new Date(e.target.value) : undefined;
                                setCreatedDateRange(prev => ({ from: d, to: prev?.to } as DateRange));
                                setShowCalendar(true);
                              }}
                              onClick={() => { setShowCalendar(true); setActiveDateField("from"); }}
                              data-testid="input-date-from"
                            />
                            <Input
                              type="input"
                              value={
                                createdDateRange?.to
                                  ? new Date(createdDateRange.to)
                                      .toLocaleDateString("en-GB") // gives dd/mm/yyyy
                                      .replace(/\//g, "-")         // convert / to -
                                  : ""
                              }
                              
                               placeholder="dd-mm-yyyy"
                              onChange={(e) => {
                                const d = e.target.value ? new Date(e.target.value) : undefined;
                                setCreatedDateRange(prev => ({ from: prev?.from, to: d } as DateRange));
                                setShowCalendar(true);
                              }}
                              onClick={() => { setShowCalendar(true); setActiveDateField("to"); }}
                              data-testid="input-date-to"
                            />
                            {showCalendar && (
                            <div 
                              ref={calendarRef}
                              className="rounded-md border absolute top-[calc(100%+5px)] right-0 sm:right-auto left-0 sm:left-auto bg-background calender--wrapper z-50"
                            >
                              <Calendar
                                mode="range"
                                selected={createdDateRange}
                                onSelect={(range) => {
                                  setCreatedDateRange(range);
                                  if (range?.from && range?.to) {
                                    setShowCalendar(false);
                                  }
                                }}
                                numberOfMonths={1}
                                defaultMonth={createdDateRange?.from}
                              />
                            </div>
                          )}
                          </div>
                          {/* Presets */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Button
                              type="button"
                              variant="select"
                              className="h-8 px-2 text-xs rounded"
                              onClick={() => {
                                const today = new Date();
                                const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                setCreatedDateRange({ from, to });
                                setShowCalendar(false);
                              }}
                            >
                              Today
                            </Button>
                            <Button
                              type="button"
                              variant="select"
                              className="h-8 px-2 text-xs rounded"
                              onClick={() => {
                                const today = new Date();
                                const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                const from = new Date(to);
                                from.setDate(from.getDate() - 6);
                                setCreatedDateRange({ from, to });
                                setShowCalendar(false);
                              }}
                            >
                              Last 7 days
                            </Button>
                            <Button
                              type="button"
                              variant="select"
                              className="h-8 px-2 text-xs rounded"
                              onClick={() => {
                                const today = new Date();
                                const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                const from = new Date(to);
                                from.setDate(from.getDate() - 29);
                                setCreatedDateRange({ from, to });
                                setShowCalendar(false);
                              }}
                            >
                              Last 30 days
                            </Button>
                            <Button
                              type="button"
                              variant="select"
                              className="h-8 px-2 text-xs rounded"
                              onClick={() => {
                                const from = new Date(1970, 0, 1);
                                const to = new Date();
                                setCreatedDateRange({ from, to });
                                setShowCalendar(false);
                              }}
                            >
                              All time
                            </Button>
                          </div>

                        </div>

                        {/* Email domains */}
                        <div>
                          <div className="text-sm font-medium text-foreground mb-2">Email domain</div>
                          <div className="flex gap-2 mb-2">
                            <Input
                              placeholder="Add domain (e.g., gmail.com)"
                              value={`${selectedDomains.join(", ")}${domainInput ? (selectedDomains.length ? ", " : "") + domainInput : ""}`}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const tokens = raw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
                                if (tokens.length > 0) {
                                  const last = raw.endsWith(",") ? "" : tokens[tokens.length - 1];
                                  const finished = raw.endsWith(",") ? tokens : tokens.slice(0, -1);
                                  if (finished.length > 0) {
                                    const merged = Array.from(new Set([...selectedDomains, ...finished]));
                                    setSelectedDomains(merged);
                                  }
                                  setDomainInput(last);
                                } else {
                                  setSelectedDomains([]);
                                  setDomainInput("");
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = domainInput.trim().toLowerCase();
                                  if (v) {
                                    const merged = Array.from(new Set([...selectedDomains, v]));
                                    setSelectedDomains(merged);
                                  }
                                  setDomainInput("");
                                }
                              }}
                              data-testid="input-domain"
                              ref={domainInputRef}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {commonDomains.map((d) => {
                              const active = selectedDomains.includes(d);
                              return (
                                <button
                                  type="button"
                                  key={d}
                                  className={`px-2 py-1 rounded border text-xs ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground"}`}
                                  onClick={() => {
                                    setSelectedDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
                                  }}
                                  data-testid={`suggest-domain-${d}`}
                                >
                                  {d}
                                </button>
                              );
                            })}
                          </div>
                          {selectedDomains.length > 0 && (
                            <div className="flex flex-wrap gap-2 hidden">
                              {selectedDomains.map((d) => (
                                <span key={d} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs">
                                  {d}
                                  <button type="button" onClick={() => setSelectedDomains(selectedDomains.filter(x => x !== d))} aria-label={`remove ${d}`}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Has description */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="has-description"
                            checked={hasDescriptionOnly}
                            onCheckedChange={(v) => setHasDescriptionOnly(Boolean(v))}
                            data-testid="checkbox-has-description"
                          />
                          <label htmlFor="has-description" className="text-sm">Has description</label>
                        </div>

                        {/* Starred only */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="starred-only"
                            checked={starredOnly}
                            onCheckedChange={(v) => setStarredOnly(Boolean(v))}
                            data-testid="checkbox-starred-only"
                          />
                          <label htmlFor="starred-only" className="text-sm">Starred only</label>
                        </div>

                        <DialogFooter className="pt-2">
                          <div className="flex w-full justify-between">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCreatedDateRange(undefined);
                                setSelectedDomains([]);
                                setHasDescriptionOnly(false);
                                setDomainInput("");
                                setStarredOnly(false);
                              }}
                            >
                              Clear all
                            </Button>
                            <Button onClick={() => setFilterOpen(false)}>Done</Button>
                          </div>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              )}
            </div>
  
            {/* Main Content */}
            <div className="space-y-4">
              {isHistoryView ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Search history..."
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        className="text-sm sm:text-base"
                        data-testid="input-search-history"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setHistoryEvents(history.list())}>Refresh</Button>
                      <Button variant="destructive" disabled={historyEvents.length === 0} onClick={() => history.clear()}>Clear All</Button>
                    </div>
                  </div>
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">No activity yet</div>
                  ) : (
                    filteredHistory.map((e) => (
                      <div key={e.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm break-words">{e.summary}</div>
                          <div className="text-xs text-muted-foreground mt-1">{formatHistoryTime(e.timestamp)}</div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">{e.type}</Badge>
                      </div>
                    ))
                  )}
                </>
              ) : isTrashView ? (
                trashedRecords.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">No items in Trash</div>
                ) : (
                  trashedRecords.map((r) => (
                    <div key={r.id} className="border rounded-md p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {r.email}
                         
                        </div>
                        {r.description && <div className="text-sm text-muted-foreground truncate">{r.description}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                      {(() => {
                            const deletedAt = (r as any).deletedAt;
                            if (!deletedAt) return null;
                            const deletedMs = new Date(deletedAt as any).getTime();
                            if (Number.isNaN(deletedMs)) return null;
                            const now = Date.now();
                            const total = 30 * 24 * 60 * 60 * 1000;
                            const remainingMs = Math.max(0, total - (now - deletedMs));
                            const daysLeft = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
                            const urgent = daysLeft <= 3;
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${urgent ? "bg-red-500 text-white" : "bg-muted text-foreground"}`} title={`Auto-deletes in ${daysLeft} day(s)`}>
                                {daysLeft}d left
                              </span>
                            );
                          })()}
                        <Button
                          variant="outline"
                          size="icon"
                          title="Restore"
                          aria-label="Restore"
                          onClick={async () => {
                            await apiRequest("PUT", `/api/records/${r.id}`, { isDeleted: false, deletedAt: null });
                            queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
                            try {
                              history.add({ type: "record:restore", summary: `Restored: ${r.email}`, details: { id: r.id } });
                            } catch {}
                          }}
                        >
                          <RefreshCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          title="Delete forever"
                          aria-label="Delete forever"
                          onClick={async () => {
                            await apiRequest("DELETE", `/api/records/${r.id}`);
                            queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
                            try {
                              history.add({ type: "record:delete", summary: `Permanently deleted: ${r.email}`, details: { id: r.id } });
                            } catch {}
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                filteredAndSortedRecords.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="bg-muted rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="141" height="166" viewBox="0 0 141 166" className="w-12 h-12 " fill="currentColor" >
                        <path xmlns="http://www.w3.org/2000/svg" d="M70 46L70.5 83L101 101.5V148L69.5 166L0 125V41L31.5 23L70 46ZM8 120L69.5 156.263V120L38.5 102V64L8 46.5V120Z"/>
                        <path xmlns="http://www.w3.org/2000/svg" d="M140.5 125L108.5 143.5V60.5L39 18.5L70 0L140.5 42V125Z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {records.length === 0 ? "No passwords stored yet" : "No matching records"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {records.length === 0 
                        ? "Get started by adding your first email and password record"
                        : "Try adjusting your search terms or sorting options"
                      }
                    </p>
                    {records.length === 0 && (
                      <div className="mobile-button-group flex flex-col sm:flex-row gap-2 justify-center">
                        <Button onClick={handleAddRecord} className="btn" data-testid="button-add-first-record">
                          Add Your First Record
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsPasswordGeneratorOpen(true)}
                          className="btn"
                          data-testid="button-try-generator"
                        >
                          Try Password Generator
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span data-testid="text-records-count">
                        {filteredAndSortedRecords.length} of {nonDeletedRecords.length} records
                      </span>
                      <span data-testid="text-sort-info">
                        Sorted by {getSortLabel(sortBy)}
                      </span>
                    </div>
                    {filteredAndSortedRecords.map((record) => (
                      <PasswordRecordCard
                        key={record.id}
                        record={record}
                        onEdit={handleEditRecord}
                        onDelete={handleDeleteRecord}
                        onToggleStar={toggleStar}
                      />
                    ))}
                  </>
                )
              )}
            </div>
          </div>
        )}
      </main>
  
      {/* Modals */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        mode={modalMode}
        record={selectedRecord}
        onCreateSuccess={async () => {
          if (wasEmptyBeforeAddRef.current) {
            try {
              const mod = await import("canvas-confetti");
              const confetti = mod.default;
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
              });
              setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 150);
              setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 150);
            } catch {}
          }
        }}
      />
  
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        record={selectedRecord}
      />
  
      <OnboardingGuide
        isOpen={isOnboardingOpen}
        onComplete={handleOnboardingComplete}
      />
  
      <PasswordGenerator
        isOpen={isPasswordGeneratorOpen}
        onClose={() => setIsPasswordGeneratorOpen(false)}
      />
    </div>
  );
}

// History modal removed; use Profile -> History button to access full page
