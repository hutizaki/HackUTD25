import { useState, useEffect, useCallback } from 'react';
import { getEnabledFeatureFlags } from '@/lib/admin';

/**
 * Hook to check if a feature flag is enabled
 * Loads on mount and refreshes when feature flags are changed (via event)
 */
export function useFeatureFlags() {
  const [featureFlags, setFeatureFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeatureFlags = useCallback(async () => {
    try {
      const response = await getEnabledFeatureFlags();
      setFeatureFlags(response.data);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      setFeatureFlags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load on mount
    loadFeatureFlags();
    
    // Listen for feature flag change events (dispatched when flags are updated in admin panel)
    const handleFeatureFlagsChanged = () => {
      loadFeatureFlags();
    };
    window.addEventListener('featureFlagsChanged', handleFeatureFlagsChanged);
    
    return () => {
      window.removeEventListener('featureFlagsChanged', handleFeatureFlagsChanged);
    };
  }, [loadFeatureFlags]);

  const isFeatureEnabled = (flagName: string): boolean => {
    // Check case-insensitively since backend stores in lowercase
    return featureFlags.some(flag => flag.toLowerCase() === flagName.toLowerCase());
  };

  return {
    featureFlags,
    isFeatureEnabled,
    loading,
    refresh: loadFeatureFlags,
  };
}

