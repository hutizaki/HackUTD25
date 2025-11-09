# Testing Guide - Pipeline POC

This guide shows you **exactly** how to test the autonomous agent pipeline.

## Prerequisites Checklist

Before testing, make sure you have:

- [ ] **3 Cursor API Keys** from https://cursor.com/settings/api-keys
  - One for PM Agent
  - One for DEV Agent  
  - One for QA Agent
- [ ] **GitHub Repository** where agents can create branches/PRs
- [ ] **MongoDB** running (locally or Docker)
- [ ] **Node.js 18+** installed

## Step-by-Step Testing

### Step 1: Setup Environment (5 minutes)

```bash
# 1. Navigate to the API directory
cd /workspace/api

# 2. Install dependencies (if not already done)
npm install

# 3. Create .env file with your credentials
cat > .env << 'EOF'
# MongoDB
MONGODB_URI=mongodb://localhost:27017/aio-saas

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random

# CORS
CORS_ORIGIN=http://localhost:5173

# Cursor API Keys - REPLACE WITH YOUR ACTUAL KEYS
PM_CLOUD_AGENT_API_KEY=cur_xxx_your_pm_key_here
DEV_CLOUD_AGENT_API_KEY=cur_xxx_your_dev_key_here
QA_CLOUD_AGENT_API_KEY=cur_xxx_your_qa_key_here

# Server
PORT=8080
NODE_ENV=development
EOF

# 4. IMPORTANT: Edit the .env file and replace the API keys!
nano .env  # or use your preferred editor
```

**⚠️ CRITICAL**: You MUST replace `cur_xxx_your_*_key_here` with your actual Cursor API keys!

### Step 2: Start MongoDB (1 minute)

Choose one option:

**Option A: Docker (Recommended)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: Local MongoDB**
```bash
# Make sure MongoDB is running on localhost:27017
mongod --dbpath /path/to/your/data
```

**Verify MongoDB is running:**
```bash
# Should show the MongoDB container
docker ps | grep mongodb

# OR test connection
mongosh mongodb://localhost:27017 --eval "db.version()"
```

### Step 3: Start the Backend (1 minute)

```bash
cd /workspace/api
npm run dev
```

You should see:
```
Server is running on port 8080
Environment: development
Health check: http://localhost:8080/healthz
```

**Test the backend is working:**
```bash
curl http://localhost:8080/healthz
# Should return: {"status":"ok","timestamp":"..."}
```

### Step 4: Create a User Account (1 minute)

Open a **new terminal** (keep the backend running in the first one).

```bash
# Register a new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'
```

Expected response:
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User"
    }
  }
}
```

**Save the token!** You'll need it for all subsequent requests.

```bash
# Set the token as an environment variable for easy reuse
export JWT_TOKEN="paste_your_token_here"
```

### Step 5: Create a Test Project (1 minute)

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Pipeline Test Project",
    "description": "Testing the autonomous agent pipeline"
  }'
```

Expected response:
```json
{
  "data": {
    "id": "673f1234567890abcdef1234",
    "name": "Pipeline Test Project",
    "description": "Testing the autonomous agent pipeline",
    ...
  }
}
```

**Save the project ID:**
```bash
export PROJECT_ID="paste_project_id_here"
```

### Step 6: Run the Pipeline! (7-11 minutes)

Now for the main event - execute the pipeline:

```bash
# Set your GitHub repository
export REPOSITORY="https://github.com/your-org/your-repo"

# Execute the pipeline
curl -X POST http://localhost:8080/api/projects/$PROJECT_ID/pipeline/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"prompt\": \"Create a health check endpoint at /api/health that returns the server status, uptime, and current timestamp. Include comprehensive unit tests and proper error handling.\",
    \"repository\": \"$REPOSITORY\",
    \"ref\": \"main\"
  }"
```

Expected response:
```json
{
  "data": {
    "runId": "run-1731168123456-abc12345",
    "state": "CREATED",
    "timeline": [
      {
        "phase": "INIT",
        "timestamp": "2025-11-09T16:20:00.000Z",
        "level": "info",
        "message": "Pipeline created",
        "data": {
          "prompt": "Create a health check endpoint..."
        }
      }
    ]
  }
}
```

**Save the run ID:**
```bash
export RUN_ID="paste_run_id_here"
```

### Step 7: Monitor Progress (Real-time)

The pipeline will take 7-11 minutes. Monitor it with:

```bash
# Check status every 10 seconds
watch -n 10 "curl -s http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \
  -H 'Authorization: Bearer $JWT_TOKEN' | jq '.data | {state, timeline: .timeline[-3:]}'"
```

Or manually check:
```bash
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
```

**What you'll see:**

1. **State: PM_RUNNING** (~2-3 minutes)
   - PM Agent is creating the product specification
   - Check timeline for `cursorUrl` to watch in real-time

2. **State: PM_COMPLETED → DEV_RUNNING** (~3-5 minutes)
   - DEV Agent is implementing the feature
   - Will read the PM's spec and write code + tests

3. **State: DEV_COMPLETED → QA_RUNNING** (~2-3 minutes)
   - QA Agent is reviewing the implementation
   - Will create a QA report with findings

4. **State: COMPLETED** 🎉
   - Pipeline finished successfully!
   - All PRs created

## Automated Testing (Easiest Way!)

Instead of manual steps, use the automated test script:

```bash
# Make sure you have JWT_TOKEN and REPOSITORY set
export JWT_TOKEN="your_token"
export REPOSITORY="https://github.com/your-org/your-repo"

# Run the automated test
cd /workspace
./test-pipeline.sh
```

The script will:
- ✅ Create a test project
- ✅ Execute the pipeline
- ✅ Monitor progress (checks every 5 seconds)
- ✅ Show final results with full timeline
- ✅ Display agent URLs and PR links

## What to Expect

### PM Agent Output (2-3 minutes)

**Branch Created:** `docs/pm-spec-{timestamp}`

**PR Created:** Yes (auto-created)

**File:** `docs/PRODUCT_SPEC.md`

**Contents:**
- Overview and objectives
- User stories and use cases
- Functional requirements
- Non-functional requirements
- Acceptance criteria
- Success metrics

### DEV Agent Output (3-5 minutes)

**Branch Created:** `feature/dev-impl-{timestamp}`

**PR Created:** Yes (auto-created)

**Files:**
- Implementation code (e.g., `api/src/routes/health.ts`)
- Unit tests (e.g., `api/src/routes/health.test.ts`)
- Updated dependencies if needed

**What it does:**
- Reads the PRODUCT_SPEC.md
- Implements the feature
- Writes comprehensive tests
- Adds error handling
- Follows existing code patterns

### QA Agent Output (2-3 minutes)

**Branch Created:** `qa/review-{timestamp}`

**PR Created:** No (review only)

**File:** `QA_REPORT.md`

**Contents:**
- Code review findings
- Test coverage analysis
- Security recommendations
- Quality issues found
- Suggestions for improvement

## Verifying Success

After the pipeline completes, verify:

1. **Check GitHub Repository**
   ```bash
   # You should see 2 new PRs:
   # 1. docs/pm-spec-* → main (Product Spec)
   # 2. feature/dev-impl-* → main (Implementation)
   ```

2. **Review the Product Spec**
   - Go to the PM Agent's PR
   - Read `docs/PRODUCT_SPEC.md`
   - Verify it matches your prompt

3. **Review the Implementation**
   - Go to the DEV Agent's PR
   - Check the code changes
   - Verify tests are included
   - Run tests locally if desired

4. **Review the QA Report**
   - Check the QA Agent's branch
   - Read `QA_REPORT.md`
   - See what issues were found

## Monitoring Agents in Real-Time

Each agent provides a Cursor URL for real-time monitoring:

```bash
# Get the timeline with Cursor URLs
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.timeline[] | select(.data.cursorUrl)'
```

Copy the `cursorUrl` and open it in your browser:
```
https://cursor.com/agents?id=bc_abc123...
```

You'll see the agent working in real-time! 🎬

## Troubleshooting

### Problem: "Cursor API key not configured"

**Solution:**
```bash
# Check your .env file
cat api/.env | grep CLOUD_AGENT_API_KEY

# Make sure all three keys are set and start with "cur_"
# Restart the backend after updating .env
```

### Problem: "Unauthorized" or "Invalid token"

**Solution:**
```bash
# Get a fresh token by logging in again
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Update your JWT_TOKEN environment variable
export JWT_TOKEN="new_token_here"
```

### Problem: "Project not found"

**Solution:**
```bash
# List your projects to get the correct ID
curl http://localhost:8080/api/projects \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data'

# Update PROJECT_ID
export PROJECT_ID="correct_id_here"
```

### Problem: "Agent polling timeout"

**Cause:** Agents can take longer than expected (5+ minutes each)

**Solution:**
```bash
# Check if the agent is still running via Cursor URL
# The agent might complete after the timeout
# Check the run status manually:
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.state'
```

### Problem: MongoDB connection error

**Solution:**
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# OR
mongosh mongodb://localhost:27017 --eval "db.version()"

# If not running, start it:
docker start mongodb
# OR
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Problem: "Repository not found or access denied"

**Solution:**
- Verify the repository URL is correct
- Make sure your Cursor account has access to the repository
- Try with a public repository first for testing

## Testing Individual Agents

You can also test agents individually without the pipeline:

### Test PM Agent Only
```bash
./test-pm-agent.sh
```

### Test DEV Agent Only
```bash
./test-dev-agent.sh
```

### Test QA Agent Only
```bash
PR_NUMBER=42 ./test-qa-agent.sh
```

See `TEST-AGENTS-README.md` for details.

## Advanced Testing

### Test with Different Prompts

```bash
# Simple feature
PROMPT="Add a /ping endpoint that returns 'pong'"

# Complex feature
PROMPT="Create a user authentication system with JWT tokens, password hashing, login, logout, and session management"

# Bug fix
PROMPT="Fix the memory leak in the session cleanup service"

# Refactoring
PROMPT="Refactor the user service to use async/await instead of callbacks"
```

### Test Error Handling

```bash
# Test with invalid repository
REPOSITORY="https://github.com/nonexistent/repo"

# Test with invalid ref
REF="nonexistent-branch"

# Test without API keys (should fail gracefully)
# Remove keys from .env temporarily
```

### Test Multiple Runs

```bash
# Execute multiple pipelines in parallel
for i in {1..3}; do
  curl -X POST http://localhost:8080/api/projects/$PROJECT_ID/pipeline/execute \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"Test run $i\", \"repository\": \"$REPOSITORY\"}" &
done

# List all runs
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data'
```

## Performance Benchmarks

Expected timings:
- **PM Agent**: 2-3 minutes
- **DEV Agent**: 3-5 minutes
- **QA Agent**: 2-3 minutes
- **Total Pipeline**: 7-11 minutes
- **API Response Time**: < 100ms
- **Polling Interval**: 5 seconds

## Success Criteria

The POC is working correctly if:

- ✅ Pipeline completes with state `COMPLETED`
- ✅ PM Agent creates `docs/PRODUCT_SPEC.md`
- ✅ DEV Agent creates implementation + tests
- ✅ QA Agent creates `QA_REPORT.md`
- ✅ Two PRs are created in GitHub
- ✅ Timeline shows all events
- ✅ No errors in backend logs

## Next Steps After Testing

Once you've verified the POC works:

1. **Review the Code**: Look at the implementation in `api/src/services/pipeline.service.ts`
2. **Customize Agents**: Modify agent prompts in the service
3. **Add More Agents**: Extend the pipeline with additional agents
4. **Integrate Frontend**: Build a UI to visualize the pipeline
5. **Add GitHub Actions**: Implement the full workflow system

## Getting Help

If you encounter issues:

1. **Check Backend Logs**: Look at the terminal running `npm run dev`
2. **Check MongoDB**: Verify data is being stored
3. **Check Cursor URLs**: See what the agents are actually doing
4. **Review Documentation**: 
   - `POC-PIPELINE-README.md` - Full POC details
   - `QUICK-START-POC.md` - Quick setup guide
   - `POC-SUMMARY.md` - Technical summary

## Quick Reference

```bash
# Environment Setup
export JWT_TOKEN="your_token"
export PROJECT_ID="your_project_id"
export RUN_ID="your_run_id"
export REPOSITORY="https://github.com/org/repo"

# Start Backend
cd /workspace/api && npm run dev

# Execute Pipeline
curl -X POST http://localhost:8080/api/projects/$PROJECT_ID/pipeline/execute \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"Your idea here\", \"repository\": \"$REPOSITORY\"}"

# Check Status
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.state'

# List All Runs
curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data'
```

---

**Ready to test?** Start with Step 1 above or use the automated script! 🚀
