import type { Session } from '@/lib/admin';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { Badge } from '@/components/common/Badge';

interface RevokeSessionConfirmProps {
  session: Session;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RevokeSessionConfirm({ session, onConfirm, onCancel }: RevokeSessionConfirmProps) {
  const statusVariant = session.status === 'active' ? 'green' : session.status === 'expired' ? 'yellow' : 'red';

  const message = (
    <div>
      <p className="mb-2">
        Are you sure you want to revoke this session?
      </p>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm">
        <div className="mb-2">
          <span className="font-medium text-gray-900 dark:text-white">User:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{session.userEmail || session.userName || 'Unknown'}</span>
        </div>
        <div className="mb-2">
          <span className="font-medium text-gray-900 dark:text-white">IP Address:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{session.ipAddress || 'N/A'}</span>
        </div>
        <div className="mb-2">
          <span className="font-medium text-gray-900 dark:text-white">Created:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{new Date(session.createdAt).toLocaleString()}</span>
        </div>
        <div>
          <span className="font-medium text-gray-900 dark:text-white">Status:</span>{' '}
          <Badge variant={statusVariant}>{session.status}</Badge>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
        This session will be immediately invalidated and the user will need to log in again.
      </p>
    </div>
  );

  return (
    <ConfirmationModal
      isOpen={true}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Revoke Session"
      message={message}
      confirmText="Revoke Session"
      variant="danger"
      zIndex={10003}
    />
  );
}
