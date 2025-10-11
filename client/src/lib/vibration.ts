/**
 * Vibration patterns for different user interactions
 * All values in milliseconds
 */

// Vibration patterns
export const VibrationPatterns = {
  // Light tap - for subtle feedback (toggle, tap)
  LIGHT: 10,
  
  // Short vibration - for quick actions (copy, generate)
  SHORT: 50,
  
  // Medium vibration - for important actions (create, update)
  MEDIUM: 100,
  
  // Long vibration - for destructive actions (delete)
  LONG: 200,
  
  // Success pattern - for successful operations
  SUCCESS: [50, 30, 50] as number[],
  
  // Error pattern - for errors
  ERROR: [100, 50, 100, 50, 100] as number[],
  
  // Double tap - for confirmations
  DOUBLE_TAP: [50, 50, 50] as number[],
  
  // Triple tap - for special actions
  TRIPLE_TAP: [30, 30, 30, 30, 30] as number[],
} as const;

/**
 * Check if vibration is supported
 */
export const isVibrationSupported = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Trigger device vibration with the given pattern
 * @param pattern - Duration in ms or array of durations [vibrate, pause, vibrate, ...]
 */
export const vibrate = (pattern: number | number[]): void => {
  try {
    if (isVibrationSupported()) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.warn('Vibration failed:', error);
  }
};

/**
 * Stop any ongoing vibration
 */
export const stopVibration = (): void => {
  try {
    if (isVibrationSupported()) {
      navigator.vibrate(0);
    }
  } catch (error) {
    console.warn('Stop vibration failed:', error);
  }
};

/**
 * Convenience functions for common vibration patterns
 */
export const Vibration = {
  /**
   * Light tap - for subtle feedback (10ms)
   * Use for: toggles, light taps, UI transitions
   */
  light: () => vibrate(VibrationPatterns.LIGHT),
  
  /**
   * Short vibration - for quick actions (50ms)
   * Use for: copy to clipboard, password generation, star toggle
   */
  short: () => vibrate(VibrationPatterns.SHORT),
  
  /**
   * Medium vibration - for important actions (100ms)
   * Use for: record created, record updated, settings changed
   */
  medium: () => vibrate(VibrationPatterns.MEDIUM),
  
  /**
   * Long vibration - for destructive actions (200ms)
   * Use for: record deleted, permanent delete, logout
   */
  long: () => vibrate(VibrationPatterns.LONG),
  
  /**
   * Success pattern - rhythmic success feedback
   * Use for: login success, registration complete, operation successful
   */
  success: () => vibrate(VibrationPatterns.SUCCESS),
  
  /**
   * Error pattern - attention-grabbing error feedback
   * Use for: validation errors, operation failed, network errors
   */
  error: () => vibrate(VibrationPatterns.ERROR),
  
  /**
   * Double tap - for confirmations
   * Use for: item restored, undo actions
   */
  doubleTap: () => vibrate(VibrationPatterns.DOUBLE_TAP),
  
  /**
   * Triple tap - for special actions
   * Use for: confetti celebration, achievement unlocked
   */
  tripleTap: () => vibrate(VibrationPatterns.TRIPLE_TAP),
  
  /**
   * Stop any ongoing vibration
   */
  stop: () => stopVibration(),
  
  /**
   * Check if vibration is supported on this device
   */
  isSupported: () => isVibrationSupported(),
};

/**
 * User preference for vibration (can be stored in localStorage)
 */
const VIBRATION_ENABLED_KEY = 'lockify-vibration-enabled';

export const VibrationPreference = {
  /**
   * Check if user has enabled vibration
   */
  isEnabled: (): boolean => {
    try {
      const stored = localStorage.getItem(VIBRATION_ENABLED_KEY);
      // Default to true if not set
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  },
  
  /**
   * Set user preference for vibration
   */
  setEnabled: (enabled: boolean): void => {
    try {
      localStorage.setItem(VIBRATION_ENABLED_KEY, String(enabled));
    } catch (error) {
      console.warn('Failed to save vibration preference:', error);
    }
  },
  
  /**
   * Toggle vibration preference
   */
  toggle: (): boolean => {
    const newValue = !VibrationPreference.isEnabled();
    VibrationPreference.setEnabled(newValue);
    return newValue;
  },
};

/**
 * Vibrate only if user has enabled it
 */
export const vibrateIfEnabled = (pattern: number | number[]): void => {
  if (VibrationPreference.isEnabled()) {
    vibrate(pattern);
  }
};

/**
 * Convenience wrapper that respects user preferences
 */
export const VibrateIfEnabled = {
  light: () => vibrateIfEnabled(VibrationPatterns.LIGHT),
  short: () => vibrateIfEnabled(VibrationPatterns.SHORT),
  medium: () => vibrateIfEnabled(VibrationPatterns.MEDIUM),
  long: () => vibrateIfEnabled(VibrationPatterns.LONG),
  success: () => vibrateIfEnabled(VibrationPatterns.SUCCESS),
  error: () => vibrateIfEnabled(VibrationPatterns.ERROR),
  doubleTap: () => vibrateIfEnabled(VibrationPatterns.DOUBLE_TAP),
  tripleTap: () => vibrateIfEnabled(VibrationPatterns.TRIPLE_TAP),
};

