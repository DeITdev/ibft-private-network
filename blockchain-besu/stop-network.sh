#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Determine which docker-compose command to use
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose" 
else
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Stop the network
echo -e "${GREEN}Stopping Besu IBFT2 network...${NC}"
$DOCKER_COMPOSE down

echo -e "${GREEN}Network stopped.${NC}"

# Wait for user input before exiting
echo -e "\n${YELLOW}Press any key to continue...${NC}"
read -n 1 -s -r