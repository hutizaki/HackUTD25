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
# Auto-detect git repository URL (convert SSH to HTTPS format)
GIT_REMOTE=$(git remote get-url origin 2>/dev/null | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//')
REPOSITORY="${REPOSITORY:-${GIT_REMOTE:-https://github.com/hutizaki/HackUTD25}}"
# Use current git branch if not specified
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
REF="${REF:-feature/dev-test-health}"  # Review the DEV agent's branch
BRANCH_NAME="qa/review-health-$(date +%s)"
PR_NUMBER="${PR_NUMBER:-1}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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
    echo "To cancel the agent:"
    echo "  curl -X POST -u \$QA_CLOUD_AGENT_API_KEY: https://api.cursor.com/v0/agents/$AGENT_ID/cancel"
    echo ""
    
    # If agent is already running, offer to poll
    if [ "$CURRENT_STATUS" = "RUNNING" ]; then
        echo -e "${BLUE}ℹ️  Agent is running. This may take 5 minutes.${NC}"
        echo ""
        read -p "Would you like to poll for completion? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${YELLOW}Polling for completion (checking every 15 seconds)...${NC}"
            echo "Press Ctrl+C to stop polling"
            echo ""
            
            POLL_COUNT=0
            MAX_POLLS=20  # 5 minutes max
            
            while [ $POLL_COUNT -lt $MAX_POLLS ]; do
                sleep 15
                POLL_COUNT=$((POLL_COUNT + 1))
                
                STATUS_RESPONSE=$(curl -s --request GET \
                  --url "https://api.cursor.com/v0/agents/${AGENT_ID}" \
                  -u "${QA_CLOUD_AGENT_API_KEY}:")
                
                CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
                echo -e "[Poll ${POLL_COUNT}/${MAX_POLLS}] Status: ${YELLOW}${CURRENT_STATUS}${NC}"
                
                if [ "$CURRENT_STATUS" = "COMPLETED" ]; then
                    echo ""
                    echo -e "${GREEN}✅ Agent completed successfully!${NC}"
                    echo ""
                    echo "Full response:"
                    echo "$STATUS_RESPONSE" | jq '.'
                    break
                elif [ "$CURRENT_STATUS" = "FAILED" ]; then
                    echo ""
                    echo -e "${RED}❌ Agent failed${NC}"
                    echo ""
                    echo "Full response:"
                    echo "$STATUS_RESPONSE" | jq '.'
                    break
                fi
            done
            
            if [ $POLL_COUNT -eq $MAX_POLLS ]; then
                echo ""
                echo -e "${YELLOW}⚠️  Agent still running after ${MAX_POLLS} polls (5 minutes)${NC}"
                echo "Continue monitoring at: $CURSOR_URL"
            fi
        fi
    fi
    
else
    echo ""
    echo -e "${RED}✗ Failed to launch QA Agent${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    
    # Check for common errors
    if echo "$RESPONSE" | grep -q "Unauthorized"; then
        echo ""
        echo -e "${YELLOW}Hint: Check that your QA_CLOUD_AGENT_API_KEY is valid${NC}"
    elif echo "$RESPONSE" | grep -q "do not have access"; then
        echo ""
        echo -e "${YELLOW}Hint: You need to install the Cursor GitHub App${NC}"
        echo "Click this link to install:"
        ERROR_URL=$(echo "$RESPONSE" | grep -o 'https://cursor.com/api/auth/connect-github[^"]*' | head -1)
        if [ -n "$ERROR_URL" ]; then
            echo "$ERROR_URL"
        fi
    fi
    
    exit 1
fi
