// app.js - Organized Blockchain API Server
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

console.log('\n\x1b[36m════════════════════════════════════════════════════════════\x1b[0m');
console.log('\x1b[36m                 BLOCKCHAIN API SERVER                     \x1b[0m');
console.log('\x1b[36m════════════════════════════════════════════════════════════\x1b[0m');
console.log(`\x1b[90m[CONFIG]\x1b[0m Server: \x1b[33m${HOST}:${PORT}\x1b[0m`);
console.log(`\x1b[90m[CONFIG]\x1b[0m Blockchain: \x1b[33m${BLOCKCHAIN_URL}\x1b[0m`);
console.log(`\x1b[90m[CONFIG]\x1b[0m Chain ID: \x1b[33m${BLOCKCHAIN_CHAIN_ID}\x1b[0m`);

// Initialize Web3
const web3 = new EEAClient(new Web3(BLOCKCHAIN_URL), BLOCKCHAIN_CHAIN_ID);

// Contract configurations
const CONTRACTS = {
  simple: {
    name: 'SimpleStorage',
    file: 'SimpleStorage.json',
    defaultArgs: [123],
    gasLimit: 5000000
  },
  employee: {
    name: 'EmployeeStorage',
    file: 'EmployeeStorage.json',
    defaultArgs: [],
    gasLimit: 8000000
  },
  user: {
    name: 'UserStorage',
    file: 'UserStorage.json',
    defaultArgs: [],
    gasLimit: 8000000
  }
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

  console.log('\n\x1b[35m─────────────────────────────────────────────────────────────\x1b[0m');
  console.log('\x1b[35m                    TRANSACTION DETAILS                     \x1b[0m');
  console.log('\x1b[35m─────────────────────────────────────────────────────────────\x1b[0m');
  console.log(`\x1b[90m[TX]\x1b[0m From: \x1b[32m${account.address}\x1b[0m`);
  console.log(`\x1b[90m[TX]\x1b[0m To: \x1b[32m${contractAddress}\x1b[0m`);
  console.log(`\x1b[90m[TX]\x1b[0m Nonce: \x1b[33m${nonce}\x1b[0m`);
  console.log(`\x1b[90m[TX]\x1b[0m Gas Price: \x1b[33m${gasPrice}\x1b[0m`);
  console.log(`\x1b[90m[TX]\x1b[0m Gas Limit: \x1b[33m${gasLimit}\x1b[0m`);

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

  console.log('\x1b[34m[BLOCKCHAIN]\x1b[0m >>> Sending transaction...');
  const receipt = await web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'));

  console.log('\n\x1b[35m─────────────────────────────────────────────────────────────\x1b[0m');
  console.log('\x1b[35m                    TRANSACTION RECEIPT                     \x1b[0m');
  console.log('\x1b[35m─────────────────────────────────────────────────────────────\x1b[0m');
  console.log(`\x1b[90m[RECEIPT]\x1b[0m Hash: \x1b[36m${receipt.transactionHash}\x1b[0m`);
  console.log(`\x1b[90m[RECEIPT]\x1b[0m Block: \x1b[33m${receipt.blockNumber}\x1b[0m`);
  console.log(`\x1b[90m[RECEIPT]\x1b[0m Gas Used: \x1b[33m${receipt.gasUsed}\x1b[0m / \x1b[33m${gasLimit}\x1b[0m`);
  console.log(`\x1b[90m[RECEIPT]\x1b[0m Status: ${receipt.status ? '\x1b[32mSUCCESS\x1b[0m' : '\x1b[31mFAILED\x1b[0m'}`);

  if (!receipt.status) throw new Error('Transaction failed');
  return receipt;
}

// Import route modules
const employeeRoutes = require('./routes-employee')(web3);
const userRoutes = require('./routes-user')(web3);

// Main Routes

// Server status
app.get('/', (req, res) => {
  res.json({
    name: 'Blockchain API Server',
    status: 'running',
    blockchain: { url: BLOCKCHAIN_URL, chainId: BLOCKCHAIN_CHAIN_ID },
    contracts: Object.keys(CONTRACTS),
    modules: [
      'employees',
      'users',
      'accounting',
      'assets',
      'crm',
      'hr',
      'payroll',
      'projects',
      'stock'
    ],
    endpoints: [
      'GET /',
      'POST /deploy',
      'GET /deployments',
      'GET /debug',
      'GET /simple',
      'POST /simple',
      'GET /employees',
      'POST /employees',
      'GET /employees/:id',
      'GET /users',
      'POST /users',
      'GET /users/:id'
    ]
  });
});

// Use modular routes
app.use('/employees', employeeRoutes);
app.use('/users', userRoutes);

// Deploy contract
app.post('/deploy', async (req, res) => {
  try {
    const { privateKey, contractType, constructorArgs } = req.body;

    if (!privateKey) return res.status(400).json({ error: 'privateKey required' });
    if (!contractType || !CONTRACTS[contractType]) {
      return res.status(400).json({ error: `contractType required: ${Object.keys(CONTRACTS).join(', ')}` });
    }

    console.log('\n\x1b[33m════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[33m                    DEPLOYING CONTRACT                      \x1b[0m');
    console.log('\x1b[33m════════════════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[90m[DEPLOY]\x1b[0m Contract Type: \x1b[36m${contractType}\x1b[0m`);

    const { contract, config } = loadContract(contractType);
    const args = constructorArgs || config.defaultArgs;
    const key = privateKey.replace(/^0x/, '');
    const account = web3.eth.accounts.privateKeyToAccount('0x' + key);

    console.log(`\x1b[90m[DEPLOY]\x1b[0m Contract Name: \x1b[36m${config.name}\x1b[0m`);
    console.log(`\x1b[90m[DEPLOY]\x1b[0m Deployer: \x1b[32m${account.address}\x1b[0m`);
    console.log(`\x1b[90m[DEPLOY]\x1b[0m Constructor Args: \x1b[33m${JSON.stringify(args)}\x1b[0m`);

    let deployData;
    if (args.length > 0) {
      const instance = new web3.eth.Contract(contract.abi);
      deployData = instance.deploy({ data: contract.bytecode, arguments: args }).encodeABI();
    } else {
      deployData = contract.bytecode;
    }

    const nonce = await web3.eth.getTransactionCount(account.address, 'pending');
    let gasPrice = await web3.eth.getGasPrice();
    if (!gasPrice || gasPrice === '0') gasPrice = '1000000000';

    let gasLimit = config.gasLimit;
    try {
      const estimatedGas = await web3.eth.estimateGas({
        data: deployData,
        from: account.address
      });
      gasLimit = Math.floor(parseInt(estimatedGas) * 1.5);
      console.log(`\x1b[90m[DEPLOY]\x1b[0m Gas Estimated: \x1b[33m${estimatedGas}\x1b[0m → Using: \x1b[33m${gasLimit}\x1b[0m`);
    } catch (estimateError) {
      console.log(`\x1b[90m[DEPLOY]\x1b[0m Gas estimation failed, using default: \x1b[33m${gasLimit}\x1b[0m`);
    }

    const txObj = {
      nonce: web3.utils.toHex(nonce),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(gasLimit),
      data: deployData,
      chainId: BLOCKCHAIN_CHAIN_ID
    };

    const custom = Common.default.forCustomChain('mainnet', {
      chainId: BLOCKCHAIN_CHAIN_ID
    }, 'istanbul');

    const tx = new Tx(txObj, { common: custom });
    tx.sign(Buffer.from(key, 'hex'));

    console.log('\x1b[34m[BLOCKCHAIN]\x1b[0m >>> Sending deployment transaction...');
    const receipt = await web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'));

    if (!receipt.contractAddress) throw new Error('Deployment failed - no contract address');
    if (!receipt.status) throw new Error('Deployment failed - transaction reverted');

    const info = {
      success: true,
      contractType,
      contractName: config.name,
      contractAddress: receipt.contractAddress,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
      deployerAddress: account.address,
      deploymentTime: new Date().toISOString(),
      constructorArgs: args,
      network: {
        url: BLOCKCHAIN_URL,
        chainId: BLOCKCHAIN_CHAIN_ID
      }
    };

    // Save deployment info
    const saveFile = path.join(__dirname, `contract-deployment-${contractType}.json`);
    fs.writeFileSync(saveFile, JSON.stringify(info, null, 2));

    console.log('\n\x1b[32m════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[32m                   DEPLOYMENT SUCCESS                       \x1b[0m');
    console.log('\x1b[32m════════════════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[90m[SUCCESS]\x1b[0m Contract Address: \x1b[32m${receipt.contractAddress}\x1b[0m`);
    console.log(`\x1b[90m[SUCCESS]\x1b[0m Transaction Hash: \x1b[36m${receipt.transactionHash}\x1b[0m`);
    console.log(`\x1b[90m[SUCCESS]\x1b[0m Block Number: \x1b[33m${receipt.blockNumber}\x1b[0m`);
    console.log(`\x1b[90m[SUCCESS]\x1b[0m Gas Efficiency: \x1b[33m${receipt.gasUsed}\x1b[0m/\x1b[33m${gasLimit}\x1b[0m (\x1b[33m${((receipt.gasUsed / gasLimit) * 100).toFixed(2)}%\x1b[0m)`);
    console.log(`\x1b[90m[SUCCESS]\x1b[0m Deployment file: \x1b[37m${saveFile}\x1b[0m`);
    console.log('\x1b[90m─────────────────────────────────────────────────────────────\x1b[0m\n');

    res.json(info);

  } catch (error) {
    console.log('\n\x1b[31m════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[31m                   DEPLOYMENT FAILED                        \x1b[0m');
    console.log('\x1b[31m════════════════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[90m[ERROR]\x1b[0m \x1b[31m${error.message}\x1b[0m`);
    console.log('\x1b[90m─────────────────────────────────────────────────────────────\x1b[0m\n');

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get deployments
app.get('/deployments', (req, res) => {
  const deployments = {};
  Object.keys(CONTRACTS).forEach(type => {
    const file = path.join(__dirname, `contract-deployment-${type}.json`);
    if (fs.existsSync(file)) {
      deployments[type] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      deployments[type] = { deployed: false };
    }
  });
  res.json({ success: true, data: deployments });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  const debug = {
    compiledContracts: {},
    deployedContracts: {},
    errors: []
  };

  Object.keys(CONTRACTS).forEach(type => {
    const config = CONTRACTS[type];
    const file = path.join(__dirname, 'compiled', config.file);
    const deployFile = path.join(__dirname, `${type}-contract-deployment.json`);

    if (fs.existsSync(file)) {
      try {
        const contract = require(file);
        debug.compiledContracts[type] = {
          exists: true,
          hasABI: !!contract.abi,
          hasBytecode: !!contract.bytecode,
          bytecodeLength: contract.bytecode ? contract.bytecode.length : 0,
          abiMethods: contract.abi ? contract.abi.filter(x => x.type === 'function').length : 0
        };
      } catch (err) {
        debug.compiledContracts[type] = { exists: true, error: err.message };
      }
    } else {
      debug.compiledContracts[type] = { exists: false };
      debug.errors.push(`Contract ${type} not compiled`);
    }

    debug.deployedContracts[type] = {
      deployed: fs.existsSync(deployFile)
    };
  });

  res.json(debug);
});

// Simple Storage routes (keeping existing functionality)
app.get('/simple', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'contract-deployment-simple.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Simple contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('simple');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const value = await instance.methods.get().call();
    res.json({ success: true, value, contractAddress: deployment.contractAddress });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/simple', async (req, res) => {
  try {
    const { privateKey, value } = req.body;
    if (!privateKey) return res.status(400).json({ error: 'privateKey required' });
    if (value === undefined) return res.status(400).json({ error: 'value required' });

    const deployFile = path.join(__dirname, 'contract-deployment-simple.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Simple contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('simple');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const data = instance.methods.set(value).encodeABI();
    console.log(`\x1b[90m[SIMPLE]\x1b[0m Setting storage value: \x1b[33m${value}\x1b[0m`);

    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data, 300000);
    console.log('\x1b[90m[SIMPLE]\x1b[0m \x1b[32m✓ Value updated successfully\x1b[0m');

    res.json({
      success: true,
      operation: 'set_value',
      value,
      contractAddress: deployment.contractAddress,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log(`\x1b[90m[SIMPLE]\x1b[0m \x1b[31m✗ Update failed: ${error.message}\x1b[0m`);
    res.status(500).json({ error: error.message });
  }
});

// Error handlers
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Start server
const server = app.listen(PORT, HOST, async () => {
  console.log('\n\x1b[36m════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[36m                     SERVER STARTED                         \x1b[0m');
  console.log('\x1b[36m════════════════════════════════════════════════════════════\x1b[0m');
  console.log(`\x1b[90m[SERVER]\x1b[0m URL: \x1b[37mhttp://localhost:${PORT}\x1b[0m`);

  try {
    const connected = await web3.eth.net.isListening();
    if (connected) {
      const chainId = await web3.eth.getChainId();
      const block = await web3.eth.getBlockNumber();
      console.log(`\x1b[90m[BLOCKCHAIN]\x1b[0m \x1b[32m✓ Connected to Chain ${chainId}, Block ${block}\x1b[0m`);
    }
  } catch (error) {
    console.log(`\x1b[90m[BLOCKCHAIN]\x1b[0m \x1b[31m✗ Connection failed: ${error.message}\x1b[0m`);
  }

  console.log('\x1b[90m[SERVER]\x1b[0m \x1b[32m✓ All endpoints ready\x1b[0m');
  console.log('\x1b[90m─────────────────────────────────────────────────────────────\x1b[0m\n');
});