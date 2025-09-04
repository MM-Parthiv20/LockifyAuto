import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Check, X, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { validatePassword } from "@/lib/password-validation";


export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const { register, isRegisterLoading } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const passwordValidation = validatePassword(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordValidation.isValid) {
      toast({
        title: "Invalid password",
        description: "Please ensure your password meets all requirements",
        variant: "destructive",
      });
      return;
    }



    try {
      await register({ username: formData.username.trim(), password: formData.password });
      setLocation("/login");
      toast({ title: "Account created", description: "You can now sign in." });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Username already exists or invalid data",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          data-testid="button-theme-toggle"
        >
           {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-primary rounded-lg p-3">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Lockify Auto</CardTitle>
            <CardDescription>Create your account</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                required
                data-testid="input-username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {formData.password && (
                <div className="text-xs space-y-1 mt-2">
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



            <Button 
              type="submit" 
              className="w-full" 
              disabled={isRegisterLoading || !passwordValidation.isValid}
              data-testid="button-register"
            >
              {isRegisterLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
