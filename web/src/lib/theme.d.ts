/**
 * Theme utility functions for managing theme preferences
 */
/**
 * Get theme preference from localStorage
 */
export declare function getThemePreference(): 'light' | 'dark' | 'system' | null;
/**
 * Set theme preference in localStorage
 */
export declare function setThemePreference(preference: 'light' | 'dark' | 'system'): void;
/**
 * Get system theme from OS preference
 */
export declare function getSystemTheme(): 'light' | 'dark';
/**
 * Apply theme to document root
 */
export declare function applyTheme(theme: 'light' | 'dark'): void;
