import { useState } from 'react';
import { motion } from 'framer-motion';
import { type FeatureFlag, type CreateFeatureFlagRequest, type UpdateFeatureFlagRequest } from '@/lib/admin';

interface CreateFeatureFlagModalProps {
  featureFlag?: FeatureFlag;
  onSave: (data: CreateFeatureFlagRequest | UpdateFeatureFlagRequest) => Promise<void>;
  onCancel: () => void;
}

export function CreateFeatureFlagModal({ featureFlag, onSave, onCancel }: CreateFeatureFlagModalProps) {
  const [name, setName] = useState(featureFlag?.name || '');
  const [description, setDescription] = useState(featureFlag?.description || '');
  const [enabled, setEnabled] = useState(featureFlag?.enabled ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() && !featureFlag) {
      setError('Feature flag name is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setLoading(true);
      if (featureFlag) {
        // Update
        await onSave({
          description,
          enabled,
        });
      } else {
        // Create
        await onSave({
          name: name.trim(),
          description,
          enabled,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save feature flag');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 10003 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {featureFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (only for create) */}
          {!featureFlag && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature Flag Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., new-ui"
                required
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this feature flag controls..."
              required
            />
          </div>

          {/* Enabled */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
              Enabled
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : featureFlag ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
