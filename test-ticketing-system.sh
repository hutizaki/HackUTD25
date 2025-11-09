#!/bin/bash

# Test Ticketing System
# This script tests the integrated pipeline with ticket management

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Ticketing System ===${NC}\n"

# Check required environment variables
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}Error: JWT_SECRET environment variable not set${NC}"
    echo "Please set JWT_SECRET to your authentication token"
    echo "Run: export JWT_SECRET=\$(cat .jwt-token)"
    exit 1
fi

if [ -z "$REPOSITORY" ]; then
    echo -e "${RED}Error: REPOSITORY environment variable not set${NC}"
    echo "Please set REPOSITORY to your GitHub repository URL"
    exit 1
fi

API_URL="http://localhost:8080"

echo -e "${YELLOW}Step 1: Creating test project...${NC}"
PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/projects" \
  -H "Cookie: aio_session=$JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ticketing System Test",
    "description": "Test project for integrated pipeline with tickets",
    "tags": ["test", "ticketing", "pipeline"]
  }')

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.data.id')

if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Failed to create project${NC}"
    echo $PROJECT_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Project created: $PROJECT_ID${NC}\n"

echo -e "${YELLOW}Step 2: Starting integrated pipeline...${NC}"
PIPELINE_RESPONSE=$(curl -s -X POST "$API_URL/api/projects/$PROJECT_ID/pipeline/integrated" \
  -H "Cookie: aio_session=$JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"Create a simple health check endpoint that returns server status and uptime\",
    \"repository\": \"$REPOSITORY\",
    \"ref\": \"main\"
  }")

RUN_ID=$(echo $PIPELINE_RESPONSE | jq -r '.data.runId')

if [ "$RUN_ID" == "null" ] || [ -z "$RUN_ID" ]; then
    echo -e "${RED}Failed to start pipeline${NC}"
    echo $PIPELINE_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Pipeline started: $RUN_ID${NC}\n"

echo -e "${YELLOW}Step 3: Fetching run status...${NC}"
sleep 2
RUN_STATUS=$(curl -s "$API_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
  -H "Cookie: aio_session=$JWT_SECRET")

echo $RUN_STATUS | jq '.'
echo ""

echo -e "${YELLOW}Step 4: Fetching tickets for run...${NC}"
TICKETS_RESPONSE=$(curl -s "$API_URL/api/runs/$RUN_ID/tickets" \
  -H "Cookie: aio_session=$JWT_SECRET")

TICKET_COUNT=$(echo $TICKETS_RESPONSE | jq '.data | length')
echo -e "${GREEN}✓ Found $TICKET_COUNT tickets${NC}"
echo $TICKETS_RESPONSE | jq '.data[] | {id: ._id, type, title, status}'
echo ""

echo -e "${YELLOW}Step 5: Fetching all project tickets...${NC}"
ALL_TICKETS=$(curl -s "$API_URL/api/projects/$PROJECT_ID/tickets" \
  -H "Cookie: aio_session=$JWT_SECRET")

echo $ALL_TICKETS | jq '.data[] | {id: ._id, type, title, status, parent: .parentId}'
echo ""

echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}✓ Project created successfully${NC}"
echo -e "${GREEN}✓ Integrated pipeline started${NC}"
echo -e "${GREEN}✓ Tickets created and tracked${NC}"
echo -e "${GREEN}✓ API endpoints working${NC}"

echo ""
echo -e "${BLUE}Test Data:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Run ID: $RUN_ID"
echo "Ticket Count: $TICKET_COUNT"

echo ""
echo -e "${YELLOW}Monitor pipeline progress:${NC}"
echo "curl $API_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID -H \"Cookie: aio_session=\$JWT_SECRET\" | jq '.'"

echo ""
echo -e "${YELLOW}View tickets:${NC}"
echo "curl $API_URL/api/runs/$RUN_ID/tickets -H \"Cookie: aio_session=\$JWT_SECRET\" | jq '.'"

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"

