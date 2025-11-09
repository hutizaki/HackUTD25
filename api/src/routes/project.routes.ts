import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { ErrorMessages, createErrorResponse } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validators/validateRequest';
import * as projectService from '../services/project.service';
import { logActivity } from '../utils/activityLog';

const router = Router();

/**
 * Zod validation schemas
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
  tags: z.array(z.string().trim().min(1, 'Tags must be non-empty strings')).optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
  tags: z.array(z.string().trim().min(1, 'Tags must be non-empty strings')).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/**
 * POST /api/projects
 * Create a new project (requires auth)
 */
router.post(
  '/',
  authenticate,
  validateRequest(createProjectSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const projectData = req.body; // Already validated by middleware

    try {
      const project = await projectService.createProject(req.userId, projectData);

      // Log activity
      await logActivity(req, 'create_project', {
        projectId: (project._id as { toString: () => string }).toString(),
        projectName: project.name,
      });

      // Return created project (transformed by toJSON)
      res.status(201).json({
        data: {
          id: (project._id as { toString: () => string }).toString(),
          user_id: (project.user_id as { toString: () => string }).toString(),
          name: project.name,
          description: project.description,
          tags: project.tags,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      res.status(400).json(createErrorResponse(ErrorMessages.VALIDATION_FAILED, errorMessage));
    }
  })
);

/**
 * GET /api/projects
 * List user's projects (requires auth)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    try {
      const projects = await projectService.getProjectsByUser(req.userId);

      // Transform projects for response
      const projectsData = projects.map((project) => ({
        id: (project._id as { toString: () => string }).toString(),
        user_id: (project.user_id as { toString: () => string }).toString(),
        name: project.name,
        description: project.description,
        tags: project.tags,
        created_at: project.created_at,
        updated_at: project.updated_at,
      }));

      res.json({ data: projectsData });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get projects';
      res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR, errorMessage));
    }
  })
);

/**
 * GET /api/projects/:id
 * Get project details (requires auth, ownership check)
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id } = req.params;

    try {
      const project = await projectService.getProjectById(id, req.userId);

      // Log activity
      await logActivity(req, 'view_project', {
        projectId: (project._id as { toString: () => string }).toString(),
      });

      // Return project (transformed by toJSON)
      res.json({
        data: {
          id: (project._id as { toString: () => string }).toString(),
          user_id: (project.user_id as { toString: () => string }).toString(),
          name: project.name,
          description: project.description,
          tags: project.tags,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(400).json(createErrorResponse(ErrorMessages.VALIDATION_FAILED, errorMessage));
      }
    }
  })
);

/**
 * PATCH /api/projects/:id
 * Update project (requires auth, ownership check)
 */
router.patch(
  '/:id',
  authenticate,
  validateRequest(updateProjectSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id } = req.params;
    const updates = req.body; // Already validated by middleware

    try {
      const project = await projectService.updateProject(id, req.userId, updates);

      // Log activity
      await logActivity(req, 'update_project', {
        projectId: (project._id as { toString: () => string }).toString(),
        projectName: project.name,
        updates: Object.keys(updates),
      });

      // Return updated project (transformed by toJSON)
      res.json({
        data: {
          id: (project._id as { toString: () => string }).toString(),
          user_id: (project.user_id as { toString: () => string }).toString(),
          name: project.name,
          description: project.description,
          tags: project.tags,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(400).json(createErrorResponse(ErrorMessages.VALIDATION_FAILED, errorMessage));
      }
    }
  })
);

/**
 * DELETE /api/projects/:id
 * Delete project (requires auth, ownership check)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id } = req.params;

    try {
      await projectService.deleteProject(id, req.userId);

      // Log activity
      await logActivity(req, 'delete_project', {
        projectId: id,
      });

      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(400).json(createErrorResponse(ErrorMessages.VALIDATION_FAILED, errorMessage));
      }
    }
  })
);

export default router;

