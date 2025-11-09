#!/bin/bash

# Get JWT Token Script
# This script helps you get a JWT token for API testing

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:8080"

echo -e "${BLUE}=== JWT Token Generator ===${NC}\n"

# Check if API is running
if ! curl -s "$API_URL/healthz" > /dev/null 2>&1; then
    echo -e "${RED}Error: API server is not running at $API_URL${NC}"
    echo "Please start the API server first:"
    echo "  cd api && npm run dev"
    exit 1
fi

echo -e "${GREEN}✓ API server is running${NC}\n"

# Prompt for credentials
echo -e "${YELLOW}Choose an option:${NC}"
echo "1. Login with existing account"
echo "2. Register new account"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "2" ]; then
    echo -e "\n${YELLOW}Register New Account${NC}"
    read -p "Email: " email
    read -p "Name: " name
    read -sp "Password (min 8 chars, must include uppercase, lowercase, number, special char): " password
    echo ""
    
    echo -e "\n${BLUE}Registering user...${NC}"
    REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\",
        \"name\": \"$name\"
      }")
    
    if echo "$REGISTER_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}Registration failed:${NC}"
        echo "$REGISTER_RESPONSE" | jq -r '.error'
        exit 1
    fi
    
    echo -e "${GREEN}✓ Registration successful${NC}\n"
    
    # Now login
    echo -e "${BLUE}Logging in...${NC}"
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\"
      }")
else
    echo -e "\n${YELLOW}Login${NC}"
    read -p "Email: " email
    read -sp "Password: " password
    echo ""
    
    echo -e "\n${BLUE}Logging in...${NC}"
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\"
      }")
fi

# Check for errors
if echo "$LOGIN_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}Login failed:${NC}"
    echo "$LOGIN_RESPONSE" | jq -r '.error'
    exit 1
fi

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to extract token from response${NC}"
    echo "Response:"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

# Get user info
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user._id')
USER_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.name')
USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.email')

echo -e "${GREEN}✓ Login successful!${NC}\n"

echo -e "${BLUE}=== User Information ===${NC}"
echo "User ID: $USER_ID"
echo "Name: $USER_NAME"
echo "Email: $USER_EMAIL"
echo ""

echo -e "${BLUE}=== JWT Token ===${NC}"
echo "$TOKEN"
echo ""

# Save to file
echo "$TOKEN" > .jwt-token
echo -e "${GREEN}✓ Token saved to .jwt-token${NC}\n"

# Export instructions
echo -e "${YELLOW}=== Usage Instructions ===${NC}"
echo ""
echo "1. Export as environment variable:"
echo -e "   ${GREEN}export JWT_TOKEN=\"$TOKEN\"${NC}"
echo ""
echo "2. Or load from file:"
echo -e "   ${GREEN}export JWT_TOKEN=\$(cat .jwt-token)${NC}"
echo ""
echo "3. Use in curl commands:"
echo -e "   ${GREEN}curl -H \"Authorization: Bearer \$JWT_TOKEN\" $API_URL/api/user/profile${NC}"
echo ""
echo "4. Test the token:"
echo -e "   ${GREEN}curl -H \"Authorization: Bearer \$JWT_TOKEN\" $API_URL/api/user/profile | jq '.'${NC}"
echo ""

# Verify token works
echo -e "${BLUE}Verifying token...${NC}"
VERIFY_RESPONSE=$(curl -s "$API_URL/api/user/profile" \
  -H "Authorization: Bearer $TOKEN")

if echo "$VERIFY_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Token is valid and working!${NC}\n"
else
    echo -e "${RED}Warning: Token verification failed${NC}"
    echo "$VERIFY_RESPONSE" | jq '.'
fi

# Auto-export for current shell (won't persist to parent shell)
export JWT_TOKEN="$TOKEN"

echo -e "${GREEN}=== Ready to use! ===${NC}"
echo -e "JWT_TOKEN is now available in this script's environment"
echo ""
echo "To use in your shell, run:"
echo -e "${GREEN}export JWT_TOKEN=\"$TOKEN\"${NC}"
echo ""
echo "Or source this output:"
echo -e "${GREEN}source <(echo 'export JWT_TOKEN=\"$TOKEN\"')${NC}"

