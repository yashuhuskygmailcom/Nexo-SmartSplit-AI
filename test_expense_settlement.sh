#!/bin/bash

echo "=== NEXO Expense Settlement Test ==="

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

# 1. Create first test user (Yashwant)
echo "1. Creating first test user (Yashwant)..."
response=$(call_api POST "/signup" '{"username":"yashwant","email":"yashwant_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 2. Login as first user
echo "2. Logging in as Yashwant..."
response=$(call_api POST "/login" '{"email":"yashwant_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 3. Create second test user (Krishna)
echo "3. Creating second test user (Krishna)..."
response=$(call_api POST "/signup" '{"username":"krishna","email":"krishna_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 4. Login as Krishna
echo "4. Logging in as Krishna..."
response=$(call_api POST "/login" '{"email":"krishna_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 5. Add Yashwant as friend to Krishna
echo "5. Adding Yashwant as friend to Krishna..."
# Get Yashwant's user ID (this is simplified - in real test we'd need to get the ID properly)
# For now, let's assume we know the friend ID or use a different approach

echo "6. Login back as Yashwant..."
response=$(call_api POST "/login" '{"email":"yashwant_'"$(date +%s)"'@example.com","password":"test123"}')
echo "Response: $response"

# 6. Create expense as Yashwant (₹200 food split with Krishna)
echo "6. Creating expense as Yashwant (₹200 food split with Krishna)..."
response=$(call_api POST "/expenses" '{
  "description": "Food expense",
  "amount": 200,
  "date": "'"$(date +%Y-%m-%d)"'",
  "paid_by": 1,
  "splits": [
    {"user_id": 1, "amount_owed": 100},
    {"user_id": 2, "amount_owed": 100}
  ]
}')
echo "Response: $response"

# 7. Get expenses to verify creation
echo "7. Getting expenses..."
response=$(call_api GET "/expenses")
echo "Response: $response"

echo "=== Expense Settlement Test Complete ==="
echo "Note: This test creates the expense but UI testing would need to be done manually"
echo "to verify that Krishna sees 'Send Money' button and Yashwant sees 'Mark Received' button"

# Clean up
rm -f cookies.txt
