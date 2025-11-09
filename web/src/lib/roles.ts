import { api } from './api';
import type { PaginationData } from './admin';

// Re-export PaginationData for convenience
export type { PaginationData };

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
 * Permission data structure
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resources: string[];
  actions: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Role Group data structure
 */
export interface RoleGroup {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  requiresOne: boolean;
  defaultRoleId?: string;
  defaultRole?: {
    id: string;
    name: string;
    displayName: string;
  };
  isSystemGroup: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Role data structure
 */
export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: Permission[];
  permissionsCount: number;
  group?: {
    id: string;
    name: string;
    displayName: string;
    isSystemGroup?: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create role data structure
 */
export interface CreateRoleData {
  name: string;
  displayName: string;
  description?: string;
  permissions?: string[];
  group: string; // Required - every role must belong to a group
}

/**
 * Update role data structure
 */
export interface UpdateRoleData {
  displayName?: string;
  description?: string;
  permissions?: string[];
  group?: string;
}

/**
 * Roles list response
 */
export interface RolesListResponse {
  data: Role[];
  pagination: PaginationData;
}

/**
 * Role details response
 */
export interface RoleDetailsResponse {
  data: Role;
}

/**
 * User roles response
 */
export interface UserRolesResponse {
  data: Role[];
}

/**
 * Assign roles to user response
 */
export interface AssignRolesResponse {
  message: string;
  data: {
    id: string;
    email: string;
    name: string;
    roles: Role[];
  };
}

/**
 * Get all roles with pagination
 */
export async function getRoles(page = 1, limit = 20): Promise<RolesListResponse> {
  ensureDevelopment();
  const response = await api.get<RolesListResponse>(`/admin/roles?page=${page}&limit=${limit}`);
  return response.data;
}

/**
 * Get role by ID
 */
export async function getRole(id: string): Promise<RoleDetailsResponse> {
  ensureDevelopment();
  const response = await api.get<RoleDetailsResponse>(`/admin/roles/${id}`);
  return response.data;
}

/**
 * Create new role
 */
export async function createRole(data: CreateRoleData): Promise<RoleDetailsResponse> {
  ensureDevelopment();
  const response = await api.post<RoleDetailsResponse>('/admin/roles', data);
  return response.data;
}

/**
 * Update role
 */
export async function updateRole(id: string, data: UpdateRoleData): Promise<RoleDetailsResponse> {
  ensureDevelopment();
  const response = await api.patch<RoleDetailsResponse>(`/admin/roles/${id}`, data);
  return response.data;
}

/**
 * Delete role
 */
export async function deleteRole(id: string): Promise<{ message: string }> {
  ensureDevelopment();
  const response = await api.delete<{ message: string }>(`/admin/roles/${id}`);
  return response.data;
}

/**
 * Add permission to role
 */
export async function addPermissionToRole(
  roleId: string,
  permissionId: string
): Promise<RoleDetailsResponse> {
  ensureDevelopment();
  const response = await api.post<RoleDetailsResponse>(`/admin/roles/${roleId}/permissions`, {
    permissionId,
  });
  return response.data;
}

/**
 * Remove permission from role
 */
export async function removePermissionFromRole(
  roleId: string,
  permissionId: string
): Promise<RoleDetailsResponse> {
  ensureDevelopment();
  const response = await api.delete<RoleDetailsResponse>(
    `/admin/roles/${roleId}/permissions/${permissionId}`
  );
  return response.data;
}

/**
 * Get user's roles
 */
export async function getUserRoles(userId: string): Promise<UserRolesResponse> {
  ensureDevelopment();
  const response = await api.get<UserRolesResponse>(`/admin/users/${userId}/roles`);
  return response.data;
}

/**
 * Assign/update roles for user
 */
export async function assignRolesToUser(
  userId: string,
  roleIds: string[]
): Promise<AssignRolesResponse> {
  ensureDevelopment();
  const response = await api.patch<AssignRolesResponse>(`/admin/users/${userId}/roles`, {
    roleIds,
  });
  return response.data;
}

/**
 * Add role to user
 */
export async function addRoleToUser(userId: string, roleId: string): Promise<AssignRolesResponse> {
  ensureDevelopment();
  const response = await api.post<AssignRolesResponse>(`/admin/users/${userId}/roles`, {
    roleId,
  });
  return response.data;
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<AssignRolesResponse> {
  ensureDevelopment();
  const response = await api.delete<AssignRolesResponse>(`/admin/users/${userId}/roles/${roleId}`);
  return response.data;
}

/**
 * Role Group interfaces
 */
export interface CreateRoleGroupData {
  name: string;
  displayName: string;
  description?: string;
  requiresOne?: boolean;
  defaultRoleId?: string;
}

export interface UpdateRoleGroupData {
  displayName?: string;
  description?: string;
  requiresOne?: boolean;
  defaultRoleId?: string;
}

export interface RoleGroupsListResponse {
  data: RoleGroup[];
}

export interface RoleGroupDetailsResponse {
  data: RoleGroup;
}

/**
 * Get all role groups
 */
export async function getRoleGroups(): Promise<RoleGroupsListResponse> {
  ensureDevelopment();
  const response = await api.get<RoleGroupsListResponse>('/admin/role-groups');
  return response.data;
}

/**
 * Get role group by ID
 */
export async function getRoleGroup(id: string): Promise<RoleGroupDetailsResponse> {
  ensureDevelopment();
  const response = await api.get<RoleGroupDetailsResponse>(`/admin/role-groups/${id}`);
  return response.data;
}

/**
 * Create new role group
 */
export async function createRoleGroup(data: CreateRoleGroupData): Promise<RoleGroupDetailsResponse> {
  ensureDevelopment();
  const response = await api.post<RoleGroupDetailsResponse>('/admin/role-groups', data);
  return response.data;
}

/**
 * Update role group
 */
export async function updateRoleGroup(
  id: string,
  data: UpdateRoleGroupData
): Promise<RoleGroupDetailsResponse> {
  ensureDevelopment();
  const response = await api.patch<RoleGroupDetailsResponse>(`/admin/role-groups/${id}`, data);
  return response.data;
}

/**
 * Delete role group
 */
export async function deleteRoleGroup(id: string): Promise<{ message: string }> {
  ensureDevelopment();
  const response = await api.delete<{ message: string }>(`/admin/role-groups/${id}`);
  return response.data;
}

