import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validators/validateRequest';
import * as ticketService from '../services/ticket.service';
import { TicketType, TicketStatus } from '../models/Ticket';
import { logger } from '../config/logger';

const router = Router();

/**
 * Validation Schemas
 */
const createTicketSchema = z.object({
  type: z.nativeEnum(TicketType),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  parentId: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  runId: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});

const updateTicketSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  branch: z.string().optional(),
  prNumber: z.number().optional(),
  prUrl: z.string().url().optional(),
  githubIssueNumber: z.number().optional(),
  githubIssueUrl: z.string().url().optional(),
  labels: z.array(z.string()).optional(),
});

const blockTicketSchema = z.object({
  blockerIds: z.array(z.string()).min(1),
});

const createDefectSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  runId: z.string().optional(),
});

/**
 * GET /api/projects/:projectId/tickets
 * Get all tickets for a project
 */
router.get(
  '/projects/:projectId/tickets',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { status, type, runId } = req.query;

    const filters: any = {};
    if (status) filters.status = status as TicketStatus;
    if (type) filters.type = type as TicketType;
    if (runId) filters.runId = runId as string;

    const tickets = await ticketService.getTicketsByProject(projectId, filters);

    res.json({
      success: true,
      data: tickets,
    });
  })
);

/**
 * POST /api/projects/:projectId/tickets
 * Create a new ticket
 */
router.post(
  '/projects/:projectId/tickets',
  authenticate,
  validateRequest(createTicketSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const input = req.body;

    const ticket = await ticketService.createTicket({
      projectId,
      ...input,
    });

    res.status(201).json({
      success: true,
      data: ticket,
    });
  })
);

/**
 * GET /api/tickets/:ticketId
 * Get ticket by ID
 */
router.get(
  '/tickets/:ticketId',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { ticketId } = req.params;

    const ticket = await ticketService.getTicket(ticketId);

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
      return;
    }

    res.json({
      success: true,
      data: ticket,
    });
  })
);

/**
 * PATCH /api/tickets/:ticketId
 * Update ticket
 */
router.patch(
  '/tickets/:ticketId',
  authenticate,
  validateRequest(updateTicketSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { ticketId } = req.params;
    const updates = req.body;

    const ticket = await ticketService.updateTicket(ticketId, updates);

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
      return;
    }

    res.json({
      success: true,
      data: ticket,
    });
  })
);

/**
 * DELETE /api/tickets/:ticketId
 * Delete ticket
 */
router.delete(
  '/tickets/:ticketId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;

    await ticketService.deleteTicket(ticketId);

    res.json({
      success: true,
      message: 'Ticket deleted successfully',
    });
  })
);

/**
 * GET /api/projects/:projectId/tickets/root
 * Get root tickets (no parent) for a project
 */
router.get(
  '/projects/:projectId/tickets/root',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;

    const tickets = await ticketService.getRootTickets(projectId);

    res.json({
      success: true,
      data: tickets,
    });
  })
);

/**
 * GET /api/tickets/:ticketId/hierarchy
 * Get ticket hierarchy (ticket + all descendants)
 */
router.get(
  '/tickets/:ticketId/hierarchy',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;

    const hierarchy = await ticketService.getTicketHierarchy(ticketId);

    res.json({
      success: true,
      data: hierarchy,
    });
  })
);

/**
 * POST /api/tickets/:ticketId/start
 * Start ticket (mark as in progress)
 */
router.post(
  '/tickets/:ticketId/start',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { ticketId } = req.params;

    // Check if ticket can start
    const canStart = await ticketService.canTicketStart(ticketId);
    if (!canStart) {
      res.status(400).json({
        success: false,
        error: 'Ticket cannot start - dependencies not resolved or ticket is blocked',
      });
      return;
    }

    const ticket = await ticketService.startTicket(ticketId);

    res.json({
      success: true,
      data: ticket,
    });
  })
);

/**
 * POST /api/tickets/:ticketId/complete
 * Complete ticket (mark as done)
 */
router.post(
  '/tickets/:ticketId/complete',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;

    const ticket = await ticketService.completeTicket(ticketId);

    res.json({
      success: true,
      data: ticket,
    });
  })
);

/**
 * POST /api/tickets/:ticketId/block
 * Block ticket with blocker tickets
 */
router.post(
  '/tickets/:ticketId/block',
  authenticate,
  validateRequest(blockTicketSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const { blockerIds } = req.body;

    const ticket = await ticketService.blockTicket(ticketId, blockerIds);

    res.json({
      success: true,
      data: ticket,
    });
  })
);

/**
 * POST /api/tickets/:ticketId/unblock/:blockerId
 * Unblock ticket (remove blocker)
 */
router.post(
  '/tickets/:ticketId/unblock/:blockerId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId, blockerId } = req.params;

    const ticket = await ticketService.unblockTicket(ticketId, blockerId);

    res.json({
      success: true,
      data: ticket,
    });
  })
);

/**
 * POST /api/tickets/:ticketId/defects
 * Create defect ticket from parent ticket
 */
router.post(
  '/tickets/:ticketId/defects',
  authenticate,
  validateRequest(createDefectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const { title, description, runId } = req.body;

    const defect = await ticketService.createDefectTicket(ticketId, title, description, runId);

    res.status(201).json({
      success: true,
      data: defect,
    });
  })
);

/**
 * GET /api/runs/:runId/tickets
 * Get all tickets for a run
 */
router.get(
  '/runs/:runId/tickets',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { runId } = req.params;

    const tickets = await ticketService.getTicketsByRun(runId);

    res.json({
      success: true,
      data: tickets,
    });
  })
);

/**
 * GET /api/runs/:runId/tickets/next
 * Get next ticket to process in a run
 */
router.get(
  '/runs/:runId/tickets/next',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { runId } = req.params;

    const ticket = await ticketService.getNextTicketInRun(runId);

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: 'No available tickets to process',
      });
      return;
    }

    res.json({
      success: true,
      data: ticket,
    });
  })
);

export default router;

