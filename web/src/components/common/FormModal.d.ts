interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    title: string;
    children: React.ReactNode;
    error?: string | null;
    loading?: boolean;
    submitText?: string;
    cancelText?: string;
    submitVariant?: 'primary' | 'danger' | 'warning';
}
export declare function FormModal({ isOpen, onClose, onSubmit, title, children, error, loading, submitText, cancelText, submitVariant, }: FormModalProps): import("react/jsx-runtime").JSX.Element;
export {};
