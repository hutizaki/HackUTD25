import { BaseModal } from './BaseModal';
import { ErrorDisplay } from './ErrorDisplay';

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

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  error,
  loading = false,
  submitText = 'Save',
  cancelText = 'Cancel',
  submitVariant = 'primary',
}: FormModalProps) {
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorDisplay error={error} />}
        {children}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[submitVariant]}`}
          >
            {loading ? 'Saving...' : submitText}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

