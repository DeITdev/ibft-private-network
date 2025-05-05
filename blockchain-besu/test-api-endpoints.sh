#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Set the API endpoint
API_URL="http://localhost:4001"

# Test account from genesis file
PRIVATE_KEY="8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63"

echo -e "${YELLOW}Testing Blockchain API endpoints...${NC}"

# Test the /deploy endpoint
echo -e "${YELLOW}1. Testing contract deployment...${NC}"
DEPLOY_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"privateKey\":\"$PRIVATE_KEY\"}" \
  $API_URL/deploy)

# Extract contract address from response
CONTRACT_ADDRESS=$(echo $DEPLOY_RESPONSE | grep -o '"contractAddress":"[^"]*"' | sed 's/"contractAddress":"//;s/"//')

if [ -z "$CONTRACT_ADDRESS" ]; then
  echo -e "${RED}Failed to deploy contract or extract contract address.${NC}"
  echo -e "${YELLOW}Response: $DEPLOY_RESPONSE${NC}"
  # Try to use the deploySimple endpoint as fallback
  echo -e "${YELLOW}Trying simple deployment as fallback...${NC}"
  DEPLOY_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"privateKey\":\"$PRIVATE_KEY\"}" \
    $API_URL/deploySimple)
  
  CONTRACT_ADDRESS=$(echo $DEPLOY_RESPONSE | grep -o '"contractAddress":"[^"]*"' | sed 's/"contractAddress":"//;s/"//')
  
  if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}Simple deployment also failed. API might not be functioning correctly.${NC}"
    exit 1
  else
    echo -e "${GREEN}Simple deployment successful! Contract address: $CONTRACT_ADDRESS${NC}"
  fi
else
  echo -e "${GREEN}Contract deployed successfully! Contract address: $CONTRACT_ADDRESS${NC}"
fi

# Test the /store endpoint
echo -e "\n${YELLOW}2. Testing storing a value in the contract...${NC}"
TEST_VALUE=42
STORE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"privateKey\":\"$PRIVATE_KEY\",\"contractAddress\":\"$CONTRACT_ADDRESS\",\"value\":$TEST_VALUE}" \
  $API_URL/store)

if [[ $STORE_RESPONSE == *"transactionHash"* ]]; then
  echo -e "${GREEN}Value stored successfully!${NC}"
  echo -e "${YELLOW}Response: $STORE_RESPONSE${NC}"
else
  echo -e "${RED}Failed to store value.${NC}"
  echo -e "${YELLOW}Response: $STORE_RESPONSE${NC}"
fi

# Allow some time for the transaction to be mined
echo -e "${YELLOW}Waiting 5 seconds for transaction to be mined...${NC}"
sleep 5

# Test the /read endpoint
echo -e "\n${YELLOW}3. Testing reading the value from the contract...${NC}"
READ_RESPONSE=$(curl -s -X GET "$API_URL/read?contractAddress=$CONTRACT_ADDRESS")

if [[ $READ_RESPONSE == "$TEST_VALUE" ]]; then
  echo -e "${GREEN}Value read successfully! Value: $READ_RESPONSE${NC}"
else
  echo -e "${YELLOW}Value read: $READ_RESPONSE (Expected: $TEST_VALUE)${NC}"
  if [[ $READ_RESPONSE == "" ]]; then
    echo -e "${RED}Failed to read value. Empty response.${NC}"
  fi
fi

echo -e "\n${GREEN}API testing complete.${NC}"