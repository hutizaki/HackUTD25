/**
 * Input sanitization utilities for client-side validation
 */

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sanitize name (remove extra whitespace, trim)
 */
export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Password requirements matching backend validation
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

/**
 * Validate password strength (matches backend validation)
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum length check
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length check (prevent DoS)
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push('Password must be less than 128 characters long');
  }

  // Uppercase letter check
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Lowercase letter check
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Number check
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special character check
  if (
    PASSWORD_REQUIREMENTS.requireSpecialChar &&
    !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Calculate password strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    // Strong: meets all requirements and has good length
    if (password.length >= 12) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  } else {
    // Calculate strength based on how many requirements are met
    const requirementsMet = 6 - errors.length;
    if (requirementsMet >= 4) {
      strength = 'medium';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Check individual password requirements (for UI feedback)
 */
export function checkPasswordRequirements(password: string) {
  return {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    maxLength: password.length <= PASSWORD_REQUIREMENTS.maxLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
}

