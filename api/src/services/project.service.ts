import mongoose from 'mongoose';
import { Project, IProject } from '../models/Project';
import { ErrorMessages } from '../utils/errors';

/**
 * Create a new project
 * @param userId - User ID creating the project
 * @param projectData - Project data (name, description, tags)
 * @returns Created project
 */
export async function createProject(
  userId: string,
  projectData: {
    name: string;
    description?: string;
    tags?: string[];
  }
): Promise<IProject> {
  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  // Create project
  const project = new Project({
    user_id: new mongoose.Types.ObjectId(userId),
    name: projectData.name.trim(),
    description: projectData.description?.trim(),
    tags: projectData.tags?.filter((tag) => tag.trim().length > 0) || [],
    created_at: new Date(),
    updated_at: new Date(),
  });

  await project.save();
  return project;
}

/**
 * Get all projects for a user
 * @param userId - User ID
 * @returns Array of user's projects
 */
export async function getProjectsByUser(userId: string): Promise<IProject[]> {
  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const projects = await Project.find({
    user_id: new mongoose.Types.ObjectId(userId),
  }).sort({ updated_at: -1 }); // Most recently updated first

  return projects;
}

/**
 * Get a project by ID with ownership check
 * @param projectId - Project ID
 * @param userId - User ID (for ownership check)
 * @returns Project if found and owned by user
 * @throws Error if project not found or not owned by user
 */
export async function getProjectById(
  projectId: string,
  userId: string
): Promise<IProject> {
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error('Invalid project ID');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const project = await Project.findOne({
    _id: new mongoose.Types.ObjectId(projectId),
    user_id: new mongoose.Types.ObjectId(userId),
  });

  if (!project) {
    throw new Error(ErrorMessages.NOT_FOUND);
  }

  return project;
}

/**
 * Update a project with ownership check
 * @param projectId - Project ID
 * @param userId - User ID (for ownership check)
 * @param updates - Project updates (name, description, tags)
 * @returns Updated project
 * @throws Error if project not found or not owned by user
 */
export async function updateProject(
  projectId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    tags?: string[];
  }
): Promise<IProject> {
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error('Invalid project ID');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  // Build update object
  const updateData: {
    name?: string;
    description?: string;
    tags?: string[];
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description.trim() || undefined;
  }
  if (updates.tags !== undefined) {
    updateData.tags = updates.tags.filter((tag) => tag.trim().length > 0);
  }

  // Update project with ownership check
  const project = await Project.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(projectId),
      user_id: new mongoose.Types.ObjectId(userId),
    },
    updateData,
    { new: true, runValidators: true }
  );

  if (!project) {
    throw new Error(ErrorMessages.NOT_FOUND);
  }

  return project;
}

/**
 * Delete a project with ownership check
 * @param projectId - Project ID
 * @param userId - User ID (for ownership check)
 * @throws Error if project not found or not owned by user
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error('Invalid project ID');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const result = await Project.deleteOne({
    _id: new mongoose.Types.ObjectId(projectId),
    user_id: new mongoose.Types.ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throw new Error(ErrorMessages.NOT_FOUND);
  }
}

