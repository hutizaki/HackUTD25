import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getUsers, getUserDirectPermissions, type AdminUser } from '@/lib/admin';

interface PermissionUsersListModalProps {
  permissionId: string;
  permissionName: string;
  onClose: () => void;
}

export function PermissionUsersListModal({ permissionId, permissionName, onClose }: PermissionUsersListModalProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsersWithPermission();
  }, [permissionId]);

  const loadUsersWithPermission = async () => {
    try {
      setLoading(true);
      setError(null);
      const allUsers = await getUsers(1, 1000);
      const usersWithPermission: AdminUser[] = [];

      await Promise.all(
        allUsers.data.map(async (user) => {
          try {
            // Use getUserDirectPermissions to show only users with explicitly assigned permissions
            const directPerms = await getUserDirectPermissions(user.id);
            if (directPerms.some((p) => p.id === permissionId)) {
              usersWithPermission.push(user);
            }
          } catch (err) {
            console.error(`Failed to load permissions for user ${user.id}:`, err);
          }
        })
      );

      setUsers(usersWithPermission);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.name.toLowerCase().includes(search.toLowerCase())
  );

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 10003 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Users with Explicit Permission: {permissionName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email or name..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Users List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {search ? 'No users match your search' : 'No users have this permission'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">{user.id}</div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {users.length} user(s) have this permission explicitly assigned (not via roles)
          </div>
        </div>
      </motion.div>
    </div>
  );
}

