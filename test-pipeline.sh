#!/bin/bash

# Test script for the Pipeline POC
# This script demonstrates the full PM -> DEV -> QA pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
REPOSITORY="${REPOSITORY:-https://github.com/your-org/your-repo}"
REF="${REF:-main}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Pipeline POC Test Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if JWT token is provided
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}Error: JWT_TOKEN environment variable is required${NC}"
  echo ""
  echo "Usage:"
  echo "  JWT_TOKEN=your_token REPOSITORY=https://github.com/org/repo ./test-pipeline.sh"
  echo ""
  echo "To get a JWT token:"
  echo "  1. Start the backend: cd api && npm run dev"
  echo "  2. Register a user: POST /api/auth/register"
  echo "  3. Login: POST /api/auth/login"
  echo "  4. Use the token from the login response"
  exit 1
fi

# Check if repository is provided
if [ "$REPOSITORY" = "https://github.com/your-org/your-repo" ]; then
  echo -e "${YELLOW}Warning: Using default repository URL${NC}"
  echo -e "${YELLOW}Set REPOSITORY environment variable to use your own repo${NC}"
  echo ""
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  API Base URL: $API_BASE_URL"
echo "  Repository:   $REPOSITORY"
echo "  Ref:          $REF"
echo ""

# Step 1: Create a test project
echo -e "${BLUE}Step 1: Creating test project...${NC}"
PROJECT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Pipeline POC Test",
    "description": "Testing the autonomous agent pipeline"
  }')

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: Failed to create project${NC}"
  echo "Response: $PROJECT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Project created: $PROJECT_ID${NC}"
echo ""

# Step 2: Execute the pipeline
echo -e "${BLUE}Step 2: Starting pipeline execution...${NC}"
PIPELINE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"prompt\": \"Create a health check endpoint at /api/health that returns the server status, uptime, and current timestamp. Include unit tests and proper error handling.\",
    \"repository\": \"$REPOSITORY\",
    \"ref\": \"$REF\"
  }")

RUN_ID=$(echo "$PIPELINE_RESPONSE" | grep -o '"runId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo -e "${RED}Error: Failed to start pipeline${NC}"
  echo "Response: $PIPELINE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Pipeline started: $RUN_ID${NC}"
echo ""

# Step 3: Monitor pipeline progress
echo -e "${BLUE}Step 3: Monitoring pipeline progress...${NC}"
echo ""

COMPLETED=false
MAX_CHECKS=60  # 5 minutes (60 * 5 seconds)
CHECK_COUNT=0

while [ "$COMPLETED" = false ] && [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
  sleep 5
  CHECK_COUNT=$((CHECK_COUNT + 1))
  
  STATUS_RESPONSE=$(curl -s "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  STATE=$(echo "$STATUS_RESPONSE" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$STATE" ]; then
    echo -e "${RED}Error: Failed to get pipeline status${NC}"
    echo "Response: $STATUS_RESPONSE"
    exit 1
  fi
  
  # Get latest timeline entry
  LATEST_MESSAGE=$(echo "$STATUS_RESPONSE" | grep -o '"message":"[^"]*"' | tail -1 | cut -d'"' -f4)
  
  echo -e "${YELLOW}[Check $CHECK_COUNT/$MAX_CHECKS]${NC} State: ${GREEN}$STATE${NC} - $LATEST_MESSAGE"
  
  # Check if completed or failed
  if [ "$STATE" = "COMPLETED" ]; then
    COMPLETED=true
    echo ""
    echo -e "${GREEN}✓ Pipeline completed successfully!${NC}"
  elif [ "$STATE" = "FAILED" ]; then
    echo ""
    echo -e "${RED}✗ Pipeline failed${NC}"
    ERROR=$(echo "$STATUS_RESPONSE" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$ERROR" ]; then
      echo -e "${RED}Error: $ERROR${NC}"
    fi
    exit 1
  fi
done

if [ "$COMPLETED" = false ]; then
  echo ""
  echo -e "${YELLOW}Pipeline is still running after $MAX_CHECKS checks${NC}"
  echo -e "${YELLOW}Check status manually:${NC}"
  echo "  curl $API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \\"
  echo "    -H \"Authorization: Bearer \$JWT_TOKEN\""
  exit 0
fi

# Step 4: Show final results
echo ""
echo -e "${BLUE}Step 4: Final Results${NC}"
echo ""

FINAL_RESPONSE=$(curl -s "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

# Extract agent run IDs and URLs
PM_AGENT_RUN=$(echo "$FINAL_RESPONSE" | grep -o '"pmAgentRunId":"[^"]*"' | head -1 | cut -d'"' -f4)
DEV_AGENT_RUN=$(echo "$FINAL_RESPONSE" | grep -o '"devAgentRunId":"[^"]*"' | head -1 | cut -d'"' -f4)
QA_AGENT_RUN=$(echo "$FINAL_RESPONSE" | grep -o '"qaAgentRunId":"[^"]*"' | head -1 | cut -d'"' -f4)

echo -e "${GREEN}Pipeline Summary:${NC}"
echo "  Run ID:        $RUN_ID"
echo "  Project ID:    $PROJECT_ID"
echo "  Final State:   COMPLETED"
echo ""

echo -e "${GREEN}Agent Runs:${NC}"
if [ -n "$PM_AGENT_RUN" ]; then
  echo "  PM Agent:      $PM_AGENT_RUN"
fi
if [ -n "$DEV_AGENT_RUN" ]; then
  echo "  DEV Agent:     $DEV_AGENT_RUN"
fi
if [ -n "$QA_AGENT_RUN" ]; then
  echo "  QA Agent:      $QA_AGENT_RUN"
fi
echo ""

echo -e "${GREEN}Timeline:${NC}"
echo "$FINAL_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 | while read -r msg; do
  echo "  • $msg"
done
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Pipeline POC test completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Check the GitHub repository for PRs created by the agents"
echo "  2. Review the product specification (docs/PRODUCT_SPEC.md)"
echo "  3. Review the implementation code"
echo "  4. Review the QA report (QA_REPORT.md)"
echo ""

echo -e "${YELLOW}To view all runs for this project:${NC}"
echo "  curl $API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs \\"
echo "    -H \"Authorization: Bearer \$JWT_TOKEN\""
echo ""
