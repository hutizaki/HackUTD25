import validator from 'validator';

/**
 * Sanitize email address
 * Normalizes email format and removes dangerous characters
 */
export function sanitizeEmail(email: string): string {
  // Trim whitespace
  let sanitized = email.trim();
  
  // Normalize to lowercase
  sanitized = sanitized.toLowerCase();
  
  // Remove any null bytes or control characters (using replace with character code check)
  sanitized = sanitized.split('').filter((char) => {
    const code = char.charCodeAt(0);
    return code >= 32 && code !== 127; // Keep printable ASCII except DEL
  }).join('');
  
  // Validate and sanitize using validator library
  if (validator.isEmail(sanitized)) {
    return validator.normalizeEmail(sanitized) || sanitized;
  }
  
  return sanitized;
}

/**
 * Sanitize name string
 * Removes dangerous characters and limits length
 */
export function sanitizeName(name: string): string {
  // Trim whitespace
  let sanitized = name.trim();
  
  // Remove null bytes and control characters
  sanitized = sanitized.split('').filter((char) => {
    const code = char.charCodeAt(0);
    return code >= 32 && code !== 127; // Keep printable ASCII except DEL
  }).join('');
  
  // Remove any HTML tags
  sanitized = validator.stripLow(sanitized, true);
  
  // Normalize whitespace (multiple spaces to single space)
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Limit length (max 100 characters as per schema)
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100).trim();
  }
  
  return sanitized;
}

/**
 * Sanitize string input (general purpose)
 * Removes dangerous characters and HTML tags
 */
export function sanitizeString(input: string, maxLength?: number): string {
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove null bytes and control characters
  sanitized = sanitized.split('').filter((char) => {
    const code = char.charCodeAt(0);
    return code >= 32 && code !== 127; // Keep printable ASCII except DEL
  }).join('');
  
  // Remove HTML tags
  sanitized = validator.stripLow(sanitized, true);
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }
  
  return sanitized;
}

/**
 * Sanitize query parameter
 * Removes dangerous characters from query strings
 */
export function sanitizeQueryParam(param: string): string {
  // Decode URL encoding first
  let sanitized = decodeURIComponent(param);
  
  // Remove null bytes and control characters
  sanitized = sanitized.split('').filter((char) => {
    const code = char.charCodeAt(0);
    return code >= 32 && code !== 127; // Keep printable ASCII except DEL
  }).join('');
  
  // Remove HTML tags
  sanitized = validator.stripLow(sanitized, true);
  
  return sanitized;
}

/**
 * Escape HTML special characters
 * Prevents XSS attacks in user-generated content
 */
export function escapeHtml(text: string): string {
  return validator.escape(text);
}

