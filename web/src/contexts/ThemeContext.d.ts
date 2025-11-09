import type { ReactNode } from 'react';
interface ThemeContextType {
    theme: 'light' | 'dark';
    themePreference: 'light' | 'dark' | 'system';
    setThemePreference: (preference: 'light' | 'dark' | 'system') => void;
    isDark: boolean;
}
export declare function ThemeProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useTheme(): ThemeContextType;
export {};
