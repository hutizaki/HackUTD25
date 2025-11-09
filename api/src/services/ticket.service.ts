import { Ticket, ITicket, TicketStatus, ITicketComment } from '../models/Ticket';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

/**
 * Ticket creation data
 */
export interface CreateTicketData {
  title: string;
  description: string;
  type: 'epic' | 'story' | 'task' | 'bug';
  priority: 'high' | 'medium' | 'low';
  projectId: string;
  runId: string;
  branchName?: string;
  baseBranch?: string;
  parentTicketId?: number;
  acceptanceCriteria: string[];
  estimatedHours?: number;
  implementationNotes?: string;
  filesAffected?: string[];
  assignedTo?: 'pm' | 'dev' | 'qa';
}

/**
 * Ticket service for managing tickets
 */
export class TicketService {
  /**
   * Create a new ticket
   */
  async createTicket(data: CreateTicketData): Promise<ITicket> {
    try {
      // Get next ticket number for this project
      const lastTicket = await Ticket.findOne({
        projectId: new mongoose.Types.ObjectId(data.projectId),
      })
        .sort({ ticketNumber: -1 })
        .limit(1);

      const ticketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;

      // Create ticket
      const ticket = await Ticket.create({
        ticketNumber,
        title: data.title,
        description: data.description,
        type: data.type,
        status: 'planned',
        priority: data.priority,
        projectId: new mongoose.Types.ObjectId(data.projectId),
        runId: data.runId,
        branchName: data.branchName,
        baseBranch: data.baseBranch || 'main',
        parentTicketId: data.parentTicketId,
        childTicketIds: [],
        acceptanceCriteria: data.acceptanceCriteria.map((desc) => ({
          description: desc,
          completed: false,
        })),
        estimatedHours: data.estimatedHours,
        implementationNotes: data.implementationNotes,
        filesAffected: data.filesAffected || [],
        assignedTo: data.assignedTo,
        createdBy: 'pm',
        comments: [],
      });

      // If has parent, add to parent's children
      if (data.parentTicketId) {
        await Ticket.findOneAndUpdate(
          {
            projectId: new mongoose.Types.ObjectId(data.projectId),
            ticketNumber: data.parentTicketId,
          },
          {
            $addToSet: { childTicketIds: ticketNumber },
          }
        );
      }

      logger.info('Ticket created', {
        ticketNumber,
        title: data.title,
        type: data.type,
      });

      return ticket;
    } catch (error) {
      logger.error('Error creating ticket', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    projectId: string,
    ticketNumber: number,
    status: TicketStatus,
    comment?: string
  ): Promise<ITicket | null> {
    try {
      const update: any = { status };

      if (comment) {
        update.$push = {
          comments: {
            agent: status.includes('qa') ? 'qa' : status.includes('dev') || status.includes('progress') || status.includes('review') ? 'dev' : 'pm',
            timestamp: new Date(),
            message: comment,
          },
        };
      }

      const ticket = await Ticket.findOneAndUpdate(
        {
          projectId: new mongoose.Types.ObjectId(projectId),
          ticketNumber,
        },
        update,
        { new: true }
      );

      if (ticket) {
        logger.info('Ticket status updated', {
          ticketNumber,
          status,
        });
      }

      return ticket;
    } catch (error) {
      logger.error('Error updating ticket status', {
        ticketNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add comment to ticket
   */
  async addComment(
    projectId: string,
    ticketNumber: number,
    agent: 'pm' | 'dev' | 'qa',
    message: string,
    data?: Record<string, unknown>
  ): Promise<ITicket | null> {
    try {
      const ticket = await Ticket.findOneAndUpdate(
        {
          projectId: new mongoose.Types.ObjectId(projectId),
          ticketNumber,
        },
        {
          $push: {
            comments: {
              agent,
              timestamp: new Date(),
              message,
              data,
            },
          },
        },
        { new: true }
      );

      return ticket;
    } catch (error) {
      logger.error('Error adding comment', {
        ticketNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get ticket by number
   */
  async getTicket(projectId: string, ticketNumber: number): Promise<ITicket | null> {
    try {
      return await Ticket.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        ticketNumber,
      });
    } catch (error) {
      logger.error('Error getting ticket', {
        ticketNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List tickets for a run
   */
  async listTickets(runId: string): Promise<ITicket[]> {
    try {
      return await Ticket.find({ runId }).sort({ ticketNumber: 1 });
    } catch (error) {
      logger.error('Error listing tickets', {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get tickets by status
   */
  async getTicketsByStatus(runId: string, status: TicketStatus): Promise<ITicket[]> {
    try {
      return await Ticket.find({ runId, status }).sort({ priority: -1, ticketNumber: 1 });
    } catch (error) {
      logger.error('Error getting tickets by status', {
        runId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark acceptance criterion as completed
   */
  async markCriterionComplete(
    projectId: string,
    ticketNumber: number,
    criterionIndex: number,
    verifiedBy: 'pm' | 'dev' | 'qa'
  ): Promise<ITicket | null> {
    try {
      const ticket = await this.getTicket(projectId, ticketNumber);
      if (!ticket) return null;

      if (criterionIndex < 0 || criterionIndex >= ticket.acceptanceCriteria.length) {
        throw new Error('Invalid criterion index');
      }

      ticket.acceptanceCriteria[criterionIndex].completed = true;
      ticket.acceptanceCriteria[criterionIndex].verifiedBy = verifiedBy;
      ticket.acceptanceCriteria[criterionIndex].verifiedAt = new Date();

      await ticket.save();

      return ticket;
    } catch (error) {
      logger.error('Error marking criterion complete', {
        ticketNumber,
        criterionIndex,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if all acceptance criteria are met
   */
  async areAllCriteriaMet(projectId: string, ticketNumber: number): Promise<boolean> {
    try {
      const ticket = await this.getTicket(projectId, ticketNumber);
      if (!ticket) return false;

      return ticket.acceptanceCriteria.every((criterion) => criterion.completed);
    } catch (error) {
      logger.error('Error checking criteria', {
        ticketNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

/**
 * Create ticket service instance
 */
export function createTicketService(): TicketService {
  return new TicketService();
}
