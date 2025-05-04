#!/bin/bash

# Stop the network
echo "Stopping Besu IBFT2 network..."
docker-compose down

echo "Network stopped."

# Wait for user input before exiting
echo -e "\nPress any key to continue..."
read -n 1 -s -r