/**
 * Mock Pipeline Service
 * 
 * This service simulates the full PM -> DEV -> QA workflow without requiring
 * actual GitHub access or Cursor Cloud Agents. Perfect for testing the
 * ticketing system and pipeline orchestration.
 */

import { Run, IRun, RunState, ITimelineEntry } from '../models/Run';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as ticketService from './ticket.service';
import { Ticket, ITicket, TicketStatus, TicketType } from '../models/Ticket';

interface MockPipelineRequest {
  projectId: string;
  userId: string;
  prompt: string;
  repository?: string;
  ref?: string;
}

interface MockAgentResult {
  success: boolean;
  output: string;
  branch?: string;
  prNumber?: number;
  issuesFound?: boolean;
}

export class MockPipelineService {
  /**
   * Start a mock pipeline run
   */
  async startMockPipeline(request: MockPipelineRequest): Promise<IRun> {
    const runId = `run-${Date.now()}-${uuidv4().substring(0, 8)}`;

    logger.info('Starting mock pipeline', { runId, projectId: request.projectId });

    // Create Run document
    const run = new Run({
      runId,
      projectId: new mongoose.Types.ObjectId(request.projectId),
      userId: new mongoose.Types.ObjectId(request.userId),
      state: 'CREATED' as RunState,
      prompt: request.prompt,
      repository: request.repository || 'mock://repository',
      ref: request.ref || 'main',
      timeline: [
        {
          phase: 'INIT',
          timestamp: new Date(),
          level: 'info',
          message: 'Mock pipeline created',
          data: { prompt: request.prompt },
        },
      ],
    });

    await run.save();

    // Create root Epic ticket
    const rootTicket = await ticketService.createTicket({
      projectId: request.projectId,
      type: TicketType.EPIC,
      title: `Pipeline: ${request.prompt.substring(0, 50)}`,
      description: `Root epic for pipeline run: ${runId}\n\nPrompt: ${request.prompt}`,
      runId,
      labels: ['pipeline-root', 'auto-generated'],
      id: Date.now(),
    });

    // Execute pipeline asynchronously
    if (rootTicket._id) {
      this.executeMockPipeline(run, rootTicket._id.toString()).catch((error) => {
        logger.error('Mock pipeline execution failed', {
          runId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return run;
  }

  /**
   * Execute the full mock pipeline
   */
  private async executeMockPipeline(run: IRun, rootTicketId: string): Promise<void> {
    try {
      // Phase 1: PM Agent - Create specification and delegate tasks
      await this.updateRunState(run.runId, 'PM_RUNNING' as RunState, {
        phase: 'PM',
        timestamp: new Date(),
        level: 'info',
        message: 'PM Agent: Analyzing requirements and creating specification',
      });

      // Simulate PM thinking time
      await this.sleep(2000);

      const pmResult = await this.executeMockPMAgent(run);

      await this.updateRunState(run.runId, 'PM_COMPLETED' as RunState, {
        phase: 'PM',
        timestamp: new Date(),
        level: 'success',
        message: 'PM Agent: Specification complete, creating task breakdown',
        data: { specification: pmResult.output },
      });

      // Phase 2: PM creates child tickets (Features and Tasks)
      await this.updateRunState(run.runId, 'PM_COMPLETED' as RunState, {
        phase: 'TICKETS',
        timestamp: new Date(),
        level: 'info',
        message: 'PM Agent: Creating hierarchical ticket structure',
      });

      const tickets = await this.createMockTicketsFromSpec(
        run.projectId.toString(),
        run.runId,
        rootTicketId,
        pmResult.output
      );

      await this.updateRunState(run.runId, 'PM_COMPLETED' as RunState, {
        phase: 'TICKETS',
        timestamp: new Date(),
        level: 'success',
        message: `PM Agent: Created ${tickets.length} tickets for implementation`,
        data: {
          ticketCount: tickets.length,
          tickets: tickets.map((t) => ({ id: t._id, title: t.title, type: t.type })),
        },
      });

      // Phase 3: Process each ticket sequentially (DEV -> QA)
      for (const ticket of tickets) {
        if (ticket._id) {
          await this.executeMockTicket(run, ticket._id.toString());
        }
      }

      // Phase 4: Complete
      await this.updateRunState(run.runId, 'COMPLETED' as RunState, {
        phase: 'COMPLETE',
        timestamp: new Date(),
        level: 'success',
        message: 'Pipeline completed successfully - all tickets implemented and tested',
      });

      // Mark root ticket as complete
      await ticketService.completeTicket(rootTicketId);

      logger.info('Mock pipeline completed', { runId: run.runId });
    } catch (error) {
      logger.error('Mock pipeline failed', {
        runId: run.runId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(run.runId, 'FAILED' as RunState, {
        phase: 'ERROR',
        timestamp: new Date(),
        level: 'error',
        message: `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      throw error;
    }
  }

  /**
   * Mock PM Agent - Creates a specification
   */
  private async executeMockPMAgent(run: IRun): Promise<MockAgentResult> {
    logger.info('Mock PM Agent: Creating specification', { runId: run.runId });

    // Simulate PM agent work
    await this.sleep(1500);

    const specification = `
# Specification for: ${run.prompt}

## Overview
This specification outlines the implementation plan for: "${run.prompt}"

## Features to Implement

### Feature 1: Core Implementation
- Implement the main functionality
- Add necessary data models
- Create API endpoints if needed

### Feature 2: Error Handling
- Add proper error handling
- Implement logging
- Add validation

### Feature 3: Testing & Documentation
- Write unit tests
- Add integration tests
- Create documentation

## Technical Requirements
- Follow existing code patterns
- Maintain code quality standards
- Ensure backward compatibility

## Acceptance Criteria
- All features implemented
- Tests passing
- Documentation complete
    `.trim();

    return {
      success: true,
      output: specification,
    };
  }

  /**
   * Create mock tickets from specification
   */
  private async createMockTicketsFromSpec(
    projectId: string,
    runId: string,
    parentTicketId: string,
    specification: string
  ): Promise<ITicket[]> {
    const tickets: ITicket[] = [];

    // Feature 1: Core Implementation
    const feature1 = await ticketService.createTicket({
      projectId,
      type: TicketType.FEATURE,
      title: 'Implement core functionality',
      description: `${specification}\n\n## This Ticket\nImplement the core functionality as outlined in the specification.`,
      parentId: parentTicketId,
      runId,
      labels: ['feature', 'core', 'auto-generated'],
      acceptanceCriteria: [
        'Core functionality implemented',
        'Code follows project standards',
        'No breaking changes',
      ],
      id: Date.now() + 1,
    });
    tickets.push(feature1);

    // Feature 2: Error Handling (depends on Feature 1)
    const feature2 = await ticketService.createTicket({
      projectId,
      type: TicketType.FEATURE,
      title: 'Add error handling and validation',
      description: 'Implement comprehensive error handling, logging, and input validation.',
      parentId: parentTicketId,
      runId,
      dependencies: feature1._id ? [feature1._id.toString()] : [],
      labels: ['feature', 'error-handling', 'auto-generated'],
      acceptanceCriteria: [
        'All errors properly handled',
        'Logging implemented',
        'Input validation added',
      ],
      id: Date.now() + 2,
    });
    tickets.push(feature2);

    // Task: Testing & Documentation (depends on both features)
    const task1 = await ticketService.createTicket({
      projectId,
      type: TicketType.TASK,
      title: 'Add tests and documentation',
      description: 'Create comprehensive tests and documentation for all implemented features.',
      parentId: parentTicketId,
      runId,
      dependencies:
        feature1._id && feature2._id
          ? [feature1._id.toString(), feature2._id.toString()]
          : [],
      labels: ['task', 'testing', 'documentation', 'auto-generated'],
      acceptanceCriteria: [
        'Unit tests written',
        'Integration tests added',
        'Documentation complete',
        'All tests passing',
      ],
      id: Date.now() + 3,
    });
    tickets.push(task1);

    logger.info('Created mock tickets', {
      runId,
      count: tickets.length,
      tickets: tickets.map((t) => ({ id: t._id, title: t.title, type: t.type })),
    });

    return tickets;
  }

  /**
   * Execute a single ticket: DEV -> QA -> Complete
   */
  private async executeMockTicket(run: IRun, ticketId: string): Promise<void> {
    try {
      const ticket = await ticketService.getTicket(ticketId);
      if (!ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      // Check if ticket can start (dependencies met)
      const canStart = await ticketService.canTicketStart(ticketId);
      if (!canStart) {
        logger.warn('Ticket cannot start - dependencies not met', {
          runId: run.runId,
          ticketId,
          title: ticket.title,
        });
        await ticketService.updateTicket(ticketId, { status: TicketStatus.BLOCKED });
        return;
      }

      // Start ticket
      await ticketService.startTicket(ticketId);

      logger.info('Executing mock ticket', {
        runId: run.runId,
        ticketId,
        title: ticket.title,
        type: ticket.type,
      });

      // DEV Agent Phase
      await this.updateRunState(run.runId, 'DEV_RUNNING' as RunState, {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'info',
        message: `DEV Agent: Starting implementation of "${ticket.title}"`,
        data: { ticketId, ticketType: ticket.type },
      });

      const devResult = await this.executeMockDevAgent(run, ticket);

      await this.updateRunState(run.runId, 'DEV_COMPLETED' as RunState, {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'success',
        message: `DEV Agent: Implementation complete for "${ticket.title}"`,
        data: {
          ticketId,
          branch: devResult.branch,
          prNumber: devResult.prNumber,
        },
      });

      // Update ticket with DEV results
      await ticketService.updateTicket(ticketId, {
        status: TicketStatus.REVIEW,
        branch: devResult.branch,
        prNumber: devResult.prNumber,
      });

      // QA Agent Phase
      await this.updateRunState(run.runId, 'QA_RUNNING' as RunState, {
        phase: 'QA',
        timestamp: new Date(),
        level: 'info',
        message: `QA Agent: Testing implementation of "${ticket.title}"`,
        data: { ticketId, branch: devResult.branch },
      });

      const qaResult = await this.executeMockQAAgent(run, ticket, devResult);

      if (qaResult.issuesFound) {
        // QA found issues - mark as blocked
        await this.updateRunState(run.runId, 'QA_COMPLETED' as RunState, {
          phase: 'QA',
          timestamp: new Date(),
          level: 'warning',
          message: `QA Agent: Issues found in "${ticket.title}" - creating defect tickets`,
          data: { ticketId, issues: qaResult.output },
        });

        await ticketService.updateTicket(ticketId, { status: TicketStatus.BLOCKED });

        // In a real system, we'd create defect tickets here
        logger.warn('QA found issues', { runId: run.runId, ticketId, issues: qaResult.output });
      } else {
        // QA passed - complete ticket
        await this.updateRunState(run.runId, 'QA_COMPLETED' as RunState, {
          phase: 'QA',
          timestamp: new Date(),
          level: 'success',
          message: `QA Agent: All tests passed for "${ticket.title}"`,
          data: { ticketId },
        });

        await ticketService.completeTicket(ticketId);

        logger.info('Ticket completed successfully', {
          runId: run.runId,
          ticketId,
          title: ticket.title,
        });
      }
    } catch (error) {
      logger.error('Failed to execute mock ticket', {
        runId: run.runId,
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mock DEV Agent - Simulates code implementation
   */
  private async executeMockDevAgent(run: IRun, ticket: ITicket): Promise<MockAgentResult> {
    logger.info('Mock DEV Agent: Implementing ticket', {
      runId: run.runId,
      ticketId: ticket._id,
      title: ticket.title,
    });

    // Simulate dev work
    await this.sleep(3000);

    const branch = `feature/${ticket.type}-${ticket._id}`;
    const prNumber = Math.floor(Math.random() * 1000) + 100;

    return {
      success: true,
      output: `Implementation complete for: ${ticket.title}`,
      branch,
      prNumber,
    };
  }

  /**
   * Mock QA Agent - Simulates testing
   */
  private async executeMockQAAgent(
    run: IRun,
    ticket: ITicket,
    devResult: MockAgentResult
  ): Promise<MockAgentResult> {
    logger.info('Mock QA Agent: Testing implementation', {
      runId: run.runId,
      ticketId: ticket._id,
      branch: devResult.branch,
    });

    // Simulate QA work
    await this.sleep(2000);

    // 90% success rate for demo purposes
    const issuesFound = Math.random() > 0.9;

    return {
      success: !issuesFound,
      output: issuesFound
        ? 'Found issues: Missing error handling in edge cases'
        : 'All tests passed successfully',
      issuesFound,
    };
  }

  /**
   * Update run state and add timeline entry
   */
  private async updateRunState(
    runId: string,
    state: RunState,
    timelineEntry: Omit<ITimelineEntry, '_id'>
  ): Promise<void> {
    await Run.updateOne(
      { runId },
      {
        $set: { state, updated_at: new Date() },
        $push: { timeline: timelineEntry as ITimelineEntry },
      }
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createMockPipelineService(): MockPipelineService {
  return new MockPipelineService();
}

