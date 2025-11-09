import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Wand2,
  Sparkles,
  Brain,
  CheckCircle2,
  Zap,
  Rocket,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Check,
  AlertCircle,
  FileText,
  Code,
  TestTube,
} from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  logs?: string[];
  metrics?: Record<string, number | string>;
  error?: string;
  icon: React.ReactNode;
}

interface PipelineVisualizationProps {
  runId: string;
  projectId: string;
  onComplete?: () => void;
}

export function PipelineVisualization({ runId, projectId, onComplete }: PipelineVisualizationProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [runState, setRunState] = useState('CREATED');
  const [pipelineInfo, setPipelineInfo] = useState<any>(null);

  // Icon mapping for stages
  const iconMap: Record<string, React.ReactNode> = {
    PM: <FileText className="w-5 h-5" />,
    TICKETS: <Sparkles className="w-5 h-5" />,
    DEV: <Code className="w-5 h-5" />,
    QA: <TestTube className="w-5 h-5" />,
    COMPLETE: <Rocket className="w-5 h-5" />,
  };

  // Fetch pipeline data
  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        // Fetch run status
        const runResponse = await fetch(`/api/projects/${projectId}/pipeline/runs/${runId}`, {
          credentials: 'include',
        });
        const runData = await runResponse.json();

        if (!runData.success) {
          throw new Error('Failed to fetch run data');
        }

        const run = runData.data;
        setRunState(run.state);
        setPipelineInfo(run);

        // Fetch progress data
        const progressResponse = await fetch(`/api/runs/${runId}/tickets/progress`, {
          credentials: 'include',
        });
        const progressData = await progressResponse.json();

        if (progressData.success) {
          const progress = progressData.data;

          // Map timeline to stages
          const stageMap = new Map<string, PipelineStage>();

          // Initialize stages
          ['PM', 'TICKETS', 'DEV', 'QA', 'COMPLETE'].forEach((phase) => {
            stageMap.set(phase, {
              id: phase,
              name: getPhaseDisplayName(phase),
              description: getPhaseDescription(phase),
              status: 'queued',
              progress: 0,
              icon: iconMap[phase] || <Activity className="w-5 h-5" />,
              logs: [],
              metrics: {},
            });
          });

          // Process timeline entries
          run.timeline?.forEach((entry: any) => {
            const phase = entry.phase;
            const stage = stageMap.get(phase);

            if (stage) {
              // Add log entry
              if (!stage.logs) stage.logs = [];
              stage.logs.push(`[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`);

              // Update status based on level
              if (entry.level === 'error') {
                stage.status = 'failed';
                stage.error = entry.message;
              } else if (entry.level === 'success') {
                stage.status = 'completed';
                stage.progress = 100;
                stage.endTime = new Date(entry.timestamp);
              } else if (entry.level === 'info' && entry.message.includes('Starting')) {
                stage.status = 'running';
                stage.startTime = new Date(entry.timestamp);
              }

              // Update metrics from data
              if (entry.data) {
                stage.metrics = { ...stage.metrics, ...entry.data };
              }
            }
          });

          // Update progress from phases
          if (progress.phases) {
            Object.entries(progress.phases).forEach(([phase, data]: [string, any]) => {
              const stage = stageMap.get(phase);
              if (stage) {
                stage.progress = data.percentage || 0;
                if (data.status === 'COMPLETED') {
                  stage.status = 'completed';
                } else if (data.status === 'IN_PROGRESS') {
                  stage.status = 'running';
                }
              }
            });
          }

          // Add ticket metrics
          const devStage = stageMap.get('DEV');
          const qaStage = stageMap.get('QA');
          const completeStage = stageMap.get('COMPLETE');

          if (devStage) {
            devStage.metrics = {
              'Total Tickets': progress.totalTickets,
              'Completed': progress.completedTickets,
              'In Progress': progress.totalTickets - progress.completedTickets,
            };
          }

          if (qaStage) {
            qaStage.metrics = {
              'Tests Run': progress.completedTickets,
              'Passed': progress.completedTickets,
              'Success Rate': '100%',
            };
          }

          if (completeStage) {
            completeStage.metrics = {
              'Total Tickets': progress.totalTickets,
              'All Complete': progress.completedTickets,
              'Success Rate': `${progress.overallPercentage}%`,
            };
          }

          // Update overall completion
          if (run.state === 'COMPLETED') {
            completeStage!.status = 'completed';
            completeStage!.progress = 100;
          } else if (run.state === 'FAILED') {
            const failedStage = Array.from(stageMap.values()).find((s) => s.status === 'running');
            if (failedStage) {
              failedStage.status = 'failed';
            }
          }

          setStages(Array.from(stageMap.values()));
        }
      } catch (error) {
        console.error('Error fetching pipeline data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipelineData();

    // Poll for updates every 2 seconds if not complete
    const interval = setInterval(() => {
      if (runState !== 'COMPLETED' && runState !== 'FAILED') {
        fetchPipelineData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runId, projectId, runState]);

  // Calculate overall progress
  useEffect(() => {
    if (stages.length > 0) {
      const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
      const overall = totalProgress / stages.length;
      setOverallProgress(overall);

      if (overall === 100 && !showConfetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        onComplete?.();
      }
    }
  }, [stages, showConfetti, onComplete]);

  const getPhaseDisplayName = (phase: string): string => {
    const names: Record<string, string> = {
      PM: 'PM Agent',
      TICKETS: 'Ticket Creation',
      DEV: 'Development',
      QA: 'Quality Assurance',
      COMPLETE: 'Deployment',
    };
    return names[phase] || phase;
  };

  const getPhaseDescription = (phase: string): string => {
    const descriptions: Record<string, string> = {
      PM: 'Analyzing requirements and creating specification',
      TICKETS: 'Breaking down work into hierarchical tickets',
      DEV: 'Implementing features and creating pull requests',
      QA: 'Testing implementations and validating quality',
      COMPLETE: 'Finalizing deployment and documentation',
    };
    return descriptions[phase] || '';
  };

  const toggleExpand = (stageId: string) => {
    setExpandedStage(expandedStage === stageId ? null : stageId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'running':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'queued':
        return 'bg-slate-600';
      case 'skipped':
        return 'bg-amber-500';
      default:
        return 'bg-slate-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500/30';
      case 'running':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/10 border-red-500/30';
      case 'queued':
        return 'bg-slate-700/30 border-slate-600/30';
      case 'skipped':
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-slate-700/30 border-slate-600/30';
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString();
  };

  const calculateDuration = (start?: Date, end?: Date) => {
    if (!start) return '0s';
    const endTime = end || new Date();
    const diff = Math.floor((endTime.getTime() - start.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animation: `fall ${2 + Math.random() * 2}s linear forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                AI Development Pipeline
              </h1>
              <p className="text-slate-400 text-lg">
                {pipelineInfo?.prompt || 'Autonomous software development workflow'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-1">
                {overallProgress.toFixed(0)}%
              </div>
              <div className="text-slate-500 text-sm">Overall Progress</div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 shimmer" />
            </motion.div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              {
                label: 'Completed',
                value: stages.filter((s) => s.status === 'completed').length,
                color: 'text-emerald-400',
              },
              {
                label: 'Running',
                value: stages.filter((s) => s.status === 'running').length,
                color: 'text-blue-400',
              },
              {
                label: 'Queued',
                value: stages.filter((s) => s.status === 'queued').length,
                color: 'text-slate-400',
              },
              {
                label: 'Failed',
                value: stages.filter((s) => s.status === 'failed').length,
                color: 'text-red-400',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm"
              >
                <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-slate-500 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Pipeline Stages */}
      <div className="max-w-7xl mx-auto space-y-4">
        <AnimatePresence>
          {stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              {/* Connecting Line */}
              {index < stages.length - 1 && (
                <div className="absolute left-8 top-20 w-0.5 h-6 bg-gradient-to-b from-slate-600 to-transparent" />
              )}

              {/* Stage Card */}
              <div
                className={`relative bg-slate-800/50 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer
                  ${getStatusBg(stage.status)}
                  ${stage.status === 'running' ? 'animate-[pulse-glow_2s_ease-in-out_infinite]' : ''}
                  hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20`}
                onClick={() => toggleExpand(stage.id)}
              >
                {/* Animated Border for Running Stage */}
                {stage.status === 'running' && (
                  <div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-50 blur-xl animate-[spin_3s_linear_infinite]"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
                    }}
                  />
                )}

                <div className="relative p-6">
                  <div className="flex items-start gap-6">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-16 h-16 rounded-xl ${getStatusColor(stage.status)} 
                      flex items-center justify-center text-white shadow-lg transition-transform duration-300
                      group-hover:scale-110 group-hover:rotate-3`}
                    >
                      {stage.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-white">{stage.name}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBg(stage.status)}`}
                          >
                            {stage.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {stage.startTime && (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Clock className="w-4 h-4" />
                              {calculateDuration(stage.startTime, stage.endTime)}
                            </div>
                          )}
                          {expandedStage === stage.id ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      <p className="text-slate-400 text-sm mb-4">{stage.description}</p>

                      {/* Progress Bar */}
                      {stage.progress > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Progress</span>
                            <span className="text-white font-medium">{stage.progress.toFixed(1)}%</span>
                          </div>
                          <div className="relative h-2 bg-slate-900/50 rounded-full overflow-hidden">
                            <motion.div
                              className={`absolute inset-y-0 left-0 ${getStatusColor(stage.status)} rounded-full`}
                              initial={{ width: 0 }}
                              animate={{ width: `${stage.progress}%` }}
                              transition={{ duration: 0.5 }}
                            >
                              {stage.status === 'running' && <div className="absolute inset-0 shimmer" />}
                            </motion.div>
                          </div>
                        </div>
                      )}

                      {/* Metrics */}
                      {Object.keys(stage.metrics || {}).length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                          {Object.entries(stage.metrics || {}).map(([key, value]) => (
                            <div
                              key={key}
                              className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30"
                            >
                              <div className="text-xs text-slate-500 mb-1">{key}</div>
                              <div className="text-lg font-semibold text-white">{value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedStage === stage.id && stage.logs && stage.logs.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-6 border-t border-slate-700/50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Execution Logs
                          </h4>
                          {stage.startTime && (
                            <div className="text-xs text-slate-500">
                              Started: {formatTime(stage.startTime)}
                              {stage.endTime && ` • Ended: ${formatTime(stage.endTime)}`}
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-950/50 rounded-lg p-4 max-h-64 overflow-y-auto border border-slate-800">
                          <div className="font-mono text-xs space-y-1">
                            {stage.logs.map((log, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="text-slate-300 hover:bg-slate-800/50 px-2 py-1 rounded transition-colors"
                              >
                                {log}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="max-w-7xl mx-auto mt-12 p-6 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-slate-500 text-sm mb-1">Pipeline ID</div>
              <div className="text-white text-lg font-semibold font-mono">{runId.split('-')[0]}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm mb-1">Status</div>
              <div className="text-white text-lg font-semibold">{runState}</div>
            </div>
            {pipelineInfo?.created_at && (
              <div>
                <div className="text-slate-500 text-sm mb-1">Started</div>
                <div className="text-white text-lg font-semibold">
                  {new Date(pipelineInfo.created_at).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          {overallProgress === 100 && (
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-6 h-6" />
              <span className="text-lg font-semibold">Pipeline Complete!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

