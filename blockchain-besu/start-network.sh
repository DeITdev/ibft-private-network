#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Besu IBFT2 network with Quorum Explorer...${NC}"

# Create required directories
mkdir -p quorum-explorer
cp explorer-config.json quorum-explorer/

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Start the network
docker-compose up -d

# Function to check if a curl request succeeds
check_endpoint() {
    local url=$1
    local max_attempts=30
    local wait_time=2
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $url to become available...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" \
           --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
           $url | grep -q "result"; then
            echo -e "${GREEN}$url is now available!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}Attempt $attempt/$max_attempts: $url not ready yet. Waiting...${NC}"
        sleep $wait_time
        attempt=$((attempt+1))
    done
    
    echo -e "${RED}Failed to connect to $url after $max_attempts attempts.${NC}"
    return 1
}

# Check if all node endpoints are available
echo -e "${YELLOW}Checking node status...${NC}"
for i in {1..4}; do
    check_endpoint "http://localhost:$((8544 + i))"
done

# Check if explorer is running
echo -e "${YELLOW}Checking if Quorum Explorer is running...${NC}"
if docker ps | grep -q "quorum-explorer"; then
    echo -e "${GREEN}Quorum Explorer is running!${NC}"
else
    echo -e "${RED}Quorum Explorer failed to start.${NC}"
    docker-compose logs quorum-explorer
fi

echo -e "${GREEN}Explorer should be available at http://localhost:25000/explorer${NC}"
echo -e "${YELLOW}To view logs: docker-compose logs -f${NC}"
echo -e "${YELLOW}To stop the network: docker-compose down${NC}"

# Wait for user input before exiting
echo -e "\n${GREEN}Network startup complete. Press any key to continue...${NC}"
read -n 1 -s -r