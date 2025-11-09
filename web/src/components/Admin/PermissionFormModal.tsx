import { useState } from 'react';
import { motion } from 'framer-motion';
import { type Permission } from '@/lib/admin';

interface PermissionFormModalProps {
  permission?: Permission | null;
  onClose: () => void;
  onSave: (data: { name: string; description: string; resources: string[]; actions: string[] }) => Promise<void>;
  saving?: boolean;
}

export function PermissionFormModal({ permission, onClose, onSave, saving = false }: PermissionFormModalProps) {
  const [name, setName] = useState(permission?.name || '');
  const [description, setDescription] = useState(permission?.description || '');
  const [resources, setResources] = useState<string[]>(permission?.resources || []);
  const [actions, setActions] = useState<string[]>(permission?.actions || []);
  const [newResource, setNewResource] = useState('');
  const [newAction, setNewAction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddResource = () => {
    const trimmed = newResource.trim();
    if (trimmed && !resources.includes(trimmed)) {
      setResources([...resources, trimmed]);
      setNewResource('');
    }
  };

  const handleRemoveResource = (resource: string) => {
    setResources(resources.filter((r) => r !== resource));
  };

  const handleAddAction = () => {
    const trimmed = newAction.trim();
    if (trimmed && !actions.includes(trimmed)) {
      setActions([...actions, trimmed]);
      setNewAction('');
    }
  };

  const handleRemoveAction = (action: string) => {
    setActions(actions.filter((a) => a !== action));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!permission && !name.trim()) {
      setError('Permission name is required');
      return;
    }

    if (!permission && name.length > 100) {
      setError('Permission name must be 100 characters or less');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (description.length > 500) {
      setError('Description must be 500 characters or less');
      return;
    }

    if (resources.length === 0) {
      setError('At least one resource is required');
      return;
    }

    if (actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        name: name.trim().toLowerCase(),
        description: description.trim(),
        resources: resources.map((r) => r.trim()),
        actions: actions.map((a) => a.trim()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permission');
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, callback: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 10003 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {permission ? 'Edit Permission' : 'Create Permission'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (only for create) */}
          {!permission && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., user-management"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {name.length}/100 characters (lowercase alphanumeric with dashes)
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this permission allows"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description.length}/500 characters
            </p>
          </div>

          {/* Resources */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resources <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {resources.map((resource) => (
                <span
                  key={resource}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  {resource}
                  <button
                    type="button"
                    onClick={() => handleRemoveResource(resource)}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newResource}
                onChange={(e) => setNewResource(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddResource)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add resource (e.g., users, posts)"
              />
              <button
                type="button"
                onClick={handleAddResource}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              At least one resource is required
            </p>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Actions <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {actions.map((action) => (
                <span
                  key={action}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                >
                  {action}
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(action)}
                    className="ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddAction)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add action (e.g., read, write, delete)"
              />
              <button
                type="button"
                onClick={handleAddAction}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              At least one action is required
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || saving}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || saving ? 'Saving...' : permission ? 'Update Permission' : 'Create Permission'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

