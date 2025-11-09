import { useState } from 'react';
import { BaseModal } from './BaseModal';

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
  requireConfirmation?: boolean; // For DELETE confirmation
  confirmationText?: string; // Text user must type
  zIndex?: number; // z-index for the modal
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  requireConfirmation = false,
  confirmationText,
  zIndex,
}: ConfirmationModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('');

  const variantClasses = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    info: 'bg-blue-500 hover:bg-blue-600 text-white',
  };

  const canConfirm = requireConfirmation
    ? confirmationInput === confirmationText
    : true;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md" zIndex={zIndex}>
      <div className="space-y-4">
        <div className="text-gray-600 dark:text-gray-300">{message}</div>
        
        {requireConfirmation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-mono font-bold">{confirmationText}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              placeholder={confirmationText}
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className={`px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

