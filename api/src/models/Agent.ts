import mongoose, { Schema, Document } from 'mongoose';

/**
 * Agent type definitions
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
 * Agent interface
 */
export interface IAgent extends Document {
  projectId?: mongoose.Types.ObjectId; // Optional: project-specific agent
  type: AgentType;
  name: string;
  role: string;
  goals: string[];
  tools: string[];
  constraints: string[];
  guardrails: string[];
  enabled: boolean;
  onboardingDocRef?: string; // Reference to onboarding document
  contextPacks?: string[]; // Context packs to include
  model?: string; // LLM model to use (e.g., "claude-4-sonnet")
  created_at: Date;
  updated_at: Date;
}

/**
 * Agent schema
 */
const AgentSchema = new Schema<IAgent>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'spec-writer',
        'roadmap-decomposer',
        'acceptance-criteria-author',
        'issue-planner',
        'developer-implementer',
        'refactorer',
        'test-author',
        'code-reviewer',
        'qa-tester',
        'security-auditor',
        'release-manager',
        'infra-deploy-engineer',
      ],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    goals: {
      type: [String],
      required: true,
      default: [],
    },
    tools: {
      type: [String],
      required: true,
      default: [],
    },
    constraints: {
      type: [String],
      required: true,
      default: [],
    },
    guardrails: {
      type: [String],
      required: true,
      default: [],
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    onboardingDocRef: {
      type: String,
      required: false,
      trim: true,
    },
    contextPacks: {
      type: [String],
      required: false,
      default: [],
    },
    model: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for project-specific agents
AgentSchema.index({ projectId: 1, type: 1 });

// Index for enabled agents
AgentSchema.index({ enabled: 1, type: 1 });

/**
 * Agent model
 */
export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

