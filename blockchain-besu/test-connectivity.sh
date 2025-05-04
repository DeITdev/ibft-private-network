#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing network connectivity between containers...${NC}"

# Test connectivity from explorer to nodes
echo -e "${YELLOW}Testing connectivity from explorer to nodes...${NC}"
docker exec -it quorum-explorer ping -c 2 node-1
docker exec -it quorum-explorer ping -c 2 node-2
docker exec -it quorum-explorer ping -c 2 node-3
docker exec -it quorum-explorer ping -c 2 node-4

# Test HTTP connectivity from explorer to nodes using Node.js
echo -e "${YELLOW}Testing HTTP connectivity from explorer to nodes using Node.js...${NC}"
docker exec -it quorum-explorer node -e "const http = require('http'); const options = {hostname: 'node-1', port: 8545, path: '/', method: 'POST', headers: {'Content-Type': 'application/json'}}; const req = http.request(options, (res) => {console.log('node-1 status code:', res.statusCode); res.on('data', (d) => {console.log(d.toString());});}); req.on('error', (e) => {console.error('node-1 error:', e);}); req.write(JSON.stringify({jsonrpc: '2.0',method: 'net_version',params: [],id: 1})); req.end();"

echo -e "${GREEN}Network connectivity test complete.${NC}"