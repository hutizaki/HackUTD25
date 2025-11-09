/**
 * Pipeline Statistics Component
 * Shows overview stats of agent activity
 */

import { motion } from 'framer-motion';
import type { AgentRun } from '@/lib/agents';

interface PipelineStatsProps {
  agentRuns: AgentRun[];
}

export function PipelineStats({ agentRuns }: PipelineStatsProps) {
  const stats = calculateStats(agentRuns);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon="🤖"
        label="Total Runs"
        value={stats.total}
        color="blue"
      />
      <StatCard
        icon="▶️"
        label="Running"
        value={stats.running}
        color="blue"
        pulse={stats.running > 0}
      />
      <StatCard
        icon="✅"
        label="Completed"
        value={stats.completed}
        color="green"
      />
      <StatCard
        icon="❌"
        label="Failed"
        value={stats.failed}
        color="red"
      />
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red';
  pulse?: boolean;
}

function StatCard({ icon, label, value, color, pulse }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={pulse ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={`text-4xl p-3 rounded-lg ${colorClasses[color]}`}
        >
          {icon}
        </motion.div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function calculateStats(agentRuns: AgentRun[]) {
  return {
    total: agentRuns.length,
    running: agentRuns.filter((r) => r.status === 'running').length,
    completed: agentRuns.filter((r) => r.status === 'completed').length,
    failed: agentRuns.filter((r) => r.status === 'failed').length,
    cancelled: agentRuns.filter((r) => r.status === 'cancelled').length,
    pending: agentRuns.filter((r) => r.status === 'pending').length,
  };
}

