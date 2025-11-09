/**
 * Type definitions for API responses
 * These match the backend API structure
 */
/**
 * Standard API error response
 */
export interface ApiErrorResponse {
    error: string;
    details?: unknown;
}
/**
 * Standard API success response wrapper
 */
export interface ApiSuccessResponse<T> {
    data: T;
}
/**
 * User type from backend
 */
export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    themePreference?: 'light' | 'dark' | 'system';
    roles?: Array<{
        id: string;
        name: string;
        displayName: string;
        description?: string;
        group?: {
            id: string;
            name: string;
            displayName: string;
            isSystemGroup?: boolean;
        } | null;
    }>;
}
/**
 * Project type from backend
 */
export interface Project {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    tags?: string[];
    created_at: string;
    updated_at: string;
}
/**
 * Create project input
 */
export interface CreateProjectInput {
    name: string;
    description?: string;
    tags?: string[];
}
/**
 * Update project input
 */
export interface UpdateProjectInput {
    name?: string;
    description?: string;
    tags?: string[];
}
