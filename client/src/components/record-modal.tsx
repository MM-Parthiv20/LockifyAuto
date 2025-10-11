import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PasswordRecord, insertPasswordRecordSchema } from "@shared/schema";
import { validatePassword } from "@/lib/password-validation";
import { PasswordGenerator } from "@/components/password-generator";
import { Eye, EyeOff, Check, X, Key } from "lucide-react";

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
      loading="lazy"
      onError={(e) => {
        // Fallback to others.png if specific image fails to load
        const target = e.target as HTMLImageElement;
        if (target.src !== "/images/social_icons/others.png") {
          target.src = "/images/social_icons/others.png";
        } else {
          // If even the fallback fails, hide the image
          target.style.display = 'none';
        }
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
        });
      } else {
        setFormData({
          email: "",
          password: "",
          description: "",
        });
      }
      setShowPassword(false);
    }
  }, [isOpen, mode, record]);

  const passwordValidation = validatePassword(formData.password);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/records", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records"] });
      toast({
        title: "Record created",
        description: "Your password record has been saved successfully",
      });
      onClose();
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
      const res = await apiRequest("PUT", `/api/records/${record?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records"] });
      toast({
        title: "Record updated",
        description: "Your password record has been updated successfully",
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      insertPasswordRecordSchema.parse(formData);
      
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
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              required
              data-testid="input-modal-email"
            />
            <p className="text-xs text-muted-foreground">Must be a valid email format</p>
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
              disabled={isLoading || !passwordValidation.isValid}
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
