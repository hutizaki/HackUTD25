import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
// Network interceptor is initialized in main.tsx

/**
 * API base URL from environment variables
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * CSRF token storage (in memory, not localStorage)
 */
let csrfToken: string | null = null;

/**
 * State-changing HTTP methods that require CSRF protection
 */
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * API Error response structure
 */
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
  issues?: Array<{ path: string[]; message: string }>;
}

/**
 * API Success response structure
 */
export interface ApiSuccessResponse<T> {
  data: T;
}

/**
 * CSRF Token response structure
 */
interface CsrfTokenResponse {
  csrfToken: string;
}

/**
 * Fetch CSRF token from backend
 */
async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await axios.get<CsrfTokenResponse>(`${API_BASE_URL}/csrf-token`, {
      withCredentials: true,
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw new Error('Failed to fetch CSRF token');
  }
}

/**
 * Get CSRF token, fetching if necessary
 */
async function getCsrfToken(): Promise<string> {
  if (!csrfToken) {
    csrfToken = await fetchCsrfToken();
  }
  return csrfToken;
}

/**
 * Refresh CSRF token
 */
export async function refreshCsrfToken(): Promise<string> {
  csrfToken = await fetchCsrfToken();
  return csrfToken;
}

/**
 * Create axios instance with default configuration
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: enables cookie handling
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add CSRF token to state-changing requests
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add CSRF token to state-changing methods
    if (config.method && STATE_CHANGING_METHODS.includes(config.method.toUpperCase())) {
      try {
        const token = await getCsrfToken();
        config.headers['X-CSRF-Token'] = token;
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
        // Continue without token - will fail with 403 and can retry
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling and network logging
 */
api.interceptors.response.use(
  (response) => {
    // Network interceptor will handle logging via fetch/XHR interception
    // This is just for axios-specific logging if needed
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle API errors
    const status = error.response.status;
    const errorData = error.response.data;

    // Handle CSRF token errors (403) - refresh token and retry once
    if (status === 403 && !originalRequest._retry) {
      const errorMessage = errorData?.error || '';
      if (
        errorMessage.includes('CSRF') ||
        errorMessage.includes('csrf') ||
        errorMessage.includes('token')
      ) {
        try {
          // Refresh CSRF token
          csrfToken = await refreshCsrfToken();
          originalRequest._retry = true;

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers['X-CSRF-Token'] = csrfToken;
          }
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Failed to refresh CSRF token:', refreshError);
          return Promise.reject(
            new Error('CSRF token validation failed. Please refresh the page and try again.')
          );
        }
      }
    }

    // Extract error message
    let errorMessage = 'An unexpected error occurred';
    if (errorData?.error) {
      errorMessage = errorData.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Handle specific status codes
    if (status === 401) {
      // Unauthorized - clear any stored auth state
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (status === 403) {
      // Forbidden (CSRF or other)
      if (!errorMessage.includes('CSRF') && !errorMessage.includes('csrf')) {
        errorMessage = 'Access forbidden.';
      }
    } else if (status === 404) {
      errorMessage = 'Resource not found.';
    } else if (status === 429) {
      // Rate limit exceeded
      errorMessage =
        'Too many requests. Please wait a moment before trying again.';
    } else if (status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    // Create error with details for validation errors
    const enhancedError = new Error(errorMessage) as Error & {
      details?: unknown;
      issues?: Array<{ path: string[]; message: string }>;
    };
    if (errorData?.details) {
      enhancedError.details = errorData.details;
    }
    if (errorData?.issues) {
      enhancedError.issues = errorData.issues;
    }

    return Promise.reject(enhancedError);
  }
);

export default api;
