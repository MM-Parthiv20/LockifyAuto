import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PasswordRecord, insertPasswordRecordSchema } from "@shared/schema";
import { validatePassword } from "@/lib/password-validation";
import { PasswordGenerator } from "@/components/password-generator";
import { Eye, EyeOff, Check, X, Key } from "lucide-react";
import { history } from "@/lib/history";

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  record?: PasswordRecord | null;
  onCreateSuccess?: () => void;
}

// Category options with custom image icons
export const categoryOptions = [
  { value: "gmail", label: "Gmail", imagePath: "/images/social_icons/Google.png" },
  { value: "outlook", label: "Outlook", imagePath: "/images/social_icons/Outlook.png" },
  { value: "yahoo", label: "Yahoo", imagePath: "/images/social_icons/others.png" },
  { value: "protonmail", label: "ProtonMail", imagePath: "/images/social_icons/others.png" },
  { value: "instagram", label: "Instagram", imagePath: "/images/social_icons/Instagram.png" },
  { value: "facebook", label: "Facebook", imagePath: "/images/social_icons/Facebook.png" },
  { value: "X", label: "X", imagePath: "/images/social_icons/X.png" },
  { value: "linkedin", label: "LinkedIn", imagePath: "/images/social_icons/Linkedin.png" },
  { value: "github", label: "GitHub", imagePath: "/images/social_icons/Github.png" },
  { value: "figma", label: "Figma", imagePath: "/images/social_icons/Figma.png" },
  { value: "dribbble", label: "Dribbble", imagePath: "/images/social_icons/Dribbble.png" },
  { value: "apple", label: "Apple", imagePath: "/images/social_icons/Apple.png" },
  { value: "amazon", label: "Amazon", imagePath: "/images/social_icons/Amazon.png" },
  { value: "discord", label: "Discord", imagePath: "/images/social_icons/Discord.png" },
  { value: "reddit", label: "Reddit", imagePath: "/images/social_icons/Reddit.png" },
  { value: "spotify", label: "Spotify", imagePath: "/images/social_icons/Spotify.png" },
  { value: "youtube", label: "YouTube", imagePath: "/images/social_icons/YouTube.png" },
  { value: "tiktok", label: "TikTok", imagePath: "/images/social_icons/TikTok.png" },
  { value: "snapchat", label: "Snapchat", imagePath: "/images/social_icons/Snapchat.png" },
  { value: "whatsapp", label: "WhatsApp", imagePath: "/images/social_icons/WhatsApp.png" },
  { value: "telegram", label: "Telegram", imagePath: "/images/social_icons/Telegram.png" },
  { value: "pinterest", label: "Pinterest", imagePath: "/images/social_icons/Pinterest.png" },
  { value: "medium", label: "Medium", imagePath: "/images/social_icons/Medium.png" },
  { value: "twitch", label: "Twitch", imagePath: "/images/social_icons/Twitch.png" },
  { value: "other", label: "Other", imagePath: "/images/social_icons/others.png" },
];

// Social media platforms that don't require email format
export const socialMediaPlatforms = ['instagram', 'facebook', 'X', 'linkedin', 'github', 'figma', 'dribbble', 'discord', 'reddit', 'spotify', 'youtube', 'tiktok', 'snapchat', 'whatsapp', 'telegram', 'pinterest', 'medium', 'twitch'];

export const isSocialMedia = (userType?: string | null) => {
  return userType ? socialMediaPlatforms.includes(userType) : false;
};

export const getCategoryIcon = (userType?: string | null) => {
  const category = categoryOptions.find(c => c.value === userType);
  if (!category) return null;
  return (
    <img 
      src={category.imagePath} 
      alt={category.label}
      className="h-5 w-5 object-contain"
      onError={(e) => {
        // Fallback to a default icon if image fails to load
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

export const getCategoryLabel = (userType?: string | null) => {
  const category = categoryOptions.find(c => c.value === userType);
  return category?.label || "Select category";
};

export function RecordModal({ isOpen, onClose, mode, record, onCreateSuccess }: RecordModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    description: "",
    userType: "gmail",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when modal opens/closes or record changes
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && record) {
        setFormData({
          email: record.email,
          password: record.password,
          description: record.description || "",
          userType: record.userType || "gmail",
        });
      } else {
        setFormData({
          email: "",
          password: "",
          description: "",
          userType: "gmail",
        });
      }
      setShowPassword(false);
    }
  }, [isOpen, mode, record]);

  const passwordValidation = validatePassword(formData.password);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const now = new Date().toISOString();
      const res = await apiRequest("POST", "/api/records", {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      return res.json();
    },
    onSuccess: (created: PasswordRecord) => {
      // Close modal first to avoid accidental double submit from rapid UI interactions
      onClose();
      // Update cache locally to avoid an extra refetch
      const current = queryClient.getQueryData<PasswordRecord[]>(["/api/records"]) || [];
      queryClient.setQueryData(["/api/records"], [created, ...current]);
      toast({
        title: "Record created",
        description: "Your password record has been saved successfully",
      });
      try {
        history.add({ type: "record: create", summary: `Created record for ${formData.email}`, details: { email: formData.email } });
      } catch {}
      if (onCreateSuccess) {
        try {
          onCreateSuccess();
        } catch {}
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create record",
        description: error.message || "Please check your input and try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const now = new Date().toISOString();
      const res = await apiRequest("PUT", `/api/records/${record?.id}`, {
        ...data,
        updatedAt: now,
      });
      return res.json();
    },
    onSuccess: (updated: PasswordRecord) => {
      // Update cache locally to avoid an extra refetch
      const current = queryClient.getQueryData<PasswordRecord[]>(["/api/records"]) || [];
      const next = current.map((r) => (r.id === updated.id ? updated : r));
      queryClient.setQueryData(["/api/records"], next);
      toast({
        title: "Record updated",
        description: "Your password record has been updated successfully",
      });
      try {
        history.add({ type: "record: update", summary: `Updated record ${record?.email || formData.email}`, details: { id: record?.id } });
      } catch {}
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update record",
        description: error.message || "Please check your input and try again",
        variant: "destructive",
      });
    },
  });

  const attemptSave = () => {
    try {
      insertPasswordRecordSchema.parse(formData);
      // Prevent duplicate emails (case-insensitive) using cached records
      const existingRecords = queryClient.getQueryData<PasswordRecord[] | undefined>(["/api/records"]) || [];
      const normalize = (v: string) => v.trim().toLowerCase();
      const incomingEmail = normalize(formData.email);
      const hasDuplicate = existingRecords.some((r) => {
        const sameEmail = normalize(r.email) === incomingEmail;
        const isActive = !(r as any).isDeleted; // treat missing as active
        if (!sameEmail || !isActive) return false;
        if (mode === "edit" && record) {
          return r.id !== record.id;
        }
        return true;
      });
      if (hasDuplicate) {
        onClose();
        toast({
          title: "Email already exist",
          variant: "destructive",
        });
        return;
      }
      
      if (mode === "add") {
        createMutation.mutate(formData);
      } else {
        updateMutation.mutate(formData);
      }
    } catch (error: any) {
      toast({
        title: "Validation failed",
        description: "Please check all fields and requirements",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createMutation.isPending || updateMutation.isPending) return;
    attemptSave();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSelect = (generatedPassword: string) => {
    setFormData(prev => ({
      ...prev,
      password: generatedPassword,
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-record">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {mode === "add" ? "Add New Record" : "Edit Record"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} noValidate className="space-y-6">


          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">
              {isSocialMedia(formData.userType) ? 'Username *' : 'Email Address *'}
            </Label>
            <Input
              id="email"
              name="email"
              type={isSocialMedia(formData.userType) ? "text" : "email"}
              placeholder={isSocialMedia(formData.userType) ? "Enter username" : "Enter email address"}
              value={formData.email}
              onChange={handleChange}
              required
              data-testid="input-modal-email"
            />
            <p className="text-xs text-muted-foreground">
              {isSocialMedia(formData.userType) 
                ? "Enter your username (@ symbol not required)" 
                : "Must be a valid email format"}
            </p>
          </div>
          
          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsPasswordGeneratorOpen(true)}
                className="text-xs text-primary hover:text-primary"
                data-testid="button-open-generator"
              >
                <Key className="h-3 w-3 mr-1" />
                Generate
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
                className="pr-10"
                data-testid="input-modal-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-modal-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            {formData.password && (
              <div className="text-xs space-y-2">
                <p className="font-medium text-muted-foreground">Password must contain:</p>
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex items-center space-x-1">
                    {passwordValidation.checks.length ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-600" />
                    )}
                    <span className={passwordValidation.checks.length ? "text-green-600" : "text-red-600"}>
                      8+ characters
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {passwordValidation.checks.uppercase ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-600" />
                    )}
                    <span className={passwordValidation.checks.uppercase ? "text-green-600" : "text-red-600"}>
                      Uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {passwordValidation.checks.lowercase ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-600" />
                    )}
                    <span className={passwordValidation.checks.lowercase ? "text-green-600" : "text-red-600"}>
                      Lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {passwordValidation.checks.number && passwordValidation.checks.special ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-600" />
                    )}
                    <span className={(passwordValidation.checks.number && passwordValidation.checks.special) ? "text-green-600" : "text-red-600"}>
                      Number & symbol
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <Label htmlFor="userType">Category (Optional)</Label>
            <Select 
              value={formData.userType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, userType: value }))}
            >
              <SelectTrigger className="w-full" data-testid="select-modal-category">
                <SelectValue placeholder="Select category">
                  {formData.userType && (
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(formData.userType)}
                      <span>{getCategoryLabel(formData.userType)}</span>
                    </div>
                  )}
                  {!formData.userType && "Select category"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[240px] overflow-y-auto">
                {categoryOptions.map((option) => {
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={option.imagePath} 
                          alt={option.label}
                          className="h-4 w-4 object-contain"
                        />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the platform type (email provider or social media)
            </p>
          </div>
          
          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              maxLength={200}
              placeholder="Optional description (max 200 characters)"
              value={formData.description}
              onChange={handleChange}
              className="resize-none"
              data-testid="input-modal-description"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Optional field</span>
              <span data-testid="text-char-count">{formData.description.length}/200 characters</span>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
              data-testid="button-modal-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
              data-testid="button-modal-save"
            >
              {isLoading ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      <PasswordGenerator
        isOpen={isPasswordGeneratorOpen}
        onClose={() => setIsPasswordGeneratorOpen(false)}
        onPasswordSelect={handlePasswordSelect}
      />
    </Dialog>
  );
}
