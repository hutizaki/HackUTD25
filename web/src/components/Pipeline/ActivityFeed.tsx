/**
 * Activity Feed Component
 * Real-time feed of agent activities
 */

import { motion, AnimatePresence } from 'framer-motion';
import { getAgentDisplayName, getAgentIcon, getStatusIcon } from '@/lib/agents';
import type { AgentRun } from '@/lib/agents';

interface ActivityFeedProps {
  agentRuns: AgentRun[];
  maxItems?: number;
}

export function ActivityFeed({ agentRuns, maxItems = 10 }: ActivityFeedProps) {
  const recentRuns = agentRuns.slice(0, maxItems);

  if (recentRuns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-2">📭</div>
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {recentRuns.map((run, index) => (
          <motion.div
            key={run._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <ActivityItem run={run} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ActivityItemProps {
  run: AgentRun;
}

function ActivityItem({ run }: ActivityItemProps) {
  const agent = typeof run.agentId === 'object' ? run.agentId : null;
  const agentType = agent?.type || 'developer-implementer';
  const agentName = agent?.name || getAgentDisplayName(agentType);
  const agentIcon = getAgentIcon(agentType);
  const statusIcon = getStatusIcon(run.status);

  const isRunning = run.status === 'running';
  const timeAgo = getTimeAgo(new Date(run.created_at));

  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Icon */}
      <motion.div
        animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg"
      >
        {agentIcon}
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {agentName}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {timeAgo}
          </span>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {getActivityDescription(run)}
        </p>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs">{statusIcon}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {run.status}
          </span>
          {run.branchName && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                {run.branchName}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getActivityDescription(run: AgentRun): string {
  const currentStep = run.steps.find((s) => s.status === 'running');
  if (currentStep) {
    return currentStep.description;
  }

  if (run.status === 'completed') {
    return 'Task completed successfully';
  }

  if (run.status === 'failed') {
    return run.error || 'Task failed';
  }

  if (run.status === 'cancelled') {
    return 'Task was cancelled';
  }

  return 'Task is pending';
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

