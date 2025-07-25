// routes-employee.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Helper function to load contract
function loadEmployeeContract() {
  const contractPath = path.join(__dirname, 'compiled', 'EmployeeStorage.json');
  if (!fs.existsSync(contractPath)) {
    throw new Error('EmployeeStorage contract not compiled');
  }
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

// Helper function to get deployment info
function getEmployeeDeployment() {
  const deployFile = path.join(__dirname, 'contract-deployment-employee.json');
  if (!fs.existsSync(deployFile)) {
    throw new Error('Employee contract not deployed');
  }
  return JSON.parse(fs.readFileSync(deployFile, 'utf8'));
}

// Helper function for transactions (imported from main app)
async function sendTransaction(web3, privateKey, contractAddress, data, gasLimit = 800000) {
  const Tx = require("ethereumjs-tx").Transaction;
  const Common = require('ethereumjs-common');

  const key = privateKey.replace(/^0x/, '');
  const account = web3.eth.accounts.privateKeyToAccount('0x' + key);
  const nonce = await web3.eth.getTransactionCount(account.address, 'pending');
  let gasPrice = await web3.eth.getGasPrice();

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
    chainId: process.env.BLOCKCHAIN_CHAIN_ID || 1337
  };

  const custom = Common.default.forCustomChain('mainnet', {
    networkId: 123,
    chainId: process.env.BLOCKCHAIN_CHAIN_ID || 1337,
    name: 'besu-network'
  }, 'istanbul');

  const tx = new Tx(txObj, { common: custom });
  tx.sign(Buffer.from(key, 'hex'));

  console.log('Sending transaction...');
  const receipt = await web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'));

  console.log('Transaction Receipt:');
  console.log(`  Transaction Hash: ${receipt.transactionHash}`);
  console.log(`  Block Number: ${receipt.blockNumber}`);
  console.log(`  Gas Used: ${receipt.gasUsed}/${gasLimit}`);
  console.log(`  Status: ${receipt.status ? 'Success' : 'Failed'}`);

  if (!receipt.status) throw new Error('Transaction failed');
  return receipt;
}

// Routes for Employee module
module.exports = (web3) => {

  // GET /employees - List all employees
  router.get('/', async (req, res) => {
    try {
      const deployment = getEmployeeDeployment();
      const contract = loadEmployeeContract();
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
          console.log(`\x1b[90m[EMPLOYEE]\x1b[0m \x1b[31m✗ Error loading ${id}: ${err.message}\x1b[0m`);
        }
      }

      res.json({
        success: true,
        employees,
        total: employees.length,
        contractAddress: deployment.contractAddress
      });

    } catch (error) {
      console.log(`\x1b[90m[EMPLOYEE]\x1b[0m \x1b[31m✗ Get list failed: ${error.message}\x1b[0m`);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /employees - Store new employee
  router.post('/', async (req, res) => {
    try {
      const { privateKey, employeeData } = req.body;

      if (!privateKey) {
        return res.status(400).json({ error: 'privateKey required' });
      }
      if (!employeeData?.recordId) {
        return res.status(400).json({ error: 'employeeData with recordId required' });
      }

      const deployment = getEmployeeDeployment();
      const contract = loadEmployeeContract();
      const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

      const { recordId, createdTimestamp, modifiedTimestamp, modifiedBy, allData } = employeeData;

      const createdUnix = Math.floor(new Date(createdTimestamp).getTime() / 1000);
      const modifiedUnix = Math.floor(new Date(modifiedTimestamp).getTime() / 1000);
      const dataString = typeof allData === 'string' ? allData : JSON.stringify(allData);

      const data = instance.methods.storeEmployee(
        recordId, createdUnix, modifiedUnix, modifiedBy, dataString
      ).encodeABI();

      console.log(`\x1b[90m[EMPLOYEE]\x1b[0m Storing data for: \x1b[33m${recordId}\x1b[0m`);
      const receipt = await sendTransaction(web3, privateKey, deployment.contractAddress, data);
      console.log('\x1b[90m[EMPLOYEE]\x1b[0m \x1b[32m✓ Data stored successfully\x1b[0m');

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
      console.log(`\x1b[90m[EMPLOYEE]\x1b[0m \x1b[31m✗ Store failed: ${error.message}\x1b[0m`);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /employees/:recordId - Get specific employee
  router.get('/:recordId', async (req, res) => {
    try {
      const { recordId } = req.params;

      const deployment = getEmployeeDeployment();
      const contract = loadEmployeeContract();
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
        allData: JSON.parse(emp.allData),
        contractAddress: deployment.contractAddress
      });

    } catch (error) {
      console.log(`\x1b[90m[EMPLOYEE]\x1b[0m \x1b[31m✗ Get ${req.params.recordId} failed: ${error.message}\x1b[0m`);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /employees/:recordId/metadata - Get employee metadata only
  router.get('/:recordId/metadata', async (req, res) => {
    try {
      const { recordId } = req.params;

      const deployment = getEmployeeDeployment();
      const contract = loadEmployeeContract();
      const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

      const exists = await instance.methods.doesEmployeeExist(recordId).call();
      if (!exists) {
        return res.status(404).json({ error: `Employee ${recordId} not found` });
      }

      const emp = await instance.methods.getEmployeeMetadata(recordId).call();
      res.json({
        success: true,
        recordId: emp.recordId,
        createdTimestamp: new Date(parseInt(emp.createdTimestamp) * 1000).toISOString(),
        modifiedTimestamp: new Date(parseInt(emp.modifiedTimestamp) * 1000).toISOString(),
        modifiedBy: emp.modifiedBy,
        contractAddress: deployment.contractAddress
      });

    } catch (error) {
      console.log(`\x1b[90m[EMPLOYEE]\x1b[0m \x1b[31m✗ Get metadata ${req.params.recordId} failed: ${error.message}\x1b[0m`);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};