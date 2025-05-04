#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Besu IBFT2 network with Quorum Explorer...${NC}"

# Check if genesis.json exists in the parent directory
if [ ! -f "../genesis.json" ]; then
    echo -e "${RED}Genesis file not found at ../genesis.json${NC}"
    echo -e "${YELLOW}Copying from ibftConfigFile.json...${NC}"
    cp ../ibftConfigFile.json ../genesis.json
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

echo -e "${GREEN}Explorer should be available at http://localhost:25000/explorer${NC}"
echo -e "${YELLOW}To view logs: $DOCKER_COMPOSE logs -f${NC}"
echo -e "${YELLOW}To stop the network: $DOCKER_COMPOSE down${NC}"

# Wait for user input before exiting
echo -e "\n${GREEN}Network startup complete. Press any key to continue...${NC}"
read -n 1 -s -r