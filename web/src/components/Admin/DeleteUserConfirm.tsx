import { useState } from 'react';
import { deleteUser, type AdminUser } from '@/lib/admin';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

interface DeleteUserConfirmProps {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteUserConfirm({ user, onClose, onSuccess }: DeleteUserConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await deleteUser(user.id);
      onSuccess();
      onClose();
    } catch (err) {
      setError(handleApiError(err, 'Failed to delete user'));
    } finally {
      setLoading(false);
    }
  };

  const message = (
    <div>
      <p className="mb-2">
        Are you sure you want to delete this user? This action cannot be undone.
      </p>
      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
      </div>
      {error && <ErrorDisplay error={error} className="mt-4" />}
    </div>
  );

  return (
    <ConfirmationModal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Delete User"
      message={message}
      confirmText="Delete User"
      variant="danger"
      loading={loading}
      requireConfirmation={true}
      confirmationText="DELETE"
      zIndex={10003}
    />
  );
}

