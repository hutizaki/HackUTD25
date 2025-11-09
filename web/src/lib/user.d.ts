import type { ApiSuccessResponse, User } from '../types/api';
/**
 * Update user's theme preference
 */
export declare function updateThemePreference(preference: 'light' | 'dark' | 'system'): Promise<ApiSuccessResponse<User>>;
