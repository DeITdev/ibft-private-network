#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping the network...${NC}"
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose" 
else
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Get the current project name (directory name by default)
PROJECT_NAME=$(basename $(pwd))

echo -e "${YELLOW}Stopping the network...${NC}"
$DOCKER_COMPOSE down

echo -e "${YELLOW}Removing only containers related to this project...${NC}"
# Only remove containers related to this compose project
docker container ls -a --filter "name=${PROJECT_NAME}" --format "{{.ID}}" | xargs -r docker container rm -f

echo -e "${YELLOW}Starting the network...${NC}"
$DOCKER_COMPOSE up -d

echo -e "${GREEN}Network has been restarted.${NC}"
echo -e "${YELLOW}Giving services time to start up (60 seconds)...${NC}"
sleep 60

echo -e "${YELLOW}Checking container status...${NC}"
docker ps

echo -e "${GREEN}Restart complete. The explorer should be available at http://localhost:25000/explorer${NC}"