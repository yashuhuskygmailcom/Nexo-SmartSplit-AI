#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3003/api"
COOKIES="/tmp/wallet_test_cookies.txt"

echo -e "${YELLOW}=== NEXO Wallet Flow Test ===${NC}\n"

# 1. Create a test user
echo -e "${YELLOW}1. Creating test user...${NC}"
TEST_EMAIL="wallet_test_$(date +%s)@example.com"
TEST_PASSWORD="testpass123"
TEST_USERNAME="walletuser"

SIGNUP_RESPONSE=$(curl -sS -c "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/signup" \
  -d "{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "Response: $SIGNUP_RESPONSE"

# 2. Login
echo -e "\n${YELLOW}2. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -sS -c "$COOKIES" -b "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/login" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "Response: $LOGIN_RESPONSE"

# 3. Check wallet (should be created with 0 balance)
echo -e "\n${YELLOW}3. Checking initial wallet balance...${NC}"
WALLET_RESPONSE=$(curl -sS -b "$COOKIES" "$API_URL/wallet")
echo "Response: $WALLET_RESPONSE"

# 4. Add funds to wallet
echo -e "\n${YELLOW}4. Adding funds to wallet (₹500)...${NC}"
ADD_FUNDS_RESPONSE=$(curl -sS -b "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/wallet/add-funds" \
  -d '{"amount":500,"description":"Initial funding"}')

echo "Response: $ADD_FUNDS_RESPONSE"

# 5. Check wallet balance after adding funds
echo -e "\n${YELLOW}5. Checking wallet balance after adding funds...${NC}"
WALLET_RESPONSE=$(curl -sS -b "$COOKIES" "$API_URL/wallet")
echo "Response: $WALLET_RESPONSE"

# 6. Pay debt from wallet
echo -e "\n${YELLOW}6. Paying debt from wallet (₹100)...${NC}"
PAY_DEBT_RESPONSE=$(curl -sS -b "$COOKIES" -H "Content-Type: application/json" \
  -X POST "$API_URL/wallet/pay-debt" \
  -d '{"amount":100,"description":"Paid friend"}')

echo "Response: $PAY_DEBT_RESPONSE"

# 7. Check wallet balance after paying
echo -e "\n${YELLOW}7. Checking wallet balance after payment...${NC}"
WALLET_RESPONSE=$(curl -sS -b "$COOKIES" "$API_URL/wallet")
echo "Response: $WALLET_RESPONSE"

# 8. Get transaction history
echo -e "\n${YELLOW}8. Getting transaction history...${NC}"
TRANSACTIONS_RESPONSE=$(curl -sS -b "$COOKIES" "$API_URL/wallet/transactions")
echo "Response: $TRANSACTIONS_RESPONSE"

echo -e "\n${GREEN}=== Wallet Flow Test Complete ===${NC}"
