#!/bin/bash

# Test Simplified Pipeline
# PM creates tickets → Wait → DEV implements → QA reviews
# All logged to /workspace/logs/

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Simplified Pipeline Test - With Logs & Tickets        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
REPOSITORY="${REPOSITORY:-}"

# Check backend
if ! curl -s "$API_BASE_URL/healthz" > /dev/null 2>&1; then
  echo -e "${RED}✗ Backend not running at $API_BASE_URL${NC}"
  echo "Start it with: cd api && npm run dev"
  exit 1
fi
echo -e "${GREEN}✓ Backend running${NC}"

# Check repository
if [ -z "$REPOSITORY" ]; then
  echo -e "${YELLOW}⚠ REPOSITORY not set${NC}"
  read -p "Enter repository URL: " REPOSITORY
  if [ -z "$REPOSITORY" ]; then
    echo -e "${RED}✗ Repository required${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ Repository: $REPOSITORY${NC}"

# Check/create JWT token
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${YELLOW}⚠ No JWT_TOKEN - creating account${NC}"
  
  EMAIL="test-$(date +%s)@example.com"
  PASSWORD="Test123!@#$(date +%s)"
  
  REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"name\": \"Test User\"}")
  
  JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}✗ Failed to create account${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Account created${NC}"
fi
echo -e "${GREEN}✓ JWT Token ready${NC}"
echo ""

# Create project
echo -e "${CYAN}Creating project...${NC}"
PROJECT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"name": "Simplified Pipeline Test", "description": "Testing PM → DEV → QA with logs"}')

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}✗ Failed to create project${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Project: $PROJECT_ID${NC}"
echo ""

# Execute simplified pipeline
echo -e "${CYAN}Executing simplified pipeline...${NC}"
echo ""

PIPELINE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/simple" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"prompt\": \"Create a user profile management system with the following features: 1) View user profile with avatar, name, email, bio. 2) Edit profile information. 3) Upload profile picture. 4) Change password. Include proper validation and error handling.\",
    \"repository\": \"$REPOSITORY\",
    \"ref\": \"main\"
  }")

RUN_ID=$(echo "$PIPELINE_RESPONSE" | grep -o '"runId":"[^"]*"' | head -1 | cut -d'"' -f4)
LOG_FILE=$(echo "$PIPELINE_RESPONSE" | grep -o '"logFile":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo -e "${RED}✗ Failed to start pipeline${NC}"
  echo "$PIPELINE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Pipeline started${NC}"
echo -e "${CYAN}Run ID: $RUN_ID${NC}"
echo -e "${CYAN}Log File: $LOG_FILE${NC}"
echo ""

# Monitor with logs
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Monitoring pipeline (check every 10s)...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

COMPLETED=false
MAX_CHECKS=120  # 20 minutes
CHECK_COUNT=0
LAST_STATE=""

while [ "$COMPLETED" = false ] && [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
  sleep 10
  CHECK_COUNT=$((CHECK_COUNT + 1))
  
  # Get status
  STATUS_RESPONSE=$(curl -s "$API_BASE_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  STATE=$(echo "$STATUS_RESPONSE" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$STATE" ]; then
    echo -e "${RED}✗ Failed to get status${NC}"
    exit 1
  fi
  
  # Show update if state changed
  if [ "$STATE" != "$LAST_STATE" ]; then
    TIMESTAMP=$(date '+%H:%M:%S')
    
    case "$STATE" in
      "CREATED")
        echo -e "${BLUE}[$TIMESTAMP]${NC} 🚀 Pipeline initialized"
        ;;
      "PM_RUNNING")
        echo -e "${CYAN}[$TIMESTAMP]${NC} 📝 PM Agent: Reading onboarding & creating work tickets..."
        echo -e "${YELLOW}         → Will create GitHub Issues for each feature${NC}"
        ;;
      "PM_COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} ✓ PM Agent done - Tickets created!"
        echo -e "${YELLOW}         → Intermediate check: Verifying PM work...${NC}"
        ;;
      "DEV_RUNNING")
        echo -e "${CYAN}[$TIMESTAMP]${NC} 💻 DEV Agent: Reading tickets & implementing features..."
        echo -e "${YELLOW}         → Will comment on issues as work progresses${NC}"
        ;;
      "DEV_COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} ✓ DEV Agent done - Features implemented!"
        ;;
      "QA_RUNNING")
        echo -e "${CYAN}[$TIMESTAMP]${NC} 🔍 QA Agent: Reviewing code & testing..."
        echo -e "${YELLOW}         → Will verify each ticket and add QA comments${NC}"
        ;;
      "QA_COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} ✓ QA Agent done - Review complete!"
        ;;
      "COMPLETED")
        echo -e "${GREEN}[$TIMESTAMP]${NC} 🎉 Pipeline completed successfully!"
        COMPLETED=true
        ;;
      "FAILED")
        echo -e "${RED}[$TIMESTAMP]${NC} ✗ Pipeline failed"
        COMPLETED=true
        ;;
    esac
    
    LAST_STATE="$STATE"
  fi
  
  # Show progress indicator
  if [ "$COMPLETED" = false ]; then
    echo -ne "\r${YELLOW}Checking... ($CHECK_COUNT checks)${NC}"
  fi
done

echo ""
echo ""

if [ "$STATE" = "FAILED" ]; then
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}Pipeline Failed${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  exit 1
fi

# Show results
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Pipeline Completed Successfully!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}What was created:${NC}"
echo ""
echo -e "${YELLOW}1. PM Agent:${NC}"
echo "   • Created GitHub Issues (work tickets)"
echo "   • Added labels and priorities"
echo "   • Created docs/PM-TICKETS-SUMMARY.md"
echo "   • Branch: pm/tickets-*"
echo ""
echo -e "${YELLOW}2. DEV Agent:${NC}"
echo "   • Implemented all tickets"
echo "   • Added comments to issues"
echo "   • Created IMPLEMENTATION-NOTES.md"
echo "   • Wrote unit tests"
echo "   • Branch: dev/implementation-*"
echo ""
echo -e "${YELLOW}3. QA Agent:${NC}"
echo "   • Reviewed all code"
echo "   • Verified each ticket"
echo "   • Created QA-REPORT.md"
echo "   • Added QA comments to issues"
echo "   • Branch: qa/review-*"
echo ""

echo -e "${CYAN}Check your GitHub repository:${NC}"
echo "  Repository: $REPOSITORY"
echo "  Look for:"
echo "    • New GitHub Issues (labeled 'feature')"
echo "    • PR from PM agent (tickets summary)"
echo "    • PR from DEV agent (implementation)"
echo "    • Branch from QA agent (review report)"
echo ""

echo -e "${CYAN}View detailed logs:${NC}"
echo "  Log file: $LOG_FILE"
echo ""
echo "  Or via API:"
echo "  curl http://localhost:8080/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID/logs \\"
echo "    -H \"Authorization: Bearer \$JWT_TOKEN\""
echo ""

# Try to show last 20 lines of log
if [ -f "$LOG_FILE" ]; then
  echo -e "${CYAN}Last 20 log entries:${NC}"
  echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
  tail -20 "$LOG_FILE"
  echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Test Complete! Check GitHub for tickets and PRs 🚀${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
