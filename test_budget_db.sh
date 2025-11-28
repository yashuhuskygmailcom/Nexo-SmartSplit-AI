#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3003/api"
COOKIES="/tmp/budget_test_cookies.txt"

echo -e "${YELLOW}=== NEXO Budget Database Integration Test ===${NC}\n"

# 1. Create a test user
echo -e "${YELLOW}1. Creating test user...${NC}"
TEST_EMAIL="budget_test_$(date +%s)@example.com"
TEST_PASSWORD="testpass123"

SIGNUP_RESPONSE=$(curl -sS -c "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/signup" \
  -d "{\"username\":\"budgetuser\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "Response: $SIGNUP_RESPONSE"

# 2. Login
echo -e "\n${YELLOW}2. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -sS -c "$COOKIES" -b "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/login" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "Response: $LOGIN_RESPONSE"

# 3. Get initial budgets (should be empty)
echo -e "\n${YELLOW}3. Getting initial budgets (should be empty)...${NC}"
BUDGETS_RESPONSE=$(curl -sS -b "$COOKIES" "$API_URL/budgets")
echo "Response: $BUDGETS_RESPONSE"

# 4. Create a budget
echo -e "\n${YELLOW}4. Creating budget - Food & Dining (₹500)...${NC}"
CREATE_BUDGET=$(curl -sS -b "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/budgets" \
  -d '{"name":"Food & Dining","budget_amount":500,"icon":"🍽️","color":"from-orange-500 to-red-500"}')

echo "Response: $CREATE_BUDGET"
BUDGET_ID=$(echo "$CREATE_BUDGET" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

# 5. Create another budget
echo -e "\n${YELLOW}5. Creating budget - Entertainment (₹200)...${NC}"
CREATE_BUDGET2=$(curl -sS -b "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/budgets" \
  -d '{"name":"Entertainment","budget_amount":200,"icon":"🎬","color":"from-purple-500 to-pink-500"}')

echo "Response: $CREATE_BUDGET2"

# 6. Get all budgets
echo -e "\n${YELLOW}6. Getting all budgets...${NC}"
GET_BUDGETS=$(curl -sS -b "$COOKIES" "$API_URL/budgets")
echo "Response: $GET_BUDGETS"

# 7. Update a budget
echo -e "\n${YELLOW}7. Updating Food & Dining budget to ₹600...${NC}"
if [ ! -z "$BUDGET_ID" ]; then
  UPDATE_BUDGET=$(curl -sS -b "$COOKIES" -H "Content-Type: application/json" \
    -X PUT "$API_URL/budgets/$BUDGET_ID" \
    -d '{"name":"Food & Dining","budget_amount":600,"icon":"🍽️","color":"from-orange-500 to-red-500"}')
  echo "Response: $UPDATE_BUDGET"
fi

# 8. Get budgets after update
echo -e "\n${YELLOW}8. Getting budgets after update...${NC}"
GET_BUDGETS2=$(curl -sS -b "$COOKIES" "$API_URL/budgets")
echo "Response: $GET_BUDGETS2"

# 9. Delete a budget
echo -e "\n${YELLOW}9. Deleting Food & Dining budget...${NC}"
if [ ! -z "$BUDGET_ID" ]; then
  DELETE_BUDGET=$(curl -sS -b "$COOKIES" \
    -X DELETE "$API_URL/budgets/$BUDGET_ID")
  echo "Response: $DELETE_BUDGET"
fi

# 10. Get final budgets
echo -e "\n${YELLOW}10. Getting budgets after deletion...${NC}"
GET_BUDGETS3=$(curl -sS -b "$COOKIES" "$API_URL/budgets")
echo "Response: $GET_BUDGETS3"

echo -e "\n${GREEN}=== Budget Database Integration Test Complete ===${NC}"
