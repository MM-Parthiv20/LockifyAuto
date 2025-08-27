import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Settings } from "lucide-react";

interface PasswordGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordSelect?: (password: string) => void;
}

interface GeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
}

export function PasswordGenerator({ isOpen, onClose, onPasswordSelect }: PasswordGeneratorProps) {
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [options, setOptions] = useState<GeneratorOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
  });

  const { toast } = useToast();

  const generatePassword = () => {
    let charset = "";
    
    if (options.includeLowercase) {
      charset += options.excludeSimilar ? "abcdefghjkmnpqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz";
    }
    if (options.includeUppercase) {
      charset += options.excludeSimilar ? "ABCDEFGHJKMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }
    if (options.includeNumbers) {
      charset += options.excludeSimilar ? "23456789" : "0123456789";
    }
    if (options.includeSymbols) {
      charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    }

    if (charset === "") {
      toast({
        title: "Invalid settings",
        description: "Please select at least one character type",
        variant: "destructive",
      });
      return;
    }

    let password = "";
    for (let i = 0; i < options.length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    setGeneratedPassword(password);
  };

  const copyToClipboard = async () => {
    if (!generatedPassword) return;
    
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast({
        title: "Copied to clipboard",
        description: "Password has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy password to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleUsePassword = () => {
    if (!generatedPassword) return;
    onPasswordSelect?.(generatedPassword);
    onClose();
    toast({
      title: "Password selected",
      description: "Generated password has been inserted into the form",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-password-generator">
        <DialogHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="bg-primary rounded-lg p-2">
              <Settings className="w-6 h-6 text-primary-foreground" />
            </div>
            <DialogTitle data-testid="text-generator-title">Password Generator</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate a strong, random password with your preferred settings
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Generated Password Display */}
          <div className="space-y-2">
            <Label>Generated Password</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={generatedPassword}
                readOnly
                placeholder="Click generate to create a password"
                className="font-mono"
                data-testid="input-generated-password"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                disabled={!generatedPassword}
                data-testid="button-copy-generated"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generatePassword}
                data-testid="button-generate-password"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Length Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Password Length</Label>
              <span className="text-sm text-muted-foreground" data-testid="text-password-length">
                {options.length} characters
              </span>
            </div>
            <Slider
              value={[options.length]}
              onValueChange={([value]) => setOptions(prev => ({ ...prev, length: value }))}
              min={4}
              max={128}
              step={1}
              className="w-full"
              data-testid="slider-password-length"
            />
          </div>

          {/* Character Type Options */}
          <div className="space-y-4">
            <Label>Character Types</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="uppercase"
                  checked={options.includeUppercase}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeUppercase: !!checked }))
                  }
                  data-testid="checkbox-uppercase"
                />
                <Label htmlFor="uppercase" className="text-sm">
                  Uppercase Letters (A-Z)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lowercase"
                  checked={options.includeLowercase}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeLowercase: !!checked }))
                  }
                  data-testid="checkbox-lowercase"
                />
                <Label htmlFor="lowercase" className="text-sm">
                  Lowercase Letters (a-z)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="numbers"
                  checked={options.includeNumbers}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeNumbers: !!checked }))
                  }
                  data-testid="checkbox-numbers"
                />
                <Label htmlFor="numbers" className="text-sm">
                  Numbers (0-9)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="symbols"
                  checked={options.includeSymbols}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeSymbols: !!checked }))
                  }
                  data-testid="checkbox-symbols"
                />
                <Label htmlFor="symbols" className="text-sm">
                  Symbols (!@#$%^&*)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-similar"
                  checked={options.excludeSimilar}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, excludeSimilar: !!checked }))
                  }
                  data-testid="checkbox-exclude-similar"
                />
                <Label htmlFor="exclude-similar" className="text-sm">
                  Exclude Similar Characters (0, O, I, l)
                </Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-generator-close"
            >
              Close
            </Button>
            {onPasswordSelect && (
              <Button
                className="flex-1"
                onClick={handleUsePassword}
                disabled={!generatedPassword}
                data-testid="button-use-password"
              >
                Use This Password
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}