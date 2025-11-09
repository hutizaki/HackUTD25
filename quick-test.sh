#!/bin/bash

# Quick Test Script - Tests the Pipeline POC in one command
# This script handles everything: setup, execution, and monitoring

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Pipeline POC - Quick Test Script                  ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
REPOSITORY="${REPOSITORY:-}"

# Check prerequisites
echo -e "${CYAN}Checking prerequisites...${NC}"

# Check if backend is running
if ! curl -s "$API_BASE_URL/healthz" > /dev/null 2>&1; then
  echo -e "${RED}✗ Backend is not running at $API_BASE_URL${NC}"
  echo ""
  echo "Please start the backend first:"
  echo "  cd api && npm run dev"
  echo ""
  exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"

# Check if repository is set
if [ -z "$REPOSITORY" ]; then
  echo -e "${YELLOW}⚠ REPOSITORY not set${NC}"
  echo ""
  echo "Please set your GitHub repository:"
  echo "  export REPOSITORY=https://github.com/your-org/your-repo"
  echo ""
  read -p "Enter repository URL now: " REPOSITORY
  
  if [ -z "$REPOSITORY" ]; then
    echo -e "${RED}✗ Repository is required${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ Repository: $REPOSITORY${NC}"

# Check if JWT token exists
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${YELLOW}⚠ JWT_TOKEN not set${NC}"
  echo ""
  echo "Do you have an account?"
  read -p "Enter 'y' if yes, 'n' to create one: " has_account
  
  if [ "$has_account" = "n" ]; then
    echo ""
    echo -e "${CYAN}Creating new account...${NC}"
    
    # Generate random email and password
    RANDOM_EMAIL="test-$(date +%s)@example.com"
    RANDOM_PASSWORD="Test123!@#$(date +%s)"
    
    REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$RANDOM_EMAIL\",
        \"password\": \"$RANDOM_PASSWORD\",
        \"name\": \"Test User\"
      }")
    
    JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$JWT_TOKEN" ]; then
      echo -e "${RED}✗ Failed to create account${NC}"
      echo "Response: $REGISTER_RESPONSE"
      exit 1
    fi
    
    echo -e "${GREEN}✓ Account created${NC}"
    echo "  Email: $RANDOM_EMAIL"
    echo "  Password: $RANDOM_PASSWORD"
    echo "  Token: ${JWT_TOKEN:0:20}..."
    
  else
    echo ""
    echo "Please login to get a JWT token:"
    echo ""
    read -p "Email: " EMAIL
    read -sp "Password: " PASSWORD
    echo ""
    
    LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$EMAIL\",
        \"password\": \"$PASSWORD\"
      }")
    
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$JWT_TOKEN" ]; then
      echo -e "${RED}✗ Login failed${NC}"
      echo "Response: $LOGIN_RESPONSE"
      exit 1
    fi
    
    echo -e "${GREEN}✓ Logged in successfully${NC}"
  fi
fi
echo -e "${GREEN}✓ JWT Token: ${JWT_TOKEN:0:20}...${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Create project
echo -e "${CYAN}Step 1: Creating test project...${NC}"
PROJECT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Pipeline Quick Test",
    "description": "Automated test of the pipeline POC"
  }')

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}✗ Failed to create project${NC}"
  echo "Response: $PROJECT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Project created: $PROJECT_ID${NC}"
echo ""

# Execute pipeline
echo -e "${CYAN}Step 2: Executing pipeline...${NC}"
PIPELINE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"prompt\": \"Create a simple health check endpoint at /api/health that returns the server status, uptime in seconds, and current timestamp. Include unit tests with at least 80% coverage.\",
    \"repository\": \"$REPOSITORY\",
    \"ref\": \"main\"
  }")

RUN_ID=$(echo "$PIPELINE_RESPONSE" | grep -o '"runId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo -e "${RED}✗ Failed to start pipeline${NC}"
  echo "Response: $PIPELINE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Pipeline started: $RUN_ID${NC}"
echo ""

# Monitor progress
echo -e "${CYAN}Step 3: Monitoring pipeline progress...${NC}"
echo -e "${YELLOW}This will take 7-11 minutes. Checking every 5 seconds...${NC}"
echo ""

COMPLETED=false
MAX_CHECKS=150  # 12.5 minutes
CHECK_COUNT=0
LAST_STATE=""

while [ "$COMPLETED" = false ] && [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
  sleep 5
  CHECK_COUNT=$((CHECK_COUNT + 1))
  
  STATUS_RESPONSE=$(curl -s "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  STATE=$(echo "$STATUS_RESPONSE" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$STATE" ]; then
    echo -e "${RED}✗ Failed to get pipeline status${NC}"
    exit 1
  fi
  
  # Only show update if state changed
  if [ "$STATE" != "$LAST_STATE" ]; then
    TIMESTAMP=$(date '+%H:%M:%S')
    
    case "$STATE" in
      "CREATED")
        echo -e "${BLUE}[$TIMESTAMP]${NC} Pipeline initialized"
        ;;
      "PM_RUNNING")
        echo -e "${CYAN}[$TIMESTAMP]${NC} 📝 PM Agent is creating product specification..."
        ;;
      "PM_COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} ✓ PM Agent completed - Spec created"
        ;;
      "DEV_RUNNING")
        echo -e "${CYAN}[$TIMESTAMP]${NC} 💻 DEV Agent is implementing the feature..."
        ;;
      "DEV_COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} ✓ DEV Agent completed - Code + tests created"
        ;;
      "QA_RUNNING")
        echo -e "${CYAN}[$TIMESTAMP]${NC} 🔍 QA Agent is reviewing the implementation..."
        ;;
      "QA_COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} ✓ QA Agent completed - Review finished"
        ;;
      "COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} 🎉 Pipeline completed successfully!"
        COMPLETED=true
        ;;
      "FAILED")
        echo -e "${RED}[$TIMESTAMP]${NC} ✗ Pipeline failed"
        ERROR=$(echo "$STATUS_RESPONSE" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -n "$ERROR" ]; then
          echo -e "${RED}Error: $ERROR${NC}"
        fi
        exit 1
        ;;
    esac
    
    LAST_STATE="$STATE"
  fi
done

if [ "$COMPLETED" = false ]; then
  echo ""
  echo -e "${YELLOW}Pipeline is still running after $CHECK_COUNT checks${NC}"
  echo -e "${YELLOW}Check status manually:${NC}"
  echo "  curl $API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID \\"
  echo "    -H \"Authorization: Bearer \$JWT_TOKEN\""
  exit 0
fi

# Show results
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Pipeline Test Completed Successfully!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Get final status
FINAL_RESPONSE=$(curl -s "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${CYAN}Results:${NC}"
echo "  Run ID:     $RUN_ID"
echo "  Project ID: $PROJECT_ID"
echo "  Repository: $REPOSITORY"
echo ""

# Extract agent run info
PM_AGENT=$(echo "$FINAL_RESPONSE" | grep -o '"pmAgentRunId":"[^"]*"' | cut -d'"' -f4)
DEV_AGENT=$(echo "$FINAL_RESPONSE" | grep -o '"devAgentRunId":"[^"]*"' | cut -d'"' -f4)
QA_AGENT=$(echo "$FINAL_RESPONSE" | grep -o '"qaAgentRunId":"[^"]*"' | cut -d'"' -f4)

echo -e "${CYAN}Agent Runs:${NC}"
[ -n "$PM_AGENT" ] && echo "  PM Agent:  $PM_AGENT"
[ -n "$DEV_AGENT" ] && echo "  DEV Agent: $DEV_AGENT"
[ -n "$QA_AGENT" ] && echo "  QA Agent:  $QA_AGENT"
echo ""

echo -e "${CYAN}What to check:${NC}"
echo "  1. Go to $REPOSITORY"
echo "  2. Look for 2 new Pull Requests:"
echo "     • docs/pm-spec-* (Product Specification)"
echo "     • feature/dev-impl-* (Implementation + Tests)"
echo "  3. Review the QA report in branch qa/review-*"
echo ""

echo -e "${CYAN}Timeline Summary:${NC}"
echo "$FINAL_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 | while read -r msg; do
  echo "  • $msg"
done
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Test completed! The pipeline is working correctly. 🚀${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
