import type { FeatureFlag } from '@/lib/admin';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { Badge } from '@/components/common/Badge';

interface DeleteFeatureFlagConfirmProps {
  featureFlag: FeatureFlag;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteFeatureFlagConfirm({ featureFlag, onConfirm, onCancel }: DeleteFeatureFlagConfirmProps) {
  const message = (
    <div>
      <p className="mb-2">
        Are you sure you want to delete the feature flag <strong>"{featureFlag.name}"</strong>?
      </p>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm">
        <div className="mb-2">
          <span className="font-medium text-gray-900 dark:text-white">Description:</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{featureFlag.description}</span>
        </div>
        <div>
          <span className="font-medium text-gray-900 dark:text-white">Status:</span>{' '}
          <Badge variant={featureFlag.enabled ? 'green' : 'gray'}>
            {featureFlag.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <ConfirmationModal
      isOpen={true}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Delete Feature Flag"
      message={message}
      confirmText="Delete Feature Flag"
      variant="danger"
      zIndex={10003}
    />
  );
}
