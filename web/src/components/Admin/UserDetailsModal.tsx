import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  getUserById, 
  impersonateUser, 
  getUserDirectPermissions,
  getUserEffectivePermissions,
  assignPermissionsToUser,
  removePermissionFromUser,
  getPermissions,
  type AdminUser,
  type Permission 
} from '@/lib/admin';
import { getUserRoles, assignRolesToUser, getRoles, type Role } from '@/lib/roles';
import { EditUserModal } from './EditUserModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { DeleteUserConfirm } from './DeleteUserConfirm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

interface UserDetailsModalProps {
  user: AdminUser | null;
  currentUserId?: string | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

export function UserDetailsModal({ user, currentUserId, onClose, onUserUpdated }: UserDetailsModalProps) {
  const [userDetails, setUserDetails] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<Array<Permission & { source: 'role' | 'direct'; roleName?: string }>>([]);
  const [directPermissions, setDirectPermissions] = useState<Permission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showPermissionSelector, setShowPermissionSelector] = useState(false);
  const [activePermissionTab, setActivePermissionTab] = useState<'effective' | 'direct' | 'role'>('effective');

  useEffect(() => {
    if (user) {
      loadUserDetails();
      loadUserRoles();
      loadAllRoles();
      loadUserPermissions();
      loadAllPermissions();
    }
  }, [user]);

  const loadUserDetails = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getUserById(user.id);
      setUserDetails(response.data);
    } catch (err) {
      setError(handleApiError(err, 'Failed to load user details'));
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdated = () => {
    loadUserDetails();
    onUserUpdated();
  };

  const handleUserDeleted = () => {
    onUserUpdated();
    onClose();
  };

  const loadUserRoles = async () => {
    if (!user) return;
    try {
      setLoadingRoles(true);
      const response = await getUserRoles(user.id);
      setUserRoles(response.data);
    } catch (err) {
      console.error('Failed to load user roles:', err);
      setUserRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadAllRoles = async () => {
    try {
      const response = await getRoles(1, 1000);
      setAllRoles(response.data);
    } catch (err) {
      console.error('Failed to load all roles:', err);
    }
  };

  const loadUserPermissions = async () => {
    if (!user) return;
    try {
      setLoadingPermissions(true);
      setPermissionError(null);
      const [effective, direct] = await Promise.all([
        getUserEffectivePermissions(user.id),
        getUserDirectPermissions(user.id),
      ]);
      setEffectivePermissions(effective);
      setDirectPermissions(direct);
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      setPermissionError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadAllPermissions = async () => {
    try {
      const response = await getPermissions(1, 1000);
      setAllPermissions(response.data);
    } catch (err) {
      console.error('Failed to load all permissions:', err);
    }
  };

  const handleAddPermission = async (permissionId: string) => {
    if (!user) return;
    try {
      setSavingPermissions(true);
      setPermissionError(null);
      await assignPermissionsToUser(user.id, [permissionId]);
      await loadUserPermissions();
      onUserUpdated();
    } catch (err) {
      setPermissionError(err instanceof Error ? err.message : 'Failed to add permission');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    if (!user) return;
    try {
      setSavingPermissions(true);
      setPermissionError(null);
      await removePermissionFromUser(user.id, permissionId);
      await loadUserPermissions();
      onUserUpdated();
    } catch (err) {
      setPermissionError(err instanceof Error ? err.message : 'Failed to remove permission');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRoleToggle = async (roleId: string) => {
    if (!user) return;
    
    const isSelected = userRoles.some((r) => r.id === roleId);
    const newRoleIds = isSelected
      ? userRoles.filter((r) => r.id !== roleId).map((r) => r.id)
      : [...userRoles.map((r) => r.id), roleId];


    try {
      setSavingRoles(true);
      setRoleError(null);
      await assignRolesToUser(user.id, newRoleIds);
      await loadUserRoles();
      onUserUpdated();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setSavingRoles(false);
    }
  };

  const handleImpersonate = async () => {
    if (!userDetails) return;
    
    try {
      setImpersonating(true);
      await impersonateUser(userDetails.id);
      window.location.href = '/dashboard';
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to sign in as user');
      setImpersonating(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 10002 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">User Actions</h2>
                  <p className="text-blue-100 text-sm mt-1">{userDetails?.email || user.email}</p>
                </div>
                <button 
                  onClick={onClose} 
                  className="text-white hover:text-blue-200 transition-colors p-1 rounded-lg hover:bg-white/10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <LoadingSpinner message="Loading user details..." />
                </div>
              ) : error ? (
                <ErrorDisplay error={error} />
              ) : userDetails ? (
                <div className="space-y-4">
                  {/* User Info Card */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</span>
                      <span className="text-sm text-gray-900 dark:text-white font-semibold">{userDetails.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</span>
                      <span className="text-sm text-gray-900 dark:text-white">{userDetails.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">User ID</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{userDetails.id}</span>
                    </div>
                  </div>

                  {/* Roles Section */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Roles</span>
                      {loadingRoles && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
                      )}
                    </div>
                    {roleError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-xs">
                        {roleError}
                      </div>
                    )}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allRoles.map((role) => {
                        const isSelected = userRoles.some((r) => r.id === role.id);
                        return (
                          <label
                            key={role.id}
                            className="flex items-start space-x-2 p-2 rounded cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleRoleToggle(role.id)}
                              disabled={savingRoles}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {role.displayName}
                                </span>
                                {role.group?.isSystemGroup && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                                    System
                                  </span>
                                )}
                              </div>
                              {role.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {role.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {userRoles.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Current Roles:</div>
                        <div className="flex flex-wrap gap-2">
                          {userRoles.map((role) => (
                            <span
                              key={role.id}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium"
                            >
                              {role.displayName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Permissions Section */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Permissions</span>
                      {loadingPermissions && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
                      )}
                    </div>
                    {permissionError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-xs">
                        {permissionError}
                      </div>
                    )}
                    
                    {/* Permission Tabs */}
                    <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => setActivePermissionTab('effective')}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                          activePermissionTab === 'effective'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Effective ({effectivePermissions.length})
                      </button>
                      <button
                        onClick={() => setActivePermissionTab('direct')}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                          activePermissionTab === 'direct'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Direct ({directPermissions.length})
                      </button>
                      <button
                        onClick={() => setActivePermissionTab('role')}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                          activePermissionTab === 'role'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        By Role
                      </button>
                    </div>

                    {/* Effective Permissions Tab */}
                    {activePermissionTab === 'effective' && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {effectivePermissions.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No permissions</p>
                        ) : (
                          effectivePermissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {permission.name}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-xs ${
                                        permission.source === 'role'
                                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                      }`}
                                    >
                                      {permission.source === 'role' ? `Role: ${permission.roleName || 'Unknown'}` : 'Direct'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{permission.description}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {permission.resources.map((resource, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
                                      >
                                        {resource}
                                      </span>
                                    ))}
                                    {permission.actions.map((action, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs"
                                      >
                                        {action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Direct Permissions Tab */}
                    {activePermissionTab === 'direct' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Directly assigned permissions</span>
                          <button
                            onClick={() => setShowPermissionSelector(!showPermissionSelector)}
                            disabled={savingPermissions}
                            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {showPermissionSelector ? 'Cancel' : 'Add Permission'}
                          </button>
                        </div>
                        {showPermissionSelector && (
                          <div className="mb-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
                            <input
                              type="text"
                              placeholder="Search permissions..."
                              value={permissionSearch}
                              onChange={(e) => setPermissionSearch(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                            />
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {allPermissions
                                .filter(
                                  (p) =>
                                    !directPermissions.some((dp) => dp.id === p.id) &&
                                    (permissionSearch === '' ||
                                      p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                                      p.description.toLowerCase().includes(permissionSearch.toLowerCase()))
                                )
                                .map((permission) => (
                                  <button
                                    key={permission.id}
                                    onClick={() => handleAddPermission(permission.id)}
                                    disabled={savingPermissions}
                                    className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                  >
                                    <div className="font-medium text-gray-900 dark:text-white">{permission.name}</div>
                                    <div className="text-gray-500 dark:text-gray-400 truncate">{permission.description}</div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {directPermissions.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No direct permissions</p>
                          ) : (
                            directPermissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-start justify-between"
                              >
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                    {permission.name}
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{permission.description}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {permission.resources.map((resource, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
                                      >
                                        {resource}
                                      </span>
                                    ))}
                                    {permission.actions.map((action, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs"
                                      >
                                        {action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemovePermission(permission.id)}
                                  disabled={savingPermissions}
                                  className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                  title="Remove permission"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Role Permissions Tab */}
                    {activePermissionTab === 'role' && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {userRoles.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No roles assigned</p>
                        ) : (
                          userRoles.map((role) => {
                            const rolePermissions = effectivePermissions.filter(
                              (p) => p.source === 'role' && p.roleName === role.displayName
                            );
                            return (
                              <div key={role.id} className="p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                  {role.displayName}
                                </div>
                                {rolePermissions.length === 0 ? (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">No permissions from this role</p>
                                ) : (
                                  <div className="space-y-1">
                                    {rolePermissions.map((permission) => (
                                      <div key={permission.id} className="text-xs">
                                        <div className="font-medium text-gray-700 dark:text-gray-300">{permission.name}</div>
                                        <div className="text-gray-500 dark:text-gray-400">{permission.description}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleImpersonate}
                      disabled={userDetails.id === currentUserId || impersonating}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                        userDetails.id === currentUserId
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : impersonating
                          ? 'bg-green-400 dark:bg-green-600 text-white cursor-wait'
                          : 'bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {impersonating ? 'Signing In...' : userDetails.id === currentUserId ? 'Already Signed In' : 'Sign In As User'}
                    </button>
                    
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="w-full px-4 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-all font-medium shadow-md hover:shadow-lg"
                    >
                      Edit User
                    </button>
                    
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full px-4 py-3 bg-yellow-500 dark:bg-yellow-600 text-white rounded-lg hover:bg-yellow-600 dark:hover:bg-yellow-700 transition-all font-medium shadow-md hover:shadow-lg"
                    >
                      Change Password
                    </button>
                    
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full px-4 py-3 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-all font-medium shadow-md hover:shadow-lg"
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No user details available</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Edit User Modal */}
      {showEditModal && userDetails && (
        <EditUserModal
          user={userDetails}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleUserUpdated}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && userDetails && (
        <ChangePasswordModal
          user={userDetails}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handleUserUpdated}
        />
      )}

      {/* Delete User Confirm */}
      {showDeleteConfirm && userDetails && (
        <DeleteUserConfirm
          user={userDetails}
          onClose={() => setShowDeleteConfirm(false)}
          onSuccess={handleUserDeleted}
        />
      )}
    </>
  );
}

