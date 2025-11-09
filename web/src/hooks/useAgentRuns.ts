/**
 * Hook for managing agent runs with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { listAgentRuns } from '@/lib/agents';
import type { AgentRun } from '@/lib/agents';

interface UseAgentRunsOptions {
  projectId: string;
  refreshInterval?: number; // milliseconds
  limit?: number;
}

export function useAgentRuns({ projectId, refreshInterval = 5000, limit = 50 }: UseAgentRunsOptions) {
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentRuns = useCallback(async () => {
    try {
      const runs = await listAgentRuns(projectId, limit);
      setAgentRuns(runs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent runs');
    } finally {
      setLoading(false);
    }
  }, [projectId, limit]);

  // Initial fetch
  useEffect(() => {
    fetchAgentRuns();
  }, [fetchAgentRuns]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      fetchAgentRuns();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchAgentRuns]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchAgentRuns();
  }, [fetchAgentRuns]);

  return {
    agentRuns,
    loading,
    error,
    refresh,
  };
}

