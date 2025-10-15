import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useBiometric } from '@/hooks/use-biometric';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useAuth } from '@/lib/auth';
import { getBiometricToken } from '@/lib/biometric';
import { Fingerprint, Smartphone, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BiometricLoginProps {
  onLoginSuccess: () => void;
  onFallbackToNormal: () => void;
}

export function BiometricLogin({ onLoginSuccess, onFallbackToNormal }: BiometricLoginProps) {
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);
  const [hasCheckedToken, setHasCheckedToken] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [biometricToken, setBiometricToken] = useState<any>(null);
  
  const { toast } = useToast();
  const { 
    isSupported, 
    isLoading, 
    isAuthenticating, 
    error,
    authenticate
  } = useBiometric();
  const { biometricEnabled } = useUserPreferences();
  const { biometricLogin, hasBiometricToken } = useAuth();

  // Check for biometric token on mount
  useEffect(() => {
    const checkBiometricToken = () => {
      const token = getBiometricToken();
      setBiometricToken(token);
      setHasCheckedToken(true);
    };

    checkBiometricToken();
  }, []);

  // Auto-attempt biometric login if token exists and biometric is enabled
  useEffect(() => {
    const attemptAutoLogin = async () => {
      if (!hasCheckedToken || !biometricToken || !biometricEnabled || !isSupported) {
        return;
      }

      // Small delay to show the biometric prompt
      setTimeout(async () => {
        await handleBiometricLogin();
      }, 500);
    };

    attemptAutoLogin();
  }, [hasCheckedToken, biometricToken, biometricEnabled, isSupported]);

  const handleBiometricLogin = async () => {
    if (!biometricToken) {
      setLoginError('No biometric token found');
      return;
    }

    try {
      setIsAttemptingLogin(true);
      setLoginError(null);
      
      const result = await biometricLogin(biometricToken.userId, biometricToken.username);
      
      if (result.success) {
        toast({
          title: "Welcome back!",
          description: "Biometric authentication successful"
        });
        onLoginSuccess();
      } else {
        setLoginError(result.error || 'Authentication failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      setLoginError(errorMsg);
    } finally {
      setIsAttemptingLogin(false);
    }
  };

  const handleRetry = () => {
    setLoginError(null);
    handleBiometricLogin();
  };

  // Don't show if biometric is disabled or no token
  if (!biometricEnabled || !biometricToken) {
    onFallbackToNormal();
    return null;
  }

  // Don't show if not supported or still loading
  if (isLoading || !isSupported) {
    onFallbackToNormal();
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-full p-3">
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Use your fingerprint to sign in</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Biometric authentication button */}
          <Button
            onClick={handleBiometricLogin}
            disabled={isAttemptingLogin || isAuthenticating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            {isAttemptingLogin || isAuthenticating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 mr-2" />
                Use Fingerprint
              </>
            )}
          </Button>

          {/* Error display */}
          {loginError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{loginError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-2 h-6 px-2"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* General error from biometric hook */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Fallback to normal login */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={onFallbackToNormal}
              className="text-muted-foreground"
              disabled={isAttemptingLogin || isAuthenticating}
            >
              Use password instead
            </Button>
          </div>

          {/* User info */}
          <div className="text-center text-sm text-muted-foreground">
            Signing in as <strong>{biometricToken?.username}</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BiometricLogin;
