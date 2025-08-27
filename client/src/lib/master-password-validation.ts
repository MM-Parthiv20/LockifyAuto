export interface MasterPasswordValidation {
  isValid: boolean;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function validateMasterPassword(password: string): MasterPasswordValidation {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isValid = Object.values(checks).every(Boolean);

  return { isValid, checks };
}

export function getMasterPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const validation = validateMasterPassword(password);
  const passedChecks = Object.values(validation.checks).filter(Boolean).length;

  if (passedChecks < 3) return 'weak';
  if (passedChecks < 5) return 'medium';
  return 'strong';
}