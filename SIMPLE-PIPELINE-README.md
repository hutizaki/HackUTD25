# Simplified Pipeline POC

This is a **realistic, proof-of-concept** pipeline that demonstrates AI agents working together with **visible outputs**:

- ✅ **Logs folder** - All activity logged to `/workspace/logs/`
- ✅ **GitHub Issues** - PM creates actual work tickets
- ✅ **Agent comments** - Agents comment on issues as they work
- ✅ **Intermediate checks** - Waits for PM to finish before starting DEV
- ✅ **3 clear phases** - PM → DEV → QA

## What This Does

### Phase 1: PM Agent (Product Manager)
**Duration:** 3-5 minutes

**Actions:**
1. Reads onboarding documentation
2. Analyzes the feature request
3. Creates 3-5 GitHub Issues (work tickets) with:
   - Clear titles
   - Detailed descriptions
   - Acceptance criteria
   - Priority labels
   - Technical notes
4. Adds comments to each issue with implementation guidance
5. Creates `docs/PM-TICKETS-SUMMARY.md`
6. Creates PR with all tickets

**Output:**
- Branch: `pm/tickets-{timestamp}`
- GitHub Issues created
- PR with ticket summary
- **Logged to:** `/workspace/logs/{runId}.log`

### Intermediate Check
**Duration:** 5 seconds

- Verifies PM agent completed successfully
- Confirms all tickets are created
- Logs verification step

### Phase 2: DEV Agent (Developer)
**Duration:** 5-8 minutes

**Actions:**
1. Reads `PM-TICKETS-SUMMARY.md`
2. Reviews all GitHub Issues
3. Implements each ticket in priority order
4. Adds "in-progress" comments to issues
5. Writes comprehensive unit tests
6. Adds detailed code comments
7. Marks issues as "completed"
8. Creates `IMPLEMENTATION-NOTES.md` with:
   - What was implemented
   - How each ticket was addressed
   - Technical decisions
   - Test coverage
9. Creates PR with implementation

**Output:**
- Branch: `dev/implementation-{timestamp}`
- Code implementation
- Unit tests
- PR with summary
- Comments on GitHub Issues
- **Logged to:** `/workspace/logs/{runId}.log`

### Phase 3: QA Agent (Quality Assurance)
**Duration:** 3-5 minutes

**Actions:**
1. Reads `IMPLEMENTATION-NOTES.md`
2. Reviews each GitHub Issue
3. Reviews code changes in DEV PR
4. Verifies test coverage
5. Tests implemented features
6. Adds QA comments to each issue:
   - ✓ Pass / ✗ Fail status
   - Specific findings
   - Recommendations
7. Creates `QA-REPORT.md` with:
   - Summary of testing
   - Each ticket verification
   - Code quality assessment
   - Security concerns
   - Performance notes
8. Adds final comment to DEV PR

**Output:**
- Branch: `qa/review-{timestamp}`
- `QA-REPORT.md`
- Comments on all issues
- Comment on DEV PR
- **Logged to:** `/workspace/logs/{runId}.log`

## Quick Start

### Prerequisites

1. **Cursor API Keys** (3 keys from https://cursor.com/settings/api-keys)
   ```bash
   # Add to api/.env
   PM_CLOUD_AGENT_API_KEY=cur_xxx
   DEV_CLOUD_AGENT_API_KEY=cur_xxx
   QA_CLOUD_AGENT_API_KEY=cur_xxx
   ```

2. **MongoDB Running**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

3. **GitHub Repository**
   ```bash
   export REPOSITORY="https://github.com/your-org/your-repo"
   ```

### Run the Test

```bash
# Terminal 1: Start backend
cd /workspace/api
npm install
npm run dev

# Terminal 2: Run test
cd /workspace
export REPOSITORY="https://github.com/your-org/your-repo"
./test-simple-pipeline.sh
```

**Time:** 15-20 minutes total

## API Endpoints

### Execute Simplified Pipeline
```bash
POST /api/projects/:id/pipeline/simple

{
  "prompt": "Your feature request here",
  "repository": "https://github.com/org/repo",
  "ref": "main"
}
```

### Get Pipeline Status
```bash
GET /api/projects/:id/pipeline/runs/:runId
```

### Get Pipeline Logs
```bash
GET /api/projects/:id/pipeline/runs/:runId/logs
```

## Logs

All activity is logged to `/workspace/logs/{runId}.log`

**Log format:**
```
[2025-11-09T16:30:00.000Z] [INIT] Pipeline created
{
  "featureRequest": "...",
  "repository": "..."
}

[2025-11-09T16:30:05.000Z] [PM_START] PM Agent starting - reading onboarding docs

[2025-11-09T16:30:10.000Z] [PM_EXECUTE] Launching PM Agent
{
  "prompt": "..."
}

[2025-11-09T16:30:15.000Z] [PM_LAUNCHED] PM Agent launched successfully
{
  "agentRunId": "...",
  "cursorUrl": "https://cursor.com/agents?id=bc_...",
  "branchName": "pm/tickets-1731168010"
}

[2025-11-09T16:30:25.000Z] [PM_POLL] Polling agent status (1/60)
{
  "status": "running",
  "agentRunId": "..."
}

...
```

## What You'll See in GitHub

### 1. GitHub Issues (from PM Agent)

Example issues created:

**Issue #1: User Profile View**
```
Title: Ticket 1/4: User Profile View Component
Labels: feature, priority:high

Description:
Create a user profile view component that displays:
- User avatar
- Name
- Email
- Bio

Acceptance Criteria:
- [ ] Component renders all user data
- [ ] Avatar has fallback for missing images
- [ ] Layout is responsive
- [ ] Includes loading state

Technical Notes:
- Use React functional component
- Fetch data from /api/users/:id
- Handle errors gracefully
```

**PM Comment on Issue #1:**
```
Implementation Guidance:
- Complexity: Medium
- Dependencies: None
- Suggested approach: Create ProfileView.tsx component
- API endpoint needed: GET /api/users/:id
- Consider using React Query for data fetching
```

### 2. DEV Agent Comments

**DEV Comment on Issue #1:**
```
🚧 In Progress

Starting implementation of User Profile View component.

Plan:
1. Create ProfileView.tsx
2. Add API integration
3. Implement loading/error states
4. Write unit tests
```

**DEV Comment (later):**
```
✅ Completed

Implemented in commit abc123:
- Created ProfileView.tsx component
- Added /api/users/:id endpoint
- Implemented loading spinner
- Added error boundary
- Test coverage: 85%

See IMPLEMENTATION-NOTES.md for details.
```

### 3. QA Agent Comments

**QA Comment on Issue #1:**
```
🔍 QA Review

Status: ✓ PASS

Verified:
- [x] Component renders correctly
- [x] Avatar fallback works
- [x] Responsive on mobile
- [x] Loading state displays
- [x] Error handling works
- [x] Tests pass (85% coverage)

Notes:
- Code quality: Good
- Performance: Acceptable
- Security: No concerns

Minor suggestion: Consider adding skeleton loader instead of spinner.
```

### 4. Pull Requests

**PR #1: PM Tickets**
- Branch: `pm/tickets-1731168010`
- Title: "Product Specification: User Profile Management"
- Files: `docs/PM-TICKETS-SUMMARY.md`
- Description: Lists all created tickets with links

**PR #2: DEV Implementation**
- Branch: `dev/implementation-1731168300`
- Title: "Implementation: User Profile Management System"
- Files: Code + tests + `IMPLEMENTATION-NOTES.md`
- Description: Summary of implementation, links to tickets

## Monitoring in Real-Time

### Watch Agents Work

Each agent provides a Cursor URL:

```bash
# Get the logs
curl http://localhost:8080/api/projects/PROJECT_ID/pipeline/runs/RUN_ID/logs \
  -H "Authorization: Bearer $JWT_TOKEN"

# Look for "cursorUrl" entries
# Open in browser to watch agent work live!
```

### Tail the Log File

```bash
# Watch logs in real-time
tail -f /workspace/logs/run-*.log
```

## Differences from Original POC

| Feature | Original POC | Simplified POC |
|---------|-------------|----------------|
| **Logs** | Console only | File-based logs |
| **Tickets** | Just docs | Real GitHub Issues |
| **Comments** | None | Agents comment on issues |
| **Intermediate Check** | None | Waits for PM completion |
| **Visibility** | Limited | High (logs + issues + comments) |
| **Complexity** | Higher | Lower (more realistic) |

## Success Criteria

The pipeline is successful if:

- ✅ Log file created in `/workspace/logs/`
- ✅ 3-5 GitHub Issues created by PM
- ✅ PM comments on each issue
- ✅ DEV implements and comments
- ✅ QA reviews and comments
- ✅ 2 PRs created (PM + DEV)
- ✅ All phases logged
- ✅ Pipeline state: `COMPLETED`

## Troubleshooting

### "Log file not found"
```bash
# Check logs directory
ls -la /workspace/logs/

# Logs are created when pipeline starts
# If missing, check backend logs for errors
```

### "No GitHub Issues created"
```bash
# PM agent might have failed
# Check the log file for errors
cat /workspace/logs/run-*.log | grep ERROR

# Check Cursor URL to see what PM agent did
```

### "Agents not commenting on issues"
```bash
# This is expected behavior - they should comment
# If not commenting, check:
# 1. GitHub permissions for Cursor
# 2. Repository access
# 3. Agent prompts in simplified-pipeline.service.ts
```

## Customization

### Change Polling Interval

Edit `api/src/services/simplified-pipeline.service.ts`:

```typescript
const pollInterval = 10000; // 10 seconds (change this)
```

### Adjust Timeouts

```typescript
const maxPolls = 60; // 10 minutes (change this)
```

### Customize Prompts

Each phase has a detailed prompt in the service file. You can:
- Add more instructions
- Change ticket format
- Modify comment templates
- Adjust acceptance criteria

## Next Steps

After successful testing:

1. **Review the logs** - See exactly what each agent did
2. **Check GitHub Issues** - Verify tickets are detailed
3. **Read agent comments** - See how they communicate
4. **Review PRs** - Check code quality
5. **Customize prompts** - Adjust for your needs
6. **Add more agents** - Extend the pipeline
7. **Build frontend** - Visualize the pipeline

## Example Feature Request

Try this feature request:

```
Create a user profile management system with:
1. View user profile (avatar, name, email, bio)
2. Edit profile information
3. Upload profile picture
4. Change password

Include proper validation, error handling, and unit tests.
```

This will create ~4 tickets that agents will implement and test.

## Architecture

```
User → POST /api/projects/:id/pipeline/simple
         ↓
    SimplifiedPipelineService
         ↓
    [Logs to file]
         ↓
    PM Agent → Creates GitHub Issues + Comments
         ↓
    [Wait 5s - Intermediate Check]
         ↓
    DEV Agent → Implements + Comments on Issues
         ↓
    QA Agent → Reviews + Comments on Issues
         ↓
    COMPLETED
```

## Files

- **Service:** `api/src/services/simplified-pipeline.service.ts`
- **Routes:** `api/src/routes/project.routes.ts` (added endpoints)
- **Test Script:** `test-simple-pipeline.sh`
- **Logs:** `/workspace/logs/{runId}.log`

---

**Ready to test?** Run `./test-simple-pipeline.sh` now! 🚀
