import mongoose from 'mongoose';
import { Ticket, ITicket, TicketType, TicketStatus } from '../models/Ticket';
import { Project } from '../models/Project';
import { logger } from '../config/logger';

/**
 * Ticket Service
 * Manages ticket lifecycle and integration with pipeline
 */

export interface CreateTicketInput {
  projectId: string;
  type: TicketType;
  title: string;
  description: string;
  parentId?: string;
  acceptanceCriteria?: string[];
  labels?: string[];
  runId?: string;
  dependencies?: string[];
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  branch?: string;
  prNumber?: number;
  prUrl?: string;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  labels?: string[];
}

/**
 * Create a new ticket
 */
export async function createTicket(input: CreateTicketInput): Promise<ITicket> {
  try {
    // Validate project exists
    const project = await Project.findById(input.projectId);
    if (!project) {
      throw new Error(`Project not found: ${input.projectId}`);
    }

    // Create ticket
    const ticket = new Ticket({
      projectId: new mongoose.Types.ObjectId(input.projectId),
      type: input.type,
      title: input.title,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria || [],
      labels: input.labels || [],
      runId: input.runId,
      status: TicketStatus.NEW,
      children: [],
      dependencies: input.dependencies
        ? input.dependencies.map((id) => new mongoose.Types.ObjectId(id))
        : [],
      blockers: [],
    });

    // Set parent if provided
    if (input.parentId) {
      ticket.parentId = new mongoose.Types.ObjectId(input.parentId);

      // Add this ticket as child to parent
      const parent = await Ticket.findById(input.parentId);
      if (parent && ticket._id) {
        await parent.addChild(ticket._id as mongoose.Types.ObjectId);
      }
    }

    await ticket.save();

    logger.info('Ticket created', {
      ticketId: ticket._id,
      projectId: input.projectId,
      type: input.type,
      title: input.title,
    });

    return ticket;
  } catch (error) {
    logger.error('Failed to create ticket', { error, input });
    throw error;
  }
}

/**
 * Get ticket by ID
 */
export async function getTicket(ticketId: string): Promise<ITicket | null> {
  try {
    const ticket = await Ticket.findById(ticketId)
      .populate('parentId')
      .populate('children')
      .populate('dependencies')
      .populate('blockers');

    return ticket;
  } catch (error) {
    logger.error('Failed to get ticket', { error, ticketId });
    throw error;
  }
}

/**
 * Get tickets by project
 */
export async function getTicketsByProject(
  projectId: string,
  filters?: {
    status?: TicketStatus;
    type?: TicketType;
    runId?: string;
  }
): Promise<ITicket[]> {
  try {
    const query: any = { projectId: new mongoose.Types.ObjectId(projectId) };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.runId) {
      query.runId = filters.runId;
    }

    const tickets = await Ticket.find(query)
      .populate('parentId')
      .populate('children')
      .sort({ created_at: -1 });

    return tickets;
  } catch (error) {
    logger.error('Failed to get tickets by project', { error, projectId, filters });
    throw error;
  }
}

/**
 * Get root tickets (no parent) for a project
 */
export async function getRootTickets(projectId: string): Promise<ITicket[]> {
  try {
    const tickets = await Ticket.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      parentId: { $exists: false },
    }).sort({ created_at: -1 });

    return tickets;
  } catch (error) {
    logger.error('Failed to get root tickets', { error, projectId });
    throw error;
  }
}

/**
 * Get ticket hierarchy (ticket + all descendants)
 */
export async function getTicketHierarchy(ticketId: string): Promise<ITicket[]> {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return [];
    }

    const hierarchy: ITicket[] = [ticket];

    // Recursively get children
    async function getChildren(parentId: mongoose.Types.ObjectId): Promise<void> {
      const children = await Ticket.find({ parentId });
      for (const child of children) {
        hierarchy.push(child);
        if (child._id) {
          await getChildren(child._id as mongoose.Types.ObjectId);
        }
      }
    }

    if (ticket._id) {
      await getChildren(ticket._id as mongoose.Types.ObjectId);
    }

    return hierarchy;
  } catch (error) {
    logger.error('Failed to get ticket hierarchy', { error, ticketId });
    throw error;
  }
}

/**
 * Update ticket
 */
export async function updateTicket(
  ticketId: string,
  updates: UpdateTicketInput
): Promise<ITicket | null> {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Update fields
    if (updates.title !== undefined) ticket.title = updates.title;
    if (updates.description !== undefined) ticket.description = updates.description;
    if (updates.status !== undefined) ticket.status = updates.status;
    if (updates.branch !== undefined) ticket.branch = updates.branch;
    if (updates.prNumber !== undefined) ticket.prNumber = updates.prNumber;
    if (updates.prUrl !== undefined) ticket.prUrl = updates.prUrl;
    if (updates.githubIssueNumber !== undefined)
      ticket.githubIssueNumber = updates.githubIssueNumber;
    if (updates.githubIssueUrl !== undefined) ticket.githubIssueUrl = updates.githubIssueUrl;
    if (updates.labels !== undefined) ticket.labels = updates.labels;

    await ticket.save();

    logger.info('Ticket updated', {
      ticketId,
      updates,
    });

    return ticket;
  } catch (error) {
    logger.error('Failed to update ticket', { error, ticketId, updates });
    throw error;
  }
}

/**
 * Delete ticket
 */
export async function deleteTicket(ticketId: string): Promise<void> {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Remove from parent's children
    if (ticket.parentId) {
      const parent = await Ticket.findById(ticket.parentId);
      if (parent && ticket._id) {
        parent.children = parent.children.filter((id) => !id.equals(ticket._id as mongoose.Types.ObjectId));
        await parent.save();
      }
    }

    // Delete ticket
    await Ticket.findByIdAndDelete(ticketId);

    logger.info('Ticket deleted', { ticketId });
  } catch (error) {
    logger.error('Failed to delete ticket', { error, ticketId });
    throw error;
  }
}

/**
 * Check if ticket can start (dependencies resolved, not blocked)
 */
export async function canTicketStart(ticketId: string): Promise<boolean> {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return false;
    }

    const canStart = await ticket.canStart();
    const isBlocked = await ticket.isBlocked();

    return canStart && !isBlocked;
  } catch (error) {
    logger.error('Failed to check if ticket can start', { error, ticketId });
    return false;
  }
}

/**
 * Get next ticket to process in a run
 */
export async function getNextTicketInRun(runId: string): Promise<ITicket | null> {
  try {
    // Find tickets in this run that are NEW and can start
    const tickets = await Ticket.find({
      runId,
      status: TicketStatus.NEW,
    });

    for (const ticket of tickets) {
      if (ticket._id) {
        const canStart = await canTicketStart(ticket._id.toString());
        if (canStart) {
          return ticket;
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('Failed to get next ticket in run', { error, runId });
    return null;
  }
}

/**
 * Mark ticket as in progress
 */
export async function startTicket(ticketId: string): Promise<ITicket | null> {
  try {
    const ticket = await updateTicket(ticketId, { status: TicketStatus.IN_PROGRESS });

    logger.info('Ticket started', { ticketId });

    return ticket;
  } catch (error) {
    logger.error('Failed to start ticket', { error, ticketId });
    throw error;
  }
}

/**
 * Mark ticket as complete
 */
export async function completeTicket(ticketId: string): Promise<ITicket | null> {
  try {
    const ticket = await updateTicket(ticketId, { status: TicketStatus.DONE });

    logger.info('Ticket completed', { ticketId });

    return ticket;
  } catch (error) {
    logger.error('Failed to complete ticket', { error, ticketId });
    throw error;
  }
}

/**
 * Mark ticket as blocked
 */
export async function blockTicket(
  ticketId: string,
  blockerIds: string[]
): Promise<ITicket | null> {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Add blockers
    for (const blockerId of blockerIds) {
      await ticket.addBlocker(new mongoose.Types.ObjectId(blockerId));
    }

    // Update status
    await ticket.updateStatus(TicketStatus.BLOCKED);

    logger.info('Ticket blocked', { ticketId, blockerIds });

    return ticket;
  } catch (error) {
    logger.error('Failed to block ticket', { error, ticketId, blockerIds });
    throw error;
  }
}

/**
 * Unblock ticket (remove blocker)
 */
export async function unblockTicket(
  ticketId: string,
  blockerId: string
): Promise<ITicket | null> {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Remove blocker
    await ticket.removeBlocker(new mongoose.Types.ObjectId(blockerId));

    // Check if still blocked
    const isBlocked = await ticket.isBlocked();
    if (!isBlocked && ticket.status === TicketStatus.BLOCKED) {
      await ticket.updateStatus(TicketStatus.NEW);
    }

    logger.info('Ticket unblocked', { ticketId, blockerId });

    return ticket;
  } catch (error) {
    logger.error('Failed to unblock ticket', { error, ticketId, blockerId });
    throw error;
  }
}

/**
 * Create defect ticket from QA review
 */
export async function createDefectTicket(
  parentTicketId: string,
  title: string,
  description: string,
  runId?: string
): Promise<ITicket> {
  try {
    const parentTicket = await Ticket.findById(parentTicketId);
    if (!parentTicket) {
      throw new Error(`Parent ticket not found: ${parentTicketId}`);
    }

    // Create defect ticket
    const defect = await createTicket({
      projectId: parentTicket.projectId.toString(),
      type: TicketType.DEFECT,
      title,
      description,
      parentId: parentTicketId,
      labels: ['defect', 'qa-found'],
      runId: runId || parentTicket.runId,
    });

    // Block parent ticket with this defect
    await parentTicket.addBlocker(defect._id as mongoose.Types.ObjectId);
    await parentTicket.updateStatus(TicketStatus.BLOCKED);

    logger.info('Defect ticket created', {
      defectId: defect._id,
      parentTicketId,
      title,
    });

    return defect;
  } catch (error) {
    logger.error('Failed to create defect ticket', { error, parentTicketId, title });
    throw error;
  }
}

/**
 * Get tickets by status
 */
export async function getTicketsByStatus(
  projectId: string,
  status: TicketStatus
): Promise<ITicket[]> {
  return getTicketsByProject(projectId, { status });
}

/**
 * Get tickets by run
 */
export async function getTicketsByRun(runId: string): Promise<ITicket[]> {
  try {
    const tickets = await Ticket.find({ runId })
      .populate('parentId')
      .populate('children')
      .sort({ created_at: -1 });

    return tickets;
  } catch (error) {
    logger.error('Failed to get tickets by run', { error, runId });
    throw error;
  }
}

