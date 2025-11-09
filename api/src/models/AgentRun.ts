import mongoose, { Schema, Document } from 'mongoose';

/**
 * Agent run status
 */
export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Agent run step
 */
export interface IAgentRunStep {
  stepNumber: number;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  output?: Record<string, unknown>;
}

/**
 * Agent run interface
 */
export interface IAgentRun extends Document {
  runId: string; // Correlation ID for the overall workflow run
  agentId: mongoose.Types.ObjectId; // Reference to Agent model
  projectId: mongoose.Types.ObjectId; // Reference to Project model
  cursorAgentId?: string; // Cursor Cloud Agent ID (e.g., "bc_abc123")
  input: Record<string, unknown>; // Input parameters for the agent
  output?: Record<string, unknown>; // Output from the agent
  steps: IAgentRunStep[]; // Steps executed by the agent
  status: AgentRunStatus;
  artifactsIn?: string[]; // Input artifacts
  artifactsOut?: string[]; // Output artifacts
  branchName?: string; // Branch created by the agent
  prNumber?: number; // PR number created by the agent
  prUrl?: string; // PR URL
  cursorUrl?: string; // Cursor agent URL
  error?: string; // Error message if failed
  created_at: Date;
  updated_at: Date;
}

/**
 * Agent run schema
 */
const AgentRunSchema = new Schema<IAgentRun>(
  {
    runId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    cursorAgentId: {
      type: String,
      required: false,
      index: true,
      trim: true,
    },
    input: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    output: {
      type: Schema.Types.Mixed,
      required: false,
    },
    steps: {
      type: [
        {
          stepNumber: { type: Number, required: true },
          description: { type: String, required: true },
          status: {
            type: String,
            required: true,
            enum: ['pending', 'running', 'completed', 'failed'],
          },
          startedAt: { type: Date, required: false },
          completedAt: { type: Date, required: false },
          error: { type: String, required: false },
          output: { type: Schema.Types.Mixed, required: false },
        },
      ],
      required: true,
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    artifactsIn: {
      type: [String],
      required: false,
      default: [],
    },
    artifactsOut: {
      type: [String],
      required: false,
      default: [],
    },
    branchName: {
      type: String,
      required: false,
      trim: true,
    },
    prNumber: {
      type: Number,
      required: false,
    },
    prUrl: {
      type: String,
      required: false,
      trim: true,
    },
    cursorUrl: {
      type: String,
      required: false,
      trim: true,
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
AgentRunSchema.index({ runId: 1, agentId: 1 });
AgentRunSchema.index({ projectId: 1, status: 1 });
// Note: cursorAgentId already has index: true in schema definition (line 70)

/**
 * Agent run model
 */
export const AgentRun = mongoose.model<IAgentRun>('AgentRun', AgentRunSchema);

