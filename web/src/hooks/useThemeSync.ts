import { useEffect, useRef } from 'react';
import { updateThemePreference } from '@/lib/user';
import { checkAuth } from '@/lib/auth';

/**
 * Debounce delay: 1 minute (60000ms)
 */
const SYNC_DELAY = 60000;

/**
 * Hook for debounced theme preference sync to database
 */
export function useThemeSync() {
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncThemePreference = async (preference: 'light' | 'dark' | 'system') => {
    // Clear previous timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Check if user is logged in
    const user = await checkAuth();
    if (!user) return;

    // Schedule sync after delay
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await updateThemePreference(preference);
      } catch (error) {
        console.error('Failed to sync theme preference:', error);
        // Optionally show error toast/notification
      }
    }, SYNC_DELAY);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return { syncThemePreference };
}

