import type { AxiosInstance } from 'axios';
/**
 * API Error response structure
 */
export interface ApiErrorResponse {
    error: string;
    details?: unknown;
    issues?: Array<{
        path: string[];
        message: string;
    }>;
}
/**
 * API Success response structure
 */
export interface ApiSuccessResponse<T> {
    data: T;
}
/**
 * Refresh CSRF token
 */
export declare function refreshCsrfToken(): Promise<string>;
/**
 * Create axios instance with default configuration
 */
export declare const api: AxiosInstance;
export default api;
