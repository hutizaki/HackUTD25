/**
 * Hook to check if a feature flag is enabled
 * Loads on mount and refreshes when feature flags are changed (via event)
 */
export declare function useFeatureFlags(): {
    featureFlags: string[];
    isFeatureEnabled: (flagName: string) => boolean;
    loading: boolean;
    refresh: () => Promise<void>;
};
