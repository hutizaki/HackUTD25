import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { getThemePreference, setThemePreference as setLocalThemePreference, applyTheme, getSystemTheme } from '../lib/theme';
import { checkAuth } from '../lib/auth';
import { useThemeSync } from '../hooks/useThemeSync';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themePreference: 'light' | 'dark' | 'system';
  setThemePreference: (preference: 'light' | 'dark' | 'system') => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ themePreference?: 'light' | 'dark' | 'system' } | null>(null);
  const [themePreference, setThemePreferenceState] = useState<'light' | 'dark' | 'system'>(() => {
    // Initialize from localStorage
    return getThemePreference() || 'system';
  });
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme());
  const { syncThemePreference } = useThemeSync();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await checkAuth();
        setUser(currentUser);
        // If user has theme preference, use it
        if (currentUser?.themePreference) {
          setThemePreferenceState(currentUser.themePreference);
          setLocalThemePreference(currentUser.themePreference);
        }
      } catch {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  // Compute actual theme from preference
  const theme = themePreference === 'system' ? systemTheme : themePreference;
  const isDark = theme === 'dark';

  // Apply theme to document root (useLayoutEffect for immediate DOM updates)
  // Only apply if theme actually changed to avoid conflicts with immediate application
  useLayoutEffect(() => {
    const currentTheme = themePreference === 'system' ? getSystemTheme() : themePreference;
    applyTheme(currentTheme);
  }, [themePreference, systemTheme]);

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const newSystemTheme = getSystemTheme();
      setSystemTheme(newSystemTheme);
      if (themePreference === 'system') {
        applyTheme(newSystemTheme);
      }
    };

    // Set initial system theme
    setSystemTheme(getSystemTheme());

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  // Load user preference on login (when user changes)
  useEffect(() => {
    if (user?.themePreference) {
      setThemePreferenceState(user.themePreference);
      setLocalThemePreference(user.themePreference);
    }
  }, [user]);

  const setThemePreference = (preference: 'light' | 'dark' | 'system') => {
    setThemePreferenceState(preference);
    setLocalThemePreference(preference);
    
    // Apply theme immediately for instant visual feedback
    // Compute the actual theme value synchronously
    const newTheme = preference === 'system' ? getSystemTheme() : preference;
    applyTheme(newTheme);
    
    // Sync to database if logged in (debounced)
    if (user) {
      syncThemePreference(preference);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

