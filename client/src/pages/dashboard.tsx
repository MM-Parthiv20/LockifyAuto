import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Shield, Plus, Search, Filter, Moon, Sun, LogOut, Key, ArrowUpDown, Calendar } from "lucide-react";

type SortOption = "newest" | "oldest" | "email" | "updated";

export default function Dashboard() {
  const { user, logout, updateOnboardingStatus } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PasswordRecord | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  const { data: records = [], isLoading } = useQuery<PasswordRecord[]>({
    queryKey: ["/api/records"],
  });

  // Check onboarding status
  useEffect(() => {
    if (user && !user.hasCompletedOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, [user]);

  const filteredAndSortedRecords = (() => {
    let filtered = records.filter(record =>
      record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    // Sort records
    switch (sortBy) {
      case "newest":
        filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        filtered = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "email":
        filtered = [...filtered].sort((a, b) => a.email.localeCompare(b.email));
        break;
      case "updated":
        filtered = [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return filtered;
  })();

  const handleAddRecord = () => {
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
    try {
      await updateOnboardingStatus(true);
      setIsOnboardingOpen(false);
    } catch (error) {
      console.error("Failed to update onboarding status:", error);
    }
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "newest": return "Newest First";
      case "oldest": return "Oldest First";
      case "email": return "Email A-Z";
      case "updated": return "Recently Updated";
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-muted-foreground">Loading your records...</div>
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
            <div className="flex items-center space-x-3">
              <div className="bg-primary rounded-lg p-2">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Lockify Auto</h1>
            </div>
            
            {/* Right Side Controls */}
            <div className="flex items-center space-x-4">
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
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (!target.src.endsWith('/others.png')) {
                                        target.src = "/images/social_icons/others.png";
                                      } else {
                                        target.style.display = 'none';
                                      }
                                    }}
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

        {/* Records Grid */}
        <div className="space-y-4">
          {filteredAndSortedRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-muted rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-12 h-12 text-muted-foreground" />
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
                  {filteredAndSortedRecords.length} of {records.length} records
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
                />
              ))}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        mode={modalMode}
        record={selectedRecord}
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
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.endsWith('/others.png')) {
                          target.src = "/images/social_icons/others.png";
                        } else {
                          target.style.display = 'none';
                        }
                      }}
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
