import mongoose, { Schema, Document } from 'mongoose';

/**
 * Ticket status in the workflow
 */
export type TicketStatus =
  | 'planned'           // PM created, not started
  | 'pm-review'         // PM reviewing before handoff
  | 'ready-for-dev'     // Ready for DEV to pick up
  | 'in-progress'       // DEV working on it
  | 'in-review'         // DEV done, ready for QA
  | 'testing'           // QA testing
  | 'qa-approved'       // QA passed
  | 'qa-failed'         // QA found issues
  | 'user-review'       // Ready for user review
  | 'completed'         // All done
  | 'blocked';          // Blocked by something

/**
 * Ticket type/difficulty
 */
export type TicketType = 'epic' | 'story' | 'task' | 'bug';

/**
 * Agent type
 */
export type AgentType = 'pm' | 'dev' | 'qa';

/**
 * Ticket comment
 */
export interface ITicketComment {
  agent: AgentType;
  timestamp: Date;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Acceptance criterion
 */
export interface IAcceptanceCriterion {
  description: string;
  completed: boolean;
  verifiedBy?: AgentType;
  verifiedAt?: Date;
}

/**
 * Ticket interface
 */
export interface ITicket extends Document {
  // Basic info
  ticketNumber: number;           // Sequential number
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: 'high' | 'medium' | 'low';
  
  // Project context
  projectId: mongoose.Types.ObjectId;
  runId: string;                  // Links to pipeline run
  
  // Branch info
  branchName?: string;            // Branch for this ticket
  baseBranch?: string;            // Branch to merge into
  prNumber?: number;              // PR number if created
  prUrl?: string;                 // PR URL
  
  // Hierarchy
  parentTicketId?: number;        // Parent ticket number
  childTicketIds: number[];       // Child ticket numbers
  
  // Requirements
  acceptanceCriteria: IAcceptanceCriterion[];
  estimatedHours?: number;
  
  // Implementation
  implementationNotes?: string;   // Technical guidance
  filesAffected?: string[];       // Files to modify
  
  // Agent assignments
  assignedTo?: AgentType;
  createdBy: AgentType;
  
  // Comments/activity
  comments: ITicketComment[];
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Ticket schema
 */
const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['epic', 'story', 'task', 'bug'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'planned',
        'pm-review',
        'ready-for-dev',
        'in-progress',
        'in-review',
        'testing',
        'qa-approved',
        'qa-failed',
        'user-review',
        'completed',
        'blocked',
      ],
      default: 'planned',
      index: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    runId: {
      type: String,
      required: true,
      index: true,
    },
    branchName: {
      type: String,
      required: false,
      trim: true,
    },
    baseBranch: {
      type: String,
      required: false,
      trim: true,
      default: 'main',
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
    parentTicketId: {
      type: Number,
      required: false,
      index: true,
    },
    childTicketIds: {
      type: [Number],
      required: true,
      default: [],
    },
    acceptanceCriteria: {
      type: [
        {
          description: { type: String, required: true },
          completed: { type: Boolean, required: true, default: false },
          verifiedBy: { type: String, enum: ['pm', 'dev', 'qa'], required: false },
          verifiedAt: { type: Date, required: false },
        },
      ],
      required: true,
      default: [],
    },
    estimatedHours: {
      type: Number,
      required: false,
    },
    implementationNotes: {
      type: String,
      required: false,
    },
    filesAffected: {
      type: [String],
      required: false,
      default: [],
    },
    assignedTo: {
      type: String,
      enum: ['pm', 'dev', 'qa'],
      required: false,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      enum: ['pm', 'dev', 'qa'],
    },
    comments: {
      type: [
        {
          agent: { type: String, required: true, enum: ['pm', 'dev', 'qa'] },
          timestamp: { type: Date, required: true },
          message: { type: String, required: true },
          data: { type: Schema.Types.Mixed, required: false },
        },
      ],
      required: true,
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes
TicketSchema.index({ projectId: 1, runId: 1 });
TicketSchema.index({ runId: 1, status: 1 });
TicketSchema.index({ projectId: 1, ticketNumber: 1 }, { unique: true });

/**
 * Ticket model
 */
export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
