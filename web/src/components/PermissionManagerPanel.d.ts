interface PermissionManagerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onMinimizedChange?: (minimized: boolean, position: {
        x: number;
        y: number;
    }) => void;
}
export declare function PermissionManagerPanel({ isOpen, onClose, onMinimizedChange }: PermissionManagerPanelProps): import("react/jsx-runtime").JSX.Element | null;
export {};
