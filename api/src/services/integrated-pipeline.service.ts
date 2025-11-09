import { Run, IRun, RunState } from '../models/Run';
import { createAgentService } from './agent.service';
import * as ticketService from './ticket.service';
import { TicketType, TicketStatus } from '../models/Ticket';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integrated Pipeline Service
 * Combines ticket management with agent execution for end-to-end workflow
 */

export interface IntegratedPipelineRequest {
  projectId: string;
  userId: string;
  prompt: string;
  repository: string;
  ref?: string;
}

export class IntegratedPipelineService {
  private agentService = createAgentService();

  /**
   * Start integrated pipeline with ticket creation
   */
  async startIntegratedPipeline(request: IntegratedPipelineRequest): Promise<IRun> {
    try {
      const runId = `run-${Date.now()}-${uuidv4().substring(0, 8)}`;

      logger.info('Starting integrated pipeline', {
        runId,
        projectId: request.projectId,
        prompt: request.prompt,
      });

      // Create run record
      const run = await Run.create({
        runId,
        projectId: new mongoose.Types.ObjectId(request.projectId),
        userId: new mongoose.Types.ObjectId(request.userId),
        state: 'CREATED',
        prompt: request.prompt,
        repository: request.repository,
        ref: request.ref || 'main',
        timeline: [
          {
            phase: 'INIT',
            timestamp: new Date(),
            level: 'info',
            message: 'Integrated pipeline created',
            data: { prompt: request.prompt },
          },
        ],
      });

      // Create root ticket for this run
      const rootTicket = await ticketService.createTicket({
        projectId: request.projectId,
        type: TicketType.EPIC,
        title: `Pipeline: ${request.prompt.substring(0, 50)}`,
        description: request.prompt,
        runId,
        labels: ['pipeline', 'auto-generated'],
      });

      logger.info('Root ticket created', {
        runId,
        ticketId: rootTicket._id,
        title: rootTicket.title,
      });

      // Start pipeline execution asynchronously
      if (rootTicket._id) {
        this.executePipeline(run, rootTicket._id.toString()).catch((error) => {
          logger.error('Pipeline execution failed', {
            runId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }

      return run;
    } catch (error) {
      logger.error('Failed to start integrated pipeline', { error, request });
      throw error;
    }
  }

  /**
   * Execute the full pipeline: PM -> Create Tickets -> DEV -> QA -> Merge
   */
  private async executePipeline(run: IRun, rootTicketId: string): Promise<void> {
    try {
      // Phase 1: PM Agent - Create specification
      await this.updateRunState(run.runId, 'PM_RUNNING', {
        phase: 'PM',
        timestamp: new Date(),
        level: 'info',
        message: 'PM Agent: Creating specification',
      });

      const pmResult = await this.executePMAgent(run);

      await this.updateRunState(run.runId, 'PM_COMPLETED', {
        phase: 'PM',
        timestamp: new Date(),
        level: 'success',
        message: 'PM Agent: Specification created',
        data: pmResult,
      });

      // Phase 2: Create child tickets based on PM output
      await this.updateRunState(run.runId, 'PM_COMPLETED' as any, {
        phase: 'TICKETS',
        timestamp: new Date(),
        level: 'info',
        message: 'Creating tickets from specification',
      });

      const tickets = await this.createTicketsFromSpec(
        run.projectId.toString(),
        run.runId,
        rootTicketId,
        pmResult.specification
      );

      logger.info('Tickets created', {
        runId: run.runId,
        ticketCount: tickets.length,
      });

      // Phase 3: Execute tickets sequentially (DEV -> QA for each)
      await this.updateRunState(run.runId, 'DEV_RUNNING' as any, {
        phase: 'EXECUTION',
        timestamp: new Date(),
        level: 'info',
        message: `Processing ${tickets.length} tickets`,
      });

      for (const ticket of tickets) {
        if (ticket._id) {
          await this.executeTicket(run, ticket._id.toString());
        }
      }

      // Phase 4: All done - mark as complete
      await this.updateRunState(run.runId, 'COMPLETED' as any, {
        phase: 'COMPLETE',
        timestamp: new Date(),
        level: 'success',
        message: 'Pipeline completed successfully',
      });

      // Mark root ticket as complete
      await ticketService.completeTicket(rootTicketId);

      logger.info('Pipeline completed', { runId: run.runId });
    } catch (error) {
      logger.error('Pipeline execution error', {
        runId: run.runId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(run.runId, 'FAILED', {
        phase: 'ERROR',
        timestamp: new Date(),
        level: 'error',
        message: `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      throw error;
    }
  }

  /**
   * Execute PM Agent
   */
  private async executePMAgent(run: IRun): Promise<any> {
    try {
      const agentRun = await this.agentService.executeAgent({
        projectId: run.projectId.toString(),
        agentType: 'spec-writer',
        runId: run.runId,
        prompt: `Create a detailed specification for: ${run.prompt}`,
        repository: run.repository,
        ref: run.ref || 'main',
      });

      // Poll for completion
      const result = await this.pollAgentCompletion(agentRun.agentRunId, 60);

      return {
        specification: result.output?.content || run.prompt,
        agentRunId: agentRun.agentRunId,
      };
    } catch (error) {
      logger.error('PM agent execution failed', { runId: run.runId, error });
      throw error;
    }
  }

  /**
   * Create tickets from PM specification
   */
  private async createTicketsFromSpec(
    projectId: string,
    runId: string,
    parentTicketId: string,
    specification: string
  ): Promise<any[]> {
    try {
      // Simple ticket creation - in production, PM agent would return structured tasks
      // For now, create 2 feature tickets as example
      const tickets = [];

      const feature1 = await ticketService.createTicket({
        projectId,
        type: TicketType.FEATURE,
        title: 'Implement core functionality',
        description: specification,
        parentId: parentTicketId,
        runId,
        labels: ['feature', 'auto-generated'],
      });
      tickets.push(feature1);

      const feature2 = await ticketService.createTicket({
        projectId,
        type: TicketType.TASK,
        title: 'Add tests and documentation',
        description: 'Create tests and documentation for the implementation',
        parentId: parentTicketId,
        runId,
        dependencies: feature1._id ? [feature1._id.toString()] : [],
        labels: ['task', 'auto-generated'],
      });
      tickets.push(feature2);

      return tickets;
    } catch (error) {
      logger.error('Failed to create tickets from spec', { error, projectId, runId });
      throw error;
    }
  }

  /**
   * Execute a single ticket: DEV -> QA -> Complete/Block
   */
  private async executeTicket(run: IRun, ticketId: string): Promise<void> {
    try {
      const ticket = await ticketService.getTicket(ticketId);
      if (!ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      // Check if ticket can start
      const canStart = await ticketService.canTicketStart(ticketId);
      if (!canStart) {
        logger.warn('Ticket cannot start - dependencies not met', {
          runId: run.runId,
          ticketId,
        });
        return;
      }

      // Start ticket
      await ticketService.startTicket(ticketId);

      logger.info('Executing ticket', {
        runId: run.runId,
        ticketId,
        title: ticket.title,
      });

      // DEV Agent - Implement the ticket
      await this.updateRunState(run.runId, 'DEV_RUNNING', {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'info',
        message: `DEV Agent: Implementing ticket ${ticket.title}`,
        data: { ticketId },
      });

      const devResult = await this.executeDevAgent(run, ticket);

      await this.updateRunState(run.runId, 'DEV_COMPLETED', {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'success',
        message: `DEV Agent: Implementation complete for ${ticket.title}`,
        data: devResult,
      });

      // Update ticket with branch and PR info
      await ticketService.updateTicket(ticketId, {
        status: TicketStatus.REVIEW,
        branch: devResult.branch,
        prNumber: devResult.prNumber,
        prUrl: devResult.prUrl,
      });

      // QA Agent - Review the implementation
      await this.updateRunState(run.runId, 'QA_RUNNING', {
        phase: 'QA',
        timestamp: new Date(),
        level: 'info',
        message: `QA Agent: Reviewing ticket ${ticket.title}`,
        data: { ticketId },
      });

      const qaResult = await this.executeQAAgent(run, ticket, devResult);

      await this.updateRunState(run.runId, 'QA_COMPLETED', {
        phase: 'QA',
        timestamp: new Date(),
        level: 'success',
        message: `QA Agent: Review complete for ${ticket.title}`,
        data: qaResult,
      });

      // Check QA results - create defects if issues found
      if (qaResult.issuesFound && qaResult.issues?.length > 0) {
        logger.warn('QA found issues', {
          runId: run.runId,
          ticketId,
          issueCount: qaResult.issues.length,
        });

        // Create defect tickets
        const defects = [];
        for (const issue of qaResult.issues) {
          const defect = await ticketService.createDefectTicket(
            ticketId,
            issue.title || 'QA Issue',
            issue.description || 'Issue found during QA review',
            run.runId
          );
          defects.push(defect);
        }

        logger.info('Defect tickets created', {
          runId: run.runId,
          ticketId,
          defectCount: defects.length,
        });

        // Ticket is now blocked - will need manual resolution
        return;
      }

      // No issues - mark ticket as complete
      await ticketService.completeTicket(ticketId);

      logger.info('Ticket completed', {
        runId: run.runId,
        ticketId,
        title: ticket.title,
      });
    } catch (error) {
      logger.error('Failed to execute ticket', {
        runId: run.runId,
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute DEV Agent
   */
  private async executeDevAgent(run: IRun, ticket: any): Promise<any> {
    try {
      const agentRun = await this.agentService.executeAgent({
        projectId: run.projectId.toString(),
        agentType: 'developer-implementer',
        runId: run.runId,
        prompt: `Implement: ${ticket.title}\n\nDescription: ${ticket.description}`,
        repository: run.repository,
        ref: run.ref || 'main',
      });

      const result = await this.pollAgentCompletion(agentRun.agentRunId, 60);

      return {
        branch: result.output?.branch || `feature/${ticket._id}`,
        prNumber: result.output?.prNumber,
        prUrl: result.output?.prUrl,
        agentRunId: agentRun.agentRunId,
      };
    } catch (error) {
      logger.error('DEV agent execution failed', { runId: run.runId, ticketId: ticket._id, error });
      throw error;
    }
  }

  /**
   * Execute QA Agent
   */
  private async executeQAAgent(run: IRun, ticket: any, devResult: any): Promise<any> {
    try {
      const agentRun = await this.agentService.executeAgent({
        projectId: run.projectId.toString(),
        agentType: 'qa-tester',
        runId: run.runId,
        prompt: `Review implementation for: ${ticket.title}\n\nBranch: ${devResult.branch}\nPR: ${devResult.prUrl}`,
        repository: run.repository,
        ref: devResult.branch,
      });

      const result = await this.pollAgentCompletion(agentRun.agentRunId, 60);

      // Parse QA results
      const issuesFound = result.output?.issuesFound || false;
      const issues = result.output?.issues || [];

      return {
        issuesFound,
        issues,
        agentRunId: agentRun.agentRunId,
      };
    } catch (error) {
      logger.error('QA agent execution failed', { runId: run.runId, ticketId: ticket._id, error });
      throw error;
    }
  }

  /**
   * Poll agent for completion
   */
  private async pollAgentCompletion(agentRunId: string, maxAttempts: number = 60): Promise<any> {
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const agentRun = await this.agentService.getAgentRunStatus(agentRunId);

      if (!agentRun) {
        throw new Error(`Agent run not found: ${agentRunId}`);
      }

      if (agentRun.status === 'completed') {
        return agentRun;
      }

      if (agentRun.status === 'failed') {
        throw new Error(`Agent run failed: ${agentRun.error || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Agent run timed out after ${maxAttempts * pollInterval}ms`);
  }

  /**
   * Update run state
   */
  private async updateRunState(runId: string, state: RunState, timelineEntry: any): Promise<void> {
    try {
      const run = await Run.findOne({ runId });
      if (!run) {
        throw new Error(`Run not found: ${runId}`);
      }

      run.state = state;
      run.timeline.push(timelineEntry);
      await run.save();
    } catch (error) {
      logger.error('Failed to update run state', { runId, state, error });
      throw error;
    }
  }

  /**
   * Get run status
   */
  async getRunStatus(runId: string): Promise<IRun | null> {
    try {
      const run = await Run.findOne({ runId })
        .populate('pmAgentRunId')
        .populate('devAgentRunId')
        .populate('qaAgentRunId');

      return run;
    } catch (error) {
      logger.error('Failed to get run status', { runId, error });
      throw error;
    }
  }

  /**
   * List runs for a project
   */
  async listRuns(projectId: string): Promise<IRun[]> {
    try {
      const runs = await Run.find({
        projectId: new mongoose.Types.ObjectId(projectId),
      }).sort({ created_at: -1 });

      return runs;
    } catch (error) {
      logger.error('Failed to list runs', { projectId, error });
      throw error;
    }
  }
}

/**
 * Factory function
 */
export function createIntegratedPipelineService(): IntegratedPipelineService {
  return new IntegratedPipelineService();
}

