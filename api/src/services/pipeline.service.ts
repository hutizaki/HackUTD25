import { Run, IRun, RunState, ITimelineEntry } from '../models/Run';
import { AgentRun, IAgentRun } from '../models/AgentRun';
import { createAgentService, ExecuteAgentRequest } from './agent.service';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Pipeline execution request
 */
export interface PipelineExecutionRequest {
  projectId: string;
  userId: string;
  prompt: string;
  repository: string;
  ref?: string;
}

/**
 * Pipeline execution result
 */
export interface PipelineExecutionResult {
  runId: string;
  state: RunState;
  timeline: ITimelineEntry[];
}

/**
 * Pipeline orchestrator service
 * Manages the PM -> DEV -> QA pipeline
 */
export class PipelineService {
  private agentService = createAgentService();

  /**
   * Start a new pipeline execution
   */
  async startPipeline(request: PipelineExecutionRequest): Promise<PipelineExecutionResult> {
    try {
      // Generate unique run ID
      const runId = `run-${Date.now()}-${uuidv4().substring(0, 8)}`;

      logger.info('Starting pipeline execution', {
        runId,
        projectId: request.projectId,
        userId: request.userId,
        repository: request.repository,
      });

      // Create run record
      const run = await Run.create({
        runId,
        projectId: new mongoose.Types.ObjectId(request.projectId),
        userId: new mongoose.Types.ObjectId(request.userId),
        state: 'CREATED',
        prompt: request.prompt,
        repository: request.repository,
        ref: request.ref,
        timeline: [
          {
            phase: 'INIT',
            timestamp: new Date(),
            level: 'info',
            message: 'Pipeline created',
            data: { prompt: request.prompt },
          },
        ],
      });

      // Start PM agent asynchronously
      this.executePMAgent(run).catch((error) => {
        logger.error('PM agent execution failed', {
          runId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      return {
        runId: run.runId,
        state: run.state,
        timeline: run.timeline,
      };
    } catch (error) {
      logger.error('Error starting pipeline', {
        projectId: request.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute PM agent (Product Manager)
   */
  private async executePMAgent(run: IRun): Promise<void> {
    try {
      // Update state
      await this.updateRunState(run.runId, 'PM_RUNNING', {
        phase: 'PM',
        timestamp: new Date(),
        level: 'info',
        message: 'Starting PM agent to create product specification',
      });

      // Build PM prompt
      const pmPrompt = `Create a comprehensive product specification for the following idea:

${run.prompt}

Please include:
1. Overview and objectives
2. User stories and use cases
3. Functional requirements
4. Non-functional requirements
5. Acceptance criteria
6. Success metrics

Create a new file called PRODUCT_SPEC.md in the docs/ directory with this specification.`;

      // Execute PM agent
      const pmRequest: ExecuteAgentRequest = {
        agentType: 'spec-writer',
        projectId: run.projectId.toString(),
        runId: run.runId,
        repository: run.repository,
        ref: run.ref,
        branchName: `docs/pm-spec-${Date.now()}`,
        prompt: pmPrompt,
        autoCreatePr: true,
      };

      const pmResult = await this.agentService.executeAgent(pmRequest);

      // Update run with PM agent run ID
      await Run.findOneAndUpdate(
        { runId: run.runId },
        {
          pmAgentRunId: new mongoose.Types.ObjectId(pmResult.agentRunId),
          $push: {
            timeline: {
              phase: 'PM',
              timestamp: new Date(),
              level: 'success',
              message: 'PM agent launched successfully',
              data: {
                agentRunId: pmResult.agentRunId,
                cursorUrl: pmResult.cursorUrl,
              },
            },
          },
        }
      );

      // Poll for PM agent completion
      await this.pollAgentCompletion(run.runId, pmResult.agentRunId, 'PM');

      // Start DEV agent
      await this.executeDEVAgent(run);
    } catch (error) {
      logger.error('PM agent execution failed', {
        runId: run.runId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(run.runId, 'FAILED', {
        phase: 'PM',
        timestamp: new Date(),
        level: 'error',
        message: `PM agent failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Execute DEV agent (Developer)
   */
  private async executeDEVAgent(run: IRun): Promise<void> {
    try {
      // Update state
      await this.updateRunState(run.runId, 'DEV_RUNNING', {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'info',
        message: 'Starting DEV agent to implement the feature',
      });

      // Build DEV prompt
      const devPrompt = `Implement the feature described in the product specification.

Original idea: ${run.prompt}

Please:
1. Read the PRODUCT_SPEC.md file created by the PM agent
2. Implement the core functionality according to the specification
3. Write unit tests for all new code
4. Ensure code follows existing patterns and conventions
5. Add proper error handling and validation

Focus on creating a working implementation with good test coverage.`;

      // Execute DEV agent
      const devRequest: ExecuteAgentRequest = {
        agentType: 'developer-implementer',
        projectId: run.projectId.toString(),
        runId: run.runId,
        repository: run.repository,
        ref: run.ref,
        branchName: `feature/dev-impl-${Date.now()}`,
        prompt: devPrompt,
        autoCreatePr: true,
      };

      const devResult = await this.agentService.executeAgent(devRequest);

      // Update run with DEV agent run ID
      await Run.findOneAndUpdate(
        { runId: run.runId },
        {
          devAgentRunId: new mongoose.Types.ObjectId(devResult.agentRunId),
          $push: {
            timeline: {
              phase: 'DEV',
              timestamp: new Date(),
              level: 'success',
              message: 'DEV agent launched successfully',
              data: {
                agentRunId: devResult.agentRunId,
                cursorUrl: devResult.cursorUrl,
              },
            },
          },
        }
      );

      // Poll for DEV agent completion
      await this.pollAgentCompletion(run.runId, devResult.agentRunId, 'DEV');

      // Start QA agent
      await this.executeQAAgent(run);
    } catch (error) {
      logger.error('DEV agent execution failed', {
        runId: run.runId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(run.runId, 'FAILED', {
        phase: 'DEV',
        timestamp: new Date(),
        level: 'error',
        message: `DEV agent failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Execute QA agent (Quality Assurance)
   */
  private async executeQAAgent(run: IRun): Promise<void> {
    try {
      // Update state
      await this.updateRunState(run.runId, 'QA_RUNNING', {
        phase: 'QA',
        timestamp: new Date(),
        level: 'info',
        message: 'Starting QA agent to review the implementation',
      });

      // Get DEV agent run to find PR number
      const devAgentRun = await AgentRun.findById(run.devAgentRunId);
      const prInfo = devAgentRun?.prNumber ? `PR #${devAgentRun.prNumber}` : 'the implementation';

      // Build QA prompt
      const qaPrompt = `Review the implementation created by the DEV agent.

Original idea: ${run.prompt}

Please:
1. Review the code changes in ${prInfo}
2. Verify the implementation meets the product specification
3. Check for code quality issues
4. Verify tests are comprehensive
5. Check for security vulnerabilities
6. Create a QA report with findings

Create a file called QA_REPORT.md with your findings and recommendations.`;

      // Execute QA agent
      const qaRequest: ExecuteAgentRequest = {
        agentType: 'qa-tester',
        projectId: run.projectId.toString(),
        runId: run.runId,
        repository: run.repository,
        ref: run.ref,
        branchName: `qa/review-${Date.now()}`,
        prompt: qaPrompt,
        autoCreatePr: false, // QA doesn't need a PR, just a report
      };

      const qaResult = await this.agentService.executeAgent(qaRequest);

      // Update run with QA agent run ID
      await Run.findOneAndUpdate(
        { runId: run.runId },
        {
          qaAgentRunId: new mongoose.Types.ObjectId(qaResult.agentRunId),
          $push: {
            timeline: {
              phase: 'QA',
              timestamp: new Date(),
              level: 'success',
              message: 'QA agent launched successfully',
              data: {
                agentRunId: qaResult.agentRunId,
                cursorUrl: qaResult.cursorUrl,
              },
            },
          },
        }
      );

      // Poll for QA agent completion
      await this.pollAgentCompletion(run.runId, qaResult.agentRunId, 'QA');

      // Mark pipeline as completed
      await this.updateRunState(run.runId, 'COMPLETED', {
        phase: 'COMPLETE',
        timestamp: new Date(),
        level: 'success',
        message: 'Pipeline completed successfully',
      });
    } catch (error) {
      logger.error('QA agent execution failed', {
        runId: run.runId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.updateRunState(run.runId, 'FAILED', {
        phase: 'QA',
        timestamp: new Date(),
        level: 'error',
        message: `QA agent failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Poll for agent completion
   */
  private async pollAgentCompletion(
    runId: string,
    agentRunId: string,
    phase: string
  ): Promise<void> {
    const maxPolls = 60; // 5 minutes (60 * 5 seconds)
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const agentRun = await this.agentService.getAgentRunStatus(agentRunId);
      if (!agentRun) {
        throw new Error('Agent run not found');
      }

      logger.info('Polling agent status', {
        runId,
        agentRunId,
        phase,
        status: agentRun.status,
        poll: i + 1,
      });

      if (agentRun.status === 'completed') {
        await this.updateRunState(
          runId,
          phase === 'PM' ? 'PM_COMPLETED' : phase === 'DEV' ? 'DEV_COMPLETED' : 'QA_COMPLETED',
          {
            phase,
            timestamp: new Date(),
            level: 'success',
            message: `${phase} agent completed successfully`,
            data: {
              branchName: agentRun.branchName,
              prNumber: agentRun.prNumber,
              prUrl: agentRun.prUrl,
            },
          }
        );
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
    timelineEntry: ITimelineEntry
  ): Promise<void> {
    await Run.findOneAndUpdate(
      { runId },
      {
        state,
        $push: { timeline: timelineEntry },
      }
    );

    logger.info('Run state updated', {
      runId,
      state,
      phase: timelineEntry.phase,
      message: timelineEntry.message,
    });
  }

  /**
   * Get run status
   */
  async getRunStatus(runId: string): Promise<IRun | null> {
    try {
      const run = await Run.findOne({ runId })
        .populate('projectId')
        .populate('userId')
        .populate('pmAgentRunId')
        .populate('devAgentRunId')
        .populate('qaAgentRunId');

      return run;
    } catch (error) {
      logger.error('Error getting run status', {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List runs for a project
   */
  async listRuns(projectId: string, limit: number = 50): Promise<IRun[]> {
    try {
      const runs = await Run.find({
        projectId: new mongoose.Types.ObjectId(projectId),
      })
        .sort({ created_at: -1 })
        .limit(limit);

      return runs;
    } catch (error) {
      logger.error('Error listing runs', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Create pipeline service instance
 */
export function createPipelineService(): PipelineService {
  return new PipelineService();
}
