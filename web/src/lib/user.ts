import { api } from './api';
import type { ApiSuccessResponse, User } from '../types/api';

/**
 * Update user's theme preference
 */
export async function updateThemePreference(
  preference: 'light' | 'dark' | 'system'
): Promise<ApiSuccessResponse<User>> {
  const response = await api.patch<ApiSuccessResponse<User>>('/user/theme-preference', {
    themePreference: preference,
  });
  return response.data;
}

