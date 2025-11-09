import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { ErrorMessages, createErrorResponse } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validators/validateRequest';
import * as projectService from '../services/project.service';
import { logActivity } from '../utils/activityLog';
import { createPipelineService, PipelineExecutionRequest } from '../services/pipeline.service';
import { createSimplifiedPipelineService } from '../services/simplified-pipeline.service';

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
 * Pipeline execution schema
 */
export const executePipelineSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(5000, 'Prompt must be less than 5000 characters')
    .trim(),
  repository: z.string().url('Repository must be a valid URL'),
  ref: z.string().trim().optional(),
});

export type ExecutePipelineInput = z.infer<typeof executePipelineSchema>;

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

/**
 * POST /api/projects/:id/pipeline/execute
 * Execute pipeline for a project (PM -> DEV -> QA)
 */
router.post(
  '/:id/pipeline/execute',
  authenticate,
  validateRequest(executePipelineSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id: projectId } = req.params;
    const { prompt, repository, ref } = req.body;

    try {
      // Verify project ownership
      await projectService.getProjectById(projectId, req.userId);

      // Create pipeline service
      const pipelineService = createPipelineService();

      // Start pipeline execution
      const pipelineRequest: PipelineExecutionRequest = {
        projectId,
        userId: req.userId,
        prompt,
        repository,
        ref,
      };

      const result = await pipelineService.startPipeline(pipelineRequest);

      // Log activity
      await logActivity(req, 'execute_pipeline', {
        projectId,
        runId: result.runId,
        repository,
      });

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR, errorMessage));
      }
    }
  })
);

/**
 * GET /api/projects/:id/pipeline/runs
 * List pipeline runs for a project
 */
router.get(
  '/:id/pipeline/runs',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id: projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      // Verify project ownership
      await projectService.getProjectById(projectId, req.userId);

      // Create pipeline service
      const pipelineService = createPipelineService();

      // Get runs
      const runs = await pipelineService.listRuns(projectId, limit);

      res.status(200).json({
        data: runs,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR, errorMessage));
      }
    }
  })
);

/**
 * GET /api/projects/:id/pipeline/runs/:runId
 * Get pipeline run status
 */
router.get(
  '/:id/pipeline/runs/:runId',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id: projectId, runId } = req.params;

    try {
      // Verify project ownership
      await projectService.getProjectById(projectId, req.userId);

      // Create pipeline service
      const pipelineService = createPipelineService();

      // Get run status
      const run = await pipelineService.getRunStatus(runId);

      if (!run) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Run not found'));
        return;
      }

      res.status(200).json({
        data: run,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR, errorMessage));
      }
    }
  })
);

/**
 * POST /api/projects/:id/pipeline/simple
 * Execute simplified pipeline (PM → DEV → QA with logs and tickets)
 */
router.post(
  '/:id/pipeline/simple',
  authenticate,
  validateRequest(executePipelineSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id: projectId } = req.params;
    const { prompt, repository, ref } = req.body;

    try {
      // Verify project ownership
      await projectService.getProjectById(projectId, req.userId);

      // Create simplified pipeline service
      const simplifiedPipeline = createSimplifiedPipelineService();

      // Start pipeline execution
      const result = await simplifiedPipeline.startPipeline({
        projectId,
        userId: req.userId,
        featureRequest: prompt,
        repository,
        ref,
      });

      // Log activity
      await logActivity(req, 'execute_simplified_pipeline', {
        projectId,
        runId: result.runId,
        repository,
        logFile: result.logFile,
      });

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR, errorMessage));
      }
    }
  })
);

/**
 * GET /api/projects/:id/pipeline/runs/:runId/logs
 * Get logs for a pipeline run
 */
router.get(
  '/:id/pipeline/runs/:runId/logs',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
      return;
    }

    const { id: projectId, runId } = req.params;

    try {
      // Verify project ownership
      await projectService.getProjectById(projectId, req.userId);

      // Create simplified pipeline service
      const simplifiedPipeline = createSimplifiedPipelineService();

      // Read log file
      const logs = simplifiedPipeline.readLogFile(runId);

      if (!logs) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Log file not found'));
        return;
      }

      res.status(200).json({
        data: {
          runId,
          logs,
          logFile: simplifiedPipeline.getLogFilePath(runId),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.NOT_FOUND;
      if (errorMessage === ErrorMessages.NOT_FOUND) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      } else {
        res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR, errorMessage));
      }
    }
  })
);

export default router;

