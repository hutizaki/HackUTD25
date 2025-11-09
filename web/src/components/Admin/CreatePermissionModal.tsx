import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Permission, CreatePermissionRequest, UpdatePermissionRequest } from '@/lib/admin';

interface CreatePermissionModalProps {
  permission?: Permission;
  onSave: (data: CreatePermissionRequest | UpdatePermissionRequest) => Promise<void>;
  onCancel: () => void;
}

export function CreatePermissionModal({ permission, onSave, onCancel }: CreatePermissionModalProps) {
  const [name, setName] = useState(permission?.name || '');
  const [description, setDescription] = useState(permission?.description || '');
  const [resources, setResources] = useState<string[]>(permission?.resources || []);
  const [actions, setActions] = useState<string[]>(permission?.actions || []);
  const [resourceInput, setResourceInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddResource = () => {
    if (resourceInput.trim() && !resources.includes(resourceInput.trim())) {
      setResources([...resources, resourceInput.trim()]);
      setResourceInput('');
    }
  };

  const handleRemoveResource = (resource: string) => {
    setResources(resources.filter((r) => r !== resource));
  };

  const handleAddAction = () => {
    if (actionInput.trim() && !actions.includes(actionInput.trim())) {
      setActions([...actions, actionInput.trim()]);
      setActionInput('');
    }
  };

  const handleRemoveAction = (action: string) => {
    setActions(actions.filter((a) => a !== action));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Permission name is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
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
      if (permission) {
        // Update
        await onSave({ description, resources, actions });
      } else {
        // Create
        await onSave({ name: name.trim(), description, resources, actions });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permission');
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, type: 'resource' | 'action') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'resource') {
        handleAddResource();
      } else {
        handleAddAction();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 10003 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {permission ? 'Edit Permission' : 'Create Permission'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (only for create) */}
          {!permission && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permission Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., admin"
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
              placeholder="Describe what this permission allows..."
              required
            />
          </div>

          {/* Resources */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resources * (at least one required)
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={resourceInput}
                onChange={(e) => setResourceInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'resource')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., users, admin, sessions"
              />
              <button
                type="button"
                onClick={handleAddResource}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {resources.map((resource, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{resource}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveResource(resource)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actions * (at least one required)
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'action')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., read, write, delete"
              />
              <button
                type="button"
                onClick={handleAddAction}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {actions.map((action, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{action}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(action)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
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
              {loading ? 'Saving...' : permission ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
