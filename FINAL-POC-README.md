# Final POC - Ticketing System + Pipeline

## ✅ What You Got

A **working proof-of-concept** with:

1. **MongoDB Ticketing System** - Tickets stored as JSON objects
2. **PM → DEV → QA Pipeline** - Automated workflow
3. **Logs Folder** - All activity logged to `/workspace/logs/`
4. **Branch Management** - PM creates feature branch, agents work on it
5. **Agent Comments** - Agents add comments to tickets

## 🚀 Quick Start (2 Commands)

```bash
# Terminal 1: Start backend
cd /workspace/api && npm run dev

# Terminal 2: Run test
cd /workspace && export REPOSITORY="https://github.com/your-org/your-repo" && ./test-simple-pipeline.sh
```

**Time: 15-20 minutes**

## 📋 What Happens

### 1. PM Agent (3-5 min)
- Reads `PROJECT_MANAGER_ONBOARDING.md`
- Creates feature branch: `feature/[name]-#[timestamp]`
- Creates 3-5 tickets (JSON objects in MongoDB)
- Each ticket has:
  - Title, description
  - Acceptance criteria
  - Branch name
  - Implementation notes
  - Priority, estimated hours
- Creates `PM-TICKETS.json` and `PM-SUMMARY.md`
- **Tickets stored in MongoDB** ✅

### 2. Intermediate Wait (5 sec)
- Verifies PM is 100% done
- Logs verification

### 3. DEV Agent (5-8 min)
- Reads `DEVELOPER_ONBOARDING.md`
- Reads PM tickets from MongoDB
- Implements each ticket
- Updates ticket status: `planned` → `in-progress` → `in-review`
- Adds comments to tickets
- Creates implementation + tests
- Creates PR

### 4. QA Agent (3-5 min)
- Reads `QA_ONBOARDING.md`
- Reads tickets from MongoDB
- Reviews DEV's code
- Verifies each acceptance criterion
- Updates ticket status: `in-review` → `testing` → `qa-approved`/`qa-failed`
- Adds QA comments to tickets
- Creates QA report

### 5. User Review
- All tickets marked `user-review`
- User can see all tickets in MongoDB
- User can review PRs and approve

## 📊 MongoDB Collections

### Tickets Collection

```javascript
{
  "_id": ObjectId("..."),
  "ticketNumber": 1,
  "title": "Implement user profile view",
  "description": "Create component to display user profile with avatar, name, email, bio",
  "type": "story",
  "status": "qa-approved",
  "priority": "high",
  "projectId": ObjectId("..."),
  "runId": "run-1731168123-abc12345",
  "branchName": "feature/user-profile-#1",
  "baseBranch": "main",
  "prNumber": 42,
  "prUrl": "https://github.com/org/repo/pull/42",
  "acceptanceCriteria": [
    {
      "description": "User can view their profile",
      "completed": true,
      "verifiedBy": "qa",
      "verifiedAt": "2025-11-09T16:45:00Z"
    },
    {
      "description": "Profile shows avatar, name, email",
      "completed": true,
      "verifiedBy": "qa",
      "verifiedAt": "2025-11-09T16:45:00Z"
    }
  ],
  "estimatedHours": 4,
  "implementationNotes": "Use React component, fetch from /api/users/:id",
  "filesAffected": ["web/src/components/Profile.tsx"],
  "assignedTo": "dev",
  "createdBy": "pm",
  "comments": [
    {
      "agent": "pm",
      "timestamp": "2025-11-09T16:30:00Z",
      "message": "Ticket created. Priority: high. Estimated: 4 hours."
    },
    {
      "agent": "dev",
      "timestamp": "2025-11-09T16:35:00Z",
      "message": "🚧 Starting implementation"
    },
    {
      "agent": "dev",
      "timestamp": "2025-11-09T16:40:00Z",
      "message": "✅ Implementation complete. PR #42 created."
    },
    {
      "agent": "qa",
      "timestamp": "2025-11-09T16:45:00Z",
      "message": "✅ QA APPROVED - All acceptance criteria verified"
    }
  ],
  "created_at": "2025-11-09T16:30:00Z",
  "updated_at": "2025-11-09T16:45:00Z"
}
```

### Runs Collection

```javascript
{
  "_id": ObjectId("..."),
  "runId": "run-1731168123-abc12345",
  "projectId": ObjectId("..."),
  "userId": ObjectId("..."),
  "state": "COMPLETED",
  "prompt": "Create user profile management system...",
  "repository": "https://github.com/org/repo",
  "ref": "main",
  "pmAgentRunId": ObjectId("..."),
  "devAgentRunId": ObjectId("..."),
  "qaAgentRunId": ObjectId("..."),
  "timeline": [
    {
      "phase": "INIT",
      "timestamp": "2025-11-09T16:30:00Z",
      "level": "info",
      "message": "Pipeline initialized"
    },
    {
      "phase": "PM",
      "timestamp": "2025-11-09T16:30:05Z",
      "level": "info",
      "message": "PM Agent: Reading onboarding and creating tickets"
    },
    {
      "phase": "PM",
      "timestamp": "2025-11-09T16:35:00Z",
      "level": "success",
      "message": "PM work verified complete - Ready to start development"
    },
    {
      "phase": "DEV",
      "timestamp": "2025-11-09T16:35:05Z",
      "level": "info",
      "message": "DEV Agent: Reading tickets and implementing"
    },
    {
      "phase": "QA",
      "timestamp": "2025-11-09T16:42:00Z",
      "level": "info",
      "message": "QA Agent: Reviewing implementation"
    },
    {
      "phase": "COMPLETE",
      "timestamp": "2025-11-09T16:47:00Z",
      "level": "success",
      "message": "Pipeline completed - Ready for user review"
    }
  ]
}
```

## 🔌 API Endpoints

### Execute Pipeline
```bash
POST /api/projects/:id/pipeline/simple

{
  "prompt": "Create user authentication with login and logout",
  "repository": "https://github.com/org/repo",
  "ref": "main"
}

Response:
{
  "data": {
    "runId": "run-1731168123-abc12345",
    "state": "CREATED",
    "logFile": "/workspace/logs/run-1731168123-abc12345.log"
  }
}
```

### Get Tickets
```bash
# List all tickets for a run
GET /api/projects/:id/tickets?runId=run-1731168123-abc12345

# Get specific ticket
GET /api/projects/:id/tickets/1

# Get tickets by status
GET /api/projects/:id/tickets?runId=run-1731168123-abc12345&status=qa-approved
```

### Get Logs
```bash
GET /api/projects/:id/pipeline/runs/:runId/logs

Response:
{
  "data": {
    "runId": "run-1731168123-abc12345",
    "logs": "[2025-11-09T16:30:00Z] [INIT] Pipeline created\n...",
    "logFile": "/workspace/logs/run-1731168123-abc12345.log"
  }
}
```

### Get Run Status
```bash
GET /api/projects/:id/pipeline/runs/:runId

Response shows current state and timeline
```

## 📁 File Structure

```
/workspace/
├── logs/
│   └── run-{timestamp}-{id}.log    # Pipeline logs
├── api/
│   └── src/
│       ├── models/
│       │   ├── Ticket.ts           # NEW: Ticket model
│       │   ├── Run.ts              # Pipeline run tracking
│       │   ├── Agent.ts            # Agent definitions
│       │   └── AgentRun.ts         # Individual agent runs
│       ├── services/
│       │   ├── ticket.service.ts   # NEW: Ticket management
│       │   └── simplified-pipeline.service.ts  # Pipeline orchestration
│       └── routes/
│           └── project.routes.ts   # Added ticket endpoints
└── Cloud_Agent_Onboarding/
    ├── PROJECT_MANAGER_ONBOARDING.md
    ├── DEVELOPER_ONBOARDING.md
    └── QA_ONBOARDING.md
```

## 🎯 Ticket Workflow

```
PM creates tickets (status: planned)
    ↓
PM reviews (status: pm-review)
    ↓
PM marks ready (status: ready-for-dev)
    ↓
DEV picks up (status: in-progress)
    ↓
DEV completes (status: in-review)
    ↓
QA tests (status: testing)
    ↓
QA approves/fails (status: qa-approved or qa-failed)
    ↓
User reviews (status: user-review)
    ↓
Completed (status: completed)
```

## 💾 Ticket Data Structure

Each ticket in MongoDB has:

```typescript
{
  ticketNumber: number,           // 1, 2, 3, etc.
  title: string,                  // "Implement user profile view"
  description: string,            // Detailed description
  type: 'epic' | 'story' | 'task' | 'bug',
  status: 'planned' | 'in-progress' | 'qa-approved' | ...,
  priority: 'high' | 'medium' | 'low',
  
  // Project context
  projectId: ObjectId,
  runId: string,
  
  // Branch info
  branchName: string,             // "feature/user-profile-#1"
  baseBranch: string,             // "main"
  prNumber: number,               // 42
  prUrl: string,                  // GitHub PR URL
  
  // Hierarchy
  parentTicketId: number,         // Parent ticket number
  childTicketIds: [number],       // Child ticket numbers
  
  // Requirements
  acceptanceCriteria: [
    {
      description: string,
      completed: boolean,
      verifiedBy: 'pm' | 'dev' | 'qa',
      verifiedAt: Date
    }
  ],
  estimatedHours: number,
  
  // Implementation
  implementationNotes: string,    // Technical guidance
  filesAffected: [string],        // Files to modify
  
  // Agents
  assignedTo: 'pm' | 'dev' | 'qa',
  createdBy: 'pm',
  
  // Activity
  comments: [
    {
      agent: 'pm' | 'dev' | 'qa',
      timestamp: Date,
      message: string,
      data: object
    }
  ]
}
```

## 🧪 Testing

### Automated Test

```bash
export REPOSITORY="https://github.com/your-org/your-repo"
./test-simple-pipeline.sh
```

### Manual Test

```bash
# 1. Start backend
cd api && npm run dev

# 2. Login and get token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

export JWT_TOKEN="your_token"

# 3. Create project
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'

export PROJECT_ID="your_project_id"

# 4. Execute pipeline
curl -X POST http://localhost:8080/api/projects/$PROJECT_ID/pipeline/simple \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a health check endpoint at /api/health",
    "repository": "https://github.com/org/repo",
    "ref": "main"
  }'

export RUN_ID="your_run_id"

# 5. Monitor progress
watch -n 10 "curl -s http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID -H 'Authorization: Bearer $JWT_TOKEN' | jq '.data.state'"

# 6. View tickets
curl http://localhost:8080/api/projects/$PROJECT_ID/tickets?runId=$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'

# 7. View logs
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID/logs \
  -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.data.logs'
```

## 📝 What You'll See

### In MongoDB

Query tickets:
```javascript
db.tickets.find({ runId: "run-1731168123-abc12345" })
```

You'll see:
- 3-5 tickets created by PM
- Each with acceptance criteria
- Comments from PM, DEV, QA
- Status progression
- Branch names and PR links

### In Logs

```
/workspace/logs/run-1731168123-abc12345.log

[2025-11-09T16:30:00.000Z] [INIT] Pipeline created
[2025-11-09T16:30:05.000Z] [PM_START] PM Agent starting
[2025-11-09T16:30:10.000Z] [PM_LAUNCHED] PM Agent launched
[2025-11-09T16:35:00.000Z] [PM_COMPLETE] PM Agent completed
[2025-11-09T16:35:05.000Z] [INTERMEDIATE] Verifying PM work
[2025-11-09T16:35:10.000Z] [DEV_START] DEV Agent starting
[2025-11-09T16:40:00.000Z] [DEV_COMPLETE] DEV Agent completed
[2025-11-09T16:40:05.000Z] [QA_START] QA Agent starting
[2025-11-09T16:45:00.000Z] [QA_COMPLETE] QA Agent completed
[2025-11-09T16:45:05.000Z] [PIPELINE_COMPLETE] Pipeline finished
```

### In GitHub

- Branch: `feature/[name]-#[timestamp]` (from PM)
- PR #1: PM's ticket summary
- PR #2: DEV's implementation
- Branch: QA's review branch

## 🎯 Success Criteria

✅ Pipeline completes (state: COMPLETED)
✅ Tickets created in MongoDB
✅ Each ticket has acceptance criteria
✅ Agents add comments to tickets
✅ Status progresses: planned → in-progress → in-review → qa-approved
✅ Logs show all activity
✅ PRs created in GitHub
✅ Feature branch created

## 📚 Models

### Ticket Model
- **File**: `api/src/models/Ticket.ts`
- **Fields**: ticketNumber, title, description, type, status, priority, acceptanceCriteria, comments, etc.
- **Statuses**: planned, in-progress, in-review, testing, qa-approved, qa-failed, user-review, completed

### Run Model
- **File**: `api/src/models/Run.ts`
- **Fields**: runId, state, timeline, agent run references
- **States**: CREATED, PM_RUNNING, PM_COMPLETED, DEV_RUNNING, DEV_COMPLETED, QA_RUNNING, QA_COMPLETED, COMPLETED

## 🛠️ Services

### TicketService
- `createTicket()` - Create new ticket
- `updateTicketStatus()` - Update status
- `addComment()` - Add agent comment
- `getTicket()` - Get ticket by number
- `listTickets()` - List all tickets for run
- `getTicketsByStatus()` - Filter by status

### SimplifiedPipelineService
- `startPipeline()` - Start PM → DEV → QA flow
- `executePMPhase()` - PM creates tickets
- `executeDEVPhase()` - DEV implements
- `executeQAPhase()` - QA reviews
- `pollAgentCompletion()` - Wait for agent
- `writeLog()` - Log to file

## 🔍 Monitoring

### View Tickets
```bash
# All tickets
curl http://localhost:8080/api/projects/$PROJECT_ID/tickets?runId=$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data[] | {number: .ticketNumber, title: .title, status: .status}'

# Specific ticket
curl http://localhost:8080/api/projects/$PROJECT_ID/tickets/1 \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data'
```

### View Logs
```bash
# Via API
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID/logs \
  -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.data.logs'

# Direct file
tail -f /workspace/logs/run-*.log
```

### View Run Status
```bash
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data | {state, timeline: .timeline[-3:]}'
```

## ⚙️ Configuration

### Required Environment Variables

```bash
# api/.env
PM_CLOUD_AGENT_API_KEY=cur_xxx
DEV_CLOUD_AGENT_API_KEY=cur_xxx
QA_CLOUD_AGENT_API_KEY=cur_xxx
MONGODB_URI=mongodb://localhost:27017/aio-saas
JWT_SECRET=your-secret-key
```

### Prerequisites

1. **MongoDB running**: `docker run -d -p 27017:27017 --name mongodb mongo`
2. **Cursor API keys**: Get from https://cursor.com/settings/api-keys
3. **GitHub repository**: Where agents create branches/PRs

## 🚨 Troubleshooting

### No tickets created
- Check logs: `cat /workspace/logs/run-*.log | grep PM`
- PM agent might have failed
- Check Cursor URL in timeline

### Tickets not in MongoDB
- Check MongoDB connection
- Check if PM agent completed successfully
- PM agent creates `PM-TICKETS.json` which we parse

### Agent not commenting
- This is expected - agents add comments to ticket objects
- Check ticket.comments array in MongoDB

## 📖 Documentation

- **This file**: Complete POC guide
- **`SIMPLE-PIPELINE-README.md`**: Detailed pipeline docs
- **`test-simple-pipeline.sh`**: Automated test script
- **Onboarding docs**: `Cloud_Agent_Onboarding/` folder

## 🎓 What This Proves

✅ **Ticketing system works** - Tickets stored in MongoDB
✅ **PM → DEV → QA flow works** - Sequential execution
✅ **Onboarding docs used** - Agents read their guides
✅ **Logs work** - All activity tracked
✅ **Branch management works** - Feature branches created
✅ **Agent comments work** - Comments stored in tickets
✅ **Status tracking works** - Tickets progress through workflow

## 🚀 Next Steps

After successful test:
1. **Check MongoDB** - See tickets created
2. **Check logs** - See agent activity
3. **Check GitHub** - See branches and PRs
4. **Review tickets** - See comments and status
5. **Customize** - Adjust prompts for your needs

---

**Ready to test?** Run `./test-simple-pipeline.sh` now! 🎉
