# Agent Test Scripts - Direct Cursor API

These test scripts call the Cursor Cloud Agents API **directly** to test PM, DEV, and QA agents.

## Prerequisites

1. **Cursor API Keys**: Get your API keys from https://cursor.com/settings/api-keys
   - Create separate API keys for PM, DEV, and QA roles
   - Each key looks like: `cur_xxx...`

2. **GitHub Repository**: The repository you want the agents to work on
   - Must be accessible to your Cursor account
   - Should have proper permissions set up

3. **jq**: JSON parsing tool (optional but recommended)
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   ```

## Quick Start

```bash
# Test PM Agent
PM_CLOUD_AGENT_API_KEY=cur_xxx \
REPOSITORY=https://github.com/your-org/your-repo \
./test-pm-agent.sh

# Test DEV Agent
DEV_CLOUD_AGENT_API_KEY=cur_xxx \
REPOSITORY=https://github.com/your-org/your-repo \
./test-dev-agent.sh

# Test QA Agent
QA_CLOUD_AGENT_API_KEY=cur_xxx \
REPOSITORY=https://github.com/your-org/your-repo \
PR_NUMBER=42 \
./test-qa-agent.sh
```

## Test Scripts

### 1. PM Agent Test (`test-pm-agent.sh`)

Tests the Product Manager agent by creating a comprehensive product specification.

**Usage:**
```bash
PM_CLOUD_AGENT_API_KEY=cur_xxx \
REPOSITORY=https://github.com/your-org/your-repo \
./test-pm-agent.sh
```

**What it does:**
- Calls Cursor API directly to launch a PM agent
- Creates a product specification for a user authentication system
- Creates branch: `docs/pm-test-spec-{timestamp}`
- Auto-creates PR with the specification
- Checks agent status after 5 seconds

**Output:**
- Agent ID and status
- Cursor URL to monitor progress
- Branch name
- Commands to check status or cancel

### 2. DEV Agent Test (`test-dev-agent.sh`)

Tests the Developer agent by implementing a health check endpoint.

**Usage:**
```bash
DEV_CLOUD_AGENT_API_KEY=cur_xxx \
REPOSITORY=https://github.com/your-org/your-repo \
./test-dev-agent.sh
```

**What it does:**
- Calls Cursor API directly to launch a DEV agent
- Implements a `/api/health` endpoint with tests
- Creates branch: `feature/dev-test-health-{timestamp}`
- Auto-creates PR with implementation
- Checks agent status after 5 seconds

**Output:**
- Agent ID and status
- Cursor URL to monitor progress
- Branch name
- Instructions to test the endpoint

### 3. QA Agent Test (`test-qa-agent.sh`)

Tests the QA agent by reviewing code from a PR.

**Usage:**
```bash
QA_CLOUD_AGENT_API_KEY=cur_xxx \
REPOSITORY=https://github.com/your-org/your-repo \
PR_NUMBER=42 \
./test-qa-agent.sh
```

**What it does:**
- Calls Cursor API directly to launch a QA agent
- Reviews the specified PR comprehensively
- Creates branch: `qa/review-health-{timestamp}`
- Does NOT auto-create PR (review only)
- Checks agent status after 5 seconds

**Output:**
- Agent ID and status
- Cursor URL to monitor progress
- Branch name with review report
- Instructions to view findings

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PM_CLOUD_AGENT_API_KEY` | Cursor API key for PM agent | Yes (PM) | `cur_xxx...` |
| `DEV_CLOUD_AGENT_API_KEY` | Cursor API key for DEV agent | Yes (DEV) | `cur_xxx...` |
| `QA_CLOUD_AGENT_API_KEY` | Cursor API key for QA agent | Yes (QA) | `cur_xxx...` |
| `REPOSITORY` | GitHub repository URL | No | `https://github.com/org/repo` |
| `REF` | Git ref (branch/tag/commit) | No | `main` |
| `PR_NUMBER` | PR number for QA review | No (QA only) | `42` |

## Full Workflow Example

```bash
# Set your repository
export REPOSITORY=https://github.com/your-org/your-repo

# 1. Run PM Agent to create spec
PM_CLOUD_AGENT_API_KEY=cur_pm_key ./test-pm-agent.sh
# Wait for completion, note the branch name

# 2. Run DEV Agent to implement feature
DEV_CLOUD_AGENT_API_KEY=cur_dev_key ./test-dev-agent.sh
# Wait for completion, note the PR number

# 3. Run QA Agent to review the PR
QA_CLOUD_AGENT_API_KEY=cur_qa_key PR_NUMBER=42 ./test-qa-agent.sh
# Review the QA findings
```

## Monitoring Agent Progress

Each script outputs a Cursor URL where you can monitor the agent's real-time progress:

```
Monitor progress: https://cursor.com/agents?id=bc_abc123
```

Open this URL in your browser to see:
- Real-time agent activity
- Files being modified
- Commits being created
- PR creation status

## Checking Agent Status

To manually check an agent's status:

```bash
# PM Agent
curl -u $PM_CLOUD_AGENT_API_KEY: \
  https://api.cursor.com/v0/agents/AGENT_ID | jq '.'

# DEV Agent
curl -u $DEV_CLOUD_AGENT_API_KEY: \
  https://api.cursor.com/v0/agents/AGENT_ID | jq '.'

# QA Agent
curl -u $QA_CLOUD_AGENT_API_KEY: \
  https://api.cursor.com/v0/agents/AGENT_ID | jq '.'
```

## Cancelling an Agent

To cancel a running agent:

```bash
curl -X POST -u $PM_CLOUD_AGENT_API_KEY: \
  https://api.cursor.com/v0/agents/AGENT_ID/cancel
```

## Troubleshooting

### Error: PM_CLOUD_AGENT_API_KEY environment variable is required

**Solution**: Set the appropriate API key:
```bash
export PM_CLOUD_AGENT_API_KEY=cur_xxx
```

### Error: Unauthorized (401)

**Cause**: Invalid or expired API key

**Solution**: 
1. Check your API key is correct
2. Get a new API key from https://cursor.com/settings/api-keys
3. Make sure you're using the right key for the right agent type

### Error: Repository not found or access denied

**Cause**: Repository URL is incorrect or you don't have access

**Solution**:
1. Verify the repository URL is correct
2. Make sure your Cursor account has access to the repository
3. Check that the repository is not private (or you have access)

### Agent status stuck in "CREATING"

**Cause**: Agent is still initializing

**Solution**: Wait a bit longer and check the Cursor URL for real-time updates

## API Key Security

**IMPORTANT**: 
- Never commit API keys to version control
- Don't share API keys publicly
- Use environment variables or secure secret management
- Rotate keys regularly
- Use separate keys for different environments

## What's Different from Backend Integration?

These test scripts call Cursor API **directly**, bypassing your backend:

```
Direct Approach:
Test Script → [API_KEY] → Cursor API

Backend Approach (for production):
Frontend → [JWT] → Your Backend → [API_KEY] → Cursor API
```

**Use these scripts for:**
- Testing Cursor API integration
- Quick agent experiments
- Development and debugging
- Understanding agent behavior

**Use backend integration for:**
- Production deployments
- User authentication and authorization
- Tracking agent runs in your database
- Integrating with your workflow orchestration

## Next Steps

1. Test each agent type with the scripts
2. Review the generated code and specifications
3. Integrate the agent system into your backend (see `.ai/guides/cursor-agent-setup.md`)
4. Build your workflow orchestration
5. Connect to your frontend

## Support

- Cursor API Docs: https://docs.cursor.com/api/agents
- Agent Setup Guide: `.ai/guides/cursor-agent-setup.md`
- Quick Start Guide: `.ai/guides/agent-quick-start.md`
- Phase 4 & 5 Notes: `docs/phase4and5notes.md`
