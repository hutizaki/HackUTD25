import type { User } from '../types/api';
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
export declare function checkAuth(): Promise<User | null>;
/**
 * Get current authenticated user
 * @returns User if authenticated, null if not
 */
export declare function getCurrentUser(): Promise<User | null>;
/**
 * Register a new user
 * @param input - Registration data (email, password, name)
 * @returns User data on success
 */
export declare function register(input: RegisterInput): Promise<User>;
/**
 * Login with email and password
 * @param input - Login credentials (email, password)
 * @returns User data on success
 */
export declare function login(input: LoginInput): Promise<User>;
/**
 * Logout current user
 * Clears the httpOnly cookie on the server
 */
export declare function logout(): Promise<void>;
/**
 * Update user's name
 * @param name - New name
 * @returns Updated user data
 */
export declare function updateUserName(name: string): Promise<User>;
