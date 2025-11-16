const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

let loadContract, sendTransaction, web3;

function initSimpleRoutes(dependencies) {
  loadContract = dependencies.loadContract;
  sendTransaction = dependencies.sendTransaction;
  web3 = dependencies.web3;
}

// =================================
// SIMPLE STORAGE CONTRACT ROUTES
// =================================

// Simple - Get stored value
router.get('/', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'contract-deployment-simple.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'SimpleStorage not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('simple');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const value = await instance.methods.get().call();
    res.json({
      value: value,
      contractAddress: deployment.contractAddress,
      deploymentBlock: deployment.blockNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
  }
});

// Simple - Store new value
router.post('/', async (req, res) => {
  try {
    const { value, privateKey } = req.body;
    if (value === undefined || !privateKey) {
      return res.status(400).json({ error: 'Missing value or privateKey' });
    }

    const deployFile = path.join(__dirname, 'contract-deployment-simple.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'SimpleStorage not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('simple');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const data = instance.methods.set(value).encodeABI();
    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data);

    res.json({
      success: true,
      value: value,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
  }
});

module.exports = {
  router,
  initSimpleRoutes
};