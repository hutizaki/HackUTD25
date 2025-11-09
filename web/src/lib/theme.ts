/**
 * Theme utility functions for managing theme preferences
 */

const THEME_PREFERENCE_KEY = 'theme-preference';

/**
 * Get theme preference from localStorage
 */
export function getThemePreference(): 'light' | 'dark' | 'system' | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

/**
 * Set theme preference in localStorage
 */
export function setThemePreference(preference: 'light' | 'dark' | 'system'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_PREFERENCE_KEY, preference);
}

/**
 * Get system theme from OS preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

