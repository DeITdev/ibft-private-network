#!/bin/bash

# Set up and run Quorum Explorer for Besu nodes
echo "Setting up Quorum Explorer for Besu private network..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

# Stop and remove any previous explorer containers
echo "Stopping any running explorer containers..."
docker-compose down
docker stop quorum-explorer 2>/dev/null
docker rm quorum-explorer 2>/dev/null

# Check if Besu nodes are running
echo "Checking if Besu nodes are running..."

# Check Node1 (port 8545)
if ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://localhost:8545 > /dev/null; then
    echo "Warning: Node1 (port 8545) does not appear to be running."
    echo "Please make sure your Besu nodes are running before starting the explorer."
    read -p "Continue anyway? (y/n): " confirm
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        exit 1
    fi
fi

# Start the Quorum Explorer
echo "Starting Quorum Explorer..."
docker-compose -f docker-compose.yml up -d

echo "Waiting for explorer to start up..."
sleep 5

# Show container logs
docker logs quorum-explorer

echo "Explorer should now be running at http://localhost:25000/explorer"
echo "If you encounter issues, check the logs with: docker logs quorum-explorer"
echo ""
echo "If the explorer fails to connect to your Besu nodes, try accessing them directly with curl:"
echo "curl -X POST -H \"Content-Type: application/json\" --data '{\"jsonrpc\":\"2.0\",\"method\":\"net_version\",\"params\":[],\"id\":1}' http://localhost:8545"