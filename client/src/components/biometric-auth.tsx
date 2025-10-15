import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useBiometric } from '@/hooks/use-biometric';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Fingerprint, Smartphone, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BiometricAuthProps {
  userId: string;
  username: string;
  onSuccess: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  showRegisterOption?: boolean;
}

export function BiometricAuth({ 
  userId, 
  username, 
  onSuccess, 
  onError, 
  disabled = false,
  showRegisterOption = true 
}: BiometricAuthProps) {
  const [shouldShow, setShouldShow] = useState(false);
  const [hasStoredCredential, setHasStoredCredential] = useState(false);
  
  const { toast } = useToast();
  const { biometricEnabled } = useUserPreferences();
  const { 
    isSupported, 
    isLoading, 
    isRegistering, 
    isAuthenticating, 
    error,
    register,
    authenticate,
    hasCredential,
    shouldOffer
  } = useBiometric();

  // Check if we should show biometric options
  useEffect(() => {
    const checkShouldShow = async () => {
      // Only show if biometric is enabled in user preferences
      if (!biometricEnabled) {
        setShouldShow(false);
        return;
      }

      const shouldOfferBiometric = await shouldOffer();
      const hasCred = hasCredential(userId);
      
      setShouldShow(shouldOfferBiometric && (hasCred || showRegisterOption));
      setHasStoredCredential(hasCred);
    };

    checkShouldShow();
  }, [userId, biometricEnabled, shouldOffer, hasCredential, showRegisterOption]);

  const handleAuthenticate = async () => {
    try {
      const result = await authenticate(userId, username);
      
      if (result.success) {
        toast({
          title: "Biometric authentication successful",
          description: "Welcome back!"
        });
        onSuccess();
      } else {
        const errorMsg = result.error || 'Authentication failed';
        toast({
          title: "Authentication failed",
          description: errorMsg,
          variant: "destructive"
        });
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      toast({
        title: "Authentication failed",
        description: errorMsg,
        variant: "destructive"
      });
      onError?.(errorMsg);
    }
  };

  const handleRegister = async () => {
    try {
      const result = await register(userId, username);
      
      if (result.success) {
        toast({
          title: "Biometric authentication set up",
          description: "You can now use your fingerprint to log in"
        });
        setHasStoredCredential(true);
        // Auto-authenticate after registration
        setTimeout(() => {
          handleAuthenticate();
        }, 500);
      } else {
        const errorMsg = result.error || 'Registration failed';
        toast({
          title: "Registration failed",
          description: errorMsg,
          variant: "destructive"
        });
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registration failed';
      toast({
        title: "Registration failed",
        description: errorMsg,
        variant: "destructive"
      });
      onError?.(errorMsg);
    }
  };

  // Don't show if not supported or loading
  if (isLoading || !shouldShow) {
    return null;
  }

  // Show error if there's one
  if (error) {
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Biometric authentication error: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Biometric authentication button */}
      {hasStoredCredential && (
        <Button
          type="button"
          onClick={handleAuthenticate}
          disabled={disabled || isAuthenticating || isRegistering}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          size="lg"
        >
          {isAuthenticating ? (
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
      )}

      {/* Registration button */}
      {!hasStoredCredential && showRegisterOption && (
        <Button
          type="button"
          onClick={handleRegister}
          disabled={disabled || isRegistering || isAuthenticating}
          variant="outline"
          className="w-full border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
          size="lg"
        >
          {isRegistering ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Smartphone className="w-5 h-5 mr-2" />
              Set up Fingerprint Login
            </>
          )}
        </Button>
      )}

      {/* Info text */}
      <div className="text-center text-sm text-muted-foreground">
        {hasStoredCredential ? (
          <>
            <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
            Biometric authentication is set up
          </>
        ) : (
          "Secure login with your device's biometric authentication"
        )}
      </div>

      {/* Browser support info */}
      {isSupported && (
        <div className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-2">
          Works on mobile devices with fingerprint sensors
        </div>
      )}
    </div>
  );
}

export default BiometricAuth;
