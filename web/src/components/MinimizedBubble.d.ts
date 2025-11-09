interface MinimizedBubbleProps {
    icon: React.ReactNode;
    color: string;
    position: {
        x: number;
        y: number;
    };
    onRestore: () => void;
    onClose: () => void;
    onPositionChange: (position: {
        x: number;
        y: number;
    }) => void;
    tooltip: string;
}
export declare function MinimizedBubble({ icon, color, position, onRestore, onClose, onPositionChange, tooltip, }: MinimizedBubbleProps): import("react/jsx-runtime").JSX.Element;
export {};
