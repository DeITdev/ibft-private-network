// app.js - Employee Blockchain API Server

// Add this line at the very top
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Web3 = require('web3');
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');
const fs = require('fs');
const path = require('path');

// Configure middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Handle CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

// Environment configuration with better port handling
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
const PORT = process.env.PORT ||
  process.env.API_BLOCKCHAIN_ENDPOINT?.split(':')[2] ||
  4001;
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL;
const BLOCKCHAIN_CHAIN_ID = parseInt(process.env.BLOCKCHAIN_CHAIN_ID);
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; // Read from environment

// Initialize web3
let web3;
try {
  web3 = new Web3(BLOCKCHAIN_URL);
  console.log('Web3 initialized with provider:', BLOCKCHAIN_URL);
} catch (error) {
  console.error('Error initializing Web3:', error.message);
  process.exit(1);
}

// Load Employee contract
const employeeContractPath = path.resolve(__dirname, 'compiled', 'EmployeeStorage.json');
let employeeContract = null;
let employeeContractAddress = null;

// Try to load contract
try {
  if (fs.existsSync(employeeContractPath)) {
    employeeContract = require(employeeContractPath);
    console.log('Employee contract ABI loaded successfully');

    // First check environment variable for contract address
    if (CONTRACT_ADDRESS) {
      employeeContractAddress = CONTRACT_ADDRESS;
      console.log('Employee contract address loaded from ENV:', employeeContractAddress);
    } else {
      // Fallback to deployment file
      const deploymentPath = path.resolve(__dirname, 'employee-contract-deployment.json');
      if (fs.existsSync(deploymentPath)) {
        const deploymentInfo = require(deploymentPath);
        employeeContractAddress = deploymentInfo.contractAddress;
        console.log('Employee contract address loaded from file:', employeeContractAddress);
      } else {
        console.log('No deployment info found. You need to deploy the contract first or set CONTRACT_ADDRESS env var.');
      }
    }
  } else {
    console.log('Employee contract not compiled. Run: node compile-employee-contract.js');
  }
} catch (error) {
  console.error('Error loading contract:', error.message);
}

// Helper function to create transaction
async function createTransaction(privateKey, contractAddress, encodedData, gasLimit = 800000) {
  try {
    // Clean private key
    privateKey = privateKey.replace(/^0x/, '');

    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    let gasPrice = await web3.eth.getGasPrice();

    // Fix zero gas price issue for local Besu
    if (gasPrice === '0' || gasPrice === 0 || parseInt(gasPrice) === 0) {
      gasPrice = '1000000000'; // 1 Gwei
      console.log('Fixed gas price from 0 to 1 Gwei');
    }

    // Estimate gas for this specific transaction
    let estimatedGas;
    try {
      estimatedGas = await web3.eth.estimateGas({
        to: contractAddress,
        data: encodedData,
        from: account.address
      });

      // Add 30% buffer to estimated gas
      gasLimit = Math.floor(estimatedGas * 1.3);
      console.log(`Estimated gas: ${estimatedGas}, Using: ${gasLimit}`);

    } catch (error) {
      console.log('Gas estimation failed, using default:', gasLimit);
    }

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice), // Use fixed gas price
      gasLimit: web3.utils.toHex(gasLimit),
      data: encodedData,
      to: contractAddress,
      chainId: BLOCKCHAIN_CHAIN_ID
    };

    // Log transaction details for debugging
    console.log('Transaction details:');
    console.log(`   Gas Limit: ${gasLimit}`);
    console.log(`   Gas Price: ${gasPrice}`);
    console.log(`   Nonce: ${txCount}`);

    // Create custom chain configuration
    const custom = Common.default.forCustomChain(
      "mainnet",
      {
        networkId: 123,
        chainId: BLOCKCHAIN_CHAIN_ID,
        name: "besu-network"
      },
      "istanbul"
    );

    // Create, sign, and send transaction
    const tx = new Tx(txObj, { common: custom });
    const privateKeyBuffer = Buffer.from(privateKey, "hex");
    tx.sign(privateKeyBuffer);

    const serialized = tx.serialize();
    const rawTx = "0x" + serialized.toString("hex");

    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    // Check if transaction was successful
    if (!receipt.status) {
      throw new Error(`Transaction failed. Gas used: ${receipt.gasUsed}/${gasLimit}`);
    }

    return receipt;
  } catch (error) {
    console.error('Transaction error:', error.message);
    throw error;
  }
}

// Convert ISO timestamp to Unix timestamp
function isoToUnixTimestamp(isoString) {
  return Math.floor(new Date(isoString).getTime() / 1000);
}

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Employee Blockchain API Server',
    status: 'running',
    contractAddress: employeeContractAddress,
    blockchain: BLOCKCHAIN_URL,
    chainId: BLOCKCHAIN_CHAIN_ID,
    port: PORT,
    host: HOST
  });
});


// === Import and use the employee routes ===
const employeeRoutes = require('./user-route')(web3, employeeContract, employeeContractAddress, createTransaction, isoToUnixTimestamp);
app.use('/employees', employeeRoutes);


// Contract info endpoint
app.get('/contract/info', (req, res) => {
  res.json({
    contractAddress: employeeContractAddress,
    blockchain: BLOCKCHAIN_URL,
    chainId: BLOCKCHAIN_CHAIN_ID,
    contractLoaded: !!employeeContract,
    contractDeployed: !!employeeContractAddress,
    server: {
      host: HOST,
      port: PORT
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server with proper host binding
const server = app.listen(PORT, HOST, () => {
  const address = server.address();
  console.log('Employee Blockchain API Server started');
  console.log('Server running on:');
  console.log(`   Host: ${address.address}`);
  console.log(`   Port: ${address.port}`);
  console.log(`   URL: http://${address.address === '::' ? 'localhost' : address.address}:${address.port}`);
  console.log('Blockchain URL:', BLOCKCHAIN_URL);
  console.log('Chain ID:', BLOCKCHAIN_CHAIN_ID);
  console.log('Contract Address:', employeeContractAddress || 'Not deployed');
  console.log('\nAvailable Endpoints:');
  console.log('  GET  /', '- Server status');
  console.log('  GET  /employees', '- List all employees');
  console.log('  GET  /employees/:recordId', '- Get specific employee');
  console.log('  POST /employees', '- Store employee data');
  console.log('  GET  /employees/:recordId/metadata', '- Get employee metadata');
  console.log('  GET  /contract/info', '- Contract information');
  console.log('\nReady to handle CDC events!');

  // Additional network interface information
  const networkInterfaces = require('os').networkInterfaces();
  console.log('\nAvailable network interfaces:');
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(interface => {
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`   ${interfaceName}: http://${interface.address}:${address.port}`);
      }
    });
  });
});