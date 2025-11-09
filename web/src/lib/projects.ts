import { api } from './api';
import type { ApiSuccessResponse, Project, CreateProjectInput, UpdateProjectInput } from '../types/api';

// Re-export CreateProjectInput for convenience
export type { CreateProjectInput };

/**
 * Create a new project
 * @param input - Project data (name, description, tags)
 * @returns Created project data
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await api.post<ApiSuccessResponse<Project>>('/projects', input);
  return response.data.data;
}

/**
 * Get all projects for the current user
 * @returns Array of user's projects
 */
export async function getProjects(): Promise<Project[]> {
  const response = await api.get<ApiSuccessResponse<Project[]>>('/projects');
  return response.data.data;
}

/**
 * Get a project by ID
 * @param id - Project ID
 * @returns Project data
 */
export async function getProject(id: string): Promise<Project> {
  const response = await api.get<ApiSuccessResponse<Project>>(`/projects/${id}`);
  return response.data.data;
}

/**
 * Update a project
 * @param id - Project ID
 * @param input - Updated project data
 * @returns Updated project data
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const response = await api.patch<ApiSuccessResponse<Project>>(`/projects/${id}`, input);
  return response.data.data;
}

/**
 * Delete a project
 * @param id - Project ID
 */
export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

/**
 * Start a mock pipeline for a project
 * @param projectId - Project ID
 * @param prompt - The prompt/description for what to build
 * @returns Pipeline run information
 */
export async function startMockPipeline(
  projectId: string,
  prompt: string
): Promise<{ runId: string; state: string; timeline: any[] }> {
  const response = await api.post<
    ApiSuccessResponse<{ runId: string; state: string; timeline: any[] }>
  >(`/projects/${projectId}/pipeline/mock`, { prompt });
  return response.data.data;
}

