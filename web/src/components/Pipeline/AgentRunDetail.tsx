/**
 * Agent Run Detail Modal
 * Detailed view of a single agent run
 */

import { motion } from 'framer-motion';
import { getAgentDisplayName, getAgentIcon, getStatusColor, getStatusIcon } from '@/lib/agents';
import type { AgentRun } from '@/lib/agents';
import { BaseModal } from '@/components/common/BaseModal';

interface AgentRunDetailProps {
  run: AgentRun | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentRunDetail({ run, isOpen, onClose }: AgentRunDetailProps) {
  if (!run) return null;

  const agent = typeof run.agentId === 'object' ? run.agentId : null;
  const agentType = agent?.type || 'developer-implementer';
  const agentName = agent?.name || getAgentDisplayName(agentType);
  const agentIcon = getAgentIcon(agentType);
  const statusColor = getStatusColor(run.status);
  const statusIcon = getStatusIcon(run.status);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div
            className={`
              flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-3xl
              bg-gray-100 dark:bg-gray-700
            `}
          >
            {agentIcon}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {agentName}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              {agent?.role || 'AI Agent'}
            </p>

            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusColor}`}>
              <span>{statusIcon}</span>
              <span className="capitalize">{run.status}</span>
            </div>
          </div>
        </div>

        {/* Steps Timeline */}
        {run.steps && run.steps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Execution Steps
            </h3>

            <div className="space-y-4">
              {run.steps.map((step, index) => (
                <motion.div
                  key={step.stepNumber}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${
                          step.status === 'completed'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                            : step.status === 'running'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                            : step.status === 'failed'
                            ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }
                      `}
                    >
                      {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : step.stepNumber}
                    </div>
                    {index < run.steps.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {step.description}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {step.completedAt
                          ? new Date(step.completedAt).toLocaleTimeString()
                          : step.startedAt
                          ? 'In progress...'
                          : 'Pending'}
                      </span>
                    </div>

                    {step.error && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">{step.error}</p>
                      </div>
                    )}

                    {step.output && Object.keys(step.output).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                          View output
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Input/Output */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Input */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Input
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(run.input, null, 2)}
              </pre>
            </div>
          </div>

          {/* Output */}
          {run.output && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Output
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(run.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Run ID</p>
            <p className="text-sm font-mono text-gray-900 dark:text-white">{run.runId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Agent Run ID</p>
            <p className="text-sm font-mono text-gray-900 dark:text-white">{run._id}</p>
          </div>
          {run.cursorAgentId && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cursor Agent ID</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">{run.cursorAgentId}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
            <p className="text-sm text-gray-900 dark:text-white">
              {new Date(run.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

