/**
 * Hook for debounced theme preference sync to database
 */
export declare function useThemeSync(): {
    syncThemePreference: (preference: "light" | "dark" | "system") => Promise<void>;
};
