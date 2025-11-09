# Frontend API Guide - Ticket System & Pipeline

Complete API documentation for building the frontend ticket visualization, progress tracking, and pipeline monitoring.

## Base URL
```
http://localhost:8080/api
```

## Authentication
All endpoints require authentication via cookie-based session:
```javascript
// Include credentials in fetch requests
fetch(url, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

---

## 📊 Ticket Statistics Endpoints

### 1. Get Project Ticket Statistics
Get comprehensive statistics for all tickets in a project.

**Endpoint:** `GET /projects/:projectId/tickets/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "byStatus": {
      "NEW": 2,
      "IN_PROGRESS": 1,
      "BLOCKED": 0,
      "REVIEW": 1,
      "QA": 1,
      "DONE": 5
    },
    "byType": {
      "EPIC": 1,
      "FEATURE": 4,
      "TASK": 3,
      "DEFECT": 2
    },
    "completion": {
      "completed": 5,
      "inProgress": 1,
      "pending": 2,
      "blocked": 0,
      "percentage": 50
    },
    "currentlyWorking": [
      {
        "id": "6910cc3247d62f3d34e7c2d9",
        "title": "Implement core functionality",
        "type": "feature",
        "branch": "feature/core-impl"
      }
    ]
  }
}
```

**Use Cases:**
- Dashboard overview
- Project statistics cards
- Progress bars
- Status distribution charts

---

### 2. Get Pipeline Run Statistics
Get statistics for a specific pipeline run.

**Endpoint:** `GET /runs/:runId/tickets/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "runId": "run-1762708526805-439a4cb0",
    "runState": "COMPLETED",
    "total": 4,
    "byStatus": {
      "NEW": 0,
      "IN_PROGRESS": 0,
      "BLOCKED": 0,
      "REVIEW": 0,
      "QA": 0,
      "DONE": 4
    },
    "byType": {
      "EPIC": 1,
      "FEATURE": 2,
      "TASK": 1,
      "DEFECT": 0
    },
    "completion": {
      "completed": 4,
      "inProgress": 0,
      "pending": 0,
      "blocked": 0,
      "percentage": 100
    },
    "currentlyWorking": [],
    "timeline": [
      {
        "phase": "PM",
        "timestamp": "2025-11-09T17:08:46.805Z",
        "level": "info",
        "message": "PM Agent: Analyzing requirements"
      }
    ]
  }
}
```

**Use Cases:**
- Pipeline run details page
- Real-time progress monitoring
- Timeline visualization
- Current activity display

---

### 3. Get Detailed Progress Information
Get detailed progress with phase breakdown.

**Endpoint:** `GET /runs/:runId/tickets/progress`

**Response:**
```json
{
  "success": true,
  "data": {
    "runId": "run-1762708526805-439a4cb0",
    "runState": "COMPLETED",
    "startedAt": "2025-11-09T17:08:46.805Z",
    "updatedAt": "2025-11-09T17:09:15.123Z",
    "totalTickets": 4,
    "completedTickets": 4,
    "overallPercentage": 100,
    "tickets": [
      {
        "id": "6910cc3247d62f3d34e7c2d9",
        "title": "Implement core functionality",
        "type": "feature",
        "status": "DONE",
        "branch": "feature/core-impl",
        "prNumber": 364,
        "parentId": "6910cc3247d62f3d34e7c2d8",
        "dependencies": [],
        "acceptanceCriteria": ["Core implemented", "Tests pass"],
        "isBlocked": false,
        "isComplete": true,
        "isWorking": false
      }
    ],
    "phases": {
      "PM": {
        "status": "COMPLETED",
        "percentage": 100
      },
      "DEV": {
        "status": "COMPLETED",
        "percentage": 100
      },
      "QA": {
        "status": "COMPLETED",
        "percentage": 100
      }
    },
    "latestActivity": {
      "phase": "COMPLETE",
      "timestamp": "2025-11-09T17:09:15.123Z",
      "level": "success",
      "message": "Pipeline completed successfully"
    }
  }
}
```

**Use Cases:**
- Detailed progress dashboard
- Phase-by-phase visualization
- Agent activity tracking
- Ticket list with status

---

### 4. Get Ticket Details
Get comprehensive details for a single ticket.

**Endpoint:** `GET /tickets/:ticketId/details`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6910cc3247d62f3d34e7c2d9",
    "title": "Implement core functionality",
    "description": "Implement the core features...",
    "type": "feature",
    "status": "DONE",
    "branch": "feature/core-impl",
    "prNumber": 364,
    "labels": ["feature", "core", "auto-generated"],
    "acceptanceCriteria": [
      "Core functionality implemented",
      "Code follows project standards",
      "No breaking changes"
    ],
    "parent": {
      "id": "6910cc3247d62f3d34e7c2d8",
      "title": "User Authentication Epic",
      "type": "epic",
      "status": "DONE"
    },
    "children": [],
    "dependencies": [],
    "isBlocked": false,
    "canStart": false,
    "createdAt": "2025-11-09T17:08:50.123Z",
    "updatedAt": "2025-11-09T17:09:10.456Z",
    "progress": {
      "isComplete": true,
      "isWorking": false,
      "isPending": false,
      "isBlocked": false,
      "percentage": 100
    }
  }
}
```

**Use Cases:**
- Ticket detail modal/page
- Dependency visualization
- Progress tracking
- Acceptance criteria checklist

---

### 5. Get Ticket Hierarchy
Get hierarchical tree structure of all tickets.

**Endpoint:** `GET /projects/:projectId/tickets/hierarchy`

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "6910cc2e47d62f3d34e7c2b0",
    "totalTickets": 4,
    "hierarchy": [
      {
        "id": "6910cc3247d62f3d34e7c2d8",
        "title": "User Authentication Epic",
        "type": "epic",
        "status": "DONE",
        "branch": null,
        "prNumber": null,
        "labels": ["epic", "auto-generated"],
        "acceptanceCriteria": 0,
        "dependencies": 0,
        "isComplete": true,
        "isWorking": false,
        "isBlocked": false,
        "children": [
          {
            "id": "6910cc3247d62f3d34e7c2d9",
            "title": "Implement core functionality",
            "type": "feature",
            "status": "DONE",
            "branch": "feature/core-impl",
            "prNumber": 364,
            "labels": ["feature", "core"],
            "acceptanceCriteria": 3,
            "dependencies": 0,
            "isComplete": true,
            "isWorking": false,
            "isBlocked": false,
            "children": []
          },
          {
            "id": "6910cc3247d62f3d34e7c2de",
            "title": "Add error handling",
            "type": "feature",
            "status": "DONE",
            "branch": "feature/error-handling",
            "prNumber": 249,
            "labels": ["feature", "error-handling"],
            "acceptanceCriteria": 3,
            "dependencies": 1,
            "isComplete": true,
            "isWorking": false,
            "isBlocked": false,
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Use Cases:**
- Tree view visualization
- Kanban board with hierarchy
- Dependency graph
- Epic/Feature/Task breakdown

---

## 🎫 Existing Ticket Endpoints

### Get All Tickets for Project
**Endpoint:** `GET /projects/:projectId/tickets`

Query Parameters:
- `status` - Filter by status (NEW, IN_PROGRESS, DONE, etc.)
- `type` - Filter by type (EPIC, FEATURE, TASK, DEFECT)

### Get All Tickets for Run
**Endpoint:** `GET /runs/:runId/tickets`

### Get Single Ticket
**Endpoint:** `GET /tickets/:ticketId`

### Update Ticket
**Endpoint:** `PATCH /tickets/:ticketId`

Body:
```json
{
  "status": "IN_PROGRESS",
  "branch": "feature/new-feature"
}
```

---

## 🚀 Pipeline Endpoints

### Start Mock Pipeline
**Endpoint:** `POST /projects/:projectId/pipeline/mock`

Body:
```json
{
  "prompt": "Build a user authentication system with email/password login"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "runId": "run-1762708526805-439a4cb0",
    "state": "CREATED",
    "timeline": [],
    "message": "Mock pipeline started - watch tickets being created and processed!"
  }
}
```

### Get Pipeline Run Status
**Endpoint:** `GET /projects/:projectId/pipeline/runs/:runId`

Response:
```json
{
  "success": true,
  "data": {
    "runId": "run-1762708526805-439a4cb0",
    "state": "DEV_RUNNING",
    "prompt": "Build a user authentication system",
    "repository": "mock://repository",
    "timeline": [
      {
        "phase": "PM",
        "timestamp": "2025-11-09T17:08:46.805Z",
        "level": "info",
        "message": "PM Agent: Analyzing requirements"
      },
      {
        "phase": "DEV",
        "timestamp": "2025-11-09T17:09:00.123Z",
        "level": "info",
        "message": "DEV Agent: Starting implementation"
      }
    ],
    "created_at": "2025-11-09T17:08:46.805Z",
    "updated_at": "2025-11-09T17:09:00.123Z"
  }
}
```

---

## 📈 Frontend Implementation Examples

### 1. Progress Bar Component

```typescript
interface ProgressData {
  totalTickets: number;
  completedTickets: number;
  overallPercentage: number;
}

async function fetchProgress(runId: string): Promise<ProgressData> {
  const response = await fetch(`/api/runs/${runId}/tickets/progress`, {
    credentials: 'include'
  });
  const json = await response.json();
  return json.data;
}

// Usage in component
const progress = await fetchProgress(runId);
<ProgressBar percentage={progress.overallPercentage} />
```

### 2. Current Working Ticket Display

```typescript
async function fetchCurrentWork(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/tickets/stats`, {
    credentials: 'include'
  });
  const json = await response.json();
  return json.data.currentlyWorking;
}

// Display
{currentWork.map(ticket => (
  <div key={ticket.id}>
    <h3>{ticket.title}</h3>
    <span>{ticket.type}</span>
    <code>{ticket.branch}</code>
  </div>
))}
```

### 3. Ticket Status Distribution

```typescript
async function fetchStats(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/tickets/stats`, {
    credentials: 'include'
  });
  const json = await response.json();
  return json.data.byStatus;
}

// Pie chart or bar chart
const stats = await fetchStats(projectId);
<PieChart data={[
  { label: 'Done', value: stats.DONE },
  { label: 'In Progress', value: stats.IN_PROGRESS },
  { label: 'Pending', value: stats.NEW },
  { label: 'Blocked', value: stats.BLOCKED }
]} />
```

### 4. Phase Progress Indicators

```typescript
async function fetchPhaseProgress(runId: string) {
  const response = await fetch(`/api/runs/${runId}/tickets/progress`, {
    credentials: 'include'
  });
  const json = await response.json();
  return json.data.phases;
}

// Display phases
const phases = await fetchPhaseProgress(runId);
<div>
  <PhaseIndicator 
    name="PM" 
    status={phases.PM.status} 
    percentage={phases.PM.percentage} 
  />
  <PhaseIndicator 
    name="DEV" 
    status={phases.DEV.status} 
    percentage={phases.DEV.percentage} 
  />
  <PhaseIndicator 
    name="QA" 
    status={phases.QA.status} 
    percentage={phases.QA.percentage} 
  />
</div>
```

### 5. Real-Time Updates (Polling)

```typescript
function usePipelineProgress(runId: string) {
  const [progress, setProgress] = useState(null);
  
  useEffect(() => {
    const pollProgress = async () => {
      const response = await fetch(`/api/runs/${runId}/tickets/progress`, {
        credentials: 'include'
      });
      const json = await response.json();
      setProgress(json.data);
      
      // Stop polling if complete or failed
      if (json.data.runState === 'COMPLETED' || json.data.runState === 'FAILED') {
        clearInterval(interval);
      }
    };
    
    // Poll every 2 seconds
    const interval = setInterval(pollProgress, 2000);
    pollProgress(); // Initial fetch
    
    return () => clearInterval(interval);
  }, [runId]);
  
  return progress;
}
```

---

## 🎨 UI Component Suggestions

### Dashboard Overview
```
┌─────────────────────────────────────────┐
│  Project: User Authentication           │
├─────────────────────────────────────────┤
│  📊 Statistics                          │
│  ├─ Total Tickets: 10                   │
│  ├─ Completed: 7 (70%)                  │
│  ├─ In Progress: 1                      │
│  └─ Blocked: 0                          │
│                                         │
│  🚀 Currently Working On:               │
│  └─ Implement core functionality        │
│     Branch: feature/core-impl           │
│                                         │
│  [Progress Bar: ████████░░ 70%]        │
└─────────────────────────────────────────┘
```

### Pipeline Progress View
```
┌─────────────────────────────────────────┐
│  Pipeline Run: run-1762708526805        │
├─────────────────────────────────────────┤
│  Phase Progress:                        │
│  ✅ PM      [████████████] 100%        │
│  🔄 DEV     [████████░░░░]  67%        │
│  ⏳ QA      [░░░░░░░░░░░░]   0%        │
│                                         │
│  Latest Activity:                       │
│  💻 DEV Agent: Implementing Feature 2   │
│     2 minutes ago                       │
│                                         │
│  Tickets: 4 total, 2 done, 1 working   │
└─────────────────────────────────────────┘
```

### Ticket Hierarchy Tree
```
📦 Epic: User Authentication [DONE]
├─ 🎯 Feature: Core Functionality [DONE]
│  ├─ Branch: feature/core-impl
│  └─ PR #364
├─ 🎯 Feature: Error Handling [IN_PROGRESS]
│  ├─ Branch: feature/error-handling
│  ├─ Depends on: Core Functionality
│  └─ 💻 Currently working...
└─ ✓ Task: Tests & Documentation [NEW]
   └─ Depends on: Core + Error Handling
```

---

## 🔄 Polling Strategy

For real-time updates, implement polling:

```typescript
// Poll every 2 seconds while pipeline is running
// Stop when COMPLETED or FAILED
const POLL_INTERVAL = 2000;

const pollUntilComplete = async (runId: string) => {
  let isComplete = false;
  
  while (!isComplete) {
    const response = await fetch(`/api/runs/${runId}/tickets/progress`);
    const data = await response.json();
    
    // Update UI
    updateUI(data.data);
    
    // Check if done
    if (data.data.runState === 'COMPLETED' || data.data.runState === 'FAILED') {
      isComplete = true;
    } else {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
};
```

---

## 📊 Data Models

### Ticket Status
```typescript
type TicketStatus = 
  | 'NEW'           // Not started
  | 'IN_PROGRESS'   // Currently being worked on
  | 'BLOCKED'       // Blocked by dependencies or issues
  | 'REVIEW'        // Code review
  | 'QA'            // Quality assurance
  | 'DONE';         // Completed

### Ticket Type
```typescript
type TicketType = 
  | 'EPIC'     // Large feature/initiative
  | 'FEATURE'  // Medium-sized feature
  | 'TASK'     // Small task
  | 'DEFECT';  // Bug/issue
```

### Run State
```typescript
type RunState = 
  | 'CREATED'       // Just created
  | 'PM_RUNNING'    // PM agent working
  | 'PM_COMPLETED'  // PM done, tickets created
  | 'DEV_RUNNING'   // DEV agent working
  | 'DEV_COMPLETED' // DEV done
  | 'QA_RUNNING'    // QA agent testing
  | 'QA_COMPLETED'  // QA done
  | 'COMPLETED'     // All done
  | 'FAILED';       // Error occurred
```

---

## 🎯 Key Metrics to Display

1. **Overall Progress**
   - Total tickets
   - Completed percentage
   - Estimated completion time

2. **Current Activity**
   - Which ticket is being worked on
   - Current phase (PM/DEV/QA)
   - Latest timeline entry

3. **Status Distribution**
   - Tickets by status (pie chart)
   - Tickets by type (bar chart)

4. **Phase Progress**
   - PM phase percentage
   - DEV phase percentage
   - QA phase percentage

5. **Blockers & Issues**
   - Number of blocked tickets
   - Dependencies not met
   - Failed QA tests

---

## 🚀 Quick Start

```bash
# 1. Start the API server
cd api && npm run dev

# 2. Get a JWT token
./get-jwt.sh

# 3. Test endpoints
export JWT_SECRET=$(cat .jwt-token)

# Get project stats
curl -H "Cookie: aio_session=$JWT_SECRET" \
  http://localhost:8080/api/projects/PROJECT_ID/tickets/stats | jq '.'

# Start a mock pipeline
curl -X POST -H "Cookie: aio_session=$JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build a todo app"}' \
  http://localhost:8080/api/projects/PROJECT_ID/pipeline/mock | jq '.'

# Monitor progress
curl -H "Cookie: aio_session=$JWT_SECRET" \
  http://localhost:8080/api/runs/RUN_ID/tickets/progress | jq '.'
```

---

## 📝 Notes

- All endpoints return JSON with `{ success: true, data: {...} }` format
- Errors return `{ success: false, error: "message" }`
- Timestamps are in ISO 8601 format
- IDs are MongoDB ObjectIds (24-character hex strings)
- Cookie-based auth is required for all endpoints
- CORS is configured for localhost:5173 (Vite default)

---

## 🎉 You're Ready!

You now have all the endpoints needed to build:
- ✅ Project dashboard with statistics
- ✅ Real-time pipeline progress tracking
- ✅ Ticket hierarchy visualization
- ✅ Phase-by-phase progress indicators
- ✅ Current activity display
- ✅ Completion percentages
- ✅ Detailed ticket views

Happy coding! 🚀

