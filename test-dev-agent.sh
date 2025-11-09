#!/bin/bash

# Direct Cursor API Test Script for DEV Agent
# This script tests the Cursor Cloud Agents API directly (no backend needed)

set -e  # Exit on error

echo "=========================================="
echo "DEV Agent Direct API Test"
echo "=========================================="
echo ""

# Load environment variables from .env file if it exists
if [ -f "api/.env" ]; then
    echo "Loading environment variables from api/.env..."
    set -a
    source api/.env
    set +a
elif [ -f ".env" ]; then
    echo "Loading environment variables from .env..."
    set -a
    source .env
    set +a
fi

# Configuration
REPOSITORY="${REPOSITORY:-https://github.com/bryan/HackUTD25}"
REF="${REF:-main}"
BRANCH_NAME="feature/dev-test-health-$(date +%s)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DEV API key is provided
if [ -z "$DEV_CLOUD_AGENT_API_KEY" ]; then
    echo -e "${RED}Error: DEV_CLOUD_AGENT_API_KEY not found${NC}"
    echo ""
    echo "Please set DEV_CLOUD_AGENT_API_KEY in one of these ways:"
    echo "  1. Add to api/.env file: DEV_CLOUD_AGENT_API_KEY=cur_xxx"
    echo "  2. Export as environment variable: export DEV_CLOUD_AGENT_API_KEY=cur_xxx"
    echo "  3. Pass inline: DEV_CLOUD_AGENT_API_KEY=cur_xxx ./test-dev-agent.sh"
    echo ""
    echo "Get your API key from: https://cursor.com/settings/api-keys"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Repository: $REPOSITORY"
echo "  Ref: $REF"
echo "  Branch: $BRANCH_NAME"
echo ""

# Launch DEV Agent (developer-implementer)
echo -e "${YELLOW}Launching DEV Agent via Cursor API...${NC}"
echo ""

RESPONSE=$(curl -s --request POST \
  --url https://api.cursor.com/v0/agents \
  -u "${DEV_CLOUD_AGENT_API_KEY}:" \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt": {
      "text": "Create a comprehensive health check endpoint at /api/health\n\nRequirements:\n1. Return JSON with: status, timestamp, version, uptime, database connectivity, memory usage\n2. Return 200 OK if all checks pass\n3. Return 503 Service Unavailable if any check fails\n4. Check database connectivity (MongoDB)\n5. Check memory usage and warn if > 90%\n6. Add proper error handling and logging\n7. Write unit tests with >80% coverage\n8. Follow existing code patterns in api/src/routes/\n9. Use TypeScript with proper types\n10. Add JSDoc comments\n\nTechnical Details:\n- Framework: Express.js\n- Language: TypeScript\n- Database: MongoDB (Mongoose)\n- Follow patterns in api/src/routes/ for routing\n- Use api/src/config/logger.ts for logging\n- Add tests in a test file\n\nAcceptance Criteria:\n- Endpoint responds at GET /api/health\n- Returns proper JSON structure\n- Checks database connectivity\n- Returns appropriate status codes\n- Has unit tests with >80% coverage\n- Follows TypeScript best practices\n- Has proper error handling\n- Has logging for failures"
    },
    "source": {
      "repository": "'"$REPOSITORY"'",
      "ref": "'"$REF"'"
    },
    "target": {
      "autoCreatePr": true,
      "branchName": "'"$BRANCH_NAME"'",
      "openAsCursorGithubApp": false,
      "skipReviewerRequest": false
    },
    "model": "claude-4-sonnet"
  }')

echo "$RESPONSE" | jq '.'

# Check if launch was successful
if echo "$RESPONSE" | jq -e '.id' > /dev/null; then
    AGENT_ID=$(echo "$RESPONSE" | jq -r '.id')
    AGENT_NAME=$(echo "$RESPONSE" | jq -r '.name')
    AGENT_STATUS=$(echo "$RESPONSE" | jq -r '.status')
    CURSOR_URL=$(echo "$RESPONSE" | jq -r '.target.url')
    BRANCH=$(echo "$RESPONSE" | jq -r '.target.branchName')
    
    echo ""
    echo -e "${GREEN}✓ DEV Agent launched successfully!${NC}"
    echo "  Agent ID: $AGENT_ID"
    echo "  Name: $AGENT_NAME"
    echo "  Status: $AGENT_STATUS"
    echo "  Branch: $BRANCH"
    echo "  Monitor progress: $CURSOR_URL"
    echo ""
    
    # Wait a bit and check status
    echo -e "${YELLOW}Waiting 5 seconds before checking status...${NC}"
    sleep 5
    
    echo -e "${YELLOW}Checking agent status...${NC}"
    STATUS_RESPONSE=$(curl -s --request GET \
      --url "https://api.cursor.com/v0/agents/${AGENT_ID}" \
      -u "${DEV_CLOUD_AGENT_API_KEY}:")
    
    echo "$STATUS_RESPONSE" | jq '.'
    
    CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "DEV Agent Test Completed!"
    echo "==========================================${NC}"
    echo ""
    echo "Agent Details:"
    echo "  ID: $AGENT_ID"
    echo "  Current Status: $CURRENT_STATUS"
    echo "  Branch: $BRANCH"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor progress: $CURSOR_URL"
    echo "  2. Check the created branch: $BRANCH"
    echo "  3. Review the PR when it's created"
    echo "  4. Test the endpoint: curl http://localhost:8080/api/health"
    echo ""
    echo "To check status again:"
    echo "  curl -u \$DEV_CLOUD_AGENT_API_KEY: https://api.cursor.com/v0/agents/$AGENT_ID | jq '.'"
    echo ""
    
else
    echo ""
    echo -e "${RED}✗ Failed to launch DEV Agent${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    
    if echo "$RESPONSE" | grep -q "Unauthorized"; then
        echo ""
        echo -e "${YELLOW}Hint: Check that your DEV_CLOUD_AGENT_API_KEY is valid${NC}"
    fi
    
    exit 1
fi
