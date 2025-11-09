import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Ticket Type Enum
 */
export enum TicketType {
  EPIC = 'epic',
  FEATURE = 'feature',
  TASK = 'task',
  DEFECT = 'defect',
}

/**
 * Ticket Status Enum
 */
export enum TicketStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  REVIEW = 'REVIEW',
  QA = 'QA',
  DONE = 'DONE',
}

/**
 * Ticket Interface
 */
export interface ITicket extends Document {
  // GitHub Integration
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  repo?: string;

  // Ticket Details
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  labels: string[];

  // Hierarchy
  parentId?: mongoose.Types.ObjectId;
  children: mongoose.Types.ObjectId[];
  orderIndex?: number;

  // Dependencies
  dependencies: mongoose.Types.ObjectId[];
  blockers: mongoose.Types.ObjectId[];

  // Acceptance Criteria
  acceptanceCriteria: string[];

  // Code Integration
  branch?: string;
  prNumber?: number;
  prUrl?: string;

  // Project & Run Association
  projectId: mongoose.Types.ObjectId;
  runId?: string;

  // Metadata
  created_at: Date;
  updated_at: Date;

  // Methods
  addChild(childId: mongoose.Types.ObjectId): Promise<ITicket>;
  updateStatus(newStatus: TicketStatus): Promise<ITicket>;
  canStart(): Promise<boolean>;
  isBlocked(): Promise<boolean>;
  addDependency(ticketId: mongoose.Types.ObjectId): Promise<ITicket>;
  addBlocker(ticketId: mongoose.Types.ObjectId): Promise<ITicket>;
  removeBlocker(ticketId: mongoose.Types.ObjectId): Promise<ITicket>;
}

/**
 * Ticket Schema
 */
const TicketSchema = new Schema<ITicket>(
  {
    // GitHub Integration
    githubIssueNumber: {
      type: Number,
      index: true,
    },
    githubIssueUrl: {
      type: String,
    },
    repo: {
      type: String,
      index: true,
    },

    // Ticket Details
    type: {
      type: String,
      enum: Object.values(TicketType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.NEW,
      required: true,
      index: true,
    },
    labels: {
      type: [String],
      default: [],
    },

    // Hierarchy
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      index: true,
    },
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket',
      },
    ],
    orderIndex: {
      type: Number,
    },

    // Dependencies
    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket',
      },
    ],
    blockers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket',
      },
    ],

    // Acceptance Criteria
    acceptanceCriteria: {
      type: [String],
      default: [],
    },

    // Code Integration
    branch: {
      type: String,
      index: true,
    },
    prNumber: {
      type: Number,
    },
    prUrl: {
      type: String,
    },

    // Project & Run Association
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    runId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

/**
 * Indexes for performance
 */
TicketSchema.index({ projectId: 1, status: 1 });
TicketSchema.index({ projectId: 1, type: 1 });
TicketSchema.index({ runId: 1 });
TicketSchema.index({ parentId: 1 });

/**
 * Add child ticket
 */
TicketSchema.methods.addChild = async function (
  this: ITicket,
  childId: mongoose.Types.ObjectId
): Promise<ITicket> {
  if (!this.children.includes(childId)) {
    this.children.push(childId);
    await this.save();
  }
  return this;
};

/**
 * Update ticket status
 */
TicketSchema.methods.updateStatus = async function (
  this: ITicket,
  newStatus: TicketStatus
): Promise<ITicket> {
  this.status = newStatus;
  await this.save();
  return this;
};

/**
 * Check if ticket can start (all dependencies resolved)
 */
TicketSchema.methods.canStart = async function (this: ITicket): Promise<boolean> {
  if (this.dependencies.length === 0) {
    return true;
  }

  const Ticket = mongoose.model<ITicket>('Ticket');
  const deps = await Ticket.find({
    _id: { $in: this.dependencies },
  });

  return deps.every((dep) => dep.status === TicketStatus.DONE);
};

/**
 * Check if ticket is blocked
 */
TicketSchema.methods.isBlocked = async function (this: ITicket): Promise<boolean> {
  if (this.blockers.length === 0) {
    return false;
  }

  const Ticket = mongoose.model<ITicket>('Ticket');
  const blockers = await Ticket.find({
    _id: { $in: this.blockers },
  });

  return blockers.some((blocker) => blocker.status !== TicketStatus.DONE);
};

/**
 * Add dependency
 */
TicketSchema.methods.addDependency = async function (
  this: ITicket,
  ticketId: mongoose.Types.ObjectId
): Promise<ITicket> {
  if (!this.dependencies.includes(ticketId)) {
    this.dependencies.push(ticketId);
    await this.save();
  }
  return this;
};

/**
 * Add blocker
 */
TicketSchema.methods.addBlocker = async function (
  this: ITicket,
  ticketId: mongoose.Types.ObjectId
): Promise<ITicket> {
  if (!this.blockers.includes(ticketId)) {
    this.blockers.push(ticketId);
    await this.save();
  }
  return this;
};

/**
 * Remove blocker
 */
TicketSchema.methods.removeBlocker = async function (
  this: ITicket,
  ticketId: mongoose.Types.ObjectId
): Promise<ITicket> {
  this.blockers = this.blockers.filter((id) => !id.equals(ticketId));
  await this.save();
  return this;
};

/**
 * Export Ticket Model
 */
export const Ticket: Model<ITicket> = mongoose.model<ITicket>('Ticket', TicketSchema);

