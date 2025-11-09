import { Agent, IAgent, AgentType } from '../models/Agent';
import { AgentRun, IAgentRun, AgentRunStatus } from '../models/AgentRun';
import { CursorApiClient, LaunchAgentRequest, AgentResponse } from '../integrations/cursor-api-client';
import { logger } from '../config/logger';
import { getCursorApiKeyForAgent } from '../config/env';
import mongoose from 'mongoose';

/**
 * Agent execution request
 */
export interface ExecuteAgentRequest {
  agentType: AgentType;
  projectId: string;
  runId: string;
  repository: string; // GitHub repository URL
  ref?: string; // Git ref (branch name, tag, or commit hash)
  branchName?: string; // Custom branch name
  prompt: string; // Task prompt
  autoCreatePr?: boolean; // Auto-create PR
  contextData?: Record<string, unknown>; // Additional context data
}

/**
 * Agent execution result
 */
export interface ExecuteAgentResult {
  agentRunId: string;
  cursorAgentId: string;
  cursorUrl: string;
  status: AgentRunStatus;
}

/**
 * Agent service for managing AI agents
 */
export class AgentService {
  constructor() {
    // No longer need a single API key - we'll get role-specific keys per agent
  }

  /**
   * Get agent by type
   */
  async getAgentByType(agentType: AgentType, projectId?: string): Promise<IAgent | null> {
    try {
      // Try to find project-specific agent first
      if (projectId) {
        const projectAgent = await Agent.findOne({
          type: agentType,
          projectId: new mongoose.Types.ObjectId(projectId),
          enabled: true,
        });
        if (projectAgent) {
          return projectAgent;
        }
      }

      // Fall back to global agent
      const globalAgent = await Agent.findOne({
        type: agentType,
        projectId: { $exists: false },
        enabled: true,
      });

      return globalAgent;
    } catch (error) {
      logger.error('Error getting agent by type', {
        agentType,
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute an agent
   */
  async executeAgent(request: ExecuteAgentRequest): Promise<ExecuteAgentResult> {
    try {
      logger.info('Executing agent', {
        agentType: request.agentType,
        projectId: request.projectId,
        runId: request.runId,
        repository: request.repository,
      });

      // Get agent configuration
      const agent = await this.getAgentByType(request.agentType, request.projectId);
      if (!agent) {
        throw new Error(`Agent not found: ${request.agentType}`);
      }

      // Get role-specific API key
      const apiKey = getCursorApiKeyForAgent(request.agentType);
      if (!apiKey) {
        throw new Error(`Cursor API key not configured for agent type: ${request.agentType}`);
      }

      // Create Cursor client with role-specific API key
      const cursorClient = new CursorApiClient(apiKey);

      // Build prompt with context
      const fullPrompt = this.buildPrompt(agent, request.prompt, request.contextData);

      // Prepare Cursor API request
      const cursorRequest: LaunchAgentRequest = {
        prompt: {
          text: fullPrompt,
        },
        source: {
          repository: request.repository,
          ref: request.ref,
        },
        target: {
          autoCreatePr: request.autoCreatePr ?? true,
          branchName: request.branchName,
          openAsCursorGithubApp: false,
          skipReviewerRequest: false,
        },
        model: agent.llmModel,
      };

      // Launch Cursor agent
      const cursorResponse: AgentResponse = await cursorClient.launchAgent(cursorRequest);

      // Create agent run record
      const agentRun = await AgentRun.create({
        runId: request.runId,
        agentId: agent._id,
        projectId: new mongoose.Types.ObjectId(request.projectId),
        cursorAgentId: cursorResponse.id,
        input: {
          prompt: request.prompt,
          repository: request.repository,
          ref: request.ref,
          branchName: request.branchName,
          contextData: request.contextData,
        },
        status: 'running',
        branchName: cursorResponse.target.branchName,
        cursorUrl: cursorResponse.target.url,
        steps: [
          {
            stepNumber: 1,
            description: 'Agent launched',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ],
      });

      logger.info('Agent executed successfully', {
        agentRunId: (agentRun._id as mongoose.Types.ObjectId).toString(), // MUST BE MONGODB OBJECT ID
        cursorAgentId: cursorResponse.id,
        cursorUrl: cursorResponse.target.url,
      });

      return {
        agentRunId: (agentRun._id as mongoose.Types.ObjectId).toString(),
        cursorAgentId: cursorResponse.id,
        cursorUrl: cursorResponse.target.url,
        status: 'running',
      };
    } catch (error) {
      logger.error('Error executing agent', {
        agentType: request.agentType,
        projectId: request.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Build prompt with agent context
   */
  private buildPrompt(
    agent: IAgent,
    userPrompt: string,
    contextData?: Record<string, unknown>
  ): string {
    const sections: string[] = [];

    // Agent role and goals
    sections.push(`# ${agent.name}`);
    sections.push(`\n**Role:** ${agent.role}`);
    
    if (agent.goals.length > 0) {
      sections.push(`\n**Goals:**`);
      agent.goals.forEach((goal) => sections.push(`- ${goal}`));
    }

    // Constraints
    if (agent.constraints.length > 0) {
      sections.push(`\n**Constraints:**`);
      agent.constraints.forEach((constraint) => sections.push(`- ${constraint}`));
    }

    // Guardrails
    if (agent.guardrails.length > 0) {
      sections.push(`\n**Guardrails:**`);
      agent.guardrails.forEach((guardrail) => sections.push(`- ${guardrail}`));
    }

    // Onboarding doc reference
    if (agent.onboardingDocRef) {
      sections.push(`\n**Onboarding Documentation:** ${agent.onboardingDocRef}`);
      sections.push(`Please read the onboarding documentation before starting your task.`);
    }

    // Context packs
    if (agent.contextPacks && agent.contextPacks.length > 0) {
      sections.push(`\n**Context Packs:**`);
      agent.contextPacks.forEach((pack) => sections.push(`- ${pack}`));
    }

    // Additional context data
    if (contextData && Object.keys(contextData).length > 0) {
      sections.push(`\n**Additional Context:**`);
      sections.push('```json');
      sections.push(JSON.stringify(contextData, null, 2));
      sections.push('```');
    }

    // User prompt
    sections.push(`\n---\n`);
    sections.push(`# Task`);
    sections.push(`\n${userPrompt}`);

    return sections.join('\n');
  }

  /**
   * Get agent run status
   */
  async getAgentRunStatus(agentRunId: string): Promise<IAgentRun | null> {
    try {
      const agentRun = await AgentRun.findById(agentRunId)
        .populate('agentId')
        .populate('projectId');

      if (!agentRun) {
        return null;
      }

      // If agent is still running, check Cursor API for updates
      if (agentRun.status === 'running' && agentRun.cursorAgentId) {
        try {
          // Get the agent to determine which API key to use
          const agent = await Agent.findById(agentRun.agentId);
          if (agent) {
            const apiKey = getCursorApiKeyForAgent(agent.type);
            if (apiKey) {
              const cursorClient = new CursorApiClient(apiKey);
              const cursorStatus = await cursorClient.getAgentStatus(agentRun.cursorAgentId);

              // Update status if changed
              const currentStatus = agentRun.status;
              if (cursorStatus.status === 'COMPLETED' && currentStatus === 'running') {
                agentRun.status = 'completed';
                await agentRun.save();
              } else if (cursorStatus.status === 'FAILED' && currentStatus === 'running') {
                agentRun.status = 'failed';
                agentRun.error = cursorStatus.error;
                await agentRun.save();
              }
            }
          }
        } catch (error) {
          logger.error('Error checking Cursor agent status', {
            agentRunId,
            cursorAgentId: agentRun.cursorAgentId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return agentRun;
    } catch (error) {
      logger.error('Error getting agent run status', {
        agentRunId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cancel agent run
   */
  async cancelAgentRun(agentRunId: string): Promise<void> {
    try {
      const agentRun = await AgentRun.findById(agentRunId);
      if (!agentRun) {
        throw new Error('Agent run not found');
      }

      if (agentRun.status !== 'running') {
        throw new Error('Agent run is not running');
      }

      // Cancel in Cursor
      if (agentRun.cursorAgentId) {
        // Get the agent to determine which API key to use
        const agent = await Agent.findById(agentRun.agentId);
        if (agent) {
          const apiKey = getCursorApiKeyForAgent(agent.type);
          if (apiKey) {
            const cursorClient = new CursorApiClient(apiKey);
            await cursorClient.cancelAgent(agentRun.cursorAgentId);
          }
        }
      }

      // Update status
      agentRun.status = 'cancelled';
      await agentRun.save();

      logger.info('Agent run cancelled', { agentRunId });
    } catch (error) {
      logger.error('Error cancelling agent run', {
        agentRunId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List agent runs for a project
   */
  async listAgentRuns(projectId: string, limit: number = 50): Promise<IAgentRun[]> {
    try {
      const agentRuns = await AgentRun.find({
        projectId: new mongoose.Types.ObjectId(projectId),
      })
        .populate('agentId')
        .sort({ created_at: -1 })
        .limit(limit);

      return agentRuns;
    } catch (error) {
      logger.error('Error listing agent runs', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Seed default agents (PM, DEV, QA)
   */
  async seedDefaultAgents(): Promise<void> {
    try {
      logger.info('Seeding default agents');

      const defaultAgents = [
        // Product Manager Agent
        {
          type: 'spec-writer' as AgentType,
          name: 'Product Manager',
          role: 'Product Manager and Specification Writer',
          goals: [
            'Write clear and comprehensive product specifications',
            'Define user stories and acceptance criteria',
            'Create detailed roadmaps and feature breakdowns',
            'Ensure alignment with business objectives',
          ],
          tools: ['GitHub Issues', 'Markdown', 'Documentation'],
          constraints: [
            'Follow product specification template',
            'Include acceptance criteria for all features',
            'Define clear success metrics',
            'Consider technical feasibility',
          ],
          guardrails: [
            'Do not make technical implementation decisions',
            'Focus on "what" and "why", not "how"',
            'Ensure specifications are testable',
            'Validate requirements with stakeholders',
          ],
          enabled: true,
          onboardingDocRef: '.ai/agents/product-manager.md',
          contextPacks: ['docs/roadmap.md', 'docs/plan.md'],
          llmModel: 'claude-4-sonnet',
        },
        // Developer Agent
        {
          type: 'developer-implementer' as AgentType,
          name: 'Backend Developer',
          role: 'Backend Developer and API Implementer',
          goals: [
            'Implement backend features according to specifications',
            'Write clean, maintainable, and testable code',
            'Follow coding standards and best practices',
            'Create comprehensive API documentation',
          ],
          tools: ['TypeScript', 'Node.js', 'Express', 'MongoDB', 'Git'],
          constraints: [
            'Follow existing code patterns and conventions',
            'Write unit tests for all new code',
            'Implement proper error handling',
            'Add input validation for all endpoints',
            'Use TypeScript for type safety',
          ],
          guardrails: [
            'Do not commit secrets or credentials',
            'Do not bypass authentication/authorization',
            'Do not make breaking API changes without versioning',
            'Do not skip error handling',
            'Ensure backward compatibility',
          ],
          enabled: true,
          onboardingDocRef: '.ai/agents/backend-manager.md',
          contextPacks: ['api/src/', 'docs/roadmap.md'],
          llmModel: 'claude-4-sonnet',
        },
        // QA Agent
        {
          type: 'qa-tester' as AgentType,
          name: 'QA Engineer',
          role: 'Quality Assurance Engineer and Tester',
          goals: [
            'Review code changes for quality and correctness',
            'Identify bugs and potential issues',
            'Verify features meet acceptance criteria',
            'Ensure code follows best practices',
          ],
          tools: ['Code Review', 'Testing Frameworks', 'GitHub PR Reviews'],
          constraints: [
            'Test all critical user flows',
            'Verify error handling and edge cases',
            'Check for security vulnerabilities',
            'Ensure code coverage meets thresholds',
          ],
          guardrails: [
            'Do not approve PRs with failing tests',
            'Do not skip security checks',
            'Ensure all acceptance criteria are met',
            'Verify backward compatibility',
          ],
          enabled: true,
          onboardingDocRef: '.ai/agents/qa.md',
          contextPacks: ['docs/roadmap.md'],
          llmModel: 'claude-4-sonnet',
        },
      ];

      for (const agentData of defaultAgents) {
        const existing = await Agent.findOne({
          type: agentData.type,
          projectId: { $exists: false },
        });

        if (!existing) {
          await Agent.create(agentData);
          logger.info('Created default agent', { type: agentData.type, name: agentData.name });
        } else {
          logger.info('Default agent already exists', { type: agentData.type });
        }
      }

      logger.info('Default agents seeded successfully');
    } catch (error) {
      logger.error('Error seeding default agents', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Create agent service instance
 */
export function createAgentService(): AgentService {
  return new AgentService();
}

