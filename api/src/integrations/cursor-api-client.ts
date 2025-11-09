import { logger } from '../config/logger';

/**
 * Cursor Cloud Agents API Client
 * Documentation: https://docs.cursor.com/api/agents
 */

export interface CursorPrompt {
  text: string;
  images?: Array<{
    data: string; // base64 encoded image
    dimension: {
      width: number;
      height: number;
    };
  }>;
}

export interface CursorSource {
  repository: string; // GitHub repository URL (e.g., https://github.com/your-org/your-repo)
  ref?: string; // Git ref (branch name, tag, or commit hash)
}

export interface CursorTarget {
  autoCreatePr?: boolean; // Whether to automatically create a pull request
  openAsCursorGithubApp?: boolean; // Whether to open the PR as the Cursor GitHub App
  skipReviewerRequest?: boolean; // Whether to skip adding the user as a reviewer
  branchName?: string; // Custom branch name for the agent to create
}

export interface CursorWebhook {
  url: string; // URL to receive webhook notifications
  secret?: string; // Secret key for webhook payload verification (minimum 32 characters)
}

export interface LaunchAgentRequest {
  prompt: CursorPrompt;
  source: CursorSource;
  target?: CursorTarget;
  webhook?: CursorWebhook;
  model?: string; // The LLM to use (e.g., claude-4-sonnet)
}

export interface AgentResponse {
  id: string; // Agent ID (e.g., "bc_abc123")
  name: string; // Agent name
  status: 'CREATING' | 'RUNNING' | 'COMPLETED' | 'FAILED'; // Agent status
  source: CursorSource;
  target: {
    branchName: string;
    url: string; // URL to view the agent in Cursor
    autoCreatePr: boolean;
    openAsCursorGithubApp: boolean;
    skipReviewerRequest: boolean;
  };
  createdAt: string; // ISO 8601 timestamp
}

export interface AgentStatusResponse extends AgentResponse {
  updatedAt?: string;
  error?: string;
}

/**
 * Cursor Cloud Agents API Client
 */
export class CursorApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.cursor.com/v0';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Cursor API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Launch a new cloud agent
   * @param request Agent launch request
   * @returns Agent response with ID and status
   */
  async launchAgent(request: LaunchAgentRequest): Promise<AgentResponse> {
    try {
      logger.info('Launching Cursor cloud agent', {
        repository: request.source.repository,
        ref: request.source.ref,
        branchName: request.target?.branchName,
      });

      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to launch Cursor agent', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to launch agent: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as AgentResponse;

      logger.info('Cursor cloud agent launched successfully', {
        agentId: data.id,
        name: data.name,
        status: data.status,
        url: data.target.url,
      });

      return data;
    } catch (error) {
      logger.error('Error launching Cursor agent', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get agent status
   * @param agentId Agent ID
   * @returns Agent status response
   */
  async getAgentStatus(agentId: string): Promise<AgentStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to get Cursor agent status', {
          agentId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to get agent status: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as AgentStatusResponse;

      return data;
    } catch (error) {
      logger.error('Error getting Cursor agent status', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cancel a running agent
   * @param agentId Agent ID
   */
  async cancelAgent(agentId: string): Promise<void> {
    try {
      logger.info('Cancelling Cursor cloud agent', { agentId });

      const response = await fetch(`${this.baseUrl}/agents/${agentId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to cancel Cursor agent', {
          agentId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to cancel agent: ${response.status} ${response.statusText}`);
      }

      logger.info('Cursor cloud agent cancelled successfully', { agentId });
    } catch (error) {
      logger.error('Error cancelling Cursor agent', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Create a Cursor API client instance
 * @param apiKey Cursor API key
 * @returns Cursor API client instance
 */
export function createCursorApiClient(apiKey: string): CursorApiClient {
  return new CursorApiClient(apiKey);
}

