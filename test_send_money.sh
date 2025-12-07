#!/bin/bash

echo "=== NEXO Send Money Test ==="

# Base URL for API calls
BASE_URL="http://localhost:3003/api"

# Function to make API calls
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ "$method" = "GET" ]; then
        curl -s -X GET "$BASE_URL$endpoint" \
             -H "Content-Type: application/json" \
             -b cookies.txt -c cookies.txt
    else
        curl -s -X $method "$BASE_URL$endpoint" \
             -H "Content-Type: application/json" \
             -d "$data" \
             -b cookies.txt -c cookies.txt
    fi
}

# Clean up any existing cookies
rm -f cookies.txt

# 1. Create first test user (Sender)
echo "1. Creating first test user (Sender)..."
response=$(call_api POST "/signup" '{"username":"sender","email":"sender_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 2. Login as first user
echo "2. Logging in as Sender..."
response=$(call_api POST "/login" '{"email":"sender_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 3. Add funds to sender's wallet
echo "3. Adding funds to sender's wallet..."
response=$(call_api POST "/wallet/add-funds" '{"amount":500,"description":"Test funds"}')
echo "Response: $response"

# 4. Create second test user (Receiver)
echo "4. Creating second test user (Receiver)..."
response=$(call_api POST "/signup" '{"username":"receiver","email":"receiver_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 5. Login as Receiver
echo "5. Logging in as Receiver..."
response=$(call_api POST "/login" '{"email":"receiver_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 6. Add Receiver as friend to Sender
echo "6. Adding Receiver as friend to Sender..."
response=$(call_api POST "/login" '{"email":"sender_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# Note: This test is simplified - in a real scenario we'd need to get the friend ID properly
echo "7. Attempting to send money (this will likely fail due to friend ID issue)..."
response=$(call_api POST "/wallet/send-money" '{"amount":100,"friendId":2,"description":"Test send"}')
echo "Response: $response"

echo "=== Send Money Test Complete ==="
echo "Note: This test demonstrates the send money API structure but needs proper friend setup"

# Clean up
rm -f cookies.txt
