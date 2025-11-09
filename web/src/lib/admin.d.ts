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
export declare function getUsers(page?: number, limit?: number, search?: string): Promise<UsersListResponse>;
/**
 * Get user details by ID
 */
export declare function getUserById(id: string): Promise<UserDetailsResponse>;
/**
 * Get sessions list with filtering and pagination
 */
export declare function getSessions(userId?: string, status?: string, page?: number, limit?: number): Promise<SessionsListResponse>;
/**
 * Revoke a session by ID
 */
export declare function revokeSession(sessionId: string): Promise<RevokeSessionResponse>;
/**
 * Get permissions list with pagination
 */
export declare function getPermissions(page?: number, limit?: number): Promise<PermissionsListResponse>;
/**
 * Create a new permission
 */
export declare function createPermission(data: CreatePermissionRequest): Promise<{
    data: Permission;
}>;
/**
 * Get a single permission by ID
 */
export declare function getPermission(id: string): Promise<Permission>;
/**
 * Update a permission
 */
export declare function updatePermission(id: string, data: UpdatePermissionRequest): Promise<{
    data: Permission;
}>;
/**
 * Delete a permission
 */
export declare function deletePermission(id: string): Promise<{
    message: string;
}>;
/**
 * Assign permissions to a user
 */
export declare function assignPermissionsToUser(userId: string, permissionIds: string[]): Promise<{
    message: string;
    data: AdminUser;
}>;
/**
 * Remove a permission from a user
 */
export declare function removePermissionFromUser(userId: string, permissionId: string): Promise<{
    message: string;
    data: AdminUser;
}>;
/**
 * Get user's direct permissions
 */
export declare function getUserDirectPermissions(userId: string): Promise<Permission[]>;
/**
 * Get user's effective permissions (role + direct) with source indicators
 * Uses the non-admin endpoint for the current user, or admin endpoint for other users
 */
export declare function getUserEffectivePermissions(userId: string, currentUserId?: string): Promise<Array<Permission & {
    source: 'role' | 'direct';
    roleName?: string;
}>>;
/**
 * Bulk set user permissions (replaces all direct permissions)
 */
export declare function bulkSetUserPermissions(userId: string, permissionIds: string[]): Promise<{
    message: string;
    data: AdminUser;
}>;
/**
 * Get feature flags list with pagination
 */
export declare function getFeatureFlags(page?: number, limit?: number): Promise<FeatureFlagsListResponse>;
/**
 * Get feature flag by name
 */
export declare function getFeatureFlagByName(name: string): Promise<{
    data: FeatureFlag;
}>;
/**
 * Create a new feature flag
 */
export declare function createFeatureFlag(data: CreateFeatureFlagRequest): Promise<{
    data: FeatureFlag;
}>;
/**
 * Update a feature flag
 */
export declare function updateFeatureFlag(name: string, data: UpdateFeatureFlagRequest): Promise<{
    data: FeatureFlag;
}>;
/**
 * Delete a feature flag
 */
export declare function deleteFeatureFlag(name: string): Promise<{
    message: string;
}>;
/**
 * Get enabled feature flags (public endpoint)
 */
export declare function getEnabledFeatureFlags(): Promise<{
    data: string[];
}>;
/**
 * Get database statistics
 */
export declare function getStats(): Promise<DatabaseStatsResponse>;
/**
 * Get documents from a collection
 */
export declare function getCollectionDocuments(collectionName: string, page?: number, limit?: number): Promise<{
    data: Record<string, unknown>[];
    pagination: PaginationData;
}>;
/**
 * Update a document in a collection
 */
export declare function updateCollectionDocument(collectionName: string, documentId: string, updates: Record<string, unknown>): Promise<{
    data: Record<string, unknown>;
}>;
/**
 * Delete a document from a collection
 */
export declare function deleteCollectionDocument(collectionName: string, documentId: string): Promise<{
    message: string;
}>;
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
export declare function getHttpOnlyCookies(): Promise<{
    data: HttpOnlyCookie[];
}>;
/**
 * Update user (email and/or name)
 */
export declare function updateUser(id: string, updates: UpdateUserRequest): Promise<UpdateUserResponse>;
/**
 * Delete user by ID
 */
export declare function deleteUser(id: string): Promise<DeleteUserResponse>;
/**
 * Change user password
 */
export declare function changeUserPassword(id: string, password: string): Promise<ChangePasswordResponse>;
/**
 * Impersonate user (sign in as user)
 */
export declare function impersonateUser(id: string): Promise<UserDetailsResponse>;
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
export declare function getUserActivityLogs(userId: string, page?: number, limit?: number, action?: string, startDate?: string, endDate?: string): Promise<ActivityLogsListResponse>;
