import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { PasswordRecord } from "@shared/schema";
import { PasswordRecordCard } from "@/components/password-record-card";
import { RecordModal } from "@/components/record-modal";
import { DeleteModal } from "@/components/delete-modal";
import { Shield, Plus, Search, Filter, Moon, Sun, LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PasswordRecord | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  const { data: records = [], isLoading } = useQuery<PasswordRecord[]>({
    queryKey: ["/api/records"],
  });

  const filteredRecords = records.filter(record =>
    record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

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
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-foreground" data-testid="text-username">
                    {user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">Password Manager</p>
                </div>
                <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium" data-testid="text-user-initials">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="p-2"
                  data-testid="button-logout"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Your Passwords</h2>
              <p className="text-muted-foreground mt-1">
                Manage your email and password records securely
              </p>
            </div>
            
            {/* Add New Record Button */}
            <Button 
              onClick={handleAddRecord}
              className="flex items-center space-x-2"
              data-testid="button-add-record"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Record</span>
            </Button>
          </div>
          
          {/* Search and Filter */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Button variant="secondary" className="flex items-center space-x-2" data-testid="button-filter">
              <Filter className="w-5 h-5" />
              <span>Filter</span>
            </Button>
          </div>
        </div>

        {/* Records Grid */}
        <div className="space-y-6">
          {filteredRecords.length === 0 ? (
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
                  : "Try adjusting your search terms"
                }
              </p>
              {records.length === 0 && (
                <Button onClick={handleAddRecord} data-testid="button-add-first-record">
                  Add Your First Record
                </Button>
              )}
            </div>
          ) : (
            filteredRecords.map((record) => (
              <PasswordRecordCard
                key={record.id}
                record={record}
                onEdit={handleEditRecord}
                onDelete={handleDeleteRecord}
              />
            ))
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
    </div>
  );
}
