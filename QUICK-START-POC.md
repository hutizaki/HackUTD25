# Quick Start - Pipeline POC

Get the autonomous agent pipeline running in 5 minutes!

## Prerequisites

1. **Cursor API Keys** - Get from https://cursor.com/settings/api-keys
   - You need 3 separate keys: PM, DEV, QA
   
2. **GitHub Repository** - A repo where agents can create branches/PRs
   
3. **MongoDB** - Running locally or via Docker

4. **Node.js** - Version 18+ recommended

## Step 1: Setup Environment

```bash
# Clone/navigate to the project
cd /workspace

# Install API dependencies
cd api
npm install

# Create .env file
cat > .env << 'EOF'
# MongoDB
MONGODB_URI=mongodb://localhost:27017/aio-saas

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# CORS
CORS_ORIGIN=http://localhost:5173

# Cursor API Keys (REQUIRED FOR POC)
PM_CLOUD_AGENT_API_KEY=cur_xxx_your_pm_key
DEV_CLOUD_AGENT_API_KEY=cur_xxx_your_dev_key
QA_CLOUD_AGENT_API_KEY=cur_xxx_your_qa_key

# Server
PORT=8080
NODE_ENV=development
EOF
```

**IMPORTANT**: Replace the `cur_xxx_*` values with your actual Cursor API keys!

## Step 2: Start MongoDB

```bash
# Option 1: Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Option 2: Local MongoDB
# Make sure MongoDB is running on localhost:27017
```

## Step 3: Start the Backend

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

## Step 4: Create a User Account

```bash
# Register a new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Login to get JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

Save the `token` from the login response - you'll need it!

## Step 5: Create a Project

```bash
# Replace YOUR_JWT_TOKEN with the token from login
export JWT_TOKEN="your_jwt_token_here"

curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Pipeline Test Project",
    "description": "Testing the autonomous agent pipeline"
  }'
```

Save the `id` from the response - this is your PROJECT_ID!

## Step 6: Run the Pipeline!

```bash
# Replace PROJECT_ID and REPOSITORY with your values
export PROJECT_ID="your_project_id_here"
export REPOSITORY="https://github.com/your-org/your-repo"

curl -X POST http://localhost:8080/api/projects/$PROJECT_ID/pipeline/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"prompt\": \"Create a health check endpoint at /api/health that returns server status, uptime, and timestamp. Include unit tests.\",
    \"repository\": \"$REPOSITORY\",
    \"ref\": \"main\"
  }"
```

Response will include a `runId` - save this!

## Step 7: Monitor Progress

```bash
# Check pipeline status
export RUN_ID="your_run_id_here"

curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
```

The response shows:
- Current `state` (CREATED, PM_RUNNING, PM_COMPLETED, DEV_RUNNING, etc.)
- `timeline` with all events
- Links to Cursor agent URLs for real-time monitoring

## Step 8: Watch It Work!

The pipeline will:

1. **PM Agent** (~2-3 minutes)
   - Creates product specification
   - Branch: `docs/pm-spec-{timestamp}`
   - File: `docs/PRODUCT_SPEC.md`
   - Creates PR automatically

2. **DEV Agent** (~3-5 minutes)
   - Implements the feature
   - Branch: `feature/dev-impl-{timestamp}`
   - Writes tests and code
   - Creates PR automatically

3. **QA Agent** (~2-3 minutes)
   - Reviews the implementation
   - Branch: `qa/review-{timestamp}`
   - File: `QA_REPORT.md`
   - No PR (just review)

Total time: **~7-11 minutes**

## Automated Test Script

Or just use the automated test script:

```bash
# Set your credentials
export JWT_TOKEN="your_jwt_token"
export REPOSITORY="https://github.com/your-org/your-repo"

# Run the test
./test-pipeline.sh
```

The script will:
- Create a test project
- Start the pipeline
- Monitor progress (checks every 5 seconds)
- Show final results

## Monitoring in Real-Time

Each agent creates a Cursor Cloud Agent that you can watch in real-time:

1. Check the timeline for `cursorUrl` fields
2. Open the URL: `https://cursor.com/agents?id=bc_...`
3. Watch the agent work live!

## Troubleshooting

### "Cursor API key not configured"
- Check your `.env` file has all three keys
- Restart the backend: `npm run dev`

### "Unauthorized"
- Make sure you're using the JWT token from login
- Token format: `Bearer your_token_here`

### "Project not found"
- Verify the PROJECT_ID is correct
- Make sure you own the project (same user who created it)

### "Agent polling timeout"
- Agents can take 5+ minutes to complete
- Check the Cursor URL to see if agent is still running
- Increase timeout in `pipeline.service.ts` if needed

### MongoDB connection error
- Make sure MongoDB is running
- Check `MONGODB_URI` in `.env`
- Try: `docker ps` to see if MongoDB container is up

## What to Expect

### PM Agent Output
- Branch: `docs/pm-spec-{timestamp}`
- PR with product specification
- File: `docs/PRODUCT_SPEC.md`
- Contains: overview, requirements, acceptance criteria

### DEV Agent Output
- Branch: `feature/dev-impl-{timestamp}`
- PR with implementation
- Working code with tests
- Follows specification from PM agent

### QA Agent Output
- Branch: `qa/review-{timestamp}`
- File: `QA_REPORT.md`
- Code review findings
- Test coverage analysis
- Security recommendations

## API Endpoints

```bash
# Execute pipeline
POST /api/projects/:id/pipeline/execute

# List all runs
GET /api/projects/:id/pipeline/runs

# Get run status
GET /api/projects/:id/pipeline/runs/:runId
```

## Next Steps

1. **Check GitHub**: Look for PRs created by the agents
2. **Review Output**: Read the spec, code, and QA report
3. **Experiment**: Try different prompts
4. **Extend**: Add more agents or customize existing ones

## Architecture

```
User → Backend API → Pipeline Service
                         ↓
                    PM Agent (Cursor)
                         ↓
                    DEV Agent (Cursor)
                         ↓
                    QA Agent (Cursor)
                         ↓
                    Complete!
```

Each agent:
- Runs independently via Cursor Cloud API
- Creates branches and PRs automatically
- Polls for completion (5 second intervals)
- Passes context to next agent

## Documentation

- **Full POC Details**: `POC-PIPELINE-README.md`
- **Phase 4 & 5 Notes**: `docs/phase4and5notes.md`
- **Test Scripts**: `test-pm-agent.sh`, `test-dev-agent.sh`, `test-qa-agent.sh`

## Success!

If you see:
- ✅ Pipeline state: `COMPLETED`
- ✅ Three PRs created in GitHub
- ✅ Product spec, implementation, and QA report

**Congratulations!** You've successfully run the autonomous agent pipeline! 🎉

## Support

Issues? Check:
1. All three Cursor API keys are set
2. MongoDB is running
3. JWT token is valid
4. Repository URL is correct
5. Backend logs for errors: `npm run dev`

## What This Proves

This POC demonstrates:
- ✅ Autonomous agents can work together
- ✅ Sequential pipeline execution works
- ✅ State tracking and progress monitoring
- ✅ Integration with Cursor Cloud API
- ✅ Automatic PR creation
- ✅ Context passing between agents

This is the foundation for the full system described in `docs/phase4and5notes.md`!
