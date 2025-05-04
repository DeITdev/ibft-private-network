#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking if the RPC servers are enabled in the logs...${NC}"

for i in {1..4}; do
  NODE="node-$i"
  echo -e "${YELLOW}Checking $NODE logs for RPC server status...${NC}"
  
  if docker logs $NODE | grep -q "JSON-RPC service started"; then
    echo -e "${GREEN}$NODE has its JSON-RPC service started successfully.${NC}"
  else
    echo -e "${RED}$NODE does not appear to have started its JSON-RPC service.${NC}"
    echo -e "${YELLOW}Checking for related errors...${NC}"
    docker logs $NODE | grep -i "rpc\|http\|json\|error\|warn\|fail" | tail -n 20
  fi
  
  echo ""
done

echo -e "${YELLOW}Checking if nodes are listening on their RPC ports...${NC}"
docker exec -it debug-helper sh -c "apk add --no-cache netcat-openbsd && for i in {1..4}; do nc -zv node-\$i \$((8544 + \$i)); done"

echo -e "${GREEN}Troubleshooting complete.${NC}"