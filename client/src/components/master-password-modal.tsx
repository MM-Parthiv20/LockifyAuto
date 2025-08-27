import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Eye, EyeOff } from "lucide-react";

interface MasterPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MasterPasswordModal({ isOpen, onSuccess, onCancel }: MasterPasswordModalProps) {
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) return;

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/verify-master", { masterPassword });
      if (res.ok) {
        onSuccess();
        setMasterPassword("");
        toast({
          title: "Access granted",
          description: "Your records are now unlocked",
        });
      } else {
        throw new Error("Invalid master password");
      }
    } catch (error) {
      toast({
        title: "Access denied",
        description: "Invalid master password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMasterPassword("");
    setShowPassword(false);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md" data-testid="modal-master-password" aria-describedby="master-password-description">
        <DialogHeader className="text-center space-y-4">
          <div className="bg-primary rounded-lg p-3 w-fit mx-auto">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle data-testid="text-master-password-title">
            Enter Master Password
          </DialogTitle>
          <p id="master-password-description" className="text-sm text-muted-foreground">
            Please enter your master password to access your stored records
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="masterPassword">Master Password</Label>
            <div className="relative">
              <Input
                id="masterPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your master password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                required
                className="pr-10"
                data-testid="input-master-password-unlock"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-master-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isLoading}
              data-testid="button-master-password-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !masterPassword.trim()}
              data-testid="button-master-password-unlock"
            >
              {isLoading ? "Verifying..." : "Unlock Records"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}