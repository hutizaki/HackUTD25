import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getCurrentUser, logout, updateUserName } from '@/lib/auth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { AdminSettings } from '@/components/Account/AdminSettings';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { User } from '@/types/api';

type Tab = 'details' | 'settings' | 'admin-settings';

function AccountContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { hasRole } = useUserRoles();
  const { hasPermission, refresh: refreshPermissions } = useUserPermissions();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setNameValue(currentUser?.name || '');
        // Refresh permissions after user is loaded
        if (currentUser?.id) {
          refreshPermissions();
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
    
    // Refresh permissions when window gains focus (in case permissions were assigned in another tab)
    const handleFocus = () => {
      if (user?.id) {
        refreshPermissions();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Only run once on mount

  const canEditName = hasPermission('account', 'write');

  const handleStartEditName = () => {
    setEditingName(true);
    setNameValue(user?.name || '');
    setNameError(null);
  };

  const handleCancelEditName = () => {
    setEditingName(false);
    setNameValue(user?.name || '');
    setNameError(null);
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      setNameError('Name is required');
      return;
    }

    if (nameValue.trim().length > 100) {
      setNameError('Name must be less than 100 characters');
      return;
    }

    try {
      setSavingName(true);
      setNameError(null);
      const updatedUser = await updateUserName(nameValue.trim());
      setUser(updatedUser);
      setEditingName(false);
      // Refresh permissions in case they changed
      await refreshPermissions();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 min-h-[calc(100vh-4rem)]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Sidebar - Tabs */}
            <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'details'
                        ? 'bg-blue-500 dark:bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    Account Details
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    disabled
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors cursor-not-allowed opacity-50 ${
                      activeTab === 'settings'
                        ? 'bg-blue-500 dark:bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Account Settings
                  </button>
                  {hasRole('admin') && (
                    <button
                      onClick={() => setActiveTab('admin-settings')}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        activeTab === 'admin-settings'
                          ? 'bg-blue-500 dark:bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      Admin Settings
                    </button>
                  )}
                </nav>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Account Details</h1>

                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="border-b border-gray-200 dark:border-gray-700 pb-6"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                          {canEditName && !editingName && (
                            <button
                              onClick={handleStartEditName}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        {editingName ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={nameValue}
                              onChange={(e) => setNameValue(e.target.value)}
                              disabled={savingName}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              maxLength={100}
                              autoFocus
                            />
                            {nameError && (
                              <p className="text-sm text-red-600 dark:text-red-400">{nameError}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={handleSaveName}
                                disabled={savingName || !nameValue.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {savingName ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelEditName}
                                disabled={savingName}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-lg text-gray-900 dark:text-white">{user?.name || 'Not available'}</div>
                        )}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="border-b border-gray-200 dark:border-gray-700 pb-6"
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                        <div className="text-lg text-gray-900 dark:text-white">{user?.email || 'Not available'}</div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="border-b border-gray-200 dark:border-gray-700 pb-6"
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User ID</label>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{user?.id || 'Not available'}</div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="pb-6"
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Created</label>
                        <div className="text-lg text-gray-900 dark:text-white">
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Not available'}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Account Settings</h1>

                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="border-b border-gray-200 dark:border-gray-700 pb-6"
                      >
                        <p className="text-gray-600 dark:text-gray-400">Settings content will go here.</p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'admin-settings' && hasRole('admin') && (
                  <AdminSettings />
                )}
              </AnimatePresence>

              {/* Logout Button - Always visible */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
                >
                  Logout
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function Account() {
  return (
    <ProtectedRoute>
      <AccountContent />
    </ProtectedRoute>
  );
}

