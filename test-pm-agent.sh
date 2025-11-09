#!/bin/bash

# Direct Cursor API Test Script for PM Agent
# This script tests the Cursor Cloud Agents API directly (no backend needed)

set -e  # Exit on error

echo "=========================================="
echo "PM Agent Direct API Test"
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
REPOSITORY="${REPOSITORY:-${GIT_REMOTE:-https://github.com/brobertiello/HackUTD25}}"
# Use current git branch if not specified
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
REF="${REF:-$CURRENT_BRANCH}"
BRANCH_NAME="${BRANCH_NAME:-pm-agent-$(date +%s)}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if PM API key is provided
if [ -z "$PM_CLOUD_AGENT_API_KEY" ]; then
    echo -e "${RED}Error: PM_CLOUD_AGENT_API_KEY not found${NC}"
    echo ""
    echo "Please set PM_CLOUD_AGENT_API_KEY in one of these ways:"
    echo "  1. Add to api/.env file: PM_CLOUD_AGENT_API_KEY=cur_xxx"
    echo "  2. Export as environment variable: export PM_CLOUD_AGENT_API_KEY=cur_xxx"
    echo "  3. Pass inline: PM_CLOUD_AGENT_API_KEY=cur_xxx ./test-pm-agent.sh"
    echo ""
    echo "Get your API key from: https://cursor.com/settings/api-keys"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Repository: $REPOSITORY"
echo "  Ref: $REF"
echo "  Branch: $BRANCH_NAME"
echo ""

# Launch PM Agent (spec-writer)
echo -e "${YELLOW}Launching PM Agent via Cursor API...${NC}"
echo ""

RESPONSE=$(curl -s --request POST \
  --url https://api.cursor.com/v0/agents \
  -u "${PM_CLOUD_AGENT_API_KEY}:" \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt": {
      "text": "You are a Product Manager agent. Analyze the following requirement and create a comprehensive product specification.\n\nRequirement: Add user authentication with login, registration, and password reset\n\nCreate a detailed specification including:\n\n1. **Overview and Objectives**\n   - What is the feature?\n   - Why is it needed?\n   - What are the business goals?\n\n2. **User Stories** (at least 5)\n   - As a [user type], I want [goal] so that [benefit]\n   - Cover: registration, login, logout, password reset, session management\n\n3. **Functional Requirements**\n   - Registration flow (email validation, password requirements)\n   - Login flow (authentication, session creation)\n   - Password reset flow (email verification, token expiration)\n   - Session management (JWT tokens, refresh tokens)\n   - Role-based access control (RBAC)\n\n4. **Non-functional Requirements**\n   - Security: Password hashing (bcrypt), JWT signing, HTTPS only\n   - Performance: Login < 500ms, token validation < 100ms\n   - Scalability: Support 10,000 concurrent users\n   - Compliance: GDPR, password strength requirements\n\n5. **Acceptance Criteria** (testable)\n   - User can register with valid email and password\n   - User receives verification email\n   - User can login with correct credentials\n   - User cannot login with incorrect credentials\n   - User can reset password via email\n   - Sessions expire after 7 days\n   - All passwords are hashed\n\n6. **Success Metrics**\n   - Registration completion rate > 80%\n   - Login success rate > 95%\n   - Password reset completion rate > 70%\n   - Average login time < 500ms\n\n7. **Technical Constraints**\n   - Must use JWT tokens\n   - Must support refresh tokens\n   - Must comply with GDPR\n   - Must have audit logging\n   - Must work with existing MongoDB database\n\n8. **Dependencies**\n   - Email service for verification and password reset\n   - MongoDB for user storage\n   - JWT library for token management\n\n9. **Risks and Mitigations**\n   - Risk: Brute force attacks → Mitigation: Rate limiting\n   - Risk: Password leaks → Mitigation: Strong hashing, breach detection\n   - Risk: Session hijacking → Mitigation: HTTPS only, secure cookies\n\nCreate a well-structured markdown document with clear sections and professional formatting. Save it as PRODUCT_SPEC.md in the repository root."
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
    echo -e "${GREEN}✓ PM Agent launched successfully!${NC}"
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
      -u "${PM_CLOUD_AGENT_API_KEY}:")
    
    echo "$STATUS_RESPONSE" | jq '.'
    
    CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "PM Agent Test Completed!"
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
    echo "  4. The agent will create PRODUCT_SPEC.md with the full specification"
    echo ""
    echo "To check status again:"
    echo "  curl -u \$PM_CLOUD_AGENT_API_KEY: https://api.cursor.com/v0/agents/$AGENT_ID | jq '.'"
    echo ""
    echo "To cancel the agent:"
    echo "  curl -X POST -u \$PM_CLOUD_AGENT_API_KEY: https://api.cursor.com/v0/agents/$AGENT_ID/cancel"
    echo ""
    
    # If agent is already running, offer to poll
    if [ "$CURRENT_STATUS" = "RUNNING" ]; then
        echo -e "${BLUE}ℹ️  Agent is running. This may take 5-30 minutes.${NC}"
        echo ""
        read -p "Would you like to poll for completion? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${YELLOW}Polling for completion (checking every 30 seconds)...${NC}"
            echo "Press Ctrl+C to stop polling"
            echo ""
            
            POLL_COUNT=0
            MAX_POLLS=40  # 20 minutes max
            
            while [ $POLL_COUNT -lt $MAX_POLLS ]; do
                sleep 30
                POLL_COUNT=$((POLL_COUNT + 1))
                
                STATUS_RESPONSE=$(curl -s --request GET \
                  --url "https://api.cursor.com/v0/agents/${AGENT_ID}" \
                  -u "${PM_CLOUD_AGENT_API_KEY}:")
                
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
                echo -e "${YELLOW}⚠️  Agent still running after ${MAX_POLLS} polls (20 minutes)${NC}"
                echo "Continue monitoring at: $CURSOR_URL"
            fi
        fi
    fi
    
else
    echo ""
    echo -e "${RED}✗ Failed to launch PM Agent${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    
    # Check for common errors
    if echo "$RESPONSE" | grep -q "Unauthorized"; then
        echo ""
        echo -e "${YELLOW}Hint: Check that your PM_CLOUD_AGENT_API_KEY is valid${NC}"
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
