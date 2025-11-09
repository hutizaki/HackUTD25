interface ErrorDisplayProps {
    error: string | null;
    className?: string;
    variant?: 'error' | 'warning' | 'info';
}
export declare function ErrorDisplay({ error, className, variant }: ErrorDisplayProps): import("react/jsx-runtime").JSX.Element | null;
export {};
