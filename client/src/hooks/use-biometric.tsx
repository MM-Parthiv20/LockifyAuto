import { useState, useEffect, useCallback } from 'react';
import { 
  checkBiometricSupport, 
  registerBiometric, 
  authenticateBiometric, 
  hasBiometricCredential, 
  removeBiometricCredential,
  shouldOfferBiometric,
  type BiometricCapability,
  type BiometricAuthResult
} from '@/lib/biometric';

export interface UseBiometricReturn {
  // State
  isSupported: boolean;
  capability: BiometricCapability | null;
  isLoading: boolean;
  isRegistering: boolean;
  isAuthenticating: boolean;
  error: string | null;
  
  // Actions
  register: (userId: string, username: string) => Promise<BiometricAuthResult>;
  authenticate: (userId: string, username: string) => Promise<BiometricAuthResult>;
  remove: () => void;
  
  // Utilities
  hasCredential: (userId: string) => boolean;
  shouldOffer: () => Promise<boolean>;
}

/**
 * React hook for biometric authentication
 */
export function useBiometric(): UseBiometricReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check support on mount
  useEffect(() => {
    const checkSupport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const support = await checkBiometricSupport();
        setCapability(support);
        setIsSupported(support.isSupported);
      } catch (err) {
        console.error('Failed to check biometric support:', err);
        setError('Failed to check biometric support');
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  const register = useCallback(async (userId: string, username: string): Promise<BiometricAuthResult> => {
    try {
      setIsRegistering(true);
      setError(null);
      
      const result = await registerBiometric(userId, username);
      
      if (!result.success && result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const authenticate = useCallback(async (userId: string, username: string): Promise<BiometricAuthResult> => {
    try {
      setIsAuthenticating(true);
      setError(null);
      
      const result = await authenticateBiometric(userId, username);
      
      if (!result.success && result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const remove = useCallback(() => {
    try {
      removeBiometricCredential();
      setError(null);
    } catch (err) {
      console.error('Failed to remove biometric credential:', err);
      setError('Failed to remove biometric credential');
    }
  }, []);

  const hasCredential = useCallback((userId: string): boolean => {
    return hasBiometricCredential(userId);
  }, []);

  const shouldOffer = useCallback(async (): Promise<boolean> => {
    try {
      return await shouldOfferBiometric();
    } catch (err) {
      console.error('Failed to check if biometric should be offered:', err);
      return false;
    }
  }, []);

  return {
    // State
    isSupported,
    capability,
    isLoading,
    isRegistering,
    isAuthenticating,
    error,
    
    // Actions
    register,
    authenticate,
    remove,
    
    // Utilities
    hasCredential,
    shouldOffer
  };
}
