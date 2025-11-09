interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    showCloseButton?: boolean;
    zIndex?: number;
}
export declare function BaseModal({ isOpen, onClose, title, children, maxWidth, showCloseButton, zIndex }: BaseModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
