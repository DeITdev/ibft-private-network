// app.js - Modular Blockchain API Server with Separate Route Files
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const EEAClient = require("web3-eea");
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');
const fs = require('fs');
const path = require('path');

const app = express();

// Import route modules (modular pattern)
const { router: userRoutes, initUserRoutes } = require('./routes-user');
const { router: taskRoutes, initTaskRoutes } = require('./routes-task');
const { router: companyRoutes, initCompanyRoutes } = require('./routes-company');
const { router: attendanceRoutes, initAttendanceRoutes } = require('./routes-attendance');
// Employee routes use a slightly different export signature (function returning router)
let employeeRoutes; // will be initialized after web3 creation

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configuration
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 4001;
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
const BLOCKCHAIN_CHAIN_ID = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '1337');

// Initialize Web3
const web3 = new EEAClient(new Web3(BLOCKCHAIN_URL), BLOCKCHAIN_CHAIN_ID);

// Contract configurations - ALL 6 CONTRACTS
const CONTRACTS = {
  simple: { name: 'SimpleStorage', file: 'SimpleStorage.json', defaultArgs: [123], gasLimit: 5000000 },
  employee: { name: 'EmployeeStorage', file: 'EmployeeStorage.json', defaultArgs: [], gasLimit: 8000000 },
  user: { name: 'UserStorage', file: 'UserStorage.json', defaultArgs: [], gasLimit: 8000000 },
  task: { name: 'TaskStorage', file: 'TaskStorage.json', defaultArgs: [], gasLimit: 8000000 },
  company: { name: 'CompanyStorage', file: 'CompanyStorage.json', defaultArgs: [], gasLimit: 8000000 },
  attendance: { name: 'AttendanceStorage', file: 'AttendanceStorage.json', defaultArgs: [], gasLimit: 8000000 }
};

// Load contract helper
function loadContract(type) {
  const config = CONTRACTS[type];
  if (!config) throw new Error(`Unknown contract: ${type}`);

  const filePath = path.join(__dirname, 'compiled', config.file);
  if (!fs.existsSync(filePath)) throw new Error(`Not compiled: ${config.file}`);

  return { contract: require(filePath), config };
}

// Transaction helper
async function sendTransaction(privateKey, contractAddress, data, gasLimit = 800000) {
  const key = privateKey.replace(/^0x/, '');
  const account = web3.eth.accounts.privateKeyToAccount('0x' + key);
  const nonce = await web3.eth.getTransactionCount(account.address, 'pending');
  let gasPrice = await web3.eth.getGasPrice();
  if (!gasPrice || gasPrice === '0') gasPrice = '1000000000';

  const txObj = {
    nonce: web3.utils.toHex(nonce),
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(gasLimit),
    data: data,
    to: contractAddress,
    chainId: BLOCKCHAIN_CHAIN_ID
  };

  const custom = Common.default.forCustomChain('mainnet', {
    networkId: 123,
    chainId: BLOCKCHAIN_CHAIN_ID,
    name: 'besu-network'
  }, 'istanbul');

  const tx = new Tx(txObj, { common: custom });
  tx.sign(Buffer.from(key, 'hex'));

  const receipt = await web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'));

  // Always show blockchain activity logs
  console.log(`Transaction: ${receipt.transactionHash}, Block: ${receipt.blockNumber}, Status: ${receipt.status ? 'Success' : 'Failed'}`);

  if (!receipt.status) throw new Error('Transaction failed');

  return receipt;
}

// Initialize route modules with dependencies
const routeDependencies = { loadContract, sendTransaction, web3 };
initUserRoutes(routeDependencies);
initTaskRoutes(routeDependencies);
initCompanyRoutes(routeDependencies);
initAttendanceRoutes(routeDependencies);
// Initialize employee routes (expects web3 directly)
employeeRoutes = require('./routes-employee')(web3);

// CORE ROUTES
app.get('/', (req, res) => {
  res.json({
    name: 'Modular Blockchain API Server',
    status: 'running',
    version: '2.0.0',
    architecture: 'modular-routes',
    blockchain: { url: BLOCKCHAIN_URL, chainId: BLOCKCHAIN_CHAIN_ID },
    contracts: Object.keys(CONTRACTS),
    routeModules: ['user', 'task', 'company', 'attendance', 'employee']
  });
});

// =================================
// MOUNT MODULAR ROUTES
// =================================
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);
app.use('/companies', companyRoutes);
app.use('/attendances', attendanceRoutes);
app.use('/employees', employeeRoutes);

// ERROR HANDLING & 404
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message, timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// SERVER STARTUP
const server = app.listen(PORT, HOST, async () => {
  console.log(`Config: ${HOST}:${PORT} -> ${BLOCKCHAIN_URL} (Chain: ${BLOCKCHAIN_CHAIN_ID})`);
  console.log('Modular Blockchain API Server started!');
  console.log(`URL: http://localhost:${PORT}`);
  console.log('Architecture: Modular Routes (v2.0.0)');
  console.log(`Supported Contracts: ${Object.keys(CONTRACTS).join(', ')}`);
  console.log('Route Modules: User, Task, Company, Attendance, Employee');

  try {
    const connected = await web3.eth.net.isListening();
    if (connected) {
      const chainId = await web3.eth.getChainId();
      const block = await web3.eth.getBlockNumber();
      console.log(`Blockchain: Chain ${chainId}, Block ${block}`);
    }
  } catch (error) {
    console.error('Blockchain connection failed:', error.message);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
