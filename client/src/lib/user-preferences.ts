/**
 * User Preferences Management
 * 
 * Handles user preferences including biometric authentication settings
 */

export interface UserPreferences {
  biometricEnabled: boolean;
  biometricPromptShown: boolean;
  vibrationEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

const PREFERENCES_KEY = 'lumora-user-preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  biometricEnabled: true, // Default to enabled, user can opt out
  biometricPromptShown: false,
  vibrationEnabled: true,
  theme: 'system'
};

/**
 * Get user preferences from localStorage
 */
export const getUserPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new preference additions
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load user preferences:', error);
  }
  
  return { ...DEFAULT_PREFERENCES };
};

/**
 * Save user preferences to localStorage
 */
export const setUserPreferences = (preferences: Partial<UserPreferences>): void => {
  try {
    const current = getUserPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    
    // Notify other components of preference changes
    window.dispatchEvent(new CustomEvent('lumora-preferences-updated', {
      detail: updated
    }));
  } catch (error) {
    console.error('Failed to save user preferences:', error);
  }
};

/**
 * Get a specific preference value
 */
export const getPreference = <K extends keyof UserPreferences>(
  key: K
): UserPreferences[K] => {
  const preferences = getUserPreferences();
  return preferences[key];
};

/**
 * Set a specific preference value
 */
export const setPreference = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void => {
  setUserPreferences({ [key]: value });
};

/**
 * Check if biometric authentication is enabled for this user
 */
export const isBiometricEnabled = (): boolean => {
  return getPreference('biometricEnabled');
};

/**
 * Enable or disable biometric authentication
 */
export const setBiometricEnabled = (enabled: boolean): void => {
  setPreference('biometricEnabled', enabled);
};

/**
 * Check if we should show the biometric prompt
 */
export const shouldShowBiometricPrompt = (): boolean => {
  const preferences = getUserPreferences();
  return !preferences.biometricPromptShown && preferences.biometricEnabled;
};

/**
 * Mark biometric prompt as shown
 */
export const markBiometricPromptShown = (): void => {
  setPreference('biometricPromptShown', true);
};

/**
 * Reset all preferences to defaults
 */
export const resetPreferences = (): void => {
  try {
    localStorage.removeItem(PREFERENCES_KEY);
    window.dispatchEvent(new CustomEvent('lumora-preferences-updated', {
      detail: DEFAULT_PREFERENCES
    }));
  } catch (error) {
    console.error('Failed to reset preferences:', error);
  }
};
