interface StorageManagerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onMinimizedChange?: (minimized: boolean, position: {
        x: number;
        y: number;
    }) => void;
}
export declare function StorageManagerPanel({ isOpen, onClose, onMinimizedChange }: StorageManagerPanelProps): import("react/jsx-runtime").JSX.Element | null;
export declare const CookieManagerPanel: typeof StorageManagerPanel;
export {};
