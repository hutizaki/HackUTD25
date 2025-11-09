interface FeatureFlagsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onMinimizedChange?: (minimized: boolean, position: {
        x: number;
        y: number;
    }) => void;
}
export declare function FeatureFlagsPanel({ isOpen, onClose, onMinimizedChange }: FeatureFlagsPanelProps): import("react/jsx-runtime").JSX.Element | null;
export {};
