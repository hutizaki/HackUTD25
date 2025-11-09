import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateUser, type AdminUser, type UpdateUserRequest } from '@/lib/admin';
import { sanitizeEmail, sanitizeName } from '@/lib/validation';

interface EditUserModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    email: user?.email || '',
    name: user?.name || '',
  });
  const [errors, setErrors] = useState<Partial<Record<'email' | 'name', string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<'email' | 'name', string>> = {};

    if (formData.email !== undefined) {
      const sanitizedEmail = sanitizeEmail(formData.email);
      if (!sanitizedEmail) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        newErrors.email = 'Invalid email address';
      }
    }

    if (formData.name !== undefined) {
      const sanitizedName = sanitizeName(formData.name);
      if (!sanitizedName || sanitizedName.length < 1) {
        newErrors.name = 'Name must be at least 1 character';
      } else if (sanitizedName.length > 100) {
        newErrors.name = 'Name must be less than 100 characters';
      }
    }

    // Check if at least one field is provided
    if (!formData.email && !formData.name) {
      setError('At least one field (email or name) must be provided');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Build update object with only provided fields
      const updates: UpdateUserRequest = {};
      if (formData.email !== undefined && formData.email !== user.email) {
        updates.email = sanitizeEmail(formData.email);
      }
      if (formData.name !== undefined && formData.name !== user.name) {
        updates.name = sanitizeName(formData.name);
      }

      await updateUser(user.id, updates);
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        // Check for validation errors
        const enhancedError = err as Error & { details?: Array<{ path: string[]; message: string }> };
        if (enhancedError.details) {
          const detailErrors: Partial<Record<'email' | 'name', string>> = {};
          enhancedError.details.forEach((detail) => {
            if (detail.path[0] === 'email') {
              detailErrors.email = detail.message;
            } else if (detail.path[0] === 'name') {
              detailErrors.name = detail.message;
            }
          });
          setErrors(detailErrors);
          setError(enhancedError.message);
        } else {
          setError(err.message || 'Failed to update user');
        }
      } else {
        setError('Failed to update user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4"
        style={{ zIndex: 10003 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        >
          <div className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Edit User</h2>
            <button onClick={onClose} className="text-white hover:text-blue-200 dark:hover:text-blue-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder={user.email}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder={user.name}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md text-white transition-colors ${
                  loading
                    ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed'
                    : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700'
                }`}
              >
                {loading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

