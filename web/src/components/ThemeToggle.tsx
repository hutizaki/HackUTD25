import { useTheme } from '../contexts/ThemeContext';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useEffect } from 'react';
import { flushSync } from 'react-dom';

export function ThemeToggle() {
  const { themePreference, setThemePreference, isDark } = useTheme();
  const { isFeatureEnabled, loading, featureFlags } = useFeatureFlags();
  
  // Debug logging (remove in production)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('ThemeToggle - Feature flags:', featureFlags);
      console.log('ThemeToggle - dark-mode-toggle enabled:', isFeatureEnabled('dark-mode-toggle'));
      console.log('ThemeToggle - Loading:', loading);
    }
  }, [featureFlags, loading]);
  
  // Hide if feature flag is disabled or still loading
  // Check case-insensitively since backend stores in lowercase
  const isEnabled = featureFlags.some(flag => flag.toLowerCase() === 'dark-mode-toggle');
  
  if (loading || !isEnabled) {
    return null;
  }
  
  const toggleTheme = () => {
    // Toggle between light and dark
    // If preference is 'system', toggle based on current computed theme
    let newPreference: 'light' | 'dark';
    if (themePreference === 'light') {
      newPreference = 'dark';
    } else if (themePreference === 'dark') {
      newPreference = 'light';
    } else {
      // If system, toggle to opposite of current computed theme (use isDark)
      newPreference = isDark ? 'light' : 'dark';
    }
    
    // Use flushSync to ensure state updates synchronously for immediate visual feedback
    flushSync(() => {
      setThemePreference(newPreference);
    });
  };
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

