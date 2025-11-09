#!/bin/bash

# Direct Cursor API Test Script for QA Agent
# This script tests the Cursor Cloud Agents API directly (no backend needed)

set -e  # Exit on error

echo "=========================================="
echo "QA Agent Direct API Test"
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
REF="${REF:-feature/dev-test-health}"  # Review the DEV agent's branch
BRANCH_NAME="qa/review-health-$(date +%s)"
PR_NUMBER="${PR_NUMBER:-1}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if QA API key is provided
if [ -z "$QA_CLOUD_AGENT_API_KEY" ]; then
    echo -e "${RED}Error: QA_CLOUD_AGENT_API_KEY not found${NC}"
    echo ""
    echo "Please set QA_CLOUD_AGENT_API_KEY in one of these ways:"
    echo "  1. Add to api/.env file: QA_CLOUD_AGENT_API_KEY=cur_xxx"
    echo "  2. Export as environment variable: export QA_CLOUD_AGENT_API_KEY=cur_xxx"
    echo "  3. Pass inline: QA_CLOUD_AGENT_API_KEY=cur_xxx ./test-qa-agent.sh"
    echo ""
    echo "Get your API key from: https://cursor.com/settings/api-keys"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Repository: $REPOSITORY"
echo "  Reviewing Branch: $REF"
echo "  QA Branch: $BRANCH_NAME"
echo "  PR Number: $PR_NUMBER"
echo ""

# Launch QA Agent (qa-tester)
echo -e "${YELLOW}Launching QA Agent via Cursor API...${NC}"
echo ""

RESPONSE=$(curl -s --request POST \
  --url https://api.cursor.com/v0/agents \
  -u "${QA_CLOUD_AGENT_API_KEY}:" \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt": {
      "text": "Review the health check endpoint implementation in PR #'"$PR_NUMBER"'\n\nPerform a comprehensive code review checking for:\n\n1. Security Vulnerabilities:\n   - Exposed secrets or credentials\n   - SQL injection risks\n   - XSS vulnerabilities\n   - Authentication/authorization issues\n\n2. Error Handling:\n   - All error cases covered\n   - Proper error messages\n   - No unhandled exceptions\n   - Graceful degradation\n\n3. Input Validation:\n   - All inputs validated\n   - Type checking\n   - Boundary conditions\n\n4. Test Coverage:\n   - Unit tests present\n   - Coverage >80%\n   - Edge cases tested\n   - Error cases tested\n\n5. Code Quality:\n   - Follows existing patterns\n   - Proper TypeScript types\n   - No console.log statements\n   - Clean code principles\n\n6. Performance:\n   - No performance bottlenecks\n   - Efficient database queries\n   - Proper async/await usage\n\n7. Documentation:\n   - Code comments for complex logic\n   - JSDoc comments\n   - API documentation\n   - README updated if needed\n\nCreate a detailed review report with:\n- Executive Summary\n- Findings categorized by severity (Critical, High, Medium, Low)\n- Specific line numbers and code snippets\n- Recommendations for each finding\n- Overall assessment\n\nFor any Critical or High severity issues, create separate defect issues.\n\nAcceptance Criteria from Original Spec:\n- Endpoint responds at GET /api/health\n- Returns proper JSON structure\n- Checks database connectivity\n- Returns appropriate status codes\n- Has unit tests with >80% coverage\n- Follows TypeScript best practices\n- Has proper error handling\n- Has logging for failures"
    },
    "source": {
      "repository": "'"$REPOSITORY"'",
      "ref": "'"$REF"'"
    },
    "target": {
      "autoCreatePr": false,
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
    echo -e "${GREEN}✓ QA Agent launched successfully!${NC}"
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
      -u "${QA_CLOUD_AGENT_API_KEY}:")
    
    echo "$STATUS_RESPONSE" | jq '.'
    
    CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "QA Agent Test Completed!"
    echo "==========================================${NC}"
    echo ""
    echo "Agent Details:"
    echo "  ID: $AGENT_ID"
    echo "  Current Status: $CURRENT_STATUS"
    echo "  Branch: $BRANCH"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor progress: $CURSOR_URL"
    echo "  2. Review the QA report in branch: $BRANCH"
    echo "  3. Check for any defect issues created"
    echo "  4. Address any Critical or High severity findings"
    echo ""
    echo "To check status again:"
    echo "  curl -u \$QA_CLOUD_AGENT_API_KEY: https://api.cursor.com/v0/agents/$AGENT_ID | jq '.'"
    echo ""
    
else
    echo ""
    echo -e "${RED}✗ Failed to launch QA Agent${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    
    if echo "$RESPONSE" | grep -q "Unauthorized"; then
        echo ""
        echo -e "${YELLOW}Hint: Check that your QA_CLOUD_AGENT_API_KEY is valid${NC}"
    fi
    
    exit 1
fi
