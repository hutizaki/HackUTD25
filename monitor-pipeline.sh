#!/bin/bash

# Monitor Pipeline Script
# Watches logs and API in real-time

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8080}"
JWT_TOKEN=""
PROJECT_ID=""
RUN_ID=""

echo -e "${BLUE}=== Pipeline Monitor ===${NC}\n"

# Function to get JWT token
get_token() {
    echo -e "${YELLOW}Getting JWT token...${NC}"
    
    # Try to login
    RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"Test123!@#"}' 2>&1)
    
    JWT_TOKEN=$(echo "$RESPONSE" | jq -r '.data.token // empty' 2>/dev/null)
    
    if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "null" ]; then
        echo -e "${YELLOW}No existing user, creating one...${NC}"
        
        # Register new user
        REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d '{
                "email":"test@example.com",
                "password":"Test123!@#",
                "username":"testuser"
            }')
        
        JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token // empty')
    fi
    
    if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "null" ]; then
        echo -e "${RED}Failed to get JWT token${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Got JWT token${NC}"
}

# Function to get or create project
get_project() {
    echo -e "${YELLOW}Getting project...${NC}"
    
    # List projects
    PROJECTS=$(curl -s "$API_URL/api/projects" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    PROJECT_ID=$(echo "$PROJECTS" | jq -r '.data[0]._id // empty' 2>/dev/null)
    
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
        echo -e "${YELLOW}Creating new project...${NC}"
        
        CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/projects" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name":"Test Pipeline Project",
                "description":"Testing PM->DEV->QA pipeline"
            }')
        
        PROJECT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data._id // empty')
    fi
    
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
        echo -e "${RED}Failed to get project ID${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Project ID: $PROJECT_ID${NC}"
}

# Function to start pipeline
start_pipeline() {
    echo -e "\n${BLUE}=== Starting Pipeline ===${NC}\n"
    
    FEATURE_REQUEST="Create a simple health check endpoint at /api/health that returns:
- Status: 'ok'
- Timestamp: current time
- Version: '1.0.0'

This should be a simple Express endpoint with a test."
    
    echo -e "${YELLOW}Feature Request:${NC}"
    echo "$FEATURE_REQUEST"
    echo ""
    
    RESPONSE=$(curl -s -X POST "$API_URL/api/projects/$PROJECT_ID/pipeline/simple" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"prompt\": \"$FEATURE_REQUEST\",
            \"repository\": \"https://github.com/test/test-repo\",
            \"ref\": \"main\"
        }")
    
    RUN_ID=$(echo "$RESPONSE" | jq -r '.data.runId // empty')
    
    if [ -z "$RUN_ID" ] || [ "$RUN_ID" == "null" ]; then
        echo -e "${RED}Failed to start pipeline${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Pipeline started!${NC}"
    echo -e "${GREEN}  Run ID: $RUN_ID${NC}\n"
}

# Function to get pipeline status
get_status() {
    curl -s "$API_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
        -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.data.state // "UNKNOWN"'
}

# Function to get timeline
get_timeline() {
    curl -s "$API_URL/api/projects/$PROJECT_ID/pipeline/runs/$RUN_ID" \
        -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.data.timeline // []'
}

# Function to get tickets
get_tickets() {
    curl -s "$API_URL/api/projects/$PROJECT_ID/tickets?runId=$RUN_ID" \
        -H "Authorization: Bearer $JWT_TOKEN" 2>/dev/null
}

# Function to display status
display_status() {
    local STATE=$(get_status)
    local TIMESTAMP=$(date '+%H:%M:%S')
    
    case $STATE in
        "CREATED")
            echo -e "${TIMESTAMP} ${BLUE}[CREATED]${NC} Pipeline initialized"
            ;;
        "PM_RUNNING")
            echo -e "${TIMESTAMP} ${YELLOW}[PM_RUNNING]${NC} PM Agent analyzing feature request..."
            ;;
        "PM_COMPLETED")
            echo -e "${TIMESTAMP} ${GREEN}[PM_COMPLETED]${NC} PM Agent finished! Tickets created."
            
            # Show tickets
            TICKETS=$(get_tickets)
            TICKET_COUNT=$(echo "$TICKETS" | jq -r '.data | length' 2>/dev/null)
            if [ ! -z "$TICKET_COUNT" ] && [ "$TICKET_COUNT" != "null" ] && [ "$TICKET_COUNT" -gt 0 ]; then
                echo -e "${GREEN}  ✓ Created $TICKET_COUNT tickets${NC}"
                echo "$TICKETS" | jq -r '.data[] | "    - Ticket #\(.ticketNumber): \(.title) [\(.status)]"' 2>/dev/null
            fi
            ;;
        "DEV_RUNNING")
            echo -e "${TIMESTAMP} ${YELLOW}[DEV_RUNNING]${NC} DEV Agent implementing tickets..."
            
            # Show ticket progress
            TICKETS=$(get_tickets)
            echo "$TICKETS" | jq -r '.data[] | "    - Ticket #\(.ticketNumber): \(.status)"' 2>/dev/null | head -5
            ;;
        "DEV_COMPLETED")
            echo -e "${TIMESTAMP} ${GREEN}[DEV_COMPLETED]${NC} DEV Agent finished! Code implemented."
            ;;
        "QA_RUNNING")
            echo -e "${TIMESTAMP} ${YELLOW}[QA_RUNNING]${NC} QA Agent testing implementation..."
            ;;
        "QA_COMPLETED")
            echo -e "${TIMESTAMP} ${GREEN}[QA_COMPLETED]${NC} QA Agent finished! Tests complete."
            ;;
        "COMPLETED")
            echo -e "${TIMESTAMP} ${GREEN}[COMPLETED]${NC} Pipeline finished successfully! 🎉"
            return 0
            ;;
        "FAILED")
            echo -e "${TIMESTAMP} ${RED}[FAILED]${NC} Pipeline failed ❌"
            return 1
            ;;
        *)
            echo -e "${TIMESTAMP} ${BLUE}[$STATE]${NC} Status: $STATE"
            ;;
    esac
    
    return 2  # Continue monitoring
}

# Function to tail log file
tail_logs() {
    local LOG_FILE="/workspace/logs/${RUN_ID}.log"
    
    if [ -f "$LOG_FILE" ]; then
        echo -e "\n${BLUE}=== Recent Log Entries ===${NC}"
        tail -n 5 "$LOG_FILE" | while IFS= read -r line; do
            if [[ $line == *"ERROR"* ]] || [[ $line == *"FAILED"* ]]; then
                echo -e "${RED}$line${NC}"
            elif [[ $line == *"SUCCESS"* ]] || [[ $line == *"COMPLETED"* ]]; then
                echo -e "${GREEN}$line${NC}"
            else
                echo -e "${BLUE}$line${NC}"
            fi
        done
        echo ""
    fi
}

# Function to monitor pipeline
monitor_pipeline() {
    echo -e "${BLUE}=== Monitoring Pipeline ===${NC}\n"
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    local LAST_STATE=""
    local CHECK_COUNT=0
    local MAX_CHECKS=120  # 20 minutes (10 sec intervals)
    
    while [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
        local CURRENT_STATE=$(get_status)
        
        # Only display if state changed
        if [ "$CURRENT_STATE" != "$LAST_STATE" ]; then
            display_status
            local RESULT=$?
            
            if [ $RESULT -eq 0 ]; then
                # Completed successfully
                echo -e "\n${GREEN}=== Pipeline Completed Successfully! ===${NC}\n"
                show_final_results
                return 0
            elif [ $RESULT -eq 1 ]; then
                # Failed
                echo -e "\n${RED}=== Pipeline Failed ===${NC}\n"
                tail_logs
                return 1
            fi
            
            LAST_STATE="$CURRENT_STATE"
        fi
        
        # Show progress indicator
        echo -n "."
        
        CHECK_COUNT=$((CHECK_COUNT + 1))
        sleep 10
    done
    
    echo -e "\n${YELLOW}Monitoring timeout reached${NC}"
}

# Function to show final results
show_final_results() {
    echo -e "${BLUE}=== Final Results ===${NC}\n"
    
    # Show tickets
    echo -e "${YELLOW}Tickets Created:${NC}"
    TICKETS=$(get_tickets)
    echo "$TICKETS" | jq -r '.data[] | "\n  Ticket #\(.ticketNumber): \(.title)\n  Status: \(.status)\n  Type: \(.type)\n  Priority: \(.priority)\n  Branch: \(.branchName // "N/A")\n  Acceptance Criteria: \(.acceptanceCriteria | length) items\n  Comments: \(.comments | length) comments"' 2>/dev/null
    
    echo -e "\n${YELLOW}Timeline:${NC}"
    get_timeline | jq -r '.[] | "  [\(.phase)] \(.message)"' 2>/dev/null
    
    echo -e "\n${YELLOW}Log File:${NC}"
    echo "  /workspace/logs/${RUN_ID}.log"
    
    echo -e "\n${GREEN}✓ Test completed successfully!${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting pipeline test...${NC}\n"
    
    # Check if API is running
    if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
        echo -e "${RED}API is not running at $API_URL${NC}"
        echo "Please start the API first: cd /workspace/api && npm run dev"
        exit 1
    fi
    
    echo -e "${GREEN}✓ API is running${NC}\n"
    
    # Setup
    get_token
    get_project
    
    # Start pipeline
    start_pipeline
    
    # Monitor
    monitor_pipeline
    
    echo -e "\n${BLUE}=== Monitor Complete ===${NC}\n"
}

# Run main
main
