interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
    requireConfirmation?: boolean;
    confirmationText?: string;
    zIndex?: number;
}
export declare function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant, loading, requireConfirmation, confirmationText, zIndex, }: ConfirmationModalProps): import("react/jsx-runtime").JSX.Element;
export {};
