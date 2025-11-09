interface NetworkPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onMinimizedChange?: (minimized: boolean, position: {
        x: number;
        y: number;
    }) => void;
}
export declare function NetworkPanel({ isOpen, onClose, onMinimizedChange }: NetworkPanelProps): import("react/jsx-runtime").JSX.Element | null;
export {};
