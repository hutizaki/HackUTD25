#!/bin/bash

# Get JWT Token - Quick and Simple
# Creates a test user and returns a JWT token

set -e

API_URL="http://localhost:8080"

echo "=== JWT Token Generator ==="
echo ""

# Check if API is running
if ! curl -s "$API_URL/healthz" > /dev/null 2>&1; then
    echo "❌ Error: API server is not running"
    echo ""
    echo "Start the API server first:"
    echo "  cd api && npm run dev"
    exit 1
fi

echo "✓ API server is running"
echo ""

# Get CSRF token
CSRF_RESPONSE=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt "$API_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

# Register new user with unique email
EMAIL="testuser$(date +%s)@example.com"
PASSWORD="SecurePass@123!"

echo "Creating test user..."
echo "Email: $EMAIL"
echo ""

curl -s -X POST "$API_URL/api/auth/register" \
  -c /tmp/cookies.txt \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"Test User\"
  }" > /dev/null

# Extract JWT from cookie (cookie name is 'aio_session')
JWT_TOKEN=$(grep 'aio_session' /tmp/cookies.txt | sed 's/.*\t//')

if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "" ]; then
    echo "❌ Failed to extract JWT token"
    echo "Cookie file:"
    cat /tmp/cookies.txt
    exit 1
fi

# Save token
echo "$JWT_TOKEN" > .jwt-token

# Verify token works (using cookie)
VERIFY=$(curl -s "$API_URL/api/user/profile" -b /tmp/cookies.txt)

if echo "$VERIFY" | jq -e '.data' > /dev/null 2>&1; then
    USER_ID=$(echo "$VERIFY" | jq -r '.data._id')
    USER_NAME=$(echo "$VERIFY" | jq -r '.data.name')
    USER_EMAIL=$(echo "$VERIFY" | jq -r '.data.email')
    
    echo "✓ User created and authenticated!"
    echo ""
    echo "=== User Information ==="
    echo "User ID: $USER_ID"
    echo "Name: $USER_NAME"
    echo "Email: $USER_EMAIL"
    echo ""
    echo "=== JWT Token ==="
    echo "$JWT_TOKEN"
    echo ""
    echo "✓ Token saved to .jwt-token"
    echo ""
    echo "=== Usage (Cookie-Based Auth) ==="
    echo ""
    echo "This API uses cookie-based authentication, not Bearer tokens."
    echo ""
    echo "1. For CLI testing, use the cookie file:"
    echo "   curl -b /tmp/cookies.txt $API_URL/api/user/profile | jq '.'"
    echo ""
    echo "2. Or set the cookie manually:"
    echo "   curl -H \"Cookie: aio_session=$JWT_TOKEN\" $API_URL/api/user/profile | jq '.'"
    echo ""
    echo "3. For the ticketing test (needs Bearer token support):"
    echo "   export JWT_TOKEN=\"$JWT_TOKEN\""
    echo "   export REPOSITORY=\"https://github.com/your-org/your-repo\""
    echo "   ./test-ticketing-system.sh"
    echo ""
    echo "   Note: You may need to modify test scripts to use cookies instead of Bearer tokens"
    echo ""
else
    echo "❌ Token verification failed"
    echo "$VERIFY" | jq '.'
fi

# Cleanup
rm -f /tmp/cookies.txt

echo "=== Ready! ==="

