interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onMinimizedChange?: (minimized: boolean, position: {
        x: number;
        y: number;
    }) => void;
}
export declare function AdminPanel({ isOpen, onClose, onMinimizedChange }: AdminPanelProps): import("react/jsx-runtime").JSX.Element | null;
export {};
