/**
 * Pipeline Visualization Component
 * Beautiful, simple visualization of the AI agent pipeline
 */

import { motion, AnimatePresence } from 'framer-motion';
import { getAgentDisplayName, getAgentIcon, getStatusColor, getStatusIcon } from '@/lib/agents';
import type { AgentRun } from '@/lib/agents';

interface PipelineVisualizationProps {
  agentRuns: AgentRun[];
  onSelectRun?: (run: AgentRun) => void;
}

export function PipelineVisualization({ agentRuns, onSelectRun }: PipelineVisualizationProps) {
  if (agentRuns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Agent Activity Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Your AI agents will appear here when they start working on tasks.
            Watch the magic happen in real-time!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {agentRuns.map((run, index) => (
          <motion.div
            key={run._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <AgentRunCard run={run} onClick={() => onSelectRun?.(run)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface AgentRunCardProps {
  run: AgentRun;
  onClick?: () => void;
}

function AgentRunCard({ run, onClick }: AgentRunCardProps) {
  const agent = typeof run.agentId === 'object' ? run.agentId : null;
  const agentType = agent?.type || 'developer-implementer';
  const agentName = agent?.name || getAgentDisplayName(agentType);
  const agentIcon = getAgentIcon(agentType);
  const statusColor = getStatusColor(run.status);
  const statusIcon = getStatusIcon(run.status);

  const isRunning = run.status === 'running';
  const isCompleted = run.status === 'completed';
  const isFailed = run.status === 'failed';

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 
        ${isRunning ? 'border-blue-400 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'}
        p-6 cursor-pointer transition-all hover:shadow-xl
      `}
    >
      <div className="flex items-start gap-4">
        {/* Agent Icon */}
        <motion.div
          animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={`
            flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl
            ${isRunning ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}
          `}
        >
          {agentIcon}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {agentName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {agent?.role || 'AI Agent'}
              </p>
            </div>

            {/* Status Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                ${statusColor}
              `}
            >
              <span>{statusIcon}</span>
              <span className="capitalize">{run.status}</span>
            </motion.div>
          </div>

          {/* Progress Steps */}
          {run.steps && run.steps.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Progress
                </span>
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(run.steps.filter((s) => s.status === 'completed').length / run.steps.length) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                    className={`h-full ${
                      isCompleted
                        ? 'bg-green-500'
                        : isFailed
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {run.steps.filter((s) => s.status === 'completed').length}/{run.steps.length}
                </span>
              </div>

              {/* Current Step */}
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                  />
                  <span>
                    {run.steps.find((s) => s.status === 'running')?.description ||
                      'Working...'}
                  </span>
                </motion.div>
              )}
            </div>
          )}

          {/* Branch & PR Info */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
            {run.branchName && (
              <div className="flex items-center gap-1">
                <span>🌿</span>
                <span className="font-mono">{run.branchName}</span>
              </div>
            )}
            {run.prUrl && (
              <a
                href={run.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>🔗</span>
                <span>PR #{run.prNumber}</span>
              </a>
            )}
            {run.cursorUrl && (
              <a
                href={run.cursorUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>🔗</span>
                <span>View in Cursor</span>
              </a>
            )}
          </div>

          {/* Error Message */}
          {isFailed && run.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-sm text-red-700 dark:text-red-300">{run.error}</p>
            </motion.div>
          )}

          {/* Timestamp */}
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            {new Date(run.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

