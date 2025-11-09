#!/bin/bash

# Simple JWT Token Generator (handles CSRF)
# This script gets a JWT token for API testing

set -e

API_URL="http://localhost:8080"

echo "=== JWT Token Generator ==="
echo ""

# Check if API is running
if ! curl -s "$API_URL/healthz" > /dev/null 2>&1; then
    echo "Error: API server is not running at $API_URL"
    echo "Please start the API server first:"
    echo "  cd api && npm run dev"
    exit 1
fi

echo "✓ API server is running"
echo ""

# Get CSRF token first
echo "Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c /tmp/cookies.txt "$API_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

if [ "$CSRF_TOKEN" == "null" ] || [ -z "$CSRF_TOKEN" ]; then
    echo "Warning: Could not get CSRF token, trying without it..."
    CSRF_TOKEN=""
fi

echo ""
echo "Choose an option:"
echo "1. Login with existing account"
echo "2. Register new account (test@example.com / Test@123!)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "2" ]; then
    echo ""
    echo "Registering test user..."
    
    REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
      -b /tmp/cookies.txt \
      -H "Content-Type: application/json" \
      -H "X-CSRF-Token: $CSRF_TOKEN" \
      -d '{
        "email": "test@example.com",
        "password": "Test@123!",
        "name": "Test User"
      }')
    
    if echo "$REGISTER_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR=$(echo "$REGISTER_RESPONSE" | jq -r '.error')
        if [[ "$ERROR" == *"already exists"* ]]; then
            echo "User already exists, will try to login instead..."
        else
            echo "Registration failed: $ERROR"
            exit 1
        fi
    else
        echo "✓ Registration successful"
    fi
    
    email="test@example.com"
    password="Test@123!"
else
    echo ""
    read -p "Email: " email
    read -sp "Password: " password
    echo ""
fi

echo ""
echo "Logging in..."

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{
    \"email\": \"$email\",
    \"password\": \"$password\"
  }")

# Check for errors
if echo "$LOGIN_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo "Login failed:"
    echo "$LOGIN_RESPONSE" | jq -r '.error'
    exit 1
fi

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "Failed to extract token from response"
    echo "Response:"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

# Get user info
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user._id')
USER_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.name')
USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.email')

echo "✓ Login successful!"
echo ""
echo "=== User Information ==="
echo "User ID: $USER_ID"
echo "Name: $USER_NAME"
echo "Email: $USER_EMAIL"
echo ""
echo "=== JWT Token ==="
echo "$TOKEN"
echo ""

# Save to file
echo "$TOKEN" > .jwt-token
echo "✓ Token saved to .jwt-token"
echo ""

# Export command
echo "=== To use this token, run: ==="
echo ""
echo "export JWT_TOKEN=\"$TOKEN\""
echo ""
echo "Or:"
echo ""
echo "export JWT_TOKEN=\$(cat .jwt-token)"
echo ""

# Verify token
echo "Verifying token..."
VERIFY_RESPONSE=$(curl -s "$API_URL/api/user/profile" \
  -H "Authorization: Bearer $TOKEN")

if echo "$VERIFY_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    echo "✓ Token is valid and working!"
else
    echo "Warning: Token verification failed"
fi

# Clean up
rm -f /tmp/cookies.txt

echo ""
echo "=== Ready! ==="
echo "Run this to set the token in your shell:"
echo ""
echo "export JWT_TOKEN=\"$TOKEN\""

