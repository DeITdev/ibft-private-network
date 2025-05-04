#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing RPC endpoints using debug-helper...${NC}"

# Test each node's RPC endpoint
for i in {1..4}; do
  PORT=$((8544 + i))
  NODE="node-$i"
  echo -e "${YELLOW}Testing $NODE on port $PORT...${NC}"
  
  RESULT=$(docker exec -it debug-helper curl -s http://$NODE:$PORT \
    -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}')
  
  if echo $RESULT | grep -q "result"; then
    echo -e "${GREEN}Success! $NODE is responding properly.${NC}"
    echo -e "Response: $RESULT"
  else
    echo -e "${RED}Failed to connect to $NODE.${NC}"
    echo -e "Response: $RESULT"
  fi
  
  echo ""
done

echo -e "${YELLOW}Testing connectivity from quorum-explorer container...${NC}"
docker exec -it quorum-explorer node -e "
const http = require('http');
const testEndpoint = (host, port) => {
  console.log('Testing ' + host + ':' + port);
  const options = {
    hostname: host,
    port: port,
    path: '/',
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    timeout: 5000
  };
  const req = http.request(options, (res) => {
    console.log(host + ':' + port + ' status code: ' + res.statusCode);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => { console.log(host + ':' + port + ' response: ' + data); });
  });
  req.on('error', (e) => { console.error(host + ':' + port + ' error: ' + e); });
  req.write(JSON.stringify({jsonrpc: '2.0', method: 'net_version', params: [], id: 1}));
  req.end();
};

testEndpoint('node-1', 8545);
testEndpoint('node-2', 8546);
testEndpoint('node-3', 8547);
testEndpoint('node-4', 8548);
"

echo -e "${GREEN}RPC endpoint tests complete.${NC}"