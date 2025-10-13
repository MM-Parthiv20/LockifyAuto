import { useState, useEffect, useCallback } from 'react';
import {
  getUserPreferences,
  setUserPreferences,
  getPreference,
  setPreference,
  isBiometricEnabled,
  setBiometricEnabled,
  shouldShowBiometricPrompt,
  markBiometricPromptShown,
  resetPreferences,
  type UserPreferences
} from '@/lib/user-preferences';

export interface UseUserPreferencesReturn {
  // State
  preferences: UserPreferences;
  isLoading: boolean;
  
  // Actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  
  // Specific preference helpers
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  shouldShowBiometricPrompt: boolean;
  markBiometricPromptShown: () => void;
  
  // Utilities
  reset: () => void;
}

/**
 * React hook for managing user preferences
 */
export function useUserPreferences(): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences());
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount and listen for changes
  useEffect(() => {
    const loadPreferences = () => {
      try {
        setPreferences(getUserPreferences());
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load initial preferences
    loadPreferences();

    // Listen for preference updates from other components
    const handlePreferencesUpdate = (event: CustomEvent) => {
      setPreferences(event.detail);
    };

    window.addEventListener('lumora-preferences-updated', handlePreferencesUpdate as EventListener);

    return () => {
      window.removeEventListener('lumora-preferences-updated', handlePreferencesUpdate as EventListener);
    };
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    setUserPreferences(newPreferences);
    // State will be updated via the event listener
  }, []);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreference(key, value);
    // State will be updated via the event listener
  }, []);

  const handleSetBiometricEnabled = useCallback((enabled: boolean) => {
    setBiometricEnabled(enabled);
  }, []);

  const handleMarkBiometricPromptShown = useCallback(() => {
    markBiometricPromptShown();
  }, []);

  const reset = useCallback(() => {
    resetPreferences();
  }, []);

  return {
    // State
    preferences,
    isLoading,
    
    // Actions
    updatePreferences,
    updatePreference,
    
    // Specific preference helpers
    biometricEnabled: preferences.biometricEnabled,
    setBiometricEnabled: handleSetBiometricEnabled,
    shouldShowBiometricPrompt: shouldShowBiometricPrompt(),
    markBiometricPromptShown: handleMarkBiometricPromptShown,
    
    // Utilities
    reset
  };
}
