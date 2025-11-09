/**
 * Input sanitization utilities for client-side validation
 */
/**
 * Sanitize email address
 */
export declare function sanitizeEmail(email: string): string;
/**
 * Sanitize name (remove extra whitespace, trim)
 */
export declare function sanitizeName(name: string): string;
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
export declare const PASSWORD_REQUIREMENTS: {
    readonly minLength: 8;
    readonly maxLength: 128;
    readonly requireUppercase: true;
    readonly requireLowercase: true;
    readonly requireNumber: true;
    readonly requireSpecialChar: true;
    readonly specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?";
};
/**
 * Validate password strength (matches backend validation)
 */
export declare function validatePasswordStrength(password: string): PasswordValidationResult;
/**
 * Check individual password requirements (for UI feedback)
 */
export declare function checkPasswordRequirements(password: string): {
    minLength: boolean;
    maxLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
};
