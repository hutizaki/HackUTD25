import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getUsers, type AdminUser } from '@/lib/admin';
import { getUserRoles, addRoleToUser, removeRoleFromUser, type Role } from '@/lib/roles';

interface RoleUsersModalProps {
  role: Role;
  onClose: () => void;
}

export function RoleUsersModal({ role, onClose }: RoleUsersModalProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersWithRole, setUsersWithRole] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
    loadUsersWithRole();
  }, [role.id]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUsers(1, 1000);
      setUsers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUsersWithRole = async () => {
    try {
      const allUsers = await getUsers(1, 1000);
      const usersWithRoleSet = new Set<string>();
      
      await Promise.all(
        allUsers.data.map(async (user) => {
          try {
            const rolesResponse = await getUserRoles(user.id);
            if (rolesResponse.data.some((r) => r.id === role.id)) {
              usersWithRoleSet.add(user.id);
            }
          } catch (err) {
            console.error(`Failed to load roles for user ${user.id}:`, err);
          }
        })
      );
      
      setUsersWithRole(usersWithRoleSet);
    } catch (err) {
      console.error('Failed to load users with role:', err);
    }
  };

  const handleToggleUser = async (userId: string) => {
    const hasRole = usersWithRole.has(userId);
    
    try {
      setSaving(true);
      setError(null);
      
      if (hasRole) {
        await removeRoleFromUser(userId, role.id);
      } else {
        await addRoleToUser(userId, role.id);
      }
      
      // Update local state
      setUsersWithRole((prev) => {
        const updated = new Set(prev);
        if (hasRole) {
          updated.delete(userId);
        } else {
          updated.add(userId);
        }
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setSaving(false);
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
            Manage Users for Role: {role.displayName}
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
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => {
              const hasRole = usersWithRole.has(user.id);
              return (
                <label
                  key={user.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={hasRole}
                    onChange={() => handleToggleUser(user.id)}
                    disabled={saving}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                  {hasRole && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                      Has Role
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {usersWithRole.size} user(s) have this role
          </div>
        </div>
      </motion.div>
    </div>
  );
}

