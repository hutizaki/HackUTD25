/**
 * Ticket Statistics Routes
 * 
 * Provides comprehensive ticket data for frontend visualization:
 * - Ticket counts and statistics
 * - Progress percentages
 * - Current working tickets
 * - Completion status
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { Ticket, TicketStatus, TicketType } from '../models/Ticket';
import { Run } from '../models/Run';
import { ErrorMessages, createErrorResponse } from '../utils/errors';

const router = Router();

/**
 * GET /api/projects/:projectId/tickets/stats
 * Get ticket statistics for a project
 */
router.get(
  '/projects/:projectId/tickets/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;

    // Get all tickets for the project
    const tickets = await Ticket.find({ projectId });

    // Calculate statistics
    const stats = {
      total: tickets.length,
      byStatus: {
        NEW: tickets.filter((t) => t.status === TicketStatus.NEW).length,
        IN_PROGRESS: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        BLOCKED: tickets.filter((t) => t.status === TicketStatus.BLOCKED).length,
        REVIEW: tickets.filter((t) => t.status === TicketStatus.REVIEW).length,
        QA: tickets.filter((t) => t.status === TicketStatus.QA).length,
        DONE: tickets.filter((t) => t.status === TicketStatus.DONE).length,
      },
      byType: {
        EPIC: tickets.filter((t) => t.type === TicketType.EPIC).length,
        FEATURE: tickets.filter((t) => t.type === TicketType.FEATURE).length,
        TASK: tickets.filter((t) => t.type === TicketType.TASK).length,
        DEFECT: tickets.filter((t) => t.type === TicketType.DEFECT).length,
      },
      completion: {
        completed: tickets.filter((t) => t.status === TicketStatus.DONE).length,
        inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        pending: tickets.filter((t) => t.status === TicketStatus.NEW).length,
        blocked: tickets.filter((t) => t.status === TicketStatus.BLOCKED).length,
        percentage: tickets.length > 0 
          ? Math.round((tickets.filter((t) => t.status === TicketStatus.DONE).length / tickets.length) * 100)
          : 0,
      },
      currentlyWorking: tickets
        .filter((t) => t.status === TicketStatus.IN_PROGRESS)
        .map((t) => ({
          id: t._id,
          title: t.title,
          type: t.type,
          branch: t.branch,
        })),
    };

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/runs/:runId/tickets/stats
 * Get ticket statistics for a specific pipeline run
 */
router.get(
  '/runs/:runId/tickets/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { runId } = req.params;

    // Get all tickets for the run
    const tickets = await Ticket.find({ runId });

    // Get run details
    const run = await Run.findOne({ runId });

    if (!run) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      return;
    }

    // Calculate statistics
    const stats = {
      runId,
      runState: run.state,
      total: tickets.length,
      byStatus: {
        NEW: tickets.filter((t) => t.status === TicketStatus.NEW).length,
        IN_PROGRESS: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        BLOCKED: tickets.filter((t) => t.status === TicketStatus.BLOCKED).length,
        REVIEW: tickets.filter((t) => t.status === TicketStatus.REVIEW).length,
        QA: tickets.filter((t) => t.status === TicketStatus.QA).length,
        DONE: tickets.filter((t) => t.status === TicketStatus.DONE).length,
      },
      byType: {
        EPIC: tickets.filter((t) => t.type === TicketType.EPIC).length,
        FEATURE: tickets.filter((t) => t.type === TicketType.FEATURE).length,
        TASK: tickets.filter((t) => t.type === TicketType.TASK).length,
        DEFECT: tickets.filter((t) => t.type === TicketType.DEFECT).length,
      },
      completion: {
        completed: tickets.filter((t) => t.status === TicketStatus.DONE).length,
        inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        pending: tickets.filter((t) => t.status === TicketStatus.NEW).length,
        blocked: tickets.filter((t) => t.status === TicketStatus.BLOCKED).length,
        percentage: tickets.length > 0 
          ? Math.round((tickets.filter((t) => t.status === TicketStatus.DONE).length / tickets.length) * 100)
          : 0,
      },
      currentlyWorking: tickets
        .filter((t) => t.status === TicketStatus.IN_PROGRESS)
        .map((t) => ({
          id: t._id,
          title: t.title,
          type: t.type,
          branch: t.branch,
          prNumber: t.prNumber,
        })),
      timeline: run.timeline,
    };

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/runs/:runId/tickets/progress
 * Get detailed progress information for a pipeline run
 */
router.get(
  '/runs/:runId/tickets/progress',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { runId } = req.params;

    // Get all tickets for the run
    const tickets = await Ticket.find({ runId }).sort({ orderIndex: 1 });

    // Get run details
    const run = await Run.findOne({ runId });

    if (!run) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      return;
    }

    // Build progress data
    const progress = {
      runId,
      runState: run.state,
      startedAt: run.created_at,
      updatedAt: run.updated_at,
      totalTickets: tickets.length,
      completedTickets: tickets.filter((t) => t.status === TicketStatus.DONE).length,
      overallPercentage: tickets.length > 0 
        ? Math.round((tickets.filter((t) => t.status === TicketStatus.DONE).length / tickets.length) * 100)
        : 0,
      tickets: tickets.map((t) => ({
        id: t._id,
        title: t.title,
        type: t.type,
        status: t.status,
        branch: t.branch,
        prNumber: t.prNumber,
        parentId: t.parentId,
        dependencies: t.dependencies,
        acceptanceCriteria: t.acceptanceCriteria,
        isBlocked: t.status === TicketStatus.BLOCKED,
        isComplete: t.status === TicketStatus.DONE,
        isWorking: t.status === TicketStatus.IN_PROGRESS,
      })),
      phases: {
        PM: {
          status: run.state === 'PM_RUNNING' ? 'IN_PROGRESS' : run.state === 'PM_COMPLETED' || run.state === 'DEV_RUNNING' || run.state === 'DEV_COMPLETED' || run.state === 'QA_RUNNING' || run.state === 'QA_COMPLETED' || run.state === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          percentage: run.state === 'PM_RUNNING' ? 50 : run.state === 'PM_COMPLETED' || run.state === 'DEV_RUNNING' || run.state === 'DEV_COMPLETED' || run.state === 'QA_RUNNING' || run.state === 'QA_COMPLETED' || run.state === 'COMPLETED' ? 100 : 0,
        },
        DEV: {
          status: run.state === 'DEV_RUNNING' ? 'IN_PROGRESS' : run.state === 'DEV_COMPLETED' || run.state === 'QA_RUNNING' || run.state === 'QA_COMPLETED' || run.state === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          percentage: tickets.length > 0 
            ? Math.round((tickets.filter((t) => t.status === TicketStatus.REVIEW || t.status === TicketStatus.QA || t.status === TicketStatus.DONE).length / tickets.length) * 100)
            : 0,
        },
        QA: {
          status: run.state === 'QA_RUNNING' ? 'IN_PROGRESS' : run.state === 'QA_COMPLETED' || run.state === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          percentage: tickets.length > 0 
            ? Math.round((tickets.filter((t) => t.status === TicketStatus.DONE).length / tickets.length) * 100)
            : 0,
        },
      },
      latestActivity: run.timeline && run.timeline.length > 0 
        ? run.timeline[run.timeline.length - 1]
        : null,
    };

    res.json({
      success: true,
      data: progress,
    });
  })
);

/**
 * GET /api/tickets/:ticketId/details
 * Get detailed information about a specific ticket
 */
router.get(
  '/tickets/:ticketId/details',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId)
      .populate('parentId', 'title type status')
      .populate('dependencies', 'title type status');

    if (!ticket) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
      return;
    }

    // Get children
    const children = await Ticket.find({ parentId: ticketId });

    // Check if blocked
    const isBlocked = await ticket.isBlocked();
    const canStart = await ticket.canStart();

    const details = {
      id: ticket._id,
      title: ticket.title,
      description: ticket.body,
      type: ticket.type,
      status: ticket.status,
      branch: ticket.branch,
      prNumber: ticket.prNumber,
      labels: ticket.labels,
      acceptanceCriteria: ticket.acceptanceCriteria,
      parent: ticket.parentId,
      children: children.map((c) => ({
        id: c._id,
        title: c.title,
        type: c.type,
        status: c.status,
      })),
      dependencies: ticket.dependencies,
      isBlocked,
      canStart,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      progress: {
        isComplete: ticket.status === TicketStatus.DONE,
        isWorking: ticket.status === TicketStatus.IN_PROGRESS,
        isPending: ticket.status === TicketStatus.NEW,
        isBlocked: ticket.status === TicketStatus.BLOCKED,
        percentage: ticket.status === TicketStatus.DONE ? 100 
          : ticket.status === TicketStatus.IN_PROGRESS ? 50 
          : 0,
      },
    };

    res.json({
      success: true,
      data: details,
    });
  })
);

/**
 * GET /api/projects/:projectId/tickets/hierarchy
 * Get hierarchical ticket structure for visualization
 */
router.get(
  '/projects/:projectId/tickets/hierarchy',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;

    // Get all tickets for the project
    const tickets = await Ticket.find({ projectId }).sort({ orderIndex: 1 });

    // Build hierarchy (root tickets with no parent)
    const rootTickets = tickets.filter((t) => !t.parentId);

    const buildHierarchy = (ticket: any): any => {
      const children = tickets.filter((t) => 
        t.parentId && t.parentId.toString() === ticket._id.toString()
      );

      return {
        id: ticket._id,
        title: ticket.title,
        type: ticket.type,
        status: ticket.status,
        branch: ticket.branch,
        prNumber: ticket.prNumber,
        labels: ticket.labels,
        acceptanceCriteria: ticket.acceptanceCriteria?.length || 0,
        dependencies: ticket.dependencies?.length || 0,
        isComplete: ticket.status === TicketStatus.DONE,
        isWorking: ticket.status === TicketStatus.IN_PROGRESS,
        isBlocked: ticket.status === TicketStatus.BLOCKED,
        children: children.map(buildHierarchy),
      };
    };

    const hierarchy = rootTickets.map(buildHierarchy);

    res.json({
      success: true,
      data: {
        projectId,
        totalTickets: tickets.length,
        hierarchy,
      },
    });
  })
);

export default router;

