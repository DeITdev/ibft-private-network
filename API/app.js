// app.js - Simple Blockchain API Server
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

console.log('Starting Blockchain API Server...');
console.log(`Config: ${HOST}:${PORT} -> ${BLOCKCHAIN_URL} (Chain: ${BLOCKCHAIN_CHAIN_ID})`);

// Initialize Web3
const web3 = new EEAClient(new Web3(BLOCKCHAIN_URL), BLOCKCHAIN_CHAIN_ID);

// Contract configurations
const CONTRACTS = {
  simple: {
    name: 'SimpleStorage',
    file: 'SimpleStorage.json',
    defaultArgs: [123],
    gasLimit: 5000000 // Increased gas limit
  },
  employee: {
    name: 'EmployeeStorage',
    file: 'EmployeeStorage.json',
    defaultArgs: [],
    gasLimit: 8000000 // Increased gas limit for larger contract
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

  // Fix zero gas price for local networks
  if (!gasPrice || gasPrice === '0') gasPrice = '1000000000';

  console.log(`Transaction Details:`);
  console.log(`  From: ${account.address}`);
  console.log(`  To: ${contractAddress}`);
  console.log(`  Nonce: ${nonce}`);
  console.log(`  Gas Price: ${gasPrice}`);
  console.log(`  Gas Limit: ${gasLimit}`);

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

  console.log('Sending transaction...');
  const receipt = await web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'));

  console.log('Transaction Receipt:');
  console.log(`  Transaction Hash: ${receipt.transactionHash}`);
  console.log(`  Block Number: ${receipt.blockNumber}`);
  console.log(`  Block Hash: ${receipt.blockHash}`);
  console.log(`  Gas Used: ${receipt.gasUsed}/${gasLimit}`);
  console.log(`  Status: ${receipt.status ? 'Success' : 'Failed'}`);
  console.log(`  Cumulative Gas Used: ${receipt.cumulativeGasUsed}`);

  if (!receipt.status) throw new Error('Transaction failed');

  return receipt;
}

// Routes

// Server status
app.get('/', (req, res) => {
  res.json({
    name: 'Blockchain API Server',
    status: 'running',
    blockchain: { url: BLOCKCHAIN_URL, chainId: BLOCKCHAIN_CHAIN_ID },
    contracts: Object.keys(CONTRACTS),
    endpoints: [
      'GET /',
      'POST /deploy',
      'GET /deployments',
      'GET /simple',
      'POST /simple',
      'GET /employees',
      'POST /employees',
      'GET /employees/:id'
    ]
  });
});

// Deploy contract
app.post('/deploy', async (req, res) => {
  try {
    const { privateKey, contractType, constructorArgs } = req.body;

    if (!privateKey) return res.status(400).json({ error: 'privateKey required' });
    if (!contractType || !CONTRACTS[contractType]) {
      return res.status(400).json({ error: `contractType required: ${Object.keys(CONTRACTS).join(', ')}` });
    }

    console.log(`Deploying ${contractType} contract...`);

    const { contract, config } = loadContract(contractType);
    const args = constructorArgs || config.defaultArgs;
    const key = privateKey.replace(/^0x/, '');
    const account = web3.eth.accounts.privateKeyToAccount('0x' + key);

    console.log(`Deployer: ${account.address}`);
    console.log(`Args: ${JSON.stringify(args)}`);
    console.log(`Bytecode length: ${contract.bytecode.length} characters`);

    // Check if bytecode looks valid
    if (!contract.bytecode || contract.bytecode.length < 10) {
      throw new Error('Invalid bytecode - contract may not be compiled correctly');
    }

    // Prepare deployment data
    let deployData;
    if (args.length > 0) {
      const instance = new web3.eth.Contract(contract.abi);
      deployData = instance.deploy({ data: contract.bytecode, arguments: args }).encodeABI();
    } else {
      deployData = contract.bytecode;
    }

    console.log(`Deploy data length: ${deployData.length} characters`);

    // Get transaction details
    const nonce = await web3.eth.getTransactionCount(account.address, 'pending');
    let gasPrice = await web3.eth.getGasPrice();
    if (!gasPrice || gasPrice === '0') gasPrice = '1000000000';

    console.log(`Transaction nonce: ${nonce}`);
    console.log(`Gas price: ${gasPrice}`);

    // Try to estimate gas first
    let gasLimit = config.gasLimit;
    try {
      const estimatedGas = await web3.eth.estimateGas({
        data: deployData,
        from: account.address
      });
      gasLimit = Math.floor(parseInt(estimatedGas) * 1.5); // Add 50% buffer
      console.log(`Estimated gas: ${estimatedGas}, Using: ${gasLimit}`);
    } catch (estimateError) {
      console.log(`Gas estimation failed: ${estimateError.message}`);
      console.log(`Using default gas limit: ${gasLimit}`);
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

    console.log('Sending deployment transaction...');
    console.log(`Transaction details:`);
    console.log(`  Gas Limit: ${gasLimit}`);
    console.log(`  Gas Price: ${gasPrice}`);
    console.log(`  Chain ID: ${BLOCKCHAIN_CHAIN_ID}`);

    const receipt = await web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'));

    // Log detailed receipt information
    console.log('Transaction Receipt:');
    console.log(`  Block Hash: ${receipt.blockHash}`);
    console.log(`  Block Number: ${receipt.blockNumber}`);
    console.log(`  Transaction Hash: ${receipt.transactionHash}`);
    console.log(`  Contract Address: ${receipt.contractAddress}`);
    console.log(`  Gas Used: ${receipt.gasUsed}`);
    console.log(`  Gas Limit: ${gasLimit}`);
    console.log(`  Status: ${receipt.status ? 'Success' : 'Failed'}`);
    console.log(`  From: ${receipt.from}`);
    console.log(`  Cumulative Gas Used: ${receipt.cumulativeGasUsed}`);

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
      transactionDetails: {
        nonce: nonce,
        cumulativeGasUsed: receipt.cumulativeGasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        status: receipt.status,
        chainId: BLOCKCHAIN_CHAIN_ID
      }
    };

    // Save deployment info
    const saveFile = path.join(__dirname, `${contractType}-deployment.json`);
    fs.writeFileSync(saveFile, JSON.stringify(info, null, 2));

    console.log('Deployment successful!');
    console.log(`Contract deployed at: ${receipt.contractAddress}`);
    console.log(`Gas efficiency: ${receipt.gasUsed}/${gasLimit} (${((receipt.gasUsed / gasLimit) * 100).toFixed(2)}%)`);
    console.log(`Deployment file saved: ${saveFile}`);

    res.json(info);

  } catch (error) {
    console.error('Deployment failed:', error.message);

    // Provide more specific error messages
    let errorMsg = error.message;
    if (error.message.includes('reverted')) {
      errorMsg = 'Contract deployment reverted. This usually means:\n' +
        '1. Contract constructor failed\n' +
        '2. Not enough gas\n' +
        '3. Invalid constructor arguments\n' +
        '4. Contract compilation error';
    }

    res.status(500).json({
      success: false,
      error: errorMsg,
      troubleshooting: {
        suggestions: [
          'Check if contracts are compiled correctly',
          'Verify constructor arguments',
          'Ensure sufficient gas limit',
          'Check blockchain connection'
        ]
      }
    });
  }
});

// Get deployments
app.get('/deployments', (req, res) => {
  const deployments = {};
  Object.keys(CONTRACTS).forEach(type => {
    const file = path.join(__dirname, `${type}-deployment.json`);
    if (fs.existsSync(file)) {
      deployments[type] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      deployments[type] = { deployed: false };
    }
  });
  res.json({ success: true, data: deployments });
});

// Debug endpoint - check compilation status
app.get('/debug', (req, res) => {
  const debug = {
    compiledContracts: {},
    nodeInfo: {},
    errors: []
  };

  // Check compiled contracts
  Object.keys(CONTRACTS).forEach(type => {
    const config = CONTRACTS[type];
    const file = path.join(__dirname, 'compiled', config.file);

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
        debug.compiledContracts[type] = {
          exists: true,
          error: err.message
        };
      }
    } else {
      debug.compiledContracts[type] = {
        exists: false,
        file: file
      };
      debug.errors.push(`Contract ${type} not compiled: ${config.file}`);
    }
  });

  res.json(debug);
});

// Simple Storage - Read
app.get('/simple', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'simple-deployment.json');
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

// Simple Storage - Write
app.post('/simple', async (req, res) => {
  try {
    const { privateKey, value } = req.body;
    if (!privateKey) return res.status(400).json({ error: 'privateKey required' });
    if (value === undefined) return res.status(400).json({ error: 'value required' });

    const deployFile = path.join(__dirname, 'simple-deployment.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Simple contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('simple');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const data = instance.methods.set(value).encodeABI();
    console.log(`Setting simple storage value: ${value}`);

    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data, 300000);
    console.log('Simple storage value updated successfully!');

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
    console.error('Update failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Employees - List
app.get('/employees', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'employee-deployment.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Employee contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('employee');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalEmployees().call();
    if (total === '0') {
      return res.json({ success: true, employees: [], total: 0 });
    }

    const ids = await instance.methods.getAllEmployeeIds().call();
    const employees = [];

    for (const id of ids) {
      try {
        const emp = await instance.methods.getEmployee(id).call();
        employees.push({
          recordId: emp.recordId,
          createdTimestamp: new Date(parseInt(emp.createdTimestamp) * 1000).toISOString(),
          modifiedTimestamp: new Date(parseInt(emp.modifiedTimestamp) * 1000).toISOString(),
          modifiedBy: emp.modifiedBy,
          allData: JSON.parse(emp.allData)
        });
      } catch (err) {
        console.error(`Error loading employee ${id}:`, err.message);
      }
    }

    res.json({ success: true, employees, total: employees.length });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Employees - Store
app.post('/employees', async (req, res) => {
  try {
    const { privateKey, employeeData } = req.body;
    if (!privateKey) return res.status(400).json({ error: 'privateKey required' });
    if (!employeeData?.recordId) return res.status(400).json({ error: 'employeeData with recordId required' });

    const deployFile = path.join(__dirname, 'employee-deployment.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Employee contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('employee');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const { recordId, createdTimestamp, modifiedTimestamp, modifiedBy, allData } = employeeData;

    const createdUnix = Math.floor(new Date(createdTimestamp).getTime() / 1000);
    const modifiedUnix = Math.floor(new Date(modifiedTimestamp).getTime() / 1000);
    const dataString = typeof allData === 'string' ? allData : JSON.stringify(allData);

    const data = instance.methods.storeEmployee(
      recordId, createdUnix, modifiedUnix, modifiedBy, dataString
    ).encodeABI();

    console.log(`Storing employee data: ${recordId}`);
    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data);
    console.log('Employee data stored successfully!');

    res.json({
      success: true,
      operation: 'store_employee',
      recordId,
      contractAddress: deployment.contractAddress,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Store failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Employees - Get by ID
app.get('/employees/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'employee-deployment.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Employee contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('employee');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const exists = await instance.methods.doesEmployeeExist(recordId).call();
    if (!exists) {
      return res.status(404).json({ error: `Employee ${recordId} not found` });
    }

    const emp = await instance.methods.getEmployee(recordId).call();
    res.json({
      success: true,
      recordId: emp.recordId,
      createdTimestamp: new Date(parseInt(emp.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(emp.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: emp.modifiedBy,
      allData: JSON.parse(emp.allData)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Start server
const server = app.listen(PORT, HOST, async () => {
  console.log('Server started!');
  console.log(`URL: http://localhost:${PORT}`);

  // Test blockchain connection
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

  console.log('Endpoints ready!');
});