/**
 * Standardized error messages for consistent API responses
 */
export const ErrorMessages = {
  // Authentication errors
  UNAUTHORIZED: 'Unauthorized',
  UNAUTHORIZED_NO_TOKEN: 'Unauthorized - No token provided',
  UNAUTHORIZED_INVALID_TOKEN: 'Unauthorized - Invalid token',
  UNAUTHORIZED_USER_NOT_FOUND: 'Unauthorized - User not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  
  // Validation errors
  VALIDATION_FAILED: 'Validation failed',
  PASSWORD_VALIDATION_FAILED: 'Password validation failed',
  
  // Resource errors
  USER_EXISTS: 'User with this email already exists',
  NOT_FOUND: 'Not found',
  
  // Security errors
  CSRF_TOKEN_MISSING: 'CSRF token missing',
  CSRF_TOKEN_INVALID: 'Invalid CSRF token',
  CSRF_TOKEN_REQUIRED: 'CSRF token is required for this request',
  CSRF_TOKEN_VALIDATION_FAILED: 'CSRF token validation failed',
  PAYLOAD_TOO_LARGE: 'Payload too large',
  PAYLOAD_TOO_LARGE_MESSAGE: 'Request body exceeds maximum allowed size',
  
  // Rate limiting
  RATE_LIMIT_AUTH: 'Too many authentication attempts, please try again later.',
  RATE_LIMIT_GENERAL: 'Too many requests, please try again later.',
  RATE_LIMIT_STRICT: 'Too many requests for this operation, please try again later.',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'Internal server error',
  
  // Success messages
  LOGOUT_SUCCESS: 'Logged out successfully',
} as const;

/**
 * Standardized API error response format
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  message?: string,
  details?: unknown
): ApiErrorResponse {
  const response: ApiErrorResponse = { error };
  if (message) {
    response.message = message;
  }
  if (details) {
    response.details = details;
  }
  return response;
}

