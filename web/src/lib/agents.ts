/**
 * Agent API client
 */

import api from './api';

/**
 * Agent types
 */
export type AgentType =
  | 'spec-writer'
  | 'roadmap-decomposer'
  | 'acceptance-criteria-author'
  | 'issue-planner'
  | 'developer-implementer'
  | 'refactorer'
  | 'test-author'
  | 'code-reviewer'
  | 'qa-tester'
  | 'security-auditor'
  | 'release-manager'
  | 'infra-deploy-engineer';

/**
 * Agent run status
 */
export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Agent run step
 */
export interface AgentRunStep {
  stepNumber: number;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: Record<string, unknown>;
}

/**
 * Agent info
 */
export interface Agent {
  _id: string;
  type: AgentType;
  name: string;
  role: string;
  goals: string[];
  tools: string[];
  constraints: string[];
  guardrails: string[];
  enabled: boolean;
  onboardingDocRef?: string;
  contextPacks?: string[];
  model: string;
  created_at: string;
  updated_at: string;
}

/**
 * Agent run
 */
export interface AgentRun {
  _id: string;
  runId: string;
  agentId: Agent | string;
  projectId: string;
  cursorAgentId?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps: AgentRunStep[];
  status: AgentRunStatus;
  artifactsIn?: string[];
  artifactsOut?: string[];
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
  cursorUrl?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Execute agent request
 */
export interface ExecuteAgentRequest {
  agentType: AgentType;
  projectId: string;
  runId: string;
  repository: string;
  ref?: string;
  branchName?: string;
  prompt: string;
  autoCreatePr?: boolean;
  contextData?: Record<string, unknown>;
}

/**
 * Execute agent result
 */
export interface ExecuteAgentResult {
  agentRunId: string;
  cursorAgentId: string;
  cursorUrl: string;
  status: AgentRunStatus;
}

/**
 * Execute an agent
 */
export async function executeAgent(request: ExecuteAgentRequest): Promise<ExecuteAgentResult> {
  const response = await api.post('/agents/execute', request);
  return response.data.data;
}

/**
 * Get agent run status
 */
export async function getAgentRun(agentRunId: string): Promise<AgentRun> {
  const response = await api.get(`/agents/runs/${agentRunId}`);
  return response.data.data;
}

/**
 * Cancel agent run
 */
export async function cancelAgentRun(agentRunId: string): Promise<void> {
  await api.post(`/agents/runs/${agentRunId}/cancel`);
}

/**
 * List agent runs for a project
 */
export async function listAgentRuns(projectId: string, limit: number = 50): Promise<AgentRun[]> {
  const response = await api.get(`/agents/runs/project/${projectId}`, {
    params: { limit },
  });
  return response.data.data;
}

/**
 * List available agent types
 */
export async function listAgentTypes(): Promise<AgentType[]> {
  const response = await api.get('/agents/types');
  return response.data.data;
}

/**
 * Get agent display name
 */
export function getAgentDisplayName(agentType: AgentType): string {
  const names: Record<AgentType, string> = {
    'spec-writer': 'Product Manager',
    'roadmap-decomposer': 'Roadmap Planner',
    'acceptance-criteria-author': 'Requirements Writer',
    'issue-planner': 'Issue Planner',
    'developer-implementer': 'Developer',
    'refactorer': 'Code Refactorer',
    'test-author': 'Test Writer',
    'code-reviewer': 'Code Reviewer',
    'qa-tester': 'QA Engineer',
    'security-auditor': 'Security Auditor',
    'release-manager': 'Release Manager',
    'infra-deploy-engineer': 'DevOps Engineer',
  };
  return names[agentType] || agentType;
}

/**
 * Get agent icon/emoji
 */
export function getAgentIcon(agentType: AgentType): string {
  const icons: Record<AgentType, string> = {
    'spec-writer': '📋',
    'roadmap-decomposer': '🗺️',
    'acceptance-criteria-author': '✍️',
    'issue-planner': '📝',
    'developer-implementer': '👨‍💻',
    'refactorer': '🔧',
    'test-author': '🧪',
    'code-reviewer': '👀',
    'qa-tester': '🔍',
    'security-auditor': '🔒',
    'release-manager': '🚀',
    'infra-deploy-engineer': '⚙️',
  };
  return icons[agentType] || '🤖';
}

/**
 * Get status color
 */
export function getStatusColor(status: AgentRunStatus): string {
  const colors: Record<AgentRunStatus, string> = {
    pending: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
    running: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900',
    completed: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900',
    failed: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900',
    cancelled: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900',
  };
  return colors[status] || colors.pending;
}

/**
 * Get status icon
 */
export function getStatusIcon(status: AgentRunStatus): string {
  const icons: Record<AgentRunStatus, string> = {
    pending: '⏳',
    running: '▶️',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
  };
  return icons[status] || '⏳';
}

