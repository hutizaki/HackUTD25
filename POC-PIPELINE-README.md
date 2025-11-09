# Pipeline Proof of Concept

This is a minimal proof-of-concept implementation of the autonomous agent pipeline described in `docs/phase4and5notes.md`.

## What This POC Does

This POC implements a simple **PM → DEV → QA** pipeline that:

1. **PM Agent**: Creates a product specification from a user prompt
2. **DEV Agent**: Implements the feature based on the specification
3. **QA Agent**: Reviews the implementation and creates a QA report

Each agent runs sequentially, and the system tracks progress through a state machine.

## Architecture

### Models

- **Run** (`api/src/models/Run.ts`): Tracks the overall pipeline execution
  - States: `CREATED → PM_RUNNING → PM_COMPLETED → DEV_RUNNING → DEV_COMPLETED → QA_RUNNING → QA_COMPLETED → COMPLETED`
  - Timeline: Array of events showing progress
  - References to each agent run

- **AgentRun** (existing): Tracks individual agent executions
  - Links to Cursor Cloud Agent API
  - Stores input/output, status, and metadata

### Services

- **PipelineService** (`api/src/services/pipeline.service.ts`): Orchestrates the pipeline
  - `startPipeline()`: Initiates a new pipeline run
  - `executePMAgent()`: Launches PM agent and waits for completion
  - `executeDEVAgent()`: Launches DEV agent after PM completes
  - `executeQAAgent()`: Launches QA agent after DEV completes
  - `pollAgentCompletion()`: Polls Cursor API for agent status
  - `getRunStatus()`: Gets current pipeline status
  - `listRuns()`: Lists all pipeline runs for a project

- **AgentService** (existing): Manages individual agent executions
  - Integrates with Cursor Cloud Agents API
  - Uses role-specific API keys (PM, DEV, QA)

### API Endpoints

```
POST   /api/projects/:id/pipeline/execute    - Start a new pipeline run
GET    /api/projects/:id/pipeline/runs       - List all runs for a project
GET    /api/projects/:id/pipeline/runs/:runId - Get status of a specific run
```

## Setup

### Prerequisites

1. **Cursor API Keys**: You need three API keys from https://cursor.com/settings/api-keys
   - PM Agent key
   - DEV Agent key
   - QA Agent key

2. **GitHub Repository**: A repository where agents can create branches and PRs

3. **Environment Variables**: Add to `api/.env`:
   ```bash
   # Cursor API Keys
   PM_CLOUD_AGENT_API_KEY=cur_xxx...
   DEV_CLOUD_AGENT_API_KEY=cur_xxx...
   QA_CLOUD_AGENT_API_KEY=cur_xxx...
   ```

### Installation

```bash
# Install dependencies
cd api
npm install

# Start the backend
npm run dev
```

## Usage

### 1. Create a Project

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Test Project",
    "description": "Testing the pipeline"
  }'
```

Save the project ID from the response.

### 2. Execute the Pipeline

```bash
curl -X POST http://localhost:8080/api/projects/PROJECT_ID/pipeline/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "prompt": "Create a user authentication system with login, logout, and session management. Include JWT tokens and password hashing.",
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  }'
```

Response:
```json
{
  "data": {
    "runId": "run-1234567890-abc123",
    "state": "CREATED",
    "timeline": [
      {
        "phase": "INIT",
        "timestamp": "2025-11-09T10:00:00.000Z",
        "level": "info",
        "message": "Pipeline created",
        "data": {
          "prompt": "Create a user authentication system..."
        }
      }
    ]
  }
}
```

### 3. Monitor Progress

```bash
# Get run status
curl http://localhost:8080/api/projects/PROJECT_ID/pipeline/runs/RUN_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response shows current state and timeline:
```json
{
  "data": {
    "runId": "run-1234567890-abc123",
    "state": "DEV_RUNNING",
    "timeline": [
      {
        "phase": "INIT",
        "timestamp": "2025-11-09T10:00:00.000Z",
        "level": "info",
        "message": "Pipeline created"
      },
      {
        "phase": "PM",
        "timestamp": "2025-11-09T10:00:05.000Z",
        "level": "info",
        "message": "Starting PM agent to create product specification"
      },
      {
        "phase": "PM",
        "timestamp": "2025-11-09T10:00:10.000Z",
        "level": "success",
        "message": "PM agent launched successfully",
        "data": {
          "agentRunId": "...",
          "cursorUrl": "https://cursor.com/agents?id=bc_..."
        }
      },
      {
        "phase": "PM",
        "timestamp": "2025-11-09T10:05:00.000Z",
        "level": "success",
        "message": "PM agent completed successfully",
        "data": {
          "branchName": "docs/pm-spec-1234567890",
          "prNumber": 42,
          "prUrl": "https://github.com/..."
        }
      },
      {
        "phase": "DEV",
        "timestamp": "2025-11-09T10:05:05.000Z",
        "level": "info",
        "message": "Starting DEV agent to implement the feature"
      }
    ]
  }
}
```

### 4. List All Runs

```bash
curl http://localhost:8080/api/projects/PROJECT_ID/pipeline/runs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Pipeline Flow

```
User submits prompt
    ↓
Pipeline created (state: CREATED)
    ↓
PM Agent launches (state: PM_RUNNING)
    ↓ (polls every 5s for completion)
PM Agent completes (state: PM_COMPLETED)
    ↓
DEV Agent launches (state: DEV_RUNNING)
    ↓ (polls every 5s for completion)
DEV Agent completes (state: DEV_COMPLETED)
    ↓
QA Agent launches (state: QA_RUNNING)
    ↓ (polls every 5s for completion)
QA Agent completes (state: QA_COMPLETED)
    ↓
Pipeline completes (state: COMPLETED)
```

## What Each Agent Does

### PM Agent (Product Manager)
- **Input**: User's idea/prompt
- **Output**: Product specification document
- **Creates**: Branch `docs/pm-spec-{timestamp}` with PR
- **File**: `docs/PRODUCT_SPEC.md`
- **Content**: Overview, user stories, requirements, acceptance criteria, success metrics

### DEV Agent (Developer)
- **Input**: Product specification from PM agent
- **Output**: Working implementation with tests
- **Creates**: Branch `feature/dev-impl-{timestamp}` with PR
- **Actions**: 
  - Reads PRODUCT_SPEC.md
  - Implements core functionality
  - Writes unit tests
  - Adds error handling

### QA Agent (Quality Assurance)
- **Input**: DEV agent's implementation
- **Output**: QA report with findings
- **Creates**: Branch `qa/review-{timestamp}` (no PR)
- **File**: `QA_REPORT.md`
- **Content**: Code review, quality issues, test coverage, security findings

## Monitoring Agent Progress

Each agent execution creates a Cursor Cloud Agent that you can monitor in real-time:

1. Check the timeline for the `cursorUrl` field
2. Open the URL in your browser: `https://cursor.com/agents?id=bc_...`
3. Watch the agent work in real-time

## Error Handling

If any agent fails:
- Pipeline state changes to `FAILED`
- Error message is stored in the `error` field
- Timeline shows the failure event
- Subsequent agents are not executed

## Limitations of This POC

This is a **minimal proof of concept**. It does NOT include:

- ❌ GitHub Actions workflows
- ❌ GitHub App integration
- ❌ Webhook receivers
- ❌ Server-Sent Events (SSE) for real-time updates
- ❌ Issue hierarchy and DAG
- ❌ Branch management and PR merging
- ❌ Defect tracking and loops
- ❌ Deployment automation
- ❌ Frontend UI integration
- ❌ Pause/resume/cancel controls
- ❌ Retry mechanisms
- ❌ Artifact management

## What's Next?

To build the full system described in `docs/phase4and5notes.md`, you would need to:

1. **Add GitHub App Integration**: Replace direct API calls with GitHub App
2. **Create GitHub Actions Workflows**: Implement reusable workflows for each agent
3. **Add Webhook Receiver**: Handle events from GitHub Actions
4. **Implement SSE**: Real-time updates to frontend
5. **Add Issue Hierarchy**: Create and manage GitHub issues in a DAG
6. **Add Branch Management**: Hierarchical branching strategy
7. **Add PR Management**: Auto-merge with required checks
8. **Add Defect Tracking**: QA creates issues, blocks merge until resolved
9. **Add Frontend UI**: Timeline view, issue tree, controls
10. **Add Deployment**: Docker builds, environment gates, rollbacks

## Testing the POC

See `test-pipeline.sh` for a complete test script that:
1. Creates a test project
2. Executes the pipeline
3. Polls for completion
4. Shows the results

```bash
./test-pipeline.sh
```

## Troubleshooting

### "Cursor API key not configured"
- Make sure you've set all three API keys in `api/.env`
- Restart the backend after adding keys

### "Agent polling timeout"
- Agents can take 5+ minutes to complete
- Increase `maxPolls` in `pipeline.service.ts` if needed
- Check the Cursor URL to see if the agent is still running

### "Agent failed"
- Check the agent's Cursor URL for error details
- Verify the repository URL is correct
- Ensure the repository is accessible to your Cursor account

## Architecture Decisions

### Why Sequential Execution?
For the POC, agents run sequentially to keep it simple. The full system would support:
- Parallel execution of independent tasks
- Dependency-based scheduling
- Concurrent agent runs

### Why Polling?
The POC uses polling to check agent status. The full system would use:
- Webhooks from Cursor API (when available)
- Server-Sent Events for real-time updates
- WebSocket connections for bi-directional communication

### Why No GitHub Actions?
The POC focuses on proving the agent orchestration works. GitHub Actions would add:
- Complexity in setup and testing
- Need for GitHub App configuration
- Webhook infrastructure
- More moving parts

The POC proves the core concept: **autonomous agents can work together in a pipeline**.

## Code Structure

```
api/src/
├── models/
│   ├── Run.ts              # NEW: Pipeline run tracking
│   ├── Agent.ts            # Existing: Agent definitions
│   └── AgentRun.ts         # Existing: Individual agent runs
├── services/
│   ├── pipeline.service.ts # NEW: Pipeline orchestration
│   └── agent.service.ts    # Existing: Agent execution
├── routes/
│   └── project.routes.ts   # UPDATED: Added pipeline endpoints
└── integrations/
    └── cursor-api-client.ts # Existing: Cursor API integration
```

## Success Criteria

This POC is successful if:
- ✅ PM agent creates a specification document
- ✅ DEV agent implements based on the spec
- ✅ QA agent reviews the implementation
- ✅ All agents complete without manual intervention
- ✅ Progress is tracked through the state machine
- ✅ Timeline shows all events
- ✅ PRs are created automatically

## Next Steps for Production

1. **Add Persistence**: Store more metadata about each run
2. **Add Retry Logic**: Automatic retries on transient failures
3. **Add Cancellation**: Allow users to cancel running pipelines
4. **Add Notifications**: Email/Slack when pipeline completes
5. **Add Metrics**: Track success rates, durations, costs
6. **Add Logging**: Structured logs for debugging
7. **Add Tests**: Unit and integration tests
8. **Add Documentation**: API docs, architecture diagrams

## Resources

- Phase 4 & 5 Notes: `docs/phase4and5notes.md`
- Test Scripts: `test-pm-agent.sh`, `test-dev-agent.sh`, `test-qa-agent.sh`
- Cursor API Docs: https://docs.cursor.com/api/agents
