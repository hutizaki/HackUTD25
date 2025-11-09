import { Run, IRun, RunState } from '../models/Run';
import { AgentRun } from '../models/AgentRun';
import { Ticket, ITicket, TicketStatus, ITicketComment } from '../models/Ticket';
import { createAgentService } from './agent.service';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Simplified Pipeline Service
 * PM → Wait for completion → DEV → QA
 * All actions logged to files
 */
export class SimplifiedPipelineService {
  private agentService = createAgentService();
  private logsDir = path.join(process.cwd(), '..', 'logs');

  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Write to log file
   */
  private writeLog(runId: string, phase: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logFile = path.join(this.logsDir, `${runId}.log`);
    
    const logEntry = {
      timestamp,
      phase,
      message,
      data,
    };
    
    const logLine = `[${timestamp}] [${phase}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}\n`;
    
    fs.appendFileSync(logFile, logLine);
    logger.info(`[${runId}] [${phase}] ${message}`, data);
  }

  /**
   * Start simplified pipeline
   */
  async startPipeline(request: {
    projectId: string;
    userId: string;
    featureRequest: string;
    repository: string;
    ref?: string;
  }): Promise<{ runId: string; state: RunState; logFile: string }> {
    const runId = `run-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const logFile = path.join(this.logsDir, `${runId}.log`);

    this.writeLog(runId, 'INIT', 'Pipeline created', {
      featureRequest: request.featureRequest,
      repository: request.repository,
    });

    // Create run record
    const run = await Run.create({
      runId,
      projectId: new mongoose.Types.ObjectId(request.projectId),
      userId: new mongoose.Types.ObjectId(request.userId),
      state: 'CREATED',
      prompt: request.featureRequest,
      repository: request.repository,
      ref: request.ref,
      timeline: [
        {
          phase: 'INIT',
          timestamp: new Date(),
          level: 'info',
          message: 'Pipeline initialized - PM will create work tickets',
          data: { logFile },
        },
      ],
    });

    // Start PM agent asynchronously
    this.executePMPhase(run, request.featureRequest).catch((error) => {
      this.writeLog(runId, 'ERROR', 'Pipeline failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return {
      runId: run.runId,
      state: run.state,
      logFile,
    };
  }

  /**
   * Phase 1: PM Agent creates work tickets
   */
  private async executePMPhase(run: IRun, featureRequest: string): Promise<void> {
    const runId = run.runId;

    try {
      this.writeLog(runId, 'PM_START', 'PM Agent starting - reading onboarding docs');

      await this.updateRunState(runId, 'PM_RUNNING', {
        phase: 'PM',
        timestamp: new Date(),
        level: 'info',
        message: 'PM Agent: Reading onboarding documentation and analyzing feature request',
      });

      // Build PM prompt with clear instructions
      const pmPrompt = `You are a Product Manager. Your task is to analyze this feature request and create detailed work tickets.

FEATURE REQUEST:
${featureRequest}

YOUR TASKS:
1. Read the PROJECT_MANAGER_ONBOARDING.md in Cloud_Agent_Onboarding/ folder
2. Break down this feature into 3-5 concrete work tickets (stored as JSON in MongoDB)
3. For each ticket, create:
   - Clear title
   - Detailed description
   - 3-5 acceptance criteria
   - Technical implementation notes
   - Priority (high/medium/low)
   - Type (epic/story/task)
   - Estimated hours
   - Branch name (feature/[slug]-#[number])

4. Create a branch for the overall feature set
5. Create PM-TICKETS.json with all ticket data
6. Create a summary document explaining the breakdown

TICKET STRUCTURE (JSON):
{
  "title": "Implement user profile view",
  "description": "Create component to display user profile...",
  "type": "story",
  "priority": "high",
  "estimatedHours": 4,
  "branchName": "feature/user-profile-#1",
  "acceptanceCriteria": [
    "User can view their profile",
    "Profile shows avatar, name, email",
    "Profile is responsive"
  ],
  "implementationNotes": "Use React component, fetch from /api/users/:id",
  "filesAffected": ["web/src/components/Profile.tsx"]
}

IMPORTANT:
- Create branch: feature/[feature-name]-#[timestamp]
- All child tickets branch from this main feature branch
- Number tickets sequentially (1, 2, 3, etc.)
- Store ticket data in PM-TICKETS.json for our system to read

After creating tickets, create PM-SUMMARY.md explaining:
- Overall feature breakdown
- Ticket dependencies
- Implementation order
- Technical approach`;

      this.writeLog(runId, 'PM_EXECUTE', 'Launching PM Agent', {
        prompt: pmPrompt.substring(0, 200) + '...',
      });

      // Execute PM agent
      const pmResult = await this.agentService.executeAgent({
        agentType: 'spec-writer',
        projectId: run.projectId.toString(),
        runId: run.runId,
        repository: run.repository,
        ref: run.ref,
        branchName: `pm/tickets-${Date.now()}`,
        prompt: pmPrompt,
        autoCreatePr: true,
      });

      this.writeLog(runId, 'PM_LAUNCHED', 'PM Agent launched successfully', {
        agentRunId: pmResult.agentRunId,
        cursorUrl: pmResult.cursorUrl,
        branchName: `pm/tickets-${Date.now()}`,
      });

      // Update run with PM agent run ID
      await Run.findOneAndUpdate(
        { runId },
        {
          pmAgentRunId: new mongoose.Types.ObjectId(pmResult.agentRunId),
          $push: {
            timeline: {
              phase: 'PM',
              timestamp: new Date(),
              level: 'success',
              message: 'PM Agent launched - Creating work tickets',
              data: {
                agentRunId: pmResult.agentRunId,
                cursorUrl: pmResult.cursorUrl,
              },
            },
          },
        }
      );

      // Wait for PM agent to complete
      this.writeLog(runId, 'PM_WAIT', 'Waiting for PM Agent to complete (polling every 10s)');
      await this.pollAgentCompletion(runId, pmResult.agentRunId, 'PM');

      this.writeLog(runId, 'PM_COMPLETE', 'PM Agent completed - Work tickets created');

      // Wait 5 seconds before starting DEV (intermediate check)
      this.writeLog(runId, 'INTERMEDIATE', 'Intermediate check: Verifying PM work is complete');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await this.updateRunState(runId, 'PM_COMPLETED', {
        phase: 'PM_COMPLETE',
        timestamp: new Date(),
        level: 'success',
        message: 'PM work verified complete - Ready to start development',
      });

      // Start DEV phase
      await this.executeDEVPhase(run);
    } catch (error) {
      this.writeLog(runId, 'PM_ERROR', 'PM Agent failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(runId, 'FAILED', {
        phase: 'PM',
        timestamp: new Date(),
        level: 'error',
        message: `PM Agent failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Phase 2: DEV Agent implements the tickets
   */
  private async executeDEVPhase(run: IRun): Promise<void> {
    const runId = run.runId;

    try {
      this.writeLog(runId, 'DEV_START', 'DEV Agent starting - reading PM tickets');

      await this.updateRunState(runId, 'DEV_RUNNING', {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'info',
        message: 'DEV Agent: Reading PM tickets and implementing features',
      });

      // Build DEV prompt
      const devPrompt = `You are a Backend Developer. Your task is to implement the features described in the PM tickets.

YOUR TASKS:
1. Read the PM-TICKETS-SUMMARY.md document
2. Review all GitHub Issues created by the PM
3. Implement each ticket in order of priority
4. Write comprehensive unit tests for each feature
5. Add detailed code comments explaining your implementation
6. Create a IMPLEMENTATION-NOTES.md document with:
   - What you implemented
   - How each ticket was addressed
   - Any technical decisions made
   - Test coverage report

IMPORTANT:
- Follow the acceptance criteria in each ticket
- Add comments to the GitHub Issues as you work on them
- Mark issues as "in-progress" then "completed"
- Write clean, well-documented code
- Ensure all tests pass
- Follow existing code patterns

After completing all tickets, create a PR with:
- Summary of all implementations
- Links to all completed tickets
- Test results
- Any notes for QA`;

      this.writeLog(runId, 'DEV_EXECUTE', 'Launching DEV Agent', {
        prompt: devPrompt.substring(0, 200) + '...',
      });

      // Execute DEV agent
      const devResult = await this.agentService.executeAgent({
        agentType: 'developer-implementer',
        projectId: run.projectId.toString(),
        runId: run.runId,
        repository: run.repository,
        ref: run.ref,
        branchName: `dev/implementation-${Date.now()}`,
        prompt: devPrompt,
        autoCreatePr: true,
      });

      this.writeLog(runId, 'DEV_LAUNCHED', 'DEV Agent launched successfully', {
        agentRunId: devResult.agentRunId,
        cursorUrl: devResult.cursorUrl,
      });

      // Update run with DEV agent run ID
      await Run.findOneAndUpdate(
        { runId },
        {
          devAgentRunId: new mongoose.Types.ObjectId(devResult.agentRunId),
          $push: {
            timeline: {
              phase: 'DEV',
              timestamp: new Date(),
              level: 'success',
              message: 'DEV Agent launched - Implementing tickets',
              data: {
                agentRunId: devResult.agentRunId,
                cursorUrl: devResult.cursorUrl,
              },
            },
          },
        }
      );

      // Wait for DEV agent to complete
      this.writeLog(runId, 'DEV_WAIT', 'Waiting for DEV Agent to complete (polling every 10s)');
      await this.pollAgentCompletion(runId, devResult.agentRunId, 'DEV');

      this.writeLog(runId, 'DEV_COMPLETE', 'DEV Agent completed - Features implemented');

      await this.updateRunState(runId, 'DEV_COMPLETED', {
        phase: 'DEV_COMPLETE',
        timestamp: new Date(),
        level: 'success',
        message: 'Development complete - Ready for QA review',
      });

      // Start QA phase
      await this.executeQAPhase(run);
    } catch (error) {
      this.writeLog(runId, 'DEV_ERROR', 'DEV Agent failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(runId, 'FAILED', {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'error',
        message: `DEV Agent failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Phase 3: QA Agent reviews the implementation
   */
  private async executeQAPhase(run: IRun): Promise<void> {
    const runId = run.runId;

    try {
      this.writeLog(runId, 'QA_START', 'QA Agent starting - reviewing implementation');

      await this.updateRunState(runId, 'QA_RUNNING', {
        phase: 'QA',
        timestamp: new Date(),
        level: 'info',
        message: 'QA Agent: Reviewing implementation and testing',
      });

      // Build QA prompt
      const qaPrompt = `You are a QA Engineer. Your task is to review the implementation and verify all tickets are complete.

YOUR TASKS:
1. Review the IMPLEMENTATION-NOTES.md document
2. Check each GitHub Issue to verify it's properly addressed
3. Review the code changes in the DEV PR
4. Verify test coverage meets requirements
5. Test the implemented features
6. Add comments to GitHub Issues with your findings
7. Create a comprehensive QA-REPORT.md with:
   - Summary of what was tested
   - Each ticket verification status (✓ Pass / ✗ Fail)
   - Code quality assessment
   - Test coverage analysis
   - Security concerns (if any)
   - Performance considerations
   - Recommendations for improvement

IMPORTANT:
- Comment on each GitHub Issue with QA status
- Mark issues as "qa-approved" or "needs-work"
- If you find issues, create new GitHub Issues labeled "bug"
- Be thorough but constructive
- Provide specific examples of issues found

After review, add a final comment to the DEV PR with:
- Overall QA verdict (Approved / Needs Changes)
- Summary of findings
- Any blocking issues`;

      this.writeLog(runId, 'QA_EXECUTE', 'Launching QA Agent', {
        prompt: qaPrompt.substring(0, 200) + '...',
      });

      // Execute QA agent
      const qaResult = await this.agentService.executeAgent({
        agentType: 'qa-tester',
        projectId: run.projectId.toString(),
        runId: run.runId,
        repository: run.repository,
        ref: run.ref,
        branchName: `qa/review-${Date.now()}`,
        prompt: qaPrompt,
        autoCreatePr: false, // QA doesn't need a PR, just review
      });

      this.writeLog(runId, 'QA_LAUNCHED', 'QA Agent launched successfully', {
        agentRunId: qaResult.agentRunId,
        cursorUrl: qaResult.cursorUrl,
      });

      // Update run with QA agent run ID
      await Run.findOneAndUpdate(
        { runId },
        {
          qaAgentRunId: new mongoose.Types.ObjectId(qaResult.agentRunId),
          $push: {
            timeline: {
              phase: 'QA',
              timestamp: new Date(),
              level: 'success',
              message: 'QA Agent launched - Reviewing implementation',
              data: {
                agentRunId: qaResult.agentRunId,
                cursorUrl: qaResult.cursorUrl,
              },
            },
          },
        }
      );

      // Wait for QA agent to complete
      this.writeLog(runId, 'QA_WAIT', 'Waiting for QA Agent to complete (polling every 10s)');
      await this.pollAgentCompletion(runId, qaResult.agentRunId, 'QA');

      this.writeLog(runId, 'QA_COMPLETE', 'QA Agent completed - Review finished');

      // Mark pipeline as completed
      await this.updateRunState(runId, 'COMPLETED', {
        phase: 'COMPLETE',
        timestamp: new Date(),
        level: 'success',
        message: 'Pipeline completed successfully - All phases done',
      });

      this.writeLog(runId, 'PIPELINE_COMPLETE', 'Pipeline finished successfully', {
        summary: 'PM created tickets → DEV implemented → QA reviewed',
      });
    } catch (error) {
      this.writeLog(runId, 'QA_ERROR', 'QA Agent failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(runId, 'FAILED', {
        phase: 'QA',
        timestamp: new Date(),
        level: 'error',
        message: `QA Agent failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Poll for agent completion (10 second intervals)
   */
  private async pollAgentCompletion(
    runId: string,
    agentRunId: string,
    phase: string
  ): Promise<void> {
    const maxPolls = 60; // 10 minutes (60 * 10 seconds)
    const pollInterval = 10000; // 10 seconds

    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const agentRun = await this.agentService.getAgentRunStatus(agentRunId);
      if (!agentRun) {
        throw new Error('Agent run not found');
      }

      this.writeLog(runId, `${phase}_POLL`, `Polling agent status (${i + 1}/${maxPolls})`, {
        status: agentRun.status,
        agentRunId,
      });

      if (agentRun.status === 'completed') {
        this.writeLog(runId, `${phase}_SUCCESS`, 'Agent completed successfully', {
          branchName: agentRun.branchName,
          prNumber: agentRun.prNumber,
          prUrl: agentRun.prUrl,
        });
        return;
      }

      if (agentRun.status === 'failed') {
        throw new Error(`Agent failed: ${agentRun.error || 'Unknown error'}`);
      }
    }

    throw new Error('Agent polling timeout - agent did not complete in time');
  }

  /**
   * Update run state and add timeline entry
   */
  private async updateRunState(
    runId: string,
    state: RunState,
    timelineEntry: {
      phase: string;
      timestamp: Date;
      level: 'info' | 'warn' | 'error' | 'success';
      message: string;
      data?: Record<string, unknown>;
    }
  ): Promise<void> {
    await Run.findOneAndUpdate(
      { runId },
      {
        state,
        $push: { timeline: timelineEntry },
      }
    );

    this.writeLog(runId, 'STATE_UPDATE', `State changed to ${state}`, {
      message: timelineEntry.message,
    });
  }

  /**
   * Get run status
   */
  async getRunStatus(runId: string): Promise<IRun | null> {
    return await Run.findOne({ runId })
      .populate('projectId')
      .populate('userId')
      .populate('pmAgentRunId')
      .populate('devAgentRunId')
      .populate('qaAgentRunId');
  }

  /**
   * Get log file path
   */
  getLogFilePath(runId: string): string {
    return path.join(this.logsDir, `${runId}.log`);
  }

  /**
   * Read log file
   */
  readLogFile(runId: string): string {
    const logFile = this.getLogFilePath(runId);
    if (fs.existsSync(logFile)) {
      return fs.readFileSync(logFile, 'utf-8');
    }
    return '';
  }
}

/**
 * Create simplified pipeline service instance
 */
export function createSimplifiedPipelineService(): SimplifiedPipelineService {
  return new SimplifiedPipelineService();
}
