import type { Project, CreateProjectInput, UpdateProjectInput } from '../types/api';
export type { CreateProjectInput };
/**
 * Create a new project
 * @param input - Project data (name, description, tags)
 * @returns Created project data
 */
export declare function createProject(input: CreateProjectInput): Promise<Project>;
/**
 * Get all projects for the current user
 * @returns Array of user's projects
 */
export declare function getProjects(): Promise<Project[]>;
/**
 * Get a project by ID
 * @param id - Project ID
 * @returns Project data
 */
export declare function getProject(id: string): Promise<Project>;
/**
 * Update a project
 * @param id - Project ID
 * @param input - Updated project data
 * @returns Updated project data
 */
export declare function updateProject(id: string, input: UpdateProjectInput): Promise<Project>;
/**
 * Delete a project
 * @param id - Project ID
 */
export declare function deleteProject(id: string): Promise<void>;
