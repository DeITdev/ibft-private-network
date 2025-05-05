#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Besu IBFT2 network with Quorum Explorer and Blockchain API...${NC}"

# Check if genesis.json exists in the parent directory
if [ ! -f "../genesis.json" ]; then
    echo -e "${RED}Genesis file not found at ../genesis.json${NC}"
    echo -e "${YELLOW}Copying from ibftConfigFile.json...${NC}"
    cp ../ibftConfigFile.json ../genesis.json
fi

# Check if .env file exists for the API
if [ ! -f "../API/.env" ]; then
    echo -e "${YELLOW}Creating .env file for API...${NC}"
    echo "BLOCKCHAIN_URL=http://node-1:8545" > ../API/.env
    echo "BLOCKCHAIN_CHAIN_ID=1337" >> ../API/.env
fi

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Ensure docker compose is available
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Start the network
echo -e "${GREEN}Starting network with $DOCKER_COMPOSE...${NC}"
$DOCKER_COMPOSE up -d

# Give the network some time to start up
echo -e "${YELLOW}Giving network time to start up (60 seconds)...${NC}"
sleep 60

# Check if nodes are running
echo -e "${YELLOW}Checking if nodes are running...${NC}"
if docker ps | grep -q "node-1" && docker ps | grep -q "node-2" && docker ps | grep -q "node-3" && docker ps | grep -q "node-4"; then
    echo -e "${GREEN}All nodes are running!${NC}"
else
    echo -e "${RED}Some nodes failed to start.${NC}"
    docker ps
    $DOCKER_COMPOSE logs
    exit 1
fi

# Check if explorer is running
echo -e "${YELLOW}Checking if Quorum Explorer is running...${NC}"
if docker ps | grep -q "quorum-explorer"; then
    echo -e "${GREEN}Quorum Explorer is running!${NC}"
else
    echo -e "${RED}Quorum Explorer failed to start.${NC}"
    $DOCKER_COMPOSE logs quorum-explorer
fi

# Check if API is running
echo -e "${YELLOW}Checking if Blockchain API is running...${NC}"
if docker ps | grep -q "blockchain-api"; then
    echo -e "${GREEN}Blockchain API is running!${NC}"
else
    echo -e "${RED}Blockchain API failed to start.${NC}"
    $DOCKER_COMPOSE logs blockchain-api
fi

echo -e "${GREEN}Explorer should be available at http://localhost:25000/explorer${NC}"
echo -e "${GREEN}Blockchain API should be available at http://localhost:4001${NC}"
echo -e "${YELLOW}To view logs: $DOCKER_COMPOSE logs -f${NC}"
echo -e "${YELLOW}To stop the network: $DOCKER_COMPOSE down${NC}"

# API endpoints documentation
echo -e "\n${GREEN}Available API Endpoints:${NC}"
echo -e "${YELLOW}POST /deploy${NC} - Deploy a smart contract"
echo -e "  Required body: { \"privateKey\": \"your-private-key\" }"
echo -e "${YELLOW}POST /store${NC} - Store a value in a deployed contract"
echo -e "  Required body: { \"privateKey\": \"your-private-key\", \"contractAddress\": \"contract-address\", \"value\": number }"
echo -e "${YELLOW}GET /read${NC} - Read a value from a deployed contract"
echo -e "  Required query: ?contractAddress=contract-address"

# Wait for user input before exiting
echo -e "\n${GREEN}Network startup complete. Press any key to continue...${NC}"
read -n 1 -s -r