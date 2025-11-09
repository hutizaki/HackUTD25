import type { Permission } from '@/lib/admin';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

interface DeletePermissionConfirmProps {
  permission: Permission;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePermissionConfirm({ permission, onConfirm, onCancel }: DeletePermissionConfirmProps) {
  const message = (
    <div>
      <p className="mb-2">
        Are you sure you want to delete the permission <strong>"{permission.name}"</strong>?
      </p>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-300 mb-3">
        <p className="font-semibold mb-1">Warning:</p>
        <p>This permission will be removed from all users who currently have it assigned.</p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm">
        <div className="mb-2">
          <span className="font-medium text-gray-900 dark:text-white">Description:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{permission.description}</span>
        </div>
        <div className="mb-2">
          <span className="font-medium text-gray-900 dark:text-white">Resources:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{permission.resources.join(', ')}</span>
        </div>
        <div>
          <span className="font-medium text-gray-900 dark:text-white">Actions:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{permission.actions.join(', ')}</span>
        </div>
      </div>
    </div>
  );

  return (
    <ConfirmationModal
      isOpen={true}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Delete Permission"
      message={message}
      confirmText="Delete Permission"
      variant="danger"
      zIndex={10003}
    />
  );
}
