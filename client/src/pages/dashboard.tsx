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
import { Plus, Search, Filter, Moon, Sun, Key, ArrowUpDown, Calendar as CalendarIcon, User, Loader2, X, RefreshCcw, Trash2, MoreVertical, ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

import LoadingSpinner from "@/components/loading-spinner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { history, HistoryEvent } from "@/lib/history";

type SortOption = "newest" | "oldest" | "email" | "updated" | "starred";

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const { user, updateOnboardingStatus } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect to login if no user is authenticated
  if (!user) {
    setLocation("/login");
    return null;
  }
  // Load filter settings from sessionStorage on mount
  const loadFilterSettings = () => {
    try {
      const saved = sessionStorage.getItem('lockify-filter-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          searchQuery: parsed.searchQuery || "",
          sortBy: parsed.sortBy || "newest",
          createdDateRange: parsed.createdDateRange ? {
            from: parsed.createdDateRange.from ? new Date(parsed.createdDateRange.from) : undefined,
            to: parsed.createdDateRange.to ? new Date(parsed.createdDateRange.to) : undefined,
          } : undefined,
          selectedDomains: parsed.selectedDomains || [],
          hasDescriptionOnly: parsed.hasDescriptionOnly || false,
          starredOnly: parsed.starredOnly || false,
          selectedCategories: parsed.selectedCategories || [],
        };
      }
    } catch (e) {
      console.error('Failed to load filter settings:', e);
    }
    return null;
  };

  const savedSettings = loadFilterSettings();

  const [searchQuery, setSearchQuery] = useState(savedSettings?.searchQuery || "");
  const [sortBy, setSortBy] = useState<SortOption>(savedSettings?.sortBy || "newest");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PasswordRecord | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>(savedSettings?.createdDateRange);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [activeDateField, setActiveDateField] = useState<"from" | "to" | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>(savedSettings?.selectedDomains || []);
  const [hasDescriptionOnly, setHasDescriptionOnly] = useState<boolean>(savedSettings?.hasDescriptionOnly || false);
  const [starredOnly, setStarredOnly] = useState<boolean>(savedSettings?.starredOnly || false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(savedSettings?.selectedCategories || []);
  const [isMoreCategoriesModalOpen, setIsMoreCategoriesModalOpen] = useState(false);
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
      // Do not refetch; cache already updated optimistically
      // Fire-and-forget history logging
      void history.add({ type: "record: toggleStar", summary: "Toggled star on a record" }).catch(() => {});
    },
  });

  const toggleStar = (record: PasswordRecord) => toggleStarMutation.mutate(record);
  const isTrashView = location === "/trash";
  const isHistoryView = location === "/history";
  const trashedRecords = (records as any[]).filter((r) => r.isDeleted);
  const nonDeletedRecords = (records as any[]).filter((r) => !r.isDeleted);
  const { toast } = useToast();

  // History page state (for /history)
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [historyFilter, setHistoryFilter] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  
  const loadHistoryEvents = async () => {
    try {
      setIsHistoryLoading(true);
      const events = await history.list();
      setHistoryEvents(events);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };
  
  useEffect(() => {
    loadHistoryEvents();
    
    const refresh = () => {
      loadHistoryEvents();
    };
    window.addEventListener('lockify-history-updated' as any, refresh as any);
    return () => window.removeEventListener('lockify-history-updated' as any, refresh as any);
  }, []);
  
  const filteredHistory = (() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return historyEvents;
    return historyEvents.filter((e: HistoryEvent) => e.summary.toLowerCase().includes(q) || e.type.toLowerCase().includes(q));
  })();
  const formatHistoryTime = (ts: number) => new Date(ts).toLocaleString();

  // Save filter settings to sessionStorage whenever they change
  useEffect(() => {
    try {
      const filterSettings = {
        searchQuery,
        sortBy,
        createdDateRange: createdDateRange ? {
          from: createdDateRange.from?.toISOString(),
          to: createdDateRange.to?.toISOString(),
        } : undefined,
        selectedDomains,
        hasDescriptionOnly,
        starredOnly,
        selectedCategories,
      };
      sessionStorage.setItem('lockify-filter-settings', JSON.stringify(filterSettings));
    } catch (e) {
      console.error('Failed to save filter settings:', e);
    }
  }, [searchQuery, sortBy, createdDateRange, selectedDomains, hasDescriptionOnly, starredOnly, selectedCategories]);

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
        // Fire-and-forget history logging
        void history.add({ type: "trash: autoDelete", summary: `Auto-deleted ${deletedCount} item(s) from Trash` }).catch(() => {});
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

  // Reusable Intro.js guided tour starter
  const ensureIntroCss = () => {
    const id = "introjs-style";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/intro.js/minified/introjs.min.css";
    document.head.appendChild(link);
  };

  const startTour = async () => {
    try {
      ensureIntroCss();
      const mod: any = await import("intro.js");
      const intro = (mod.default || mod.introJs)();
      intro.setOptions({
        // lock down interactions outside the tooltip
        disableInteraction: true,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        // controls and labels
        showButtons: true,
        showBullets: true,
        showProgress: true,
        skipLabel: "Skip Tour",
        nextLabel: "Next →",
        prevLabel: "← Back",
        doneLabel: "Get Started!",
        // Position and appearance
        tooltipPosition: "auto",
        positionPrecedence: ["bottom", "top", "right", "left"],
        scrollToElement: true,
        scrollPadding: 30,
        overlayOpacity: 0.8,
        // Steps with detailed content
        tooltipClass: "intro-tooltip-wide",
        steps: [
          { 
            title: "Welcome to Lockify",
            intro: "Secure password management solution. This tour covers essential features." 
          },
          { 
            element: "#tour-avatar", 
            title: "Profile & Account",
            intro: "Access settings, history, and preferences via your avatar.",
            position: "bottom"
          },
          { 
            element: "#tour-search", 
            title: "Search",
            intro: "Locate credentials by email, username, or description in real-time.",
            position: "bottom"
          },
          { 
            element: "#tour-sort", 
            title: "Sorting",
            intro: "Sort by date, email (A-Z), last update, or starred items.",
            position: "bottom"
          },
          { 
            element: "#tour-filters", 
            title: "Advanced Filters",
            intro: "Filter by date range, domain, description, or starred items.",
            position: "bottom"
          },
          { 
            element: window.innerWidth >= 1280 ? "#tour-password-generator" : "#tour-password-generator-mobile", 
            title: "Password Generator",
            intro: "Generate secure passwords with customizable length (8-128) and character types.",
            position: window.innerWidth >= 1280 ? "left" : "left"
          },
          { 
            element: window.innerWidth >= 1280 ? "#tour-add-record" : "#tour-add-record-mobile", 
            title: "Add Password",
            intro: "Store encrypted passwords with email, description, and star marking.",
            position: window.innerWidth >= 1280 ? "left" : "left"
          },
        ],
      });
      const injectSkipButton = () => {
        try {
          const tooltips = document.querySelectorAll('.introjs-tooltip');
          if (!tooltips.length) return;
          const btnContainers = document.querySelectorAll('.introjs-tooltipbuttons');
          btnContainers.forEach((container) => {
            if (!container.querySelector('.introjs-custom-skip')) {
              const skipBtn = document.createElement('a');
              skipBtn.className = 'introjs-button introjs-custom-skip';
              skipBtn.textContent = 'Skip';
              skipBtn.addEventListener('click', () => intro.exit());
              container.appendChild(skipBtn);
            }
          });
        } catch {}
      };
      
      const markComplete = async () => { 
        try { 
          await updateOnboardingStatus(true); 
        } catch {} 
      };
      
      intro.oncomplete(async () => {
        await markComplete();
        try { 
          sessionStorage.setItem('lockify-tour-done', '1'); 
        } catch {}
        (window as any).__lockifyTourRunning = false;
      });
      
      intro.onexit(async () => {
        // Mark as complete even when exiting/skipping to prevent tour from repeating
        await markComplete();
        try { 
          sessionStorage.setItem('lockify-tour-done', '1'); 
        } catch {}
        (window as any).__lockifyTourRunning = false;
      });
      
      intro.onafterchange(injectSkipButton);
      intro.onchange(injectSkipButton);
      
      (window as any).__lockifyTourRunning = true;
      intro.start();
      // ensure first step has skip
      setTimeout(injectSkipButton, 0);
    } catch (error) {
      console.error("Tour initialization failed:", error);
    }
  };

  // Expose manual trigger for editing/QA
  useEffect(() => {
    (window as any).startLockifyTutorial = startTour;
  }, []);

  // Auto-run tour for first-time users
  useEffect(() => {
    if (!user) return;
    try {
      const done = sessionStorage.getItem('lockify-tour-done');
      if (user.hasCompletedOnboarding || done === '1') return;
      if ((window as any).__lockifyTourRunning) return;
    } catch {}
    const t = window.setTimeout(() => { if (!(window as any).__lockifyTourRunning) startTour(); }, 300);
    return () => window.clearTimeout(t);
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
    if (selectedCategories.length > 0) n += 1;
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

      // Category filter
      const categoryOk = selectedCategories.length === 0 || selectedCategories.includes((record as any).userType || "gmail");

      return matchesQuery && fromOk && toOk && domainOk && descOk && starOk && categoryOk;
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
    <div className="min-h-screen bg-background relative">
      {/* Navigation Header */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2" onClick={() => setLocation("/")}>
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

              {/* Manual Start Tour */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startTour()}
                className="p-2"
                data-testid="button-start-tour"
              >
                <span className="hidden sm:inline">Start tour</span>
                <span className="sm:hidden">Tour</span>
              </Button>

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
                <div id="tour-avatar" className="flex items-center gap-2 pr-1 cursor-pointer" onClick={() => setLocation("/profile")}>
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
              
              {/* Profile Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/profile")}
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
        <div>
        {!isTrashView && !isHistoryView && (  
          <div className="mb-4">
              
              {/* floating Add record and password generator */}
              <div className="floating-button-group fixed bottom-4 right-4 xl:hidden flex flex-col gap-3 items-end">
                <Button
                  onClick={() => setIsPasswordGeneratorOpen(true)}
                  className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#A889B3] text-black shadow-[0_10px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.45)] transition-transform duration-200 active:translate-y-0.5"
                  size="icon"
                  data-testid="button-password-generator"
                >
                  <Key className="w-6 h-6" />
                </Button>
                <Button
                  onClick={() => handleAddRecord()}
                  className="flex items-center justify-center sm:w-20 sm:h-20 w-16 h-16 xl:rounded-3xl rounded-2xl bg-[#8AA0D8] text-black shadow-[0_14px_28px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.5)] transition-transform duration-200 active:translate-y-0.5"
                  data-testid="button-add-record"
                >
                  <Plus className="w-9 h-9" />
                </Button>
              </div>
             
           

              
              
              {/* Search, Sort and Filters */}
              
              <div className="search-sort-container flex flex-row gap-2">
                <div className="flex-1 relative" id="tour-search">
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
                    <SelectTrigger id="tour-sort" className="relative w-full" data-testid="select-sort">
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
                      <Button id="tour-filters" variant="outline" className="relative" data-testid="button-filters">
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

                        {/* Category filter */}
                        <div>
                          <div className="text-sm font-medium text-foreground mb-2">Category</div>
                          <div className="flex flex-wrap gap-2">
                            {["gmail", "outlook", "github", "facebook"].map((category) => {
                              const active = selectedCategories.includes(category);
                              // Get category icon from record-modal
                              const categoryData = (() => {
                                const categoryMap: Record<string, string> = {
                                  gmail: "/images/social_icons/Google.png",
                                  outlook: "/images/social_icons/Outlook.png",
                                  yahoo: "/images/social_icons/others.png",
                                  github: "/images/social_icons/Github.png",
                                  facebook: "/images/social_icons/Facebook.png",
                                  X: "/images/social_icons/X.png",
                                  linkedin: "/images/social_icons/Linkedin.png",
                                  instagram: "/images/social_icons/Instagram.png",
                                  figma: "/images/social_icons/Figma.png",
                                  dribbble: "/images/social_icons/Dribbble.png",
                                  discord: "/images/social_icons/Discord.png",
                                  reddit: "/images/social_icons/Reddit.png",
                                  spotify: "/images/social_icons/Spotify.png",
                                  youtube: "/images/social_icons/YouTube.png",
                                  tiktok: "/images/social_icons/TikTok.png",
                                  snapchat: "/images/social_icons/Snapchat.png",
                                  whatsapp: "/images/social_icons/WhatsApp.png",
                                  telegram: "/images/social_icons/Telegram.png",
                                  pinterest: "/images/social_icons/Pinterest.png",
                                  medium: "/images/social_icons/Medium.png",
                                  twitch: "/images/social_icons/Twitch.png",
                                  other: "/images/social_icons/others.png"
                                };
                                return categoryMap[category] || "/images/social_icons/others.png";
                              })();
                              return (
                                <button
                                  type="button"
                                  key={category}
                                  className={`px-3 py-1.5 rounded-md border text-xs capitalize flex items-center gap-1.5 ${
                                    active 
                                      ? "bg-primary text-primary-foreground border-primary" 
                                      : "bg-muted text-foreground hover:bg-muted/80"
                                  }`}
                                  onClick={() => {
                                    setSelectedCategories(prev => 
                                      prev.includes(category) 
                                        ? prev.filter(x => x !== category) 
                                        : [...prev, category]
                                    );
                                  }}
                                  data-testid={`category-${category}`}
                                >
                                  <img 
                                    src={categoryData} 
                                    alt={category}
                                    className="h-3.5 w-3.5 object-contain"
                                  />
                                  {category}
                                </button>
                              );
                            })}
                            {/* Plus button to open more categories modal */}
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-md border text-xs flex items-center gap-1.5 bg-muted text-foreground hover:bg-muted/80 relative"
                              onClick={() => setIsMoreCategoriesModalOpen(true)}
                              data-testid="button-more-categories"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              More
                              {(() => {
                                const moreCategories = ["yahoo", "X", "linkedin", "instagram", "figma", "dribbble", "discord", "reddit", "spotify", "youtube", "tiktok", "snapchat", "whatsapp", "telegram", "pinterest", "medium", "twitch", "other"];
                                const selectedMoreCategories = selectedCategories.filter(cat => moreCategories.includes(cat));
                                if (selectedMoreCategories.length > 0) {
                                  return (
                                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 min-w-4 px-1">
                                      {selectedMoreCategories.length}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </button>
                          </div>
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
                                setSelectedCategories([]);
                                setSearchQuery("");
                                setSortBy("newest");
                                // Clear sessionStorage
                                try {
                                  sessionStorage.removeItem('lockify-filter-settings');
                                } catch (e) {
                                  console.error('Failed to clear filter settings:', e);
                                }
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
            </div>
            )}
  
            {/* Main Content */}
            <div className="space-y-4">
              {isHistoryView ? (
                <>
                  <div className="flex flex-row gap-2 sm:items-center sm:justify-between">
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
                      
                      <Button variant="outline" size="icon" onClick={() => loadHistoryEvents()} className="sm:hidden size-8" title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => loadHistoryEvents()} className="hidden sm:inline-flex">Refresh</Button>
                      <Button variant="destructive" size="icon" disabled={historyEvents.length === 0} onClick={async () => { await history.clear(); setHistoryEvents([]); toast({ title: "Deleted all history", description: "All activity history was deleted." }); }} className="sm:hidden" title="Clear All">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" disabled={historyEvents.length === 0} onClick={async () => { await history.clear(); setHistoryEvents([]); toast({ title: "Deleted all history", description: "All activity history was deleted." }); }} className="hidden sm:inline-flex">Clear All</Button>
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
                <>
                    <div className="mb-4 flex items-center gap-2">
                      <ArrowLeft
                        className="w-8 h-8 rounded-md bg-primary/10 p-1 cursor-pointer"
                        onClick={() => setLocation("/profile")}
                      />
                      <div>
                        <h2 className="text-xl sm:text-3xl font-bold text-foreground">Trash</h2>
                      </div>
                    </div>
                  {trashedRecords.length === 0 ? (
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
                            // Log history (no need to await)
                            void history.add({ type: "record: restore", summary: `Restored: ${r.email}`, details: { id: r.id } }).catch(() => {});
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
                            // Log history (no need to await)
                            void history.add({ type: "record: delete", summary: `Permanently deleted: ${r.email}`, details: { id: r.id } }).catch(() => {});
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                  )}
                </>
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

      {/* More Categories Modal */}
      <Dialog open={isMoreCategoriesModalOpen} onOpenChange={setIsMoreCategoriesModalOpen}>
        <DialogContent className="sm:max-w-[540px] px-4 py-4 sm:px-6 sm:py-6">
          <DialogHeader>
            <DialogTitle>All Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
              {["yahoo", "X", "linkedin", "instagram", "figma", "dribbble", "discord", "reddit", "spotify", "youtube", "tiktok", "snapchat", "whatsapp", "telegram", "pinterest", "medium", "twitch", "other"].map((category) => {
                const active = selectedCategories.includes(category);
                const categoryData = (() => {
                  const categoryMap: Record<string, string> = {
                    gmail: "/images/social_icons/Google.png",
                    outlook: "/images/social_icons/Outlook.png",
                    yahoo: "/images/social_icons/others.png",
                    github: "/images/social_icons/Github.png",
                    facebook: "/images/social_icons/Facebook.png",
                    X: "/images/social_icons/X.png",
                    linkedin: "/images/social_icons/Linkedin.png",
                    instagram: "/images/social_icons/Instagram.png",
                    figma: "/images/social_icons/Figma.png",
                    dribbble: "/images/social_icons/Dribbble.png",
                    discord: "/images/social_icons/Discord.png",
                    reddit: "/images/social_icons/Reddit.png",
                    spotify: "/images/social_icons/Spotify.png",
                    youtube: "/images/social_icons/YouTube.png",
                    tiktok: "/images/social_icons/TikTok.png",
                    snapchat: "/images/social_icons/Snapchat.png",
                    whatsapp: "/images/social_icons/WhatsApp.png",
                    telegram: "/images/social_icons/Telegram.png",
                    pinterest: "/images/social_icons/Pinterest.png",
                    medium: "/images/social_icons/Medium.png",
                    twitch: "/images/social_icons/Twitch.png",
                    other: "/images/social_icons/others.png"
                  };
                  return categoryMap[category] || "/images/social_icons/others.png";
                })();
                return (
                  <button
                    type="button"
                    key={category}
                    className={`px-3 py-1.5 rounded-md border text-xs capitalize flex items-center gap-1.5 ${
                      active 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(category) 
                          ? prev.filter(x => x !== category) 
                          : [...prev, category]
                      );
                    }}
                    data-testid={`more-category-${category}`}
                  >
                    <img 
                      src={categoryData} 
                      alt={category}
                      className="h-3.5 w-3.5 object-contain"
                    />
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsMoreCategoriesModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// History modal removed; use Profile -> History button to access full page
