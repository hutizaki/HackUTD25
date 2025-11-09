import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getUsers, 
  getSessions, 
  getUserById,
  revokeSession,
  removePermissionFromUser,
  assignPermissionsToUser,
  getPermissions,
  getUserDirectPermissions,
  getUserEffectivePermissions,
  impersonateUser,
  getUserActivityLogs,
  type AdminUser, 
  type PaginationData,
  type Session,
  type Permission,
  type ActivityLog,
} from '@/lib/admin';
import { getRoles, getUserRoles, addRoleToUser, removeRoleFromUser, getRoleGroups, type Role, type RoleGroup } from '@/lib/roles';
import { RoleUsersListModal } from './RoleUsersListModal';
import { PermissionUsersListModal } from './PermissionUsersListModal';
import { formatRelativeTime } from '@/utils/date';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';
import { 
  getAllCookies, 
  getAllLocalStorageItems, 
  getAllSessionStorageItems,
  getAllCaches,
  deleteCookie,
  deleteLocalStorageItem,
  deleteSessionStorageItem,
  formatBytes,
  formatJSON,
  type Cookie,
  type LocalStorageItem,
  type SessionStorageItem,
  type CacheInfo,
} from '@/lib/storage';

interface UserListProps {
  onUserClick: (user: AdminUser) => void;
  currentUserId?: string | null;
}

type SortField = 'email' | 'name' | 'createdAt' | 'activeSessions' | 'lastActivity' | 'permissionCount' | 'roleCount' | 'directPermissions' | 'inheritedPermissions' | 'totalSessions';
type SortDirection = 'asc' | 'desc';

interface ColumnOption {
  id: SortField;
  label: string;
  enabled: boolean;
}

const COLUMN_SETTINGS_STORAGE_KEY = 'adminPanel_columnVisibility';

// Default column visibility: email, name, lastActivity enabled
const DEFAULT_COLUMNS: ColumnOption[] = [
  { id: 'email', label: 'Email', enabled: true },
  { id: 'name', label: 'Name', enabled: true },
  { id: 'createdAt', label: 'Created At', enabled: false },
  { id: 'activeSessions', label: 'Active Sessions', enabled: false },
  { id: 'totalSessions', label: 'Total Sessions', enabled: false },
  { id: 'lastActivity', label: 'Last Activity', enabled: true },
  { id: 'roleCount', label: 'Roles', enabled: false },
  { id: 'directPermissions', label: 'Direct Permissions', enabled: false },
  { id: 'inheritedPermissions', label: 'Inherited Permissions', enabled: false },
  { id: 'permissionCount', label: 'Total Permissions', enabled: false },
];

// Load column settings from localStorage
function loadColumnSettings(): ColumnOption[] {
  try {
    const saved = localStorage.getItem(COLUMN_SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all columns exist
      return DEFAULT_COLUMNS.map(defaultCol => {
        const savedCol = parsed.find((c: ColumnOption) => c.id === defaultCol.id);
        return savedCol ? { ...defaultCol, enabled: savedCol.enabled } : defaultCol;
      });
    }
  } catch (err) {
    console.error('Failed to load column settings:', err);
  }
  return DEFAULT_COLUMNS;
}

// Save column settings to localStorage
function saveColumnSettings(columns: ColumnOption[]): void {
  try {
    localStorage.setItem(COLUMN_SETTINGS_STORAGE_KEY, JSON.stringify(columns));
  } catch (err) {
    console.error('Failed to save column settings:', err);
  }
}

interface ExpandedUserData {
  sessions: Session[];
  allSessions: Session[];
  permissions: Permission[];
  lastActivity: string | null;
  loading: boolean;
}

export function UserList({ onUserClick }: UserListProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userData, setUserData] = useState<Record<string, ExpandedUserData>>({});
  const [sortField, setSortField] = useState<SortField>('email');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [expandedTab, setExpandedTab] = useState<Record<string, 'info' | 'sessions' | 'permissions' | 'storage' | 'logs' | 'roles'>>({});
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allGroups, setAllGroups] = useState<RoleGroup[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, Role[]>>({});
  const [roleSearch, setRoleSearch] = useState<Record<string, string>>({});
  const [updatingRoles, setUpdatingRoles] = useState<Record<string, Set<string>>>({});
  const [roleUserCounts, setRoleUserCounts] = useState<Record<string, number>>({});
  const [showingRoleUsers, setShowingRoleUsers] = useState<{ roleId: string; roleName: string } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, Set<string>>>({});
  const [roleValidationErrors, setRoleValidationErrors] = useState<Record<string, string[]>>({});
  const [starredUsers, setStarredUsers] = useState<Set<string>>(new Set());
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);
  const [showLogsFilters, setShowLogsFilters] = useState<Record<string, boolean>>({});
  const [logsPropertyFilters, setLogsPropertyFilters] = useState<Record<string, Record<string, string>>>({});
  const [logsSearch, setLogsSearch] = useState<Record<string, string>>({});
  const [activityLogs, setActivityLogs] = useState<Record<string, { logs: ActivityLog[]; pagination: PaginationData | null; loading: boolean; error: string | null }>>({});
  const [logsPage, setLogsPage] = useState<Record<string, number>>({});
  const [effectivePermissions, setEffectivePermissions] = useState<Record<string, Array<Permission & { source: 'role' | 'direct'; roleName?: string }>>>({});
  const [directPermissions, setDirectPermissions] = useState<Record<string, Permission[]>>({});
  const [searchTimeout, setSearchTimeout] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
  const [storageData, setStorageData] = useState<Record<string, {
    cookies: Cookie[];
    localStorage: LocalStorageItem[];
    sessionStorage: SessionStorageItem[];
    caches: CacheInfo[];
  }>>({});
  const [showActiveSessions, setShowActiveSessions] = useState<Record<string, boolean>>({});
  const [showRevokedSessions, setShowRevokedSessions] = useState<Record<string, boolean>>({});
  const [collapsedStorageSections, setCollapsedStorageSections] = useState<Record<string, Set<string>>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, Set<string>>>({});
  const [logsDateRange, setLogsDateRange] = useState<Record<string, { startDate?: string; endDate?: string }>>({});
  const [collapsedPermissionCategories, setCollapsedPermissionCategories] = useState<Record<string, Set<string>>>({});
  const [permissionUserCounts, setPermissionUserCounts] = useState<Record<string, number>>({});
  const [showingPermissionUsers, setShowingPermissionUsers] = useState<{ permissionId: string; permissionName: string } | null>(null);
  const columnSettingsRef = useRef<HTMLDivElement>(null);
  const validatingRef = useRef<Set<string>>(new Set()); // Track which users are currently being validated

  const STARRED_USERS_STORAGE_KEY = 'adminPanel_starredUsers';
  
  // Column visibility options - load from localStorage on mount
  const [columns, setColumns] = useState<ColumnOption[]>(loadColumnSettings);

  // Save column settings to localStorage whenever they change
  useEffect(() => {
    saveColumnSettings(columns);
  }, [columns]);

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  // Load starred users from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STARRED_USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStarredUsers(new Set(parsed));
      }
    } catch (err) {
      console.error('Failed to load starred users:', err);
    }
  }, []);

  // Save starred users to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STARRED_USERS_STORAGE_KEY, JSON.stringify(Array.from(starredUsers)));
    } catch (err) {
      console.error('Failed to save starred users:', err);
    }
  }, [starredUsers]);

  // Load all permissions on mount and calculate user counts
  useEffect(() => {
    const loadAllPermissions = async () => {
      try {
        const response = await getPermissions(1, 1000);
        setAllPermissions(response.data);
        // Load user counts for each permission
        loadPermissionUserCounts(response.data);
      } catch (err) {
        console.error('Failed to load permissions:', err);
      }
    };
    loadAllPermissions();
  }, []);

  // Listen for permission changes from PermissionManager
  useEffect(() => {
    const handlePermissionChange = async (event: CustomEvent<{ userIds?: string[] }>) => {
      const userIds = event.detail?.userIds;
      
      // If specific user IDs provided, refresh only those users
      if (userIds && userIds.length > 0) {
        const refreshPromises = userIds.map(async (userId) => {
          try {
            const [effectivePerms, directPerms] = await Promise.all([
              getUserEffectivePermissions(userId).catch(() => []),
              getUserDirectPermissions(userId).catch(() => []),
            ]);
            
            setEffectivePermissions(prev => ({
              ...prev,
              [userId]: effectivePerms,
            }));
            
            setDirectPermissions(prev => ({
              ...prev,
              [userId]: directPerms,
            }));
          } catch (err) {
            console.error(`Failed to refresh permissions for user ${userId}:`, err);
          }
        });
        
        await Promise.all(refreshPromises);
      } else {
        // If no specific users, refresh all users in the current list
        const refreshPromises = users.map(async (user) => {
          try {
            const [effectivePerms, directPerms] = await Promise.all([
              getUserEffectivePermissions(user.id).catch(() => []),
              getUserDirectPermissions(user.id).catch(() => []),
            ]);
            
            setEffectivePermissions(prev => ({
              ...prev,
              [user.id]: effectivePerms,
            }));
            
            setDirectPermissions(prev => ({
              ...prev,
              [user.id]: directPerms,
            }));
          } catch (err) {
            console.error(`Failed to refresh permissions for user ${user.id}:`, err);
          }
        });
        
        await Promise.all(refreshPromises);
      }
    };

    window.addEventListener('permissionsChanged', handlePermissionChange as unknown as EventListener);
    
    return () => {
      window.removeEventListener('permissionsChanged', handlePermissionChange as unknown as EventListener);
    };
  }, [users]);

  // Load user counts for each permission (only explicitly assigned, not via roles)
  const loadPermissionUserCounts = async (permissions: Permission[]) => {
    try {
      const allUsers = await getUsers(1, 1000);
      const counts: Record<string, number> = {};

      await Promise.all(
        permissions.map(async (permission) => {
          let count = 0;
          await Promise.all(
            allUsers.data.map(async (user) => {
              try {
                // Use getUserDirectPermissions to count only explicitly assigned permissions
                const directPerms = await getUserDirectPermissions(user.id);
                if (directPerms.some((p) => p.id === permission.id)) {
                  count++;
                }
              } catch (err) {
                // Ignore errors for individual users
              }
            })
          );
          counts[permission.id] = count;
        })
      );

      setPermissionUserCounts(counts);
    } catch (err) {
      console.error('Failed to load permission user counts:', err);
    }
  };

  // Load all roles and groups on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [rolesResponse, groupsResponse] = await Promise.all([
          getRoles(1, 1000),
          getRoleGroups(),
        ]);
        setAllRoles(rolesResponse.data);
        setAllGroups(groupsResponse.data);
        // Load user counts for each role
        loadRoleUserCounts(rolesResponse.data);
      } catch (err) {
        console.error('Failed to load roles/groups:', err);
      }
    };
    loadAllData();
  }, []);

  // Load user counts for each role
  const loadRoleUserCounts = async (roles: Role[]) => {
    try {
      const allUsers = await getUsers(1, 1000);
      const counts: Record<string, number> = {};

      await Promise.all(
        roles.map(async (role) => {
          let count = 0;
          await Promise.all(
            allUsers.data.map(async (user) => {
              try {
                const rolesResponse = await getUserRoles(user.id);
                if (rolesResponse.data.some((r) => r.id === role.id)) {
                  count++;
                }
              } catch (err) {
                // Ignore errors for individual users
              }
            })
          );
          counts[role.id] = count;
        })
      );

      setRoleUserCounts(counts);
    } catch (err) {
      console.error('Failed to load role user counts:', err);
    }
  };

  // Close column settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(event.target as Node)) {
        setShowColumnSettings(false);
      }
    };

    if (showColumnSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSettings]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUsers(page, limit, search || undefined);
      setUsers(response.data);
      setPagination(response.pagination);
      
      // Pre-fetch basic metrics for all users
      await Promise.all(response.data.map(user => loadUserMetrics(user.id)));
    } catch (err) {
      setError(handleApiError(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserMetrics = async (userId: string) => {
    try {
      // Get active sessions count and last activity
      const sessionsResponse = await getSessions(userId, 'active', 1, 100);
      const allSessionsResponse = await getSessions(userId, 'all', 1, 100);
      
      const activeSessions = sessionsResponse.data;
      const allSessions = allSessionsResponse.data;
      
      // Get user details to fetch permissions
      const userDetailsResponse = await getUserById(userId);
      
      const lastActivity = allSessions.length > 0
        ? allSessions.reduce((latest, session) => {
            const sessionTime = new Date(session.lastActivity).getTime();
            const latestTime = latest ? new Date(latest).getTime() : 0;
            return sessionTime > latestTime ? session.lastActivity : latest;
          }, null as string | null)
        : null;

      setUserData(prev => ({
        ...prev,
        [userId]: {
          sessions: activeSessions,
          allSessions: allSessions,
          permissions: userDetailsResponse.data.permissions?.map(p => ({
            id: p._id,
            name: p.name,
            description: p.description,
            resources: p.resources,
            actions: p.actions,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })) || [],
          lastActivity,
          loading: false,
        },
      }));
    } catch (err) {
      console.error(`Failed to load metrics for user ${userId}:`, err);
      setUserData(prev => ({
        ...prev,
        [userId]: {
          sessions: [],
          allSessions: [],
          permissions: [],
          lastActivity: null,
          loading: false,
        },
      }));
    }
  };

  const toggleUserExpansion = async (userId: string) => {
    const isExpanded = expandedUsers.has(userId);
    
    if (isExpanded) {
      // Collapse
      setExpandedUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      // Clear tab selection
      setExpandedTab(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } else {
      // Expand - load full data
      setExpandedUsers(prev => new Set(prev).add(userId));
      // Set default tab to info
      setExpandedTab(prev => ({ ...prev, [userId]: 'info' }));
      
      // Load all data when user is expanded
      if (!userData[userId] || userData[userId].permissions.length === 0) {
        // Load permissions
        setUserData(prev => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || { sessions: [], allSessions: [], permissions: [], lastActivity: null, loading: false }),
            loading: true,
          },
        }));

        try {
          // Load all data in parallel
          const [sessionsResponse, userDetails, effectivePerms, userRolesResponse, directPerms] = await Promise.all([
            getSessions(userId, 'all', 1, 1000),
            getUserById(userId),
            getUserEffectivePermissions(userId).catch(() => []), // Load effective permissions
            getUserRoles(userId).catch(() => ({ data: [] })), // Load roles
            getUserDirectPermissions(userId).catch(() => []), // Load direct permissions
          ]);
          
          // Transform permissions from backend format to Permission format
          const userPermissions: Permission[] = (userDetails.data.permissions || []).map(p => ({
            id: p._id,
            name: p.name,
            description: p.description,
            resources: p.resources,
            actions: p.actions,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }));
          
          setUserData(prev => ({
            ...prev,
            [userId]: {
              sessions: sessionsResponse.data.filter(s => s.status === 'active'),
              allSessions: sessionsResponse.data,
              permissions: userPermissions,
              lastActivity: prev[userId]?.lastActivity || null,
              loading: false,
            },
          }));

          // Set effective permissions
          setEffectivePermissions(prev => ({
            ...prev,
            [userId]: effectivePerms,
          }));

          // Set direct permissions
          setDirectPermissions(prev => ({
            ...prev,
            [userId]: directPerms,
          }));

          // Set user roles
          setUserRoles(prev => ({
            ...prev,
            [userId]: userRolesResponse.data,
          }));

          // Load storage data
          loadStorageData(userId);

          // Load activity logs (first page)
          loadActivityLogs(userId, 1);
        } catch (err) {
          console.error(`Failed to load data for user ${userId}:`, err);
          setUserData(prev => ({
            ...prev,
            [userId]: {
              ...(prev[userId] || { sessions: [], allSessions: [], permissions: [], lastActivity: null }),
              loading: false,
            },
          }));
        }
      } else {
        // If data already loaded, still load roles if not loaded
        if (!userRoles[userId]) {
          try {
            const userRolesResponse = await getUserRoles(userId);
            setUserRoles(prev => ({
              ...prev,
              [userId]: userRolesResponse.data,
            }));
          } catch (err) {
            console.error(`Failed to load roles for user ${userId}:`, err);
          }
        }
        // Load effective permissions if not loaded
        if (!effectivePermissions[userId]) {
          try {
            const effectivePerms = await getUserEffectivePermissions(userId);
            setEffectivePermissions(prev => ({
              ...prev,
              [userId]: effectivePerms,
            }));
          } catch (err) {
            console.error(`Failed to load effective permissions for user ${userId}:`, err);
          }
        }
        // Load direct permissions if not loaded
        if (!directPermissions[userId]) {
          try {
            const directPerms = await getUserDirectPermissions(userId);
            setDirectPermissions(prev => ({
              ...prev,
              [userId]: directPerms,
            }));
          } catch (err) {
            console.error(`Failed to load direct permissions for user ${userId}:`, err);
          }
        }
        // Load storage data if not loaded
        if (!storageData[userId]) {
          loadStorageData(userId);
        }
        // Load activity logs if not loaded
        if (!activityLogs[userId] || activityLogs[userId].logs.length === 0) {
          loadActivityLogs(userId, 1);
        }
      }
    }
  };

  const loadStorageData = async (userId: string) => {
    try {
      const cookies = getAllCookies();
      const localStorage = getAllLocalStorageItems();
      const sessionStorage = getAllSessionStorageItems();
      let caches: CacheInfo[] = [];
      
      try {
        caches = await getAllCaches();
      } catch {
        // Cache Storage might not be available
      }
      
      setStorageData(prev => ({
        ...prev,
        [userId]: { cookies, localStorage, sessionStorage, caches },
      }));
    } catch (err) {
      console.error(`Failed to load storage for user ${userId}:`, err);
    }
  };

  const loadActivityLogs = async (userId: string, page: number = 1) => {
    try {
      setActivityLogs(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          loading: true,
          error: null,
        },
      }));

      const dateRange = logsDateRange[userId];
      const startDate = dateRange?.startDate;
      const endDate = dateRange?.endDate;
      const response = await getUserActivityLogs(userId, page, 50, undefined, startDate, endDate);

      setActivityLogs(prev => ({
        ...prev,
        [userId]: {
          logs: response.data,
          pagination: response.pagination,
          loading: false,
          error: null,
        },
      }));
      setLogsPage(prev => ({ ...prev, [userId]: page }));
    } catch (err) {
      setActivityLogs(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load activity logs',
        },
      }));
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleTogglePermission = async (userId: string, permissionId: string, enabled: boolean) => {
    try {
      const userPermissions = userData[userId]?.permissions || [];
      const currentPermissionIds = userPermissions.map(p => p.id);
      
      if (enabled) {
        // Add permission
        await assignPermissionsToUser(userId, [...currentPermissionIds, permissionId]);
      } else {
        // Remove permission
        await removePermissionFromUser(userId, permissionId);
      }
      
      // Reload user data and permissions immediately to update counts
      await loadUserMetrics(userId);
      
      // Always refresh permissions (not just when expanded) to update counts
      const [effectivePerms, directPerms] = await Promise.all([
        getUserEffectivePermissions(userId).catch(() => []),
        getUserDirectPermissions(userId).catch(() => []),
      ]);
      
      // Update effective and direct permissions immediately
      setEffectivePermissions(prev => ({
        ...prev,
        [userId]: effectivePerms,
      }));
      
      setDirectPermissions(prev => ({
        ...prev,
        [userId]: directPerms,
      }));
      
      if (expandedUsers.has(userId)) {
        const [userDetails, sessionsResponse] = await Promise.all([
          getUserById(userId),
          getSessions(userId, 'all', 1, 100),
        ]);
        
        setUserData(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            permissions: (userDetails.data.permissions || []).map(p => ({
              id: p._id,
              name: p.name,
              description: p.description,
              resources: p.resources,
              actions: p.actions,
              category: (p as any).category,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            })),
            sessions: sessionsResponse.data.filter(s => s.status === 'active'),
            allSessions: sessionsResponse.data,
          },
        }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update permission');
    }
  };

  // Validate user roles against group requirements
  const validateUserRoles = (userId: string): string[] => {
    // Prevent concurrent validations for the same user
    if (validatingRef.current.has(userId)) {
      return roleValidationErrors[userId] || [];
    }

    const errors: string[] = [];
    const userRoleList = userRoles[userId] || [];

    // Don't validate if groups haven't been loaded yet
    if (allGroups.length === 0) {
      return errors;
    }

    for (const group of allGroups) {
      if (group.requiresOne) {
        const rolesInGroup = userRoleList.filter((r) => {
          // Handle both cases: r.group might be null/undefined or an object with id
          if (!r.group) {
            return false;
          }
          
          // Extract group ID from role - backend returns group as { id, name, displayName, isSystemGroup }
          let roleGroupId: string | undefined;
          if (typeof r.group === 'object' && r.group !== null) {
            // Check for 'id' property first (this is what the backend returns)
            if ('id' in r.group && r.group.id) {
              roleGroupId = String(r.group.id);
            } else if ('_id' in r.group && r.group._id) {
              roleGroupId = String(r.group._id);
            }
          } else if (typeof r.group === 'string') {
            roleGroupId = r.group;
          }
          
          // Compare with group ID (both as strings to avoid type mismatches)
          const groupId = String(group.id);
          
          // Only include if IDs match
          const matches = roleGroupId === groupId;
          return matches;
        });
        
        // Only show error if user has no role from this group
        // If they have exactly one, that's valid (no error)
        // If they have more than one, that's an error
        if (rolesInGroup.length === 0) {
          errors.push(`User must have exactly one role from group "${group.displayName}"`);
        } else if (rolesInGroup.length > 1) {
          errors.push(`User can only have one role from group "${group.displayName}". Currently has: ${rolesInGroup.map((r) => r.displayName).join(', ')}`);
        }
        // If rolesInGroup.length === 1, that's valid, so no error is added
      }
    }

    return errors;
  };

  const handleToggleRole = async (userId: string, roleId: string) => {
    // Prevent multiple simultaneous updates for the same role
    if (updatingRoles[userId]?.has(roleId)) {
      return;
    }

    const currentUserRoles = userRoles[userId] || [];
    const isSelected = currentUserRoles.some((r) => r.id === roleId);
    const role = allRoles.find((r) => r.id === roleId);
    
    if (!role) {
      return;
    }

    // Validate before saving
    if (!isSelected) {
      // Adding a role - check if it would violate group requirements
      const newRoles = [...currentUserRoles, role];
      // Check if adding this role would violate group requirements
      const tempErrors: string[] = [];
      
      for (const group of allGroups) {
        if (group.requiresOne) {
          const rolesInGroup = newRoles.filter((r) => r.group?.id === group.id);
          
          if (rolesInGroup.length === 0) {
            // Would have no role from this group - check if default role exists
            if (!group.defaultRoleId) {
              tempErrors.push(`Cannot add this role. User must have exactly one role from group "${group.displayName}". No default role is set.`);
            }
          } else if (rolesInGroup.length > 1) {
            // Would have multiple roles from this group
            const existingRoleInGroup = currentUserRoles.find((r) => r.group?.id === group.id && r.id !== roleId);
            if (existingRoleInGroup) {
              // This is expected - the backend will replace the existing role
              // But we should warn the user
              if (!confirm(`Adding this role will replace "${existingRoleInGroup.displayName}" from group "${group.displayName}". Continue?`)) {
                return;
              }
            } else {
              tempErrors.push(`Cannot add this role. User can only have one role from group "${group.displayName}". Currently has: ${rolesInGroup.filter((r) => r.id !== roleId).map((r) => r.displayName).join(', ')}`);
            }
          }
        }
      }
      
      if (tempErrors.length > 0) {
        setRoleValidationErrors(prev => ({ ...prev, [userId]: tempErrors }));
        alert(`Cannot add role:\n${tempErrors.join('\n')}`);
        return;
      }
    } else {
      // Removing a role - check if it would violate group requirements
      const newRoles = currentUserRoles.filter((r) => r.id !== roleId);
      const tempErrors: string[] = [];
      
      for (const group of allGroups) {
        if (group.requiresOne) {
          const rolesInGroup = newRoles.filter((r) => r.group?.id === group.id);
          
          if (rolesInGroup.length === 0) {
            // Would have no role from this group
            if (!group.defaultRoleId) {
              tempErrors.push(`Cannot remove this role. User must have exactly one role from group "${group.displayName}". No default role is set.`);
            }
          }
        }
      }
      
      if (tempErrors.length > 0) {
        setRoleValidationErrors(prev => ({ ...prev, [userId]: tempErrors }));
        alert(`Cannot remove role:\n${tempErrors.join('\n')}`);
        return;
      }
    }

    try {
      // Set updating state
      setUpdatingRoles(prev => ({
        ...prev,
        [userId]: new Set(prev[userId] || []).add(roleId),
      }));

      if (isSelected) {
        // Use removeRoleFromUser for removing
        await removeRoleFromUser(userId, roleId);
      } else {
        // Use addRoleToUser for simple addition
        await addRoleToUser(userId, roleId);
      }

      // Reload user roles to get updated state
      const response = await getUserRoles(userId);
      setUserRoles(prev => ({ ...prev, [userId]: response.data }));
      
      // Refresh permissions since role changes affect inherited permissions
      const [effectivePerms, directPerms] = await Promise.all([
        getUserEffectivePermissions(userId).catch(() => []),
        getUserDirectPermissions(userId).catch(() => []),
      ]);
      
      setEffectivePermissions(prev => ({
        ...prev,
        [userId]: effectivePerms,
      }));
      
      setDirectPermissions(prev => ({
        ...prev,
        [userId]: directPerms,
      }));
      
      // Validate after update (use requestAnimationFrame to ensure state is updated)
      // Only validate if groups are loaded
      if (allGroups.length > 0 && !validatingRef.current.has(userId)) {
        validatingRef.current.add(userId);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const errors = validateUserRoles(userId);
            setRoleValidationErrors(prev => {
              const current = prev[userId] || [];
              // Only update if errors changed to prevent infinite loops
              if (JSON.stringify(current.sort()) !== JSON.stringify(errors.sort())) {
                return { ...prev, [userId]: errors };
              }
              return prev;
            });
            validatingRef.current.delete(userId);
          });
        });
      } else {
        // Clear errors if groups aren't loaded yet
        setRoleValidationErrors(prev => ({ ...prev, [userId]: [] }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      // Clear updating state
      setUpdatingRoles(prev => {
        const updated = { ...prev };
        if (updated[userId]) {
          updated[userId] = new Set(updated[userId]);
          updated[userId].delete(roleId);
        }
        return updated;
      });
    }
  };

  const handleRevokeSession = async (sessionId: string, userId: string) => {
    try {
      await revokeSession(sessionId);
      // Reload user metrics
      await loadUserMetrics(userId);
      // Reload expanded data if expanded
      if (expandedUsers.has(userId)) {
        const sessionsResponse = await getSessions(userId, 'all', 1, 100);
        setUserData(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            sessions: sessionsResponse.data.filter(s => s.status === 'active'),
            allSessions: sessionsResponse.data,
          },
        }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke session');
    }
  };

  const toggleStarred = (userId: string) => {
    setStarredUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleOpenNewSession = async (userId: string) => {
    try {
      await impersonateUser(userId);
      window.location.href = '/dashboard';
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to sign in as user');
    }
  };

  // Sort and filter users
  const sortedUsers = useMemo(() => {
    let filtered = [...users];
    
    // Filter by starred users if enabled
    if (filterStarredOnly) {
      filtered = filtered.filter(user => starredUsers.has(user.id));
    }
    
    const sorted = filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'email':
        case 'name':
          aValue = a[sortField].toLowerCase();
          bValue = b[sortField].toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'activeSessions':
          aValue = userData[a.id]?.sessions.length || 0;
          bValue = userData[b.id]?.sessions.length || 0;
          break;
        case 'lastActivity':
          aValue = userData[a.id]?.lastActivity 
            ? new Date(userData[a.id]!.lastActivity!).getTime() 
            : 0;
          bValue = userData[b.id]?.lastActivity 
            ? new Date(userData[b.id]!.lastActivity!).getTime() 
            : 0;
          break;
        case 'permissionCount':
          aValue = (directPermissions[a.id]?.length || 0) + (effectivePermissions[a.id]?.filter(p => p.source === 'role').length || 0);
          bValue = (directPermissions[b.id]?.length || 0) + (effectivePermissions[b.id]?.filter(p => p.source === 'role').length || 0);
          break;
        case 'roleCount':
          aValue = userRoles[a.id]?.length || 0;
          bValue = userRoles[b.id]?.length || 0;
          break;
        case 'directPermissions':
          aValue = directPermissions[a.id]?.length || 0;
          bValue = directPermissions[b.id]?.length || 0;
          break;
        case 'inheritedPermissions':
          aValue = effectivePermissions[a.id]?.filter(p => p.source === 'role').length || 0;
          bValue = effectivePermissions[b.id]?.filter(p => p.source === 'role').length || 0;
          break;
        case 'totalSessions':
          aValue = userData[a.id]?.allSessions?.length || 0;
          bValue = userData[b.id]?.allSessions?.length || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [users, sortField, sortDirection, userData, filterStarredOnly, starredUsers, userRoles, directPermissions, effectivePermissions]);

  const visibleColumns = columns.filter(col => col.enabled);

  if (loading && users.length === 0) {
    return <LoadingSpinner message="Loading users..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Search */}
        <div className="flex items-center space-x-2 flex-1 min-w-[300px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search by email or name..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Starred Filter */}
        <button
          onClick={() => setFilterStarredOnly(!filterStarredOnly)}
          className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
            filterStarredOnly
              ? 'bg-yellow-200 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-300 dark:hover:bg-yellow-900/50'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <svg className="w-5 h-5" fill={filterStarredOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>Starred Only</span>
        </button>

        {/* Column Settings */}
        <div className="relative" ref={columnSettingsRef}>
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Columns</span>
          </button>

          {showColumnSettings && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Visible Columns</h3>
              <div className="space-y-2">
                {columns.map((col) => (
                  <label key={col.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.enabled}
                      onChange={(e) => {
                        setColumns(prev =>
                          prev.map(c => c.id === col.id ? { ...c, enabled: e.target.checked } : c)
                        );
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                {/* Expand/Collapse column */}
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort(col.id)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.label}</span>
                    {sortField === col.id && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                {/* Starred column */}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => {
                const isExpanded = expandedUsers.has(user.id);
                const userMetrics = userData[user.id];
                const activeSessionsCount = userMetrics?.sessions.length || 0;
                const lastActivity = userMetrics?.lastActivity 
                  ? formatRelativeTime(userMetrics.lastActivity)
                  : 'Never';
                
                // Calculate additional metrics
                const roleCount = userRoles[user.id]?.length || 0;
                const directPermCount = directPermissions[user.id]?.length || 0;
                const inheritedPermCount = effectivePermissions[user.id]?.filter(p => p.source === 'role').length || 0;
                const totalSessionsCount = userMetrics?.allSessions?.length || 0;

                return (
                  <>
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {/* Expand/Collapse Button */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserExpansion(user.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>

                      {/* Email */}
                      {visibleColumns.some(c => c.id === 'email') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.email}</td>
                      )}

                      {/* Name */}
                      {visibleColumns.some(c => c.id === 'name') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.name}</td>
                      )}

                      {/* Created At */}
                      {visibleColumns.some(c => c.id === 'createdAt') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      )}

                      {/* Active Sessions */}
                      {visibleColumns.some(c => c.id === 'activeSessions') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                            {activeSessionsCount}
                          </span>
                        </td>
                      )}

                      {/* Total Sessions */}
                      {visibleColumns.some(c => c.id === 'totalSessions') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium">
                            {totalSessionsCount}
                          </span>
                        </td>
                      )}

                      {/* Last Activity */}
                      {visibleColumns.some(c => c.id === 'lastActivity') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {lastActivity}
                        </td>
                      )}

                      {/* Role Count */}
                      {visibleColumns.some(c => c.id === 'roleCount') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium">
                            {roleCount}
                          </span>
                        </td>
                      )}

                      {/* Direct Permissions */}
                      {visibleColumns.some(c => c.id === 'directPermissions') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                            {directPermCount}
                          </span>
                        </td>
                      )}

                      {/* Inherited Permissions */}
                      {visibleColumns.some(c => c.id === 'inheritedPermissions') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium">
                            {inheritedPermCount}
                          </span>
                        </td>
                      )}

                      {/* Total Permissions */}
                      {visibleColumns.some(c => c.id === 'permissionCount') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                            {directPermCount + inheritedPermCount}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick(user);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="View Actions"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </td>

                      {/* Starred */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStarred(user.id);
                          }}
                          className={`transition-colors ${
                            starredUsers.has(user.id)
                              ? 'text-yellow-500 dark:text-yellow-400'
                              : 'text-gray-400 dark:text-gray-600 hover:text-yellow-500 dark:hover:text-yellow-400'
                          }`}
                          title={starredUsers.has(user.id) ? 'Unstar user' : 'Star user'}
                        >
                          <svg className="w-5 h-5" fill={starredUsers.has(user.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      </td>
                    </motion.tr>

                    {/* Expanded Row - Sidebar with Tabs */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={visibleColumns.length + 3} className="px-0 py-0 bg-gray-50 dark:bg-gray-900">
                            {userMetrics?.loading ? (
                              <div className="flex items-center justify-center py-12">
                                <LoadingSpinner size="md" />
                              </div>
                            ) : (
                              <div className="flex border-t border-gray-200 dark:border-gray-700">
                                {/* Sidebar */}
                                <div className="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                                  <div className="p-2 space-y-1">
                                    {/* Info Tab */}
                                    <button
                                      onClick={() => {
                                        setExpandedTab(prev => ({ ...prev, [user.id]: 'info' }));
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                                        expandedTab[user.id] === 'info'
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span>Info</span>
                                    </button>
                                    {/* Sessions Tab */}
                                    <button
                                      onClick={() => {
                                        setExpandedTab(prev => ({ ...prev, [user.id]: 'sessions' }));
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                                        expandedTab[user.id] === 'sessions'
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Sessions</span>
                                      </div>
                                      {userMetrics?.sessions && (() => {
                                        const activeCount = userMetrics.sessions.filter(s => s.status === 'active').length;
                                        const revokedCount = userMetrics.sessions.filter(s => s.status === 'revoked' || s.status === 'expired').length;
                                        return (
                                          <div className="flex items-center space-x-1">
                                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                              {activeCount}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                              {revokedCount}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setExpandedTab(prev => ({ ...prev, [user.id]: 'permissions' }));
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                                        expandedTab[user.id] === 'permissions'
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <span>Permissions</span>
                                      </div>
                                      {(() => {
                                        const directCount = directPermissions[user.id]?.length ?? null;
                                        const effectivePerms = effectivePermissions[user.id];
                                        
                                        if (directCount === null || !effectivePerms) {
                                          return null; // Not loaded yet
                                        }
                                        
                                        // Count inherited permissions (from roles) using source field
                                        const inheritedCount = effectivePerms.filter(p => p.source === 'role').length;
                                        
                                        return (
                                          <div className="flex items-center space-x-1">
                                            {directCount > 0 && (
                                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                {directCount}
                                              </span>
                                            )}
                                            {inheritedCount > 0 && (
                                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                                {inheritedCount}
                                              </span>
                                            )}
                                            {directCount === 0 && inheritedCount === 0 && (
                                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                                0
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setExpandedTab(prev => ({ ...prev, [user.id]: 'roles' }));
                                        // Load roles if not already loaded
                                        if (!userRoles[user.id]) {
                                          try {
                                            const userRolesResponse = await getUserRoles(user.id);
                                            setUserRoles(prev => ({
                                              ...prev,
                                              [user.id]: userRolesResponse.data,
                                            }));
                                            // Validate roles after loading (only if groups are loaded)
                                            if (allGroups.length > 0 && !validatingRef.current.has(user.id)) {
                                              validatingRef.current.add(user.id);
                                              requestAnimationFrame(() => {
                                                requestAnimationFrame(() => {
                                                  const errors = validateUserRoles(user.id);
                                                  setRoleValidationErrors(prev => {
                                                    const current = prev[user.id] || [];
                                                    // Only update if errors changed to prevent infinite loops
                                                    if (JSON.stringify(current.sort()) !== JSON.stringify(errors.sort())) {
                                                      return { ...prev, [user.id]: errors };
                                                    }
                                                    return prev;
                                                  });
                                                  validatingRef.current.delete(user.id);
                                                });
                                              });
                                            }
                                          } catch (err) {
                                            console.error(`Failed to load roles for user ${user.id}:`, err);
                                            setUserRoles(prev => ({ ...prev, [user.id]: [] }));
                                            setRoleValidationErrors(prev => ({ ...prev, [user.id]: [] }));
                                          }
                                        }
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                                        expandedTab[user.id] === 'roles'
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span>Roles</span>
                                      </div>
                                      {userRoles[user.id] && userRoles[user.id].length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                          {userRoles[user.id].length}
                                        </span>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setExpandedTab(prev => ({ ...prev, [user.id]: 'storage' }));
                                        // Initialize storage sections as collapsed
                                        if (!collapsedStorageSections[user.id]) {
                                          setCollapsedStorageSections(prev => ({
                                            ...prev,
                                            [user.id]: new Set(['cookies', 'localStorage', 'sessionStorage'])
                                          }));
                                        }
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                                        expandedTab[user.id] === 'storage'
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                        </svg>
                                        <span>Storage</span>
                                      </div>
                                      {storageData[user.id] && (() => {
                                        const storage = storageData[user.id];
                                        // Calculate total storage size
                                        let totalBytes = 0;
                                        
                                        // Cookies size
                                        storage.cookies.forEach(cookie => {
                                          totalBytes += (cookie.name?.length || 0) + (cookie.value?.length || 0) + (cookie.domain?.length || 0) + (cookie.path?.length || 0);
                                        });
                                        
                                        // LocalStorage size
                                        storage.localStorage.forEach(item => {
                                          totalBytes += (item.key?.length || 0) + (item.value?.length || 0);
                                        });
                                        
                                        // SessionStorage size
                                        storage.sessionStorage.forEach(item => {
                                          totalBytes += (item.key?.length || 0) + (item.value?.length || 0);
                                        });
                                        
                                        // Cache size (approximate)
                                        storage.caches.forEach(cache => {
                                          totalBytes += ('size' in cache && typeof cache.size === 'number') ? cache.size : 0;
                                        });
                                        
                                        return totalBytes > 0 ? (
                                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                            {formatBytes(totalBytes)}
                                          </span>
                                        ) : null;
                                      })()}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setExpandedTab(prev => ({ ...prev, [user.id]: 'logs' }));
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                                        expandedTab[user.id] === 'logs'
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Logs</span>
                                      </div>
                                      {(() => {
                                        const logsData = activityLogs[user.id];
                                        if (!logsData) {
                                          return null; // Not loaded yet
                                        }
                                        if (logsData.loading) {
                                          return null; // Still loading
                                        }
                                        if (logsData.logs && logsData.logs.length > 0) {
                                          const mostRecentLog = logsData.logs[0];
                                          const timeSince = formatRelativeTime(mostRecentLog.timestamp);
                                          return (
                                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                              {timeSince}
                                            </span>
                                          );
                                        }
                                        // No logs available
                                        return (
                                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400">
                                            N/A
                                          </span>
                                        );
                                      })()}
                                    </button>
                                  </div>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 p-6 min-h-[400px] max-h-[600px] overflow-y-auto overflow-x-hidden">
                                  {expandedTab[user.id] === 'info' && (
                                    <div className="space-y-4">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Information</h3>
                                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</span>
                                          <span className="text-sm text-gray-900 dark:text-white font-semibold">{user.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</span>
                                          <span className="text-sm text-gray-900 dark:text-white">{user.email}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">User ID</span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{user.id}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created At</span>
                                          <span className="text-sm text-gray-900 dark:text-white">
                                            {new Date(user.createdAt).toLocaleString()}
                                          </span>
                                        </div>
                                        {userData[user.id]?.lastActivity && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Activity</span>
                                            <span className="text-sm text-gray-900 dark:text-white">
                                              {formatRelativeTime(userData[user.id].lastActivity!)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {expandedTab[user.id] === 'sessions' && (
                                    <div className="overflow-x-hidden">
                                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <div className="flex items-center space-x-2">
                                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sessions</h3>
                                          {userMetrics?.sessions && (() => {
                                            const activeCount = userMetrics.sessions.filter(s => s.status === 'active').length;
                                            const revokedCount = userMetrics.sessions.filter(s => s.status === 'revoked' || s.status === 'expired').length;
                                            const isActiveEnabled = showActiveSessions[user.id] !== false; // Default to true
                                            const isRevokedEnabled = showRevokedSessions[user.id] === true; // Default to false
                                            
                                            return (
                                              <div className="flex items-center space-x-2">
                                                <button
                                                  onClick={() => setShowActiveSessions(prev => ({ ...prev, [user.id]: !isActiveEnabled }))}
                                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                                    isActiveEnabled
                                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                      : 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-500 opacity-60'
                                                  }`}
                                                >
                                                  Active: {activeCount}
                                                </button>
                                                <button
                                                  onClick={() => setShowRevokedSessions(prev => ({ ...prev, [user.id]: !isRevokedEnabled }))}
                                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                                    isRevokedEnabled
                                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                                      : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-500 opacity-60'
                                                  }`}
                                                >
                                                  Revoked: {revokedCount}
                                                </button>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <button
                                            onClick={() => handleOpenNewSession(user.id)}
                                            className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Open New Session</span>
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        {(() => {
                                          const sessions = userMetrics?.sessions || [];
                                          const isActiveEnabled = showActiveSessions[user.id] !== false; // Default to true
                                          const isRevokedEnabled = showRevokedSessions[user.id] === true; // Default to false
                                          
                                          const filteredSessions = sessions.filter(s => {
                                            if (s.status === 'active') return isActiveEnabled;
                                            if (s.status === 'revoked' || s.status === 'expired') return isRevokedEnabled;
                                            return false;
                                          });
                                          
                                          if (filteredSessions.length === 0) {
                                            return <p className="text-sm text-gray-500 dark:text-gray-400">No sessions found</p>;
                                          }
                                          
                                          return filteredSessions.map((session) => (
                                            <div
                                              key={session.id}
                                              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                            >
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center space-x-2 mb-2">
                                                    <span
                                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                                        session.status === 'active'
                                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                          : session.status === 'expired'
                                                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                      }`}
                                                    >
                                                      {session.status}
                                                    </span>
                                                    {session.ipAddress && (
                                                      <span className="text-sm text-gray-500 dark:text-gray-400">IP: {session.ipAddress}</span>
                                                    )}
                                                  </div>
                                                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                                    <div>Last Activity: {formatRelativeTime(session.lastActivity)}</div>
                                                    <div>Created: {new Date(session.createdAt).toLocaleString()}</div>
                                                    {session.userAgent && (
                                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={session.userAgent}>
                                                        {session.userAgent}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                {session.status === 'active' && (
                                                  <button
                                                    onClick={() => handleRevokeSession(session.id, user.id)}
                                                    className="ml-4 px-3 py-1.5 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded text-sm transition-colors"
                                                  >
                                                    Revoke
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    </div>
                                  )}

                                  {expandedTab[user.id] === 'permissions' && (
                                    <div className="overflow-x-hidden">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissions</h3>
                                      {userMetrics?.loading ? (
                                        <div className="flex items-center justify-center py-8">
                                          <LoadingSpinner size="sm" message="Loading permissions..." />
                                        </div>
                                      ) : (() => {
                                        // Group permissions by category
                                        const groupedPermissions: Record<string, Permission[]> = {};
                                        const uncategorized: Permission[] = [];

                                        allPermissions.forEach((permission) => {
                                          if (permission.category) {
                                            if (!groupedPermissions[permission.category]) {
                                              groupedPermissions[permission.category] = [];
                                            }
                                            groupedPermissions[permission.category].push(permission);
                                          } else {
                                            uncategorized.push(permission);
                                          }
                                        });

                                        const toggleCategory = (category: string) => {
                                          setCollapsedPermissionCategories((prev) => {
                                            const next = { ...prev };
                                            if (!next[user.id]) {
                                              next[user.id] = new Set();
                                            }
                                            if (next[user.id].has(category)) {
                                              next[user.id].delete(category);
                                            } else {
                                              next[user.id].add(category);
                                            }
                                            return next;
                                          });
                                        };

                                        const isCollapsed = (category: string) => {
                                          return collapsedPermissionCategories[user.id]?.has(category) || false;
                                        };

                                        return (
                                          <div className="space-y-4">
                                            {allPermissions.length === 0 ? (
                                              <p className="text-sm text-gray-500 dark:text-gray-400">No permissions available</p>
                                            ) : (
                                              <>
                                                {/* Categorized Permissions */}
                                                {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                                                  <div key={category} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                    <button
                                                      onClick={() => toggleCategory(category)}
                                                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                      <div className="flex items-center space-x-2">
                                                        <svg
                                                          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                                                            isCollapsed(category) ? '' : 'rotate-90'
                                                          }`}
                                                          fill="none"
                                                          stroke="currentColor"
                                                          viewBox="0 0 24 24"
                                                        >
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{category}</h4>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">({categoryPermissions.length})</span>
                                                      </div>
                                                    </button>
                                                    {!isCollapsed(category) && (
                                                      <div className="p-4 space-y-2">
                                                        {categoryPermissions.map((permission) => {
                                                          // Check if user has this permission (direct or via role)
                                                          const hasDirectPermission = userData[user.id]?.permissions?.some(p => p.id === permission.id) || false;
                                                          const effectivePerm = effectivePermissions[user.id]?.find(p => p.id === permission.id);
                                                          const hasEffectivePermission = !!effectivePerm;
                                                          const hasViaRole = hasEffectivePermission && effectivePerm?.source === 'role';
                                                          const roleName = effectivePerm?.roleName;
                                                          
                                                          // Checkbox should only be checked if permission is directly assigned
                                                          const isChecked = hasDirectPermission;
                                                          
                                                          // Determine card background color based on permission state
                                                          let cardBgColor = '';
                                                          if (hasDirectPermission && hasViaRole) {
                                                            cardBgColor = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
                                                          } else if (hasDirectPermission && !hasViaRole) {
                                                            cardBgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                                                          } else if (!hasDirectPermission && hasViaRole) {
                                                            cardBgColor = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
                                                          } else {
                                                            cardBgColor = 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600';
                                                          }
                                                          
                                                          const userCount = permissionUserCounts[permission.id] || 0;
                                                          
                                                          return (
                                                            <div
                                                              key={permission.id}
                                                              className={`${cardBgColor} rounded-lg p-4 relative`}
                                                            >
                                                              {/* Top right corner: Via Role badge and user count */}
                                                              <div className="absolute top-4 right-4 flex items-center space-x-2">
                                                                {hasViaRole && (
                                                                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                                                                    Via {roleName || 'Role'}
                                                                  </span>
                                                                )}
                                                                <button
                                                                  onClick={() => setShowingPermissionUsers({ permissionId: permission.id, permissionName: permission.name })}
                                                                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                                  title={`${userCount} user(s) have this permission`}
                                                                >
                                                                  {userCount}
                                                                </button>
                                                              </div>
                                                              
                                                              <div className="flex items-start justify-between pr-24">
                                                                <div className="flex-1">
                                                                  <div className="flex items-start space-x-3 mb-2">
                                                                    <input
                                                                      type="checkbox"
                                                                      checked={isChecked}
                                                                      onChange={(e) => handleTogglePermission(user.id, permission.id, e.target.checked)}
                                                                      className="mt-1 w-5 h-5 text-green-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:ring-offset-0 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-green-600 dark:checked:border-green-600 cursor-pointer transition-all checked:bg-green-600 checked:border-green-600"
                                                                    />
                                                                    <div className="flex-1">
                                                                      <div className="flex items-center flex-wrap gap-2 mb-1">
                                                                        <span className="font-medium text-gray-900 dark:text-white">{permission.name}</span>
                                                                        {permission.resources.map((resource, idx) => (
                                                                          <span
                                                                            key={idx}
                                                                            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium"
                                                                          >
                                                                            {resource}
                                                                          </span>
                                                                        ))}
                                                                        {permission.actions.map((action, idx) => (
                                                                          <span
                                                                            key={idx}
                                                                            className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium"
                                                                          >
                                                                            {action}
                                                                          </span>
                                                                        ))}
                                                                      </div>
                                                                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{permission.description}</div>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}

                                                {/* Uncategorized Permissions */}
                                                {uncategorized.length > 0 && (
                                                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                    <button
                                                      onClick={() => toggleCategory('uncategorized')}
                                                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                      <div className="flex items-center space-x-2">
                                                        <svg
                                                          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                                                            isCollapsed('uncategorized') ? '' : 'rotate-90'
                                                          }`}
                                                          fill="none"
                                                          stroke="currentColor"
                                                          viewBox="0 0 24 24"
                                                        >
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Uncategorized</h4>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">({uncategorized.length})</span>
                                                      </div>
                                                    </button>
                                                    {!isCollapsed('uncategorized') && (
                                                      <div className="p-4 space-y-2">
                                                        {uncategorized.map((permission) => {
                                                          // Check if user has this permission (direct or via role)
                                                          const hasDirectPermission = userData[user.id]?.permissions?.some(p => p.id === permission.id) || false;
                                                          const effectivePerm = effectivePermissions[user.id]?.find(p => p.id === permission.id);
                                                          const hasEffectivePermission = !!effectivePerm;
                                                          const hasViaRole = hasEffectivePermission && effectivePerm?.source === 'role';
                                                          const roleName = effectivePerm?.roleName;
                                                          
                                                          // Checkbox should only be checked if permission is directly assigned
                                                          const isChecked = hasDirectPermission;
                                                          
                                                          // Determine card background color based on permission state
                                                          let cardBgColor = '';
                                                          if (hasDirectPermission && hasViaRole) {
                                                            cardBgColor = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
                                                          } else if (hasDirectPermission && !hasViaRole) {
                                                            cardBgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                                                          } else if (!hasDirectPermission && hasViaRole) {
                                                            cardBgColor = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
                                                          } else {
                                                            cardBgColor = 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600';
                                                          }
                                                          
                                                          const userCount = permissionUserCounts[permission.id] || 0;
                                                          
                                                          return (
                                                            <div
                                                              key={permission.id}
                                                              className={`${cardBgColor} rounded-lg p-4 relative`}
                                                            >
                                                              {/* Top right corner: Via Role badge and user count */}
                                                              <div className="absolute top-4 right-4 flex items-center space-x-2">
                                                                {hasViaRole && (
                                                                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                                                                    Via {roleName || 'Role'}
                                                                  </span>
                                                                )}
                                                                <button
                                                                  onClick={() => setShowingPermissionUsers({ permissionId: permission.id, permissionName: permission.name })}
                                                                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                                  title={`${userCount} user(s) have this permission`}
                                                                >
                                                                  {userCount}
                                                                </button>
                                                              </div>
                                                              
                                                              <div className="flex items-start justify-between pr-24">
                                                                <div className="flex-1">
                                                                  <div className="flex items-start space-x-3 mb-2">
                                                                    <input
                                                                      type="checkbox"
                                                                      checked={isChecked}
                                                                      onChange={(e) => handleTogglePermission(user.id, permission.id, e.target.checked)}
                                                                      className="mt-1 w-5 h-5 text-green-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:ring-offset-0 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-green-600 dark:checked:border-green-600 cursor-pointer transition-all checked:bg-green-600 checked:border-green-600"
                                                                    />
                                                                    <div className="flex-1">
                                                                      <div className="flex items-center flex-wrap gap-2 mb-1">
                                                                        <span className="font-medium text-gray-900 dark:text-white">{permission.name}</span>
                                                                        {permission.resources.map((resource, idx) => (
                                                                          <span
                                                                            key={idx}
                                                                            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium"
                                                                          >
                                                                            {resource}
                                                                          </span>
                                                                        ))}
                                                                        {permission.actions.map((action, idx) => (
                                                                          <span
                                                                            key={idx}
                                                                            className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium"
                                                                          >
                                                                            {action}
                                                                          </span>
                                                                        ))}
                                                                      </div>
                                                                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{permission.description}</div>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {expandedTab[user.id] === 'roles' && (
                                    <div className="overflow-x-hidden">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Roles</h3>
                                        {userRoles[user.id] && userRoles[user.id].length > 0 && (
                                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                            {userRoles[user.id].length} assigned
                                          </span>
                                        )}
                                      </div>

                                      {/* Validation Errors */}
                                      {roleValidationErrors[user.id] && roleValidationErrors[user.id].length > 0 && (
                                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                          <div className="flex items-start space-x-2">
                                            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="flex-1">
                                              <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">Validation Errors:</h4>
                                              <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-400">
                                                {roleValidationErrors[user.id].map((error, idx) => (
                                                  <li key={idx}>{error}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Current Roles Summary */}
                                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <div className="flex items-center flex-wrap gap-2">
                                          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Current Roles:</span>
                                          {userRoles[user.id] && userRoles[user.id].length > 0 ? (
                                            userRoles[user.id].map((role) => (
                                              <span
                                                key={role.id}
                                                className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-xs font-medium flex items-center space-x-1"
                                              >
                                                <span>{role.displayName}</span>
                                                {role.group && allGroups.find((g) => g.id === role.group?.id)?.defaultRole?.id === role.id && (
                                                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium ml-1">
                                                    Default
                                                  </span>
                                                )}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-sm text-gray-500 dark:text-gray-400 italic">No roles assigned</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Search */}
                                      <div className="mb-4">
                                        <input
                                          type="text"
                                          value={roleSearch[user.id] || ''}
                                          onChange={(e) => setRoleSearch(prev => ({ ...prev, [user.id]: e.target.value }))}
                                          placeholder="Search roles..."
                                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                      </div>

                                      {/* Groups List */}
                                      <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {allGroups.length === 0 ? (
                                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No groups available</p>
                                        ) : (() => {
                                          const searchTerm = (roleSearch[user.id] || '').toLowerCase();
                                          
                                          // Filter groups and their roles by search term
                                          const filteredGroups = allGroups
                                            .map(group => {
                                              const rolesInGroup = allRoles.filter(role => role.group?.id === group.id);
                                              const filteredRolesInGroup = rolesInGroup.filter(role =>
                                                role.displayName.toLowerCase().includes(searchTerm) ||
                                                role.name.toLowerCase().includes(searchTerm) ||
                                                (role.description && role.description.toLowerCase().includes(searchTerm)) ||
                                                group.displayName.toLowerCase().includes(searchTerm) ||
                                                group.name.toLowerCase().includes(searchTerm)
                                              );
                                              
                                              return {
                                                group,
                                                roles: filteredRolesInGroup,
                                              };
                                            })
                                            .filter(({ roles }) => roles.length > 0 || searchTerm === '');

                                          if (filteredGroups.length === 0) {
                                            return (
                                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                                No groups match your search
                                              </p>
                                            );
                                          }

                                          return filteredGroups.map(({ group, roles }) => {
                                            const userRoleList = userRoles[user.id] || [];
                                            const rolesInGroup = userRoleList.filter((r) => r.group?.id === group.id);
                                            const isCollapsed = collapsedGroups[user.id]?.has(group.id) || false;
                                            const isValid = group.requiresOne 
                                              ? rolesInGroup.length === 1 
                                              : true;
                                            const hasError = group.requiresOne && rolesInGroup.length !== 1;

                                            return (
                                              <div
                                                key={group.id}
                                                className={`border rounded-lg overflow-hidden ${
                                                  hasError
                                                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                                                    : isValid && group.requiresOne
                                                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                                }`}
                                              >
                                                {/* Group Header */}
                                                <button
                                                  onClick={() => {
                                                    setCollapsedGroups(prev => {
                                                      const groups = prev[user.id] || new Set();
                                                      const updated = new Set(groups);
                                                      if (isCollapsed) {
                                                        updated.delete(group.id);
                                                      } else {
                                                        updated.add(group.id);
                                                      }
                                                      return { ...prev, [user.id]: updated };
                                                    });
                                                  }}
                                                  className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                  <div className="flex items-center space-x-3 flex-1">
                                                    <svg
                                                      className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                    <div className="flex-1 text-left">
                                                      <div className="flex items-center space-x-2">
                                                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                                          {group.displayName}
                                                        </span>
                                                        {group.requiresOne && (
                                                          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                                                            Requires One
                                                          </span>
                                                        )}
                                                      </div>
                                                      {group.description && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                          {group.description}
                                                        </p>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                      {hasError && (
                                                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                      )}
                                                      {isValid && group.requiresOne && (
                                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                      )}
                                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {rolesInGroup.length} / {roles.length}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </button>

                                                {/* Group Roles */}
                                                {!isCollapsed && (
                                                  <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
                                                    {roles.length === 0 ? (
                                                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                                        No roles in this group
                                                      </p>
                                                    ) : (
                                                      roles.map((role) => {
                                                        const hasRole = userRoleList.some((r) => r.id === role.id);
                                                        const isUpdating = updatingRoles[user.id]?.has(role.id) || false;

                                                        return (
                                                          <label
                                                            key={role.id}
                                                            className={`relative flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                              hasRole
                                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                            } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                                          >
                                                            <div className="flex-shrink-0 mt-0.5">
                                                              <input
                                                                type="checkbox"
                                                                checked={hasRole}
                                                                onChange={() => handleToggleRole(user.id, role.id)}
                                                                disabled={isUpdating}
                                                                className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 cursor-pointer disabled:cursor-wait disabled:opacity-50 transition-all checked:bg-blue-600 checked:border-blue-600"
                                                              />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                              <div className="flex items-start justify-between mb-1.5">
                                                                <div className="flex items-center space-x-2 flex-1">
                                                                  <span className={`font-semibold text-sm ${hasRole ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-white'}`}>
                                                                    {role.displayName}
                                                                  </span>
                                                                  {group.defaultRole?.id === role.id && (
                                                                    <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                                                                      Default
                                                                    </span>
                                                                  )}
                                                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                    {role.id}
                                                                  </span>
                                                                  {isUpdating && (
                                                                    <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                  )}
                                                                </div>
                                                                <div className="flex items-center space-x-2 flex-shrink-0">
                                                                  <button
                                                                    onClick={(e) => {
                                                                      e.preventDefault();
                                                                      e.stopPropagation();
                                                                      setShowingRoleUsers({ roleId: role.id, roleName: role.displayName });
                                                                    }}
                                                                    className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                                    title="View users with this role"
                                                                  >
                                                                    <span>{roleUserCounts[role.id] ?? '...'}</span>
                                                                    <span className="text-gray-500 dark:text-gray-400">users</span>
                                                                  </button>
                                                                </div>
                                                              </div>
                                                              {role.description && (
                                                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1.5">
                                                                  {role.description}
                                                                </div>
                                                              )}
                                                            </div>
                                                          </label>
                                                        );
                                                      })
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  )}

                                  {expandedTab[user.id] === 'storage' && (
                                    <div className="overflow-x-hidden">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storage</h3>
                                      <div className="space-y-4">
                                        {/* Cookies */}
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                          <button
                                            onClick={() => {
                                              const isCollapsed = collapsedStorageSections[user.id]?.has('cookies') || false;
                                              setCollapsedStorageSections(prev => {
                                                const sections = prev[user.id] || new Set();
                                                if (isCollapsed) {
                                                  sections.delete('cookies');
                                                } else {
                                                  sections.add('cookies');
                                                }
                                                return { ...prev, [user.id]: new Set(sections) };
                                              });
                                            }}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                          >
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cookies ({storageData[user.id]?.cookies.length || 0})</h4>
                                            <svg
                                              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${collapsedStorageSections[user.id]?.has('cookies') ? '' : 'rotate-180'}`}
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                          {collapsedStorageSections[user.id]?.has('cookies') !== true && (
                                            <div className="p-3 space-y-2 max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                                            {storageData[user.id]?.cookies.length === 0 ? (
                                              <p className="text-sm text-gray-500 dark:text-gray-400">No cookies</p>
                                            ) : (
                                              storageData[user.id]?.cookies.map((cookie, idx) => (
                                                <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-sm flex items-center justify-between">
                                                  <span className="font-mono text-xs">{cookie.name}: {cookie.value}</span>
                                                  <button
                                                    onClick={() => {
                                                      deleteCookie(cookie.name);
                                                      loadStorageData(user.id);
                                                    }}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Local Storage */}
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                          <button
                                            onClick={() => {
                                              const isCollapsed = collapsedStorageSections[user.id]?.has('localStorage') || false;
                                              setCollapsedStorageSections(prev => {
                                                const sections = prev[user.id] || new Set();
                                                if (isCollapsed) {
                                                  sections.delete('localStorage');
                                                } else {
                                                  sections.add('localStorage');
                                                }
                                                return { ...prev, [user.id]: new Set(sections) };
                                              });
                                            }}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                          >
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Local Storage ({storageData[user.id]?.localStorage.length || 0})</h4>
                                            <svg
                                              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${collapsedStorageSections[user.id]?.has('localStorage') ? '' : 'rotate-180'}`}
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                          {collapsedStorageSections[user.id]?.has('localStorage') !== true && (
                                            <div className="p-3 space-y-2 max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                                            {storageData[user.id]?.localStorage.length === 0 ? (
                                              <p className="text-sm text-gray-500 dark:text-gray-400">No local storage items</p>
                                            ) : (
                                              storageData[user.id]?.localStorage.map((item, idx) => (
                                                <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-sm flex items-center justify-between">
                                                  <span className="font-mono text-xs">{item.key}: {formatJSON(item.value)} ({formatBytes(item.size)})</span>
                                                  <button
                                                    onClick={() => {
                                                      deleteLocalStorageItem(item.key);
                                                      loadStorageData(user.id);
                                                    }}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Session Storage */}
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                          <button
                                            onClick={() => {
                                              const isCollapsed = collapsedStorageSections[user.id]?.has('sessionStorage') || false;
                                              setCollapsedStorageSections(prev => {
                                                const sections = prev[user.id] || new Set();
                                                if (isCollapsed) {
                                                  sections.delete('sessionStorage');
                                                } else {
                                                  sections.add('sessionStorage');
                                                }
                                                return { ...prev, [user.id]: new Set(sections) };
                                              });
                                            }}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                          >
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Session Storage ({storageData[user.id]?.sessionStorage.length || 0})</h4>
                                            <svg
                                              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${collapsedStorageSections[user.id]?.has('sessionStorage') ? '' : 'rotate-180'}`}
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                          {collapsedStorageSections[user.id]?.has('sessionStorage') !== true && (
                                            <div className="p-3 space-y-2 max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                                            {storageData[user.id]?.sessionStorage.length === 0 ? (
                                              <p className="text-sm text-gray-500 dark:text-gray-400">No session storage items</p>
                                            ) : (
                                              storageData[user.id]?.sessionStorage.map((item, idx) => (
                                                <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-sm flex items-center justify-between">
                                                  <span className="font-mono text-xs">{item.key}: {formatJSON(item.value)} ({formatBytes(item.size)})</span>
                                                  <button
                                                    onClick={() => {
                                                      deleteSessionStorageItem(item.key);
                                                      loadStorageData(user.id);
                                                    }}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {expandedTab[user.id] === 'logs' && (
                                    <div className="overflow-x-hidden">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Logs</h3>
                                      
                                      {/* Search and Filters */}
                                      <div className="mb-4 space-y-3">
                                        <div className="flex items-center space-x-3">
                                          <input
                                            type="text"
                                            value={logsSearch[user.id] || ''}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setLogsSearch(prev => ({ ...prev, [user.id]: value }));
                                              
                                              // Clear existing timeout
                                              if (searchTimeout[user.id]) {
                                                clearTimeout(searchTimeout[user.id]);
                                              }
                                              
                                              // Set new timeout for debounced search
                                              const timeoutId = setTimeout(() => {
                                                loadActivityLogs(user.id, 1);
                                              }, 500);
                                              
                                              setSearchTimeout(prev => ({ ...prev, [user.id]: timeoutId }));
                                            }}
                                            placeholder="Search logs by action, path, IP, user agent..."
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                          />
                                          <button
                                            onClick={() => setShowLogsFilters(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                                              (logsDateRange[user.id]?.startDate || logsDateRange[user.id]?.endDate || Object.keys(logsPropertyFilters[user.id] || {}).length > 0)
                                                ? 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            }`}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                            </svg>
                                            <span>Filters</span>
                                            {((logsDateRange[user.id]?.startDate || logsDateRange[user.id]?.endDate) || Object.keys(logsPropertyFilters[user.id] || {}).length > 0) && (
                                              <span className="ml-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                                                {[
                                                  logsDateRange[user.id]?.startDate ? '1' : '',
                                                  logsDateRange[user.id]?.endDate ? '1' : '',
                                                  Object.keys(logsPropertyFilters[user.id] || {}).length > 0 ? String(Object.keys(logsPropertyFilters[user.id] || {}).length) : ''
                                                ].filter(Boolean).length}
                                              </span>
                                            )}
                                          </button>
                                        </div>
                                        
                                        {/* Filters Modal */}
                                        {showLogsFilters[user.id] && (
                                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg">
                                            <div className="flex items-center justify-between mb-4">
                                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Filter Logs</h4>
                                              <button
                                                onClick={() => setShowLogsFilters(prev => ({ ...prev, [user.id]: false }))}
                                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                              >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            </div>
                                            
                                            <div className="space-y-4">
                                              {/* Date Range */}
                                              <div>
                                                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</h5>
                                                <div className="flex items-center space-x-3">
                                                  <label className="flex flex-col space-y-1 text-sm flex-1">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">Start Date</span>
                                                    <input
                                                      type="date"
                                                      value={logsDateRange[user.id]?.startDate || ''}
                                                      onChange={(e) => {
                                                        setLogsDateRange(prev => ({
                                                          ...prev,
                                                          [user.id]: {
                                                            ...prev[user.id],
                                                            startDate: e.target.value || undefined,
                                                          }
                                                        }));
                                                        loadActivityLogs(user.id, 1);
                                                      }}
                                                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                    />
                                                  </label>
                                                  <label className="flex flex-col space-y-1 text-sm flex-1">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">End Date</span>
                                                    <input
                                                      type="date"
                                                      value={logsDateRange[user.id]?.endDate || ''}
                                                      onChange={(e) => {
                                                        setLogsDateRange(prev => ({
                                                          ...prev,
                                                          [user.id]: {
                                                            ...prev[user.id],
                                                            endDate: e.target.value || undefined,
                                                          }
                                                        }));
                                                        loadActivityLogs(user.id, 1);
                                                      }}
                                                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                    />
                                                  </label>
                                                </div>
                                              </div>
                                              
                                              {/* Property Filters */}
                                              <div>
                                                <div className="flex items-center justify-between mb-2">
                                                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">Property Filters</h5>
                                                  <button
                                                    onClick={() => {
                                                      const newKey = `filter_${Date.now()}`;
                                                      setLogsPropertyFilters(prev => ({
                                                        ...prev,
                                                        [user.id]: {
                                                          ...(prev[user.id] || {}),
                                                          [newKey]: '',
                                                        }
                                                      }));
                                                    }}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                  >
                                                    + Add Filter
                                                  </button>
                                                </div>
                                                <div className="space-y-2">
                                                  {Object.entries(logsPropertyFilters[user.id] || {}).map(([key, value]) => (
                                                    <div key={key} className="flex items-center space-x-2">
                                                      <input
                                                        type="text"
                                                        placeholder="Property name (e.g., action, method, path)"
                                                        value={value}
                                                        onChange={(e) => {
                                                          setLogsPropertyFilters(prev => ({
                                                            ...prev,
                                                            [user.id]: {
                                                              ...(prev[user.id] || {}),
                                                              [key]: e.target.value,
                                                            }
                                                          }));
                                                        }}
                                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                      />
                                                      <button
                                                        onClick={() => {
                                                          setLogsPropertyFilters(prev => {
                                                            const filters = { ...(prev[user.id] || {}) };
                                                            delete filters[key];
                                                            return {
                                                              ...prev,
                                                              [user.id]: filters,
                                                            };
                                                          });
                                                        }}
                                                        className="px-2 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                      >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                      </button>
                                                    </div>
                                                  ))}
                                                  {Object.keys(logsPropertyFilters[user.id] || {}).length === 0 && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">No property filters added</p>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Clear All Filters */}
                                              {((logsDateRange[user.id]?.startDate || logsDateRange[user.id]?.endDate) || Object.keys(logsPropertyFilters[user.id] || {}).length > 0) && (
                                                <button
                                                  onClick={() => {
                                                    setLogsDateRange(prev => ({
                                                      ...prev,
                                                      [user.id]: { startDate: undefined, endDate: undefined }
                                                    }));
                                                    setLogsPropertyFilters(prev => ({
                                                      ...prev,
                                                      [user.id]: {},
                                                    }));
                                                    loadActivityLogs(user.id, 1);
                                                  }}
                                                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                                >
                                                  Clear All Filters
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Logs List */}
                                      <div className="space-y-3">
                                        {activityLogs[user.id]?.loading ? (
                                          <div className="flex items-center justify-center py-8">
                                            <LoadingSpinner size="sm" />
                                          </div>
                                        ) : activityLogs[user.id]?.error ? (
                                          <ErrorDisplay error={activityLogs[user.id].error} />
                                        ) : (() => {
                                          const logs = activityLogs[user.id]?.logs || [];
                                          const searchTerm = (logsSearch[user.id] || '').toLowerCase();
                                          
                                          const filteredLogs = logs.filter(log => {
                                            // Search filter
                                            if (searchTerm && !(
                                              log.action.toLowerCase().includes(searchTerm) ||
                                              log.method.toLowerCase().includes(searchTerm) ||
                                              log.path.toLowerCase().includes(searchTerm) ||
                                              log.ipAddress?.toLowerCase().includes(searchTerm) ||
                                              log.userAgent?.toLowerCase().includes(searchTerm) ||
                                              formatRelativeTime(log.timestamp).toLowerCase().includes(searchTerm) ||
                                              JSON.stringify(log.details).toLowerCase().includes(searchTerm)
                                            )) {
                                              return false;
                                            }
                                            
                                            // Property filters
                                            const propertyFilters = logsPropertyFilters[user.id] || {};
                                            for (const propertyName of Object.values(propertyFilters)) {
                                              if (!propertyName.trim()) continue;
                                              
                                              const propertyValue = (log as any)[propertyName];
                                              if (propertyValue === undefined || propertyValue === null) {
                                                return false;
                                              }
                                              
                                              const valueStr = String(propertyValue).toLowerCase();
                                              if (!valueStr.includes(searchTerm.toLowerCase()) && searchTerm) {
                                                // If search term doesn't match this property, continue checking
                                                continue;
                                              }
                                            }
                                            
                                            return true;
                                          });

                                          if (filteredLogs.length === 0) {
                                            return <p className="text-sm text-gray-500 dark:text-gray-400">No activity logs found</p>;
                                          }

                                          return (
                                            <>
                                              {filteredLogs.map((log) => {
                                                const isExpanded = expandedLogs[user.id]?.has(log.id) || false;
                                                return (
                                                  <div
                                                    key={log.id}
                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                                                  >
                                                    <div className="p-4">
                                                      <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                          <div className="flex items-center space-x-2 mb-2">
                                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                                              {log.method}
                                                            </span>
                                                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                                                              {log.action}
                                                            </span>
                                                            {log.ipAddress && (
                                                              <span className="text-sm text-gray-500 dark:text-gray-400">IP: {log.ipAddress}</span>
                                                            )}
                                                          </div>
                                                          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                                            <div><span className="font-medium">Path:</span> {log.path}</div>
                                                            <div><span className="font-medium">Time:</span> {formatRelativeTime(log.timestamp)} ({new Date(log.timestamp).toLocaleString()})</div>
                                                            {log.userAgent && (
                                                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={log.userAgent}>
                                                                <span className="font-medium">User Agent:</span> {log.userAgent}
                                                              </div>
                                                            )}
                                                            {log.requestId && (
                                                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                <span className="font-medium">Request ID:</span> {log.requestId}
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <button
                                                          onClick={() => {
                                                            setExpandedLogs(prev => {
                                                              const expanded = prev[user.id] || new Set();
                                                              if (isExpanded) {
                                                                expanded.delete(log.id);
                                                              } else {
                                                                expanded.add(log.id);
                                                              }
                                                              return { ...prev, [user.id]: new Set(expanded) };
                                                            });
                                                          }}
                                                          className="ml-4 px-3 py-1.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center space-x-1"
                                                        >
                                                          <span>{isExpanded ? 'Hide' : 'Show'} Details</span>
                                                          <svg
                                                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                          >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                          </svg>
                                                        </button>
                                                      </div>
                                                    </div>
                                                    {isExpanded && (
                                                      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
                                                        {/* Request Details */}
                                                        <div>
                                                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Request Details</h5>
                                                          <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs space-y-1">
                                                            <div><span className="font-medium">Method:</span> {log.method}</div>
                                                            <div><span className="font-medium">Path:</span> {log.path}</div>
                                                            {log.ipAddress && (
                                                              <div><span className="font-medium">IP Address:</span> {log.ipAddress}</div>
                                                            )}
                                                            {log.userAgent && (
                                                              <div><span className="font-medium">User Agent:</span> {log.userAgent}</div>
                                                            )}
                                                            {log.requestId && (
                                                              <div><span className="font-medium">Request ID:</span> <span className="font-mono">{log.requestId}</span></div>
                                                            )}
                                                          </div>
                                                        </div>
                                                        
                                                        {/* Response Details */}
                                                        <div>
                                                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Response Details</h5>
                                                          <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs space-y-1">
                                                            <div><span className="font-medium">Status:</span> {log.details.statusCode ? String(log.details.statusCode) : 'N/A'}</div>
                                                            {(() => {
                                                              const responseTime = 'responseTime' in log.details ? log.details.responseTime : null;
                                                              return responseTime ? (
                                                                <div><span className="font-medium">Response Time:</span> {String(responseTime)}ms</div>
                                                              ) : null;
                                                            })()}
                                                            {(() => {
                                                              const responseSize = 'responseSize' in log.details ? log.details.responseSize : null;
                                                              return responseSize ? (
                                                                <div><span className="font-medium">Response Size:</span> {formatBytes(Number(responseSize))}</div>
                                                              ) : null;
                                                            })()}
                                                          </div>
                                                        </div>
                                                        
                                                        {/* Additional Details */}
                                                        {Object.keys(log.details).length > 0 && (
                                                          <div>
                                                            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Additional Details</h5>
                                                            <pre className="bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto text-xs text-gray-900 dark:text-gray-100 font-mono">
                                                              {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                          </div>
                                                        )}
                                                        
                                                        {/* Analytics */}
                                                        <div>
                                                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Analytics</h5>
                                                          <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs space-y-1">
                                                            <div><span className="font-medium">Timestamp:</span> {new Date(log.timestamp).toLocaleString()}</div>
                                                            <div><span className="font-medium">Relative Time:</span> {formatRelativeTime(log.timestamp)}</div>
                                                            <div><span className="font-medium">User ID:</span> <span className="font-mono">{log.userId}</span></div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}

                                              {/* Pagination */}
                                              {activityLogs[user.id]?.pagination && activityLogs[user.id].pagination!.totalPages > 1 && (
                                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                                    Showing {((logsPage[user.id] || 1) - 1) * 50 + 1} to{' '}
                                                    {Math.min((logsPage[user.id] || 1) * 50, activityLogs[user.id].pagination!.total)} of {activityLogs[user.id].pagination!.total} logs
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                    <button
                                                      onClick={() => loadActivityLogs(user.id, (logsPage[user.id] || 1) - 1)}
                                                      disabled={!activityLogs[user.id].pagination!.hasPrevPage}
                                                      className={`px-3 py-1 rounded-md text-sm ${
                                                        activityLogs[user.id].pagination!.hasPrevPage
                                                          ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                      }`}
                                                    >
                                                      Previous
                                                    </button>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                      Page {logsPage[user.id] || 1} of {activityLogs[user.id].pagination!.totalPages}
                                                    </span>
                                                    <button
                                                      onClick={() => loadActivityLogs(user.id, (logsPage[user.id] || 1) + 1)}
                                                      disabled={!activityLogs[user.id].pagination!.hasNextPage}
                                                      className={`px-3 py-1 rounded-md text-sm ${
                                                        activityLogs[user.id].pagination!.hasNextPage
                                                          ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                      }`}
                                                    >
                                                      Next
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrevPage}
              className={`px-4 py-2 rounded-md ${
                pagination.hasPrevPage
                  ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNextPage}
              className={`px-4 py-2 rounded-md ${
                pagination.hasNextPage
                  ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Role Users Modal */}
      <AnimatePresence>
        {showingRoleUsers && (
          <RoleUsersListModal
            roleId={showingRoleUsers.roleId}
            roleName={showingRoleUsers.roleName}
            onClose={() => setShowingRoleUsers(null)}
          />
        )}
        {showingPermissionUsers && (
          <PermissionUsersListModal
            permissionId={showingPermissionUsers.permissionId}
            permissionName={showingPermissionUsers.permissionName}
            onClose={() => setShowingPermissionUsers(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}