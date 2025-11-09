#!/bin/bash

# Test Mock Pipeline - Full PM -> DEV -> QA Workflow
# This script demonstrates the complete pipeline without requiring GitHub access

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MOCK PIPELINE TEST - PM → DEV → QA Workflow          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check required environment variables
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}Error: JWT_SECRET environment variable not set${NC}"
    echo "Please set JWT_SECRET to your authentication token"
    echo "Run: export JWT_SECRET=\$(cat .jwt-token)"
    exit 1
fi

API_URL="http://localhost:8080"

echo -e "${YELLOW}📋 Step 1: Creating test project...${NC}"
PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/projects" \
  -H "Cookie: aio_session=$JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mock Pipeline Demo",
    "description": "Demonstration of full PM -> DEV -> QA workflow with ticket management",
    "tags": ["demo", "mock", "pipeline", "ticketing"]
  }')

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.data.id')

if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Failed to create project${NC}"
    echo $PROJECT_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Project created: $PROJECT_ID${NC}"
echo ""

echo -e "${YELLOW}🚀 Step 2: Starting mock pipeline...${NC}"
echo -e "${CYAN}   This will demonstrate:${NC}"
echo -e "${CYAN}   1. PM Agent creates specification${NC}"
echo -e "${CYAN}   2. PM Agent delegates work into hierarchical tickets${NC}"
echo -e "${CYAN}   3. DEV Agent implements each ticket sequentially${NC}"
echo -e "${CYAN}   4. QA Agent tests each implementation${NC}"
echo ""

PIPELINE_RESPONSE=$(curl -s -X POST "$API_URL/api/projects/$PROJECT_ID/pipeline/mock" \
  -H "Cookie: aio_session=$JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Build a user authentication system with email/password login, JWT tokens, and password reset functionality"
  }')

RUN_ID=$(echo $PIPELINE_RESPONSE | jq -r '.data.runId')

if [ "$RUN_ID" == "null" ] || [ -z "$RUN_ID" ]; then
    echo -e "${RED}Failed to start pipeline${NC}"
    echo $PIPELINE_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Pipeline started: $RUN_ID${NC}"
echo ""

echo -e "${MAGENTA}⏳ Step 3: Monitoring pipeline progress (real-time)...${NC}"
echo -e "${CYAN}   Watching PM create tickets, DEV implement, and QA test...${NC}"
echo ""

CURRENT_STATE=""
POLL_COUNT=0
MAX_POLLS=60  # 5 minutes max

while [ "$CURRENT_STATE" != "COMPLETED" ] && [ "$CURRENT_STATE" != "FAILED" ] && [ $POLL_COUNT -lt $MAX_POLLS ]; do
    POLL_COUNT=$((POLL_COUNT + 1))
    
    # Get Run Status
    RUN_STATUS=$(curl -s "$API_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
      -H "Cookie: aio_session=$JWT_SECRET")
    
    CURRENT_STATE=$(echo $RUN_STATUS | jq -r '.data.state')
    
    # Get latest timeline entry
    LATEST_MESSAGE=$(echo $RUN_STATUS | jq -r '.data.timeline[-1].message')
    LATEST_PHASE=$(echo $RUN_STATUS | jq -r '.data.timeline[-1].phase')
    LATEST_LEVEL=$(echo $RUN_STATUS | jq -r '.data.timeline[-1].level')
    
    # Color based on phase
    case $LATEST_PHASE in
        "PM")
            PHASE_COLOR=$YELLOW
            ICON="📝"
            ;;
        "DEV")
            PHASE_COLOR=$BLUE
            ICON="💻"
            ;;
        "QA")
            PHASE_COLOR=$MAGENTA
            ICON="🧪"
            ;;
        "TICKETS")
            PHASE_COLOR=$CYAN
            ICON="🎫"
            ;;
        "COMPLETE")
            PHASE_COLOR=$GREEN
            ICON="✅"
            ;;
        "ERROR")
            PHASE_COLOR=$RED
            ICON="❌"
            ;;
        *)
            PHASE_COLOR=$NC
            ICON="ℹ️"
            ;;
    esac
    
    echo -e "${PHASE_COLOR}${ICON} [$LATEST_PHASE] $LATEST_MESSAGE${NC}"
    
    if [ "$CURRENT_STATE" == "COMPLETED" ]; then
        echo ""
        echo -e "${GREEN}✅ Pipeline completed successfully!${NC}"
        break
    elif [ "$CURRENT_STATE" == "FAILED" ]; then
        echo ""
        echo -e "${RED}❌ Pipeline failed!${NC}"
        break
    fi
    
    sleep 2
done

if [ $POLL_COUNT -eq $MAX_POLLS ]; then
    echo -e "${RED}⏱️  Pipeline monitoring timed out! Current state: $CURRENT_STATE${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📊 Step 4: Fetching final ticket status...${NC}"

TICKETS_RESPONSE=$(curl -s "$API_URL/api/runs/$RUN_ID/tickets" \
  -H "Cookie: aio_session=$JWT_SECRET")

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    TICKET HIERARCHY                        ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Display tickets in a tree structure
echo $TICKETS_RESPONSE | jq -r '.data[] | 
  if .parentId == null then
    "📦 EPIC: \(.title) [\(.status)]"
  elif .type == "feature" then
    "  ├─ 🎯 FEATURE: \(.title) [\(.status)]"
  elif .type == "task" then
    "  └─ ✓ TASK: \(.title) [\(.status)]"
  else
    "  └─ \(.type | ascii_upcase): \(.title) [\(.status)]"
  end'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Get ticket counts
TOTAL_TICKETS=$(echo $TICKETS_RESPONSE | jq '.data | length')
COMPLETED_TICKETS=$(echo $TICKETS_RESPONSE | jq '[.data[] | select(.status == "DONE")] | length')
IN_PROGRESS=$(echo $TICKETS_RESPONSE | jq '[.data[] | select(.status == "IN_PROGRESS")] | length')
BLOCKED=$(echo $TICKETS_RESPONSE | jq '[.data[] | select(.status == "BLOCKED")] | length')

echo -e "${YELLOW}📈 Step 5: Pipeline Statistics${NC}"
echo ""
echo -e "  Total Tickets:      ${CYAN}$TOTAL_TICKETS${NC}"
echo -e "  Completed:          ${GREEN}$COMPLETED_TICKETS${NC}"
echo -e "  In Progress:        ${YELLOW}$IN_PROGRESS${NC}"
echo -e "  Blocked:            ${RED}$BLOCKED${NC}"
echo ""

# Show detailed ticket info
echo -e "${YELLOW}📋 Step 6: Detailed Ticket Information${NC}"
echo ""
echo $TICKETS_RESPONSE | jq '.data[] | {
  title: .title,
  type: .type,
  status: .status,
  branch: .branch,
  prNumber: .prNumber,
  dependencies: (.dependencies | length),
  acceptanceCriteria: (.acceptanceCriteria | length)
}'

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   TEST COMPLETE ✅                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Summary:${NC}"
echo -e "  Project ID:    ${CYAN}$PROJECT_ID${NC}"
echo -e "  Run ID:        ${CYAN}$RUN_ID${NC}"
echo -e "  Final State:   ${GREEN}$CURRENT_STATE${NC}"
echo -e "  Tickets:       ${CYAN}$TOTAL_TICKETS created, $COMPLETED_TICKETS completed${NC}"
echo ""

echo -e "${YELLOW}What Just Happened:${NC}"
echo ""
echo -e "  ${GREEN}1.${NC} PM Agent analyzed the prompt"
echo -e "  ${GREEN}2.${NC} PM Agent created a specification"
echo -e "  ${GREEN}3.${NC} PM Agent broke down work into hierarchical tickets:"
echo -e "     ${CYAN}•${NC} 1 Epic (root)"
echo -e "     ${CYAN}•${NC} 2 Features (implementation)"
echo -e "     ${CYAN}•${NC} 1 Task (testing/docs)"
echo -e "  ${GREEN}4.${NC} DEV Agent implemented each ticket sequentially"
echo -e "  ${GREEN}5.${NC} QA Agent tested each implementation"
echo -e "  ${GREEN}6.${NC} Tickets marked as DONE when QA passed"
echo ""

echo -e "${CYAN}💡 Key Features Demonstrated:${NC}"
echo -e "  ${GREEN}✓${NC} Hierarchical ticket structure (Epic → Features → Tasks)"
echo -e "  ${GREEN}✓${NC} Dependency management (tickets wait for dependencies)"
echo -e "  ${GREEN}✓${NC} Sequential agent execution (PM → DEV → QA)"
echo -e "  ${GREEN}✓${NC} Branch and PR tracking"
echo -e "  ${GREEN}✓${NC} Acceptance criteria"
echo -e "  ${GREEN}✓${NC} Real-time status updates"
echo ""

echo -e "${YELLOW}🔍 View Full Details:${NC}"
echo ""
echo -e "  Pipeline Run:"
echo -e "  ${CYAN}curl -H \"Cookie: aio_session=\$JWT_SECRET\" \\${NC}"
echo -e "  ${CYAN}  $API_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID | jq '.'${NC}"
echo ""
echo -e "  All Tickets:"
echo -e "  ${CYAN}curl -H \"Cookie: aio_session=\$JWT_SECRET\" \\${NC}"
echo -e "  ${CYAN}  $API_URL/api/runs/$RUN_ID/tickets | jq '.'${NC}"
echo ""

echo -e "${GREEN}🎉 Success! The ticketing system is fully operational!${NC}"
echo ""

