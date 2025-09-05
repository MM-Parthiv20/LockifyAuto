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
import { Plus, Search, Filter, Moon, Sun, Key, ArrowUpDown, Calendar, User, Loader2 } from "lucide-react";

import Profile from "@/pages/profile";
import LoadingSpinner from "@/components/loading-spinner";

type SortOption = "newest" | "oldest" | "email" | "updated";

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
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
  const avatarUrl = (() => {
    if (user?.profileimage) return user.profileimage;
    const seed = (user?.id || user?.username || "1").length % 100 || 1;
    return `https://avatar.iran.liara.run/public/${seed}`;
  })();

  const { data: records = [], isLoading } = useQuery<PasswordRecord[]>({
    queryKey: ["/api/records"],
  });

  // Open onboarding once per device (localStorage flag)
  useEffect(() => {
    const seen = localStorage.getItem("lockify-onboarding-seen");
    if (!seen) {
      setIsOnboardingOpen(true);
    }
  }, []);

  const filteredAndSortedRecords = (() => {
    let filtered = records.filter(record =>
      record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

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
    localStorage.setItem("lockify-onboarding-seen", "1");
    setIsOnboardingOpen(false);
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
              <svg xmlns="http://www.w3.org/2000/svg" width="141" height="166" viewBox="0 0 141 166" className="w-9 h-9" fill="currentColor">
              <path xmlns="http://www.w3.org/2000/svg" d="M70 46L70.5 83L101 101.5V148L69.5 166L0 125V41L31.5 23L70 46ZM8 120L69.5 156.263V120L38.5 102V64L8 46.5V120Z"/>
              <path xmlns="http://www.w3.org/2000/svg" d="M140.5 125L108.5 143.5V60.5L39 18.5L70 0L140.5 42V125Z"/>
              </svg>
              </div>
              <h1 className="text-xl font-semibold text-foreground">Lockify Auto</h1>
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
  
              {/* User Menu removed for open app */}
            </div>
          </div>
        </div>
      </nav>
  
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {showProfile ? (
          <Profile onBack={() => setShowProfile(false)} />
        ) : (
          <div>
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Your Passwords</h2>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Manage your email and password records securely
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="mobile-button-group flex flex-col sm:flex-row gap-2">
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
              </div>
              
              {/* Search and Sort */}
              <div className="search-sort-container mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                    <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-sort">
                      <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest" data-testid="sort-newest">Newest First</SelectItem>
                      <SelectItem value="oldest" data-testid="sort-oldest">Oldest First</SelectItem>
                      <SelectItem value="email" data-testid="sort-email">Email A-Z</SelectItem>
                      <SelectItem value="updated" data-testid="sort-updated">Recently Updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
  
            {/* Records Grid */}
            <div className="space-y-4">
              {filteredAndSortedRecords.length === 0 ? (
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
          </div>
        )}
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
    </div>
  );
}
