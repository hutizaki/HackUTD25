import type { Role } from '@/lib/roles';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

interface DeleteRoleConfirmProps {
  role: Role;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteRoleConfirm({ role, onConfirm, onCancel }: DeleteRoleConfirmProps) {
  const message = (
    <div>
      <p className="mb-2">
        Are you sure you want to delete the role <strong>"{role.displayName}"</strong> ({role.name})?
      </p>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm">
        <div className="mb-2">
          <span className="font-medium text-gray-900 dark:text-white">Display Name:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{role.displayName}</span>
        </div>
        {role.description && (
          <div className="mb-2">
            <span className="font-medium text-gray-900 dark:text-white">Description:</span>{' '}
            <span className="text-gray-600 dark:text-gray-300">{role.description}</span>
          </div>
        )}
        <div>
          <span className="font-medium text-gray-900 dark:text-white">Permissions:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{role.permissionsCount}</span>
        </div>
      </div>
    </div>
  );

  return (
    <ConfirmationModal
      isOpen={true}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Delete Role"
      message={message}
      confirmText="Delete Role"
      variant="danger"
      zIndex={10003}
    />
  );
}

