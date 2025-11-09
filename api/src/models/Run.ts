import mongoose, { Schema, Document } from 'mongoose';

/**
 * Run state for the pipeline
 */
export type RunState =
  | 'CREATED'
  | 'PM_RUNNING'
  | 'PM_COMPLETED'
  | 'DEV_RUNNING'
  | 'DEV_COMPLETED'
  | 'QA_RUNNING'
  | 'QA_COMPLETED'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Timeline entry for tracking progress
 */
export interface ITimelineEntry {
  phase: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Run interface - tracks a complete pipeline execution
 */
export interface IRun extends Document {
  runId: string; // Unique correlation ID
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  state: RunState;
  prompt: string; // The original user prompt/idea
  repository: string; // GitHub repository URL
  ref?: string; // Git ref (branch)
  
  // Agent run references
  pmAgentRunId?: mongoose.Types.ObjectId;
  devAgentRunId?: mongoose.Types.ObjectId;
  qaAgentRunId?: mongoose.Types.ObjectId;
  
  // Timeline for tracking progress
  timeline: ITimelineEntry[];
  
  // Error tracking
  error?: string;
  
  created_at: Date;
  updated_at: Date;
}

/**
 * Run schema
 */
const RunSchema = new Schema<IRun>(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      enum: [
        'CREATED',
        'PM_RUNNING',
        'PM_COMPLETED',
        'DEV_RUNNING',
        'DEV_COMPLETED',
        'QA_RUNNING',
        'QA_COMPLETED',
        'COMPLETED',
        'FAILED',
      ],
      default: 'CREATED',
      index: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    repository: {
      type: String,
      required: true,
      trim: true,
    },
    ref: {
      type: String,
      required: false,
      trim: true,
    },
    pmAgentRunId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentRun',
      required: false,
      index: true,
    },
    devAgentRunId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentRun',
      required: false,
      index: true,
    },
    qaAgentRunId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentRun',
      required: false,
      index: true,
    },
    timeline: {
      type: [
        {
          phase: { type: String, required: true },
          timestamp: { type: Date, required: true },
          level: {
            type: String,
            required: true,
            enum: ['info', 'warn', 'error', 'success'],
          },
          message: { type: String, required: true },
          data: { type: Schema.Types.Mixed, required: false },
        },
      ],
      required: true,
      default: [],
    },
    error: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes
RunSchema.index({ projectId: 1, state: 1 });
RunSchema.index({ userId: 1, created_at: -1 });

/**
 * Run model
 */
export const Run = mongoose.model<IRun>('Run', RunSchema);
