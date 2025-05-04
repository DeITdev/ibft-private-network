#!/bin/bash

# Copy explorer config to the right place
mkdir -p quorum-explorer
cp explorer-config.json quorum-explorer/

# Start the network
echo "Starting Besu IBFT2 network with Quorum Explorer..."
docker-compose up -d

# Give some time for nodes to start
sleep 5

# Check if nodes are running
echo "Checking node status..."
for i in {1..4}; do
  echo "Node-$i:"
  curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
    http://localhost:$((8544 + i))
  echo
done

echo "Explorer should be available at http://localhost:25000/explorer"
echo "To view logs: docker-compose logs -f"
echo "To stop the network: docker-compose down"

# Wait for user input before exiting
echo -e "\nPress any key to continue..."
read -n 1 -s -r