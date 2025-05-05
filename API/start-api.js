#!/usr/bin/env node

/**
 * Blockchain API startup script
 * This script sets up environment variables and starts the API server
 */

// Load environment variables
require('dotenv').config();

console.log('Starting Blockchain API...');
console.log(`Connecting to blockchain at: ${process.env.BLOCKCHAIN_URL}`);
console.log(`Using chain ID: ${process.env.BLOCKCHAIN_CHAIN_ID}`);

// Importing the main app
require('./app');