import { api } from './api';
import type { ApiSuccessResponse, User } from '../types/api';

/**
 * Register input type
 */
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

/**
 * Login input type
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Check if user is authenticated by calling /auth/me
 * @returns User if authenticated, null if not
 */
export async function checkAuth(): Promise<User | null> {
  try {
    const response = await api.get<ApiSuccessResponse<User>>('/auth/me');
    return response.data.data;
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user
 * @returns User if authenticated, null if not
 */
export async function getCurrentUser(): Promise<User | null> {
  return checkAuth();
}

/**
 * Register a new user
 * @param input - Registration data (email, password, name)
 * @returns User data on success
 */
export async function register(input: RegisterInput): Promise<User> {
  const response = await api.post<ApiSuccessResponse<User>>('/auth/register', input);
  return response.data.data;
}

/**
 * Login with email and password
 * @param input - Login credentials (email, password)
 * @returns User data on success
 */
export async function login(input: LoginInput): Promise<User> {
  const response = await api.post<ApiSuccessResponse<User>>('/auth/login', input);
  return response.data.data;
}

/**
 * Logout current user
 * Clears the httpOnly cookie on the server
 */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/**
 * Update user's name
 * @param name - New name
 * @returns Updated user data
 */
export async function updateUserName(name: string): Promise<User> {
  const response = await api.patch<ApiSuccessResponse<User>>('/user/name', { name });
  return response.data.data;
}

