import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useBiometric } from '@/hooks/use-biometric';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Fingerprint, Shield, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BiometricSetupPromptProps {
  userId: string;
  username: string;
  onSetupComplete: () => void;
  onSkip: () => void;
}

export function BiometricSetupPrompt({ 
  userId, 
  username, 
  onSetupComplete, 
  onSkip 
}: BiometricSetupPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { 
    isSupported, 
    isLoading, 
    isRegistering, 
    error,
    register,
    hasCredential,
    shouldOffer
  } = useBiometric();
  const { biometricEnabled, setBiometricEnabled } = useUserPreferences();

  // Check if we should show the setup prompt
  useEffect(() => {
    const checkShouldShow = async () => {
      // Don't show if biometric is disabled or already set up
      if (!biometricEnabled || hasCredential(userId)) {
        return;
      }

      // Check if biometric should be offered on this device
      const shouldOfferBiometric = await shouldOffer();
      if (shouldOfferBiometric) {
        setIsOpen(true);
      }
    };

    checkShouldShow();
  }, [userId, biometricEnabled, hasCredential, shouldOffer]);

  const handleSetup = async () => {
    try {
      setIsSettingUp(true);
      setSetupError(null);
      
      const result = await register(userId, username);
      
      if (result.success) {
        toast({
          title: "Biometric authentication set up",
          description: "You can now use your fingerprint for quick access"
        });
        setIsOpen(false);
        onSetupComplete();
      } else {
        setSetupError(result.error || 'Setup failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Setup failed';
      setSetupError(errorMsg);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    onSkip();
  };

  const handleDisable = () => {
    setBiometricEnabled(false);
    setIsOpen(false);
    onSkip();
  };

  // Don't show if not supported or still loading
  if (isLoading || !isSupported) {
    return null;
  }

  // Don't show if biometric is disabled
  if (!biometricEnabled) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            Enable Fingerprint Login
          </DialogTitle>
          <DialogDescription>
            Set up biometric authentication for quicker access to your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Benefits */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Quick and secure access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No need to remember passwords</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Works with fingerprint or face ID</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error display */}
          {setupError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{setupError}</AlertDescription>
            </Alert>
          )}

          {/* General error from biometric hook */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              Your biometric data stays on your device and is never shared with our servers.
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSettingUp || isRegistering}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            variant="ghost"
            onClick={handleDisable}
            disabled={isSettingUp || isRegistering}
            className="w-full sm:w-auto text-muted-foreground"
          >
            Don't Ask Again
          </Button>
          <Button
            onClick={handleSetup}
            disabled={isSettingUp || isRegistering}
            className="w-full sm:w-auto"
          >
            {isSettingUp || isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4 mr-2" />
                Set Up Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BiometricSetupPrompt;
