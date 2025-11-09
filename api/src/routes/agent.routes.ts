import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { createAgentService, ExecuteAgentRequest } from '../services/agent.service';
import { hasAnyCursorApiKey, getCursorApiKeyForAgent } from '../config/env';
import { logger } from '../config/logger';
import { createErrorResponse, ErrorMessages } from '../utils/errors';
import { AgentType } from '../models/Agent';
import { z } from 'zod';

const router = Router();

// Validation schemas
const executeAgentSchema = z.object({
  agentType: z.enum([
    'spec-writer',
    'roadmap-decomposer',
    'acceptance-criteria-author',
    'issue-planner',
    'developer-implementer',
    'refactorer',
    'test-author',
    'code-reviewer',
    'qa-tester',
    'security-auditor',
    'release-manager',
    'infra-deploy-engineer',
  ]),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  repository: z.string().url(),
  ref: z.string().optional(),
  branchName: z.string().optional(),
  prompt: z.string().min(1),
  autoCreatePr: z.boolean().optional(),
  contextData: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/agents/execute
 * Execute an agent
 */
router.post('/execute', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validationResult = executeAgentSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json(
        createErrorResponse(
          ErrorMessages.VALIDATION_ERROR,
          errors
        )
      );
      return;
    }

    const request: ExecuteAgentRequest = validationResult.data;

    // Check if Cursor API key is configured for this agent type
    const apiKey = getCursorApiKeyForAgent(request.agentType);
    if (!apiKey) {
      res.status(503).json(
        createErrorResponse(
          ErrorMessages.SERVICE_UNAVAILABLE,
          `Cursor API key is not configured for agent type: ${request.agentType}`
        )
      );
      return;
    }

    // Create agent service
    const agentService = createAgentService();

    // Execute agent
    const result = await agentService.executeAgent(request);

    logger.info('Agent executed via API', {
      userId: req.userId,
      agentType: request.agentType,
      projectId: request.projectId,
      agentRunId: result.agentRunId,
    });

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    logger.error('Error executing agent via API', {
      userId: req.userId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json(
      createErrorResponse(
        ErrorMessages.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : undefined
      )
    );
  }
});

/**
 * GET /api/agents/runs/:agentRunId
 * Get agent run status
 */
router.get('/runs/:agentRunId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentRunId } = req.params;

    if (!hasAnyCursorApiKey()) {
      res.status(503).json(
        createErrorResponse(
          ErrorMessages.SERVICE_UNAVAILABLE,
          'Cursor API keys are not configured'
        )
      );
      return;
    }

    const agentService = createAgentService();
    const agentRun = await agentService.getAgentRunStatus(agentRunId);

    if (!agentRun) {
      res.status(404).json(
        createErrorResponse(ErrorMessages.NOT_FOUND, 'Agent run not found')
      );
      return;
    }

    res.status(200).json({
      data: agentRun,
    });
  } catch (error) {
    logger.error('Error getting agent run status via API', {
      userId: req.userId,
      agentRunId: req.params.agentRunId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json(
      createErrorResponse(
        ErrorMessages.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : undefined
      )
    );
  }
});

/**
 * POST /api/agents/runs/:agentRunId/cancel
 * Cancel agent run
 */
router.post('/runs/:agentRunId/cancel', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentRunId } = req.params;

    if (!hasAnyCursorApiKey()) {
      res.status(503).json(
        createErrorResponse(
          ErrorMessages.SERVICE_UNAVAILABLE,
          'Cursor API keys are not configured'
        )
      );
      return;
    }

    const agentService = createAgentService();
    await agentService.cancelAgentRun(agentRunId);

    logger.info('Agent run cancelled via API', {
      userId: req.userId,
      agentRunId,
    });

    res.status(200).json({
      data: { message: 'Agent run cancelled successfully' },
    });
  } catch (error) {
    logger.error('Error cancelling agent run via API', {
      userId: req.userId,
      agentRunId: req.params.agentRunId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json(
      createErrorResponse(
        ErrorMessages.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : undefined
      )
    );
  }
});

/**
 * GET /api/agents/runs/project/:projectId
 * List agent runs for a project
 */
router.get('/runs/project/:projectId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!hasAnyCursorApiKey()) {
      res.status(503).json(
        createErrorResponse(
          ErrorMessages.SERVICE_UNAVAILABLE,
          'Cursor API keys are not configured'
        )
      );
      return;
    }

    const agentService = createAgentService();
    const agentRuns = await agentService.listAgentRuns(projectId, limit);

    res.status(200).json({
      data: agentRuns,
    });
  } catch (error) {
    logger.error('Error listing agent runs via API', {
      userId: req.userId,
      projectId: req.params.projectId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json(
      createErrorResponse(
        ErrorMessages.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : undefined
      )
    );
  }
});

/**
 * GET /api/agents/types
 * List available agent types
 */
router.get('/types', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const agentTypes: AgentType[] = [
      'spec-writer',
      'roadmap-decomposer',
      'acceptance-criteria-author',
      'issue-planner',
      'developer-implementer',
      'refactorer',
      'test-author',
      'code-reviewer',
      'qa-tester',
      'security-auditor',
      'release-manager',
      'infra-deploy-engineer',
    ];

    res.status(200).json({
      data: agentTypes,
    });
  } catch (error) {
    logger.error('Error listing agent types via API', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json(
      createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR)
    );
  }
});

export default router;

