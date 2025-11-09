import { api } from './api';

/**
 * Check if we're in development mode
 * Admin functions should only be called in development
 */
function ensureDevelopment(): void {
  if (!import.meta.env.DEV) {
    throw new Error('Admin functions are only available in development environment');
  }
}

/**
 * User data structure from admin API
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * Pagination data structure
 */
export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Users list response
 */
export interface UsersListResponse {
  data: AdminUser[];
  pagination: PaginationData;
}

/**
 * User details response
 */
export interface UserDetailsResponse {
  data: AdminUser & {
    permissions?: Array<{
      _id: string;
      name: string;
      description: string;
      resources: string[];
      actions: string[];
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

/**
 * Session data structure
 */
export interface Session {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  revoked: boolean;
  status: 'active' | 'expired' | 'revoked';
}

/**
 * Sessions list response
 */
export interface SessionsListResponse {
  data: Session[];
  pagination: PaginationData;
}

/**
 * Permission data structure
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resources: string[];
  actions: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Permissions list response
 */
export interface PermissionsListResponse {
  data: Permission[];
  pagination: PaginationData;
}

/**
 * Feature Flag data structure
 */
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Feature Flags list response
 */
export interface FeatureFlagsListResponse {
  data: FeatureFlag[];
  pagination: PaginationData;
}

/**
 * Database connection status
 */
export interface DatabaseConnection {
  status: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';
  state: number;
  database: string;
}

/**
 * Collection counts
 */
export interface CollectionCounts {
  [collectionName: string]: number;
}

/**
 * Collections data
 */
export interface CollectionsData {
  names: string[];
  counts: CollectionCounts;
  total: number;
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  dataSize: number;
  storageSize: number;
  indexes: number;
  indexSize: number;
  collections: number;
}

/**
 * Database stats response
 */
export interface DatabaseStatsResponse {
  data: {
    connection: DatabaseConnection;
    collections: CollectionsData;
    stats: DatabaseStats | null;
  };
}

/**
 * Update user request body
 */
export interface UpdateUserRequest {
  email?: string;
  name?: string;
}

/**
 * Update user response
 */
export interface UpdateUserResponse {
  data: AdminUser;
}

/**
 * Change password request body
 */
export interface ChangePasswordRequest {
  password: string;
}

/**
 * Change password response
 */
export interface ChangePasswordResponse {
  message: string;
}

/**
 * Delete user response
 */
export interface DeleteUserResponse {
  message: string;
}

/**
 * Revoke session response
 */
export interface RevokeSessionResponse {
  message: string;
}

/**
 * Create permission request body
 */
export interface CreatePermissionRequest {
  name: string;
  description: string;
  resources: string[];
  actions: string[];
}

/**
 * Update permission request body
 */
export interface UpdatePermissionRequest {
  description?: string;
  resources?: string[];
  actions?: string[];
}

/**
 * Create feature flag request body
 */
export interface CreateFeatureFlagRequest {
  name: string;
  description: string;
  enabled?: boolean;
}

/**
 * Update feature flag request body
 */
export interface UpdateFeatureFlagRequest {
  description?: string;
  enabled?: boolean;
}

/**
 * Assign permissions to user request body
 */
export interface AssignPermissionsRequest {
  permissionIds: string[];
}

/**
 * Get users list with pagination and search
 */
export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<UsersListResponse> {
  ensureDevelopment();
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) {
    params.append('search', search);
  }

  const response = await api.get<{ data: Array<{ _id: string; email: string; name: string; createdAt: string }>; pagination: PaginationData }>(`/admin/users?${params.toString()}`);
  
  // Transform MongoDB _id to id
  const transformedData: UsersListResponse = {
    data: response.data.data.map((user) => ({
      id: user._id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    })),
    pagination: response.data.pagination,
  };
  
  return transformedData;
}

/**
 * Get user details by ID
 */
export async function getUserById(id: string): Promise<UserDetailsResponse> {
  ensureDevelopment();
  
  const response = await api.get<{ 
    data: { 
      _id: string; 
      email: string; 
      name: string; 
      createdAt: string;
      permissions?: Array<{
        _id: string;
        name: string;
        description: string;
        resources: string[];
        actions: string[];
        createdAt: string;
        updatedAt: string;
      }>;
    } 
  }>(`/admin/users/${id}`);
  
  // Transform MongoDB _id to id
  const transformedData: UserDetailsResponse = {
    data: {
      id: response.data.data._id,
      email: response.data.data.email,
      name: response.data.data.name,
      createdAt: response.data.data.createdAt,
      permissions: response.data.data.permissions?.map(p => ({
        _id: p._id,
        name: p.name,
        description: p.description,
        resources: p.resources,
        actions: p.actions,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    },
  };
  
  return transformedData;
}

/**
 * Get sessions list with filtering and pagination
 */
export async function getSessions(
  userId?: string,
  status: string = 'active',
  page: number = 1,
  limit: number = 20
): Promise<SessionsListResponse> {
  ensureDevelopment();
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    status,
  });

  if (userId) {
    params.append('userId', userId);
  }

  const response = await api.get<{ data: Session[]; pagination: PaginationData }>(`/admin/sessions?${params.toString()}`);
  return response.data;
}

/**
 * Revoke a session by ID
 */
export async function revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
  ensureDevelopment();
  
  const response = await api.delete<RevokeSessionResponse>(`/admin/sessions/${sessionId}`);
  return response.data;
}

/**
 * Get permissions list with pagination
 */
export async function getPermissions(
  page: number = 1,
  limit: number = 20
): Promise<PermissionsListResponse> {
  ensureDevelopment();
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await api.get<{ data: Array<{ _id: string; name: string; description: string; resources: string[]; actions: string[]; createdAt: string; updatedAt: string }>; pagination: PaginationData }>(`/admin/permissions?${params.toString()}`);
  
  // Transform MongoDB _id to id
  const transformedData: PermissionsListResponse = {
    data: response.data.data.map((permission) => ({
      id: permission._id,
      name: permission.name,
      description: permission.description,
      resources: permission.resources,
      actions: permission.actions,
      category: (permission as any).category,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    })),
    pagination: response.data.pagination,
  };
  
  return transformedData;
}

/**
 * Create a new permission
 */
export async function createPermission(
  data: CreatePermissionRequest
): Promise<{ data: Permission }> {
  ensureDevelopment();
  
  const response = await api.post<{ data: { _id: string; name: string; description: string; resources: string[]; actions: string[]; createdAt: string; updatedAt: string } }>('/admin/permissions', data);
  
  return {
    data: {
      id: response.data.data._id,
      name: response.data.data.name,
      description: response.data.data.description,
      resources: response.data.data.resources,
      actions: response.data.data.actions,
      createdAt: response.data.data.createdAt,
      updatedAt: response.data.data.updatedAt,
    },
  };
}

/**
 * Get a single permission by ID
 */
export async function getPermission(id: string): Promise<Permission> {
  ensureDevelopment();
  
  const response = await api.get<{ data: { _id: string; name: string; description: string; resources: string[]; actions: string[]; createdAt: string; updatedAt: string } }>(`/admin/permissions/${id}`);
  
  return {
    id: response.data.data._id,
    name: response.data.data.name,
    description: response.data.data.description,
    resources: response.data.data.resources,
    actions: response.data.data.actions,
    createdAt: response.data.data.createdAt,
    updatedAt: response.data.data.updatedAt,
  };
}

/**
 * Update a permission
 */
export async function updatePermission(
  id: string,
  data: UpdatePermissionRequest
): Promise<{ data: Permission }> {
  ensureDevelopment();
  
  const response = await api.patch<{ data: { _id: string; name: string; description: string; resources: string[]; actions: string[]; createdAt: string; updatedAt: string } }>(`/admin/permissions/${id}`, data);
  
  return {
    data: {
      id: response.data.data._id,
      name: response.data.data.name,
      description: response.data.data.description,
      resources: response.data.data.resources,
      actions: response.data.data.actions,
      createdAt: response.data.data.createdAt,
      updatedAt: response.data.data.updatedAt,
    },
  };
}

/**
 * Delete a permission
 */
export async function deletePermission(id: string): Promise<{ message: string }> {
  ensureDevelopment();
  
  const response = await api.delete<{ message: string }>(`/admin/permissions/${id}`);
  return response.data;
}

/**
 * Assign permissions to a user
 */
export async function assignPermissionsToUser(
  userId: string,
  permissionIds: string[]
): Promise<{ message: string; data: AdminUser }> {
  ensureDevelopment();
  
  const response = await api.post<{ message: string; data: { _id: string; email: string; name: string; createdAt: string } }>(`/admin/users/${userId}/permissions`, {
    permissionIds,
  });
  
  return {
    message: response.data.message,
    data: {
      id: response.data.data._id,
      email: response.data.data.email,
      name: response.data.data.name,
      createdAt: response.data.data.createdAt,
    },
  };
}

/**
 * Remove a permission from a user
 */
export async function removePermissionFromUser(
  userId: string,
  permissionId: string
): Promise<{ message: string; data: AdminUser }> {
  ensureDevelopment();
  
  const response = await api.delete<{ message: string; data: { _id: string; email: string; name: string; createdAt: string } }>(`/admin/users/${userId}/permissions/${permissionId}`);
  
  return {
    message: response.data.message,
    data: {
      id: response.data.data._id,
      email: response.data.data.email,
      name: response.data.data.name,
      createdAt: response.data.data.createdAt,
    },
  };
}

/**
 * Get user's direct permissions
 */
export async function getUserDirectPermissions(userId: string): Promise<Permission[]> {
  ensureDevelopment();
  
  const response = await api.get<{ data: Array<{ id: string; _id?: string; name: string; description: string; resources: string[]; actions: string[]; createdAt: string; updatedAt: string }> }>(`/admin/users/${userId}/permissions`);
  
  return response.data.data.map((permission) => ({
    id: permission.id || permission._id || '',
    name: permission.name,
    description: permission.description,
    resources: permission.resources,
    actions: permission.actions,
    category: (permission as any).category,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
  }));
}

/**
 * Get user's effective permissions (role + direct) with source indicators
 * Uses the non-admin endpoint for the current user, or admin endpoint for other users
 */
export async function getUserEffectivePermissions(userId: string, currentUserId?: string): Promise<Array<Permission & { source: 'role' | 'direct'; roleName?: string }>> {
  // If checking current user's own permissions, use the non-admin endpoint
  const endpoint = (currentUserId && userId === currentUserId) 
    ? '/user/permissions/effective'
    : `/admin/users/${userId}/permissions/effective`;
  
  try {
    const response = await api.get<{ data: Array<{ _id?: string; id?: string; name: string; description: string; resources: string[]; actions: string[]; createdAt: string; updatedAt: string; source: 'role' | 'direct'; roleName?: string }> }>(endpoint);
    
    return response.data.data.map((permission) => ({
      id: permission._id || permission.id || '',
      name: permission.name,
      description: permission.description,
      resources: permission.resources,
      actions: permission.actions,
      category: (permission as any).category,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
      source: permission.source,
      roleName: permission.roleName,
    }));
  } catch (err) {
    // If not in dev mode or endpoint doesn't exist, return empty array
    // This allows the app to work in production without breaking
    console.error('Failed to fetch effective permissions:', {
      endpoint,
      userId,
      currentUserId,
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      errorResponse: (err as any)?.response?.data,
    });
    return [];
  }
}

/**
 * Bulk set user permissions (replaces all direct permissions)
 */
export async function bulkSetUserPermissions(
  userId: string,
  permissionIds: string[]
): Promise<{ message: string; data: AdminUser }> {
  ensureDevelopment();
  
  const response = await api.post<{ message: string; data: { _id: string; email: string; name: string; createdAt: string } }>(`/admin/users/${userId}/permissions/bulk`, {
    permissionIds,
  });
  
  return {
    message: response.data.message,
    data: {
      id: response.data.data._id,
      email: response.data.data.email,
      name: response.data.data.name,
      createdAt: response.data.data.createdAt,
    },
  };
}

/**
 * Get feature flags list with pagination
 */
export async function getFeatureFlags(
  page: number = 1,
  limit: number = 20
): Promise<FeatureFlagsListResponse> {
  ensureDevelopment();
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await api.get<{ data: Array<{ _id: string; name: string; description: string; enabled: boolean; createdAt: string; updatedAt: string }>; pagination: PaginationData }>(`/admin/feature-flags?${params.toString()}`);
  
  // Transform MongoDB _id to id
  const transformedData: FeatureFlagsListResponse = {
    data: response.data.data.map((flag) => ({
      id: flag._id,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
    })),
    pagination: response.data.pagination,
  };
  
  return transformedData;
}

/**
 * Get feature flag by name
 */
export async function getFeatureFlagByName(name: string): Promise<{ data: FeatureFlag }> {
  ensureDevelopment();
  
  const response = await api.get<{ data: { _id: string; name: string; description: string; enabled: boolean; createdAt: string; updatedAt: string } }>(`/admin/feature-flags/${name}`);
  
  return {
    data: {
      id: response.data.data._id,
      name: response.data.data.name,
      description: response.data.data.description,
      enabled: response.data.data.enabled,
      createdAt: response.data.data.createdAt,
      updatedAt: response.data.data.updatedAt,
    },
  };
}

/**
 * Create a new feature flag
 */
export async function createFeatureFlag(
  data: CreateFeatureFlagRequest
): Promise<{ data: FeatureFlag }> {
  ensureDevelopment();
  
  const response = await api.post<{ data: { _id: string; name: string; description: string; enabled: boolean; createdAt: string; updatedAt: string } }>('/admin/feature-flags', data);
  
  return {
    data: {
      id: response.data.data._id,
      name: response.data.data.name,
      description: response.data.data.description,
      enabled: response.data.data.enabled,
      createdAt: response.data.data.createdAt,
      updatedAt: response.data.data.updatedAt,
    },
  };
}

/**
 * Update a feature flag
 */
export async function updateFeatureFlag(
  name: string,
  data: UpdateFeatureFlagRequest
): Promise<{ data: FeatureFlag }> {
  ensureDevelopment();
  
  const response = await api.put<{ data: { _id: string; name: string; description: string; enabled: boolean; createdAt: string; updatedAt: string } }>(`/admin/feature-flags/${name}`, data);
  
  return {
    data: {
      id: response.data.data._id,
      name: response.data.data.name,
      description: response.data.data.description,
      enabled: response.data.data.enabled,
      createdAt: response.data.data.createdAt,
      updatedAt: response.data.data.updatedAt,
    },
  };
}

/**
 * Delete a feature flag
 */
export async function deleteFeatureFlag(name: string): Promise<{ message: string }> {
  ensureDevelopment();
  
  const response = await api.delete<{ message: string }>(`/admin/feature-flags/${name}`);
  return response.data;
}

/**
 * Get enabled feature flags (public endpoint)
 */
export async function getEnabledFeatureFlags(): Promise<{ data: string[] }> {
  const response = await api.get<{ data: string[] }>('/feature-flags');
  return response.data;
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<DatabaseStatsResponse> {
  ensureDevelopment();
  
  const response = await api.get<DatabaseStatsResponse>('/admin/stats');
  return response.data;
}

/**
 * Get documents from a collection
 */
export async function getCollectionDocuments(
  collectionName: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: Record<string, unknown>[]; pagination: PaginationData }> {
  ensureDevelopment();
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await api.get<{ data: Record<string, unknown>[]; pagination: PaginationData }>(
    `/admin/collections/${encodeURIComponent(collectionName)}/documents?${params.toString()}`
  );
  return response.data;
}

/**
 * Update a document in a collection
 */
export async function updateCollectionDocument(
  collectionName: string,
  documentId: string,
  updates: Record<string, unknown>
): Promise<{ data: Record<string, unknown> }> {
  ensureDevelopment();
  
  const response = await api.put<{ data: Record<string, unknown> }>(
    `/admin/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`,
    updates
  );
  return response.data;
}

/**
 * Delete a document from a collection
 */
export async function deleteCollectionDocument(
  collectionName: string,
  documentId: string
): Promise<{ message: string }> {
  ensureDevelopment();
  
  const response = await api.delete<{ message: string }>(
    `/admin/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`
  );
  return response.data;
}

/**
 * HttpOnly cookie interface
 */
export interface HttpOnlyCookie {
  name: string;
  value: string;
  httpOnly: boolean;
}

/**
 * Get HttpOnly cookies from the backend
 */
export async function getHttpOnlyCookies(): Promise<{ data: HttpOnlyCookie[] }> {
  ensureDevelopment();
  
  const response = await api.get<{ data: HttpOnlyCookie[] }>('/admin/cookies');
  return response.data;
}

/**
 * Update user (email and/or name)
 */
export async function updateUser(
  id: string,
  updates: UpdateUserRequest
): Promise<UpdateUserResponse> {
  ensureDevelopment();
  
  const response = await api.put<{ data: { _id: string; email: string; name: string; createdAt: string } }>(`/admin/users/${id}`, updates);
  
  // Transform MongoDB _id to id
  return {
    data: {
      id: response.data.data._id,
      email: response.data.data.email,
      name: response.data.data.name,
      createdAt: response.data.data.createdAt,
    },
  };
}

/**
 * Delete user by ID
 */
export async function deleteUser(id: string): Promise<DeleteUserResponse> {
  ensureDevelopment();
  
  const response = await api.delete<DeleteUserResponse>(`/admin/users/${id}`);
  return response.data;
}

/**
 * Change user password
 */
export async function changeUserPassword(
  id: string,
  password: string
): Promise<ChangePasswordResponse> {
  ensureDevelopment();
  
  const response = await api.patch<ChangePasswordResponse>(`/admin/users/${id}/password`, {
    password,
  });
  return response.data;
}

/**
 * Impersonate user (sign in as user)
 */
export async function impersonateUser(id: string): Promise<UserDetailsResponse> {
  ensureDevelopment();
  
  const response = await api.post<{ data: { _id: string; email: string; name: string; createdAt: string } }>(`/admin/users/${id}/impersonate`);
  
  return {
    data: {
      id: response.data.data._id,
      email: response.data.data.email,
      name: response.data.data.name,
      createdAt: response.data.data.createdAt,
    },
  };
}

/**
 * Activity log data structure
 */
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  method: string;
  path: string;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * Activity logs list response
 */
export interface ActivityLogsListResponse {
  data: ActivityLog[];
  pagination: PaginationData;
}

/**
 * Get activity logs for a user
 */
export async function getUserActivityLogs(
  userId: string,
  page: number = 1,
  limit: number = 50,
  action?: string,
  startDate?: string,
  endDate?: string
): Promise<ActivityLogsListResponse> {
  ensureDevelopment();
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (action) {
    params.append('action', action);
  }
  if (startDate) {
    params.append('startDate', startDate);
  }
  if (endDate) {
    params.append('endDate', endDate);
  }

  const response = await api.get<ActivityLogsListResponse>(
    `/admin/users/${encodeURIComponent(userId)}/activity-logs?${params.toString()}`
  );
  return response.data;
}

