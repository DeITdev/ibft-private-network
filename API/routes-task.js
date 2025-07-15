// routes-task.js - Task management routes
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Helper function to load contract (will be injected from app.js)
let loadContract, sendTransaction, web3;

// Initialize route dependencies
function initTaskRoutes(dependencies) {
  loadContract = dependencies.loadContract;
  sendTransaction = dependencies.sendTransaction;
  web3 = dependencies.web3;
}

// =================================
// TASK CONTRACT ROUTES
// =================================

// Tasks - List all tasks
router.get('/', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'contract-deployment-task.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Task contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('task');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalTasks().call();
    if (total === '0') {
      return res.json({ success: true, tasks: [], total: 0 });
    }

    const ids = await instance.methods.getAllTaskIds().call();
    const tasks = [];

    for (const id of ids) {
      try {
        const task = await instance.methods.getTask(id).call();
        tasks.push({
          recordId: task.recordId,
          createdTimestamp: new Date(parseInt(task.createdTimestamp) * 1000).toISOString(),
          modifiedTimestamp: new Date(parseInt(task.modifiedTimestamp) * 1000).toISOString(),
          modifiedBy: task.modifiedBy,
          allData: JSON.parse(task.allData)
        });
      } catch (err) {
        console.error(`Error loading task ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      tasks,
      total: tasks.length,
      contractAddress: deployment.contractAddress,
      metadata: {
        blockchainNetwork: deployment.transactionDetails?.chainId || 'unknown',
        contractType: 'TaskStorage',
        deploymentTime: deployment.deploymentTime
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'list_tasks'
    });
  }
});

// Tasks - Store new task data
router.post('/', async (req, res) => {
  try {
    const { privateKey, taskData } = req.body;

    // Validation
    if (!privateKey) {
      return res.status(400).json({ error: 'privateKey required' });
    }
    if (!taskData?.recordId) {
      return res.status(400).json({ error: 'taskData with recordId required' });
    }

    const deployFile = path.join(__dirname, 'contract-deployment-task.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Task contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('task');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const { recordId, createdTimestamp, modifiedTimestamp, modifiedBy, allData } = taskData;

    // Convert timestamps to Unix format
    const createdUnix = Math.floor(new Date(createdTimestamp).getTime() / 1000);
    const modifiedUnix = Math.floor(new Date(modifiedTimestamp).getTime() / 1000);
    const dataString = typeof allData === 'string' ? allData : JSON.stringify(allData);

    // Encode the transaction
    const data = instance.methods.storeTask(
      recordId, createdUnix, modifiedUnix, modifiedBy, dataString
    ).encodeABI();

    console.log(`Storing task data: ${recordId}`);
    console.log(`  Subject: ${allData.subject || 'N/A'}`);
    console.log(`  Project: ${allData.project || 'N/A'}`);
    console.log(`  Status: ${allData.status || 'N/A'}`);
    console.log(`  Priority: ${allData.priority || 'N/A'}`);

    // Send transaction
    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data);
    console.log('Task data stored successfully on blockchain!');

    res.json({
      success: true,
      operation: 'store_task',
      recordId,
      taskInfo: {
        subject: allData.subject,
        project: allData.project,
        status: allData.status,
        priority: allData.priority
      },
      blockchain: {
        contractAddress: deployment.contractAddress,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Task store failed:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'store_task'
    });
  }
});

// Tasks - Get task by ID
router.get('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-task.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Task contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('task');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if task exists
    const exists = await instance.methods.doesTaskExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `Task ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get task data
    const task = await instance.methods.getTask(recordId).call();
    const taskData = JSON.parse(task.allData);

    res.json({
      success: true,
      recordId: task.recordId,
      createdTimestamp: new Date(parseInt(task.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(task.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: task.modifiedBy,
      allData: taskData,
      taskInfo: {
        subject: taskData.subject,
        project: taskData.project,
        status: taskData.status,
        priority: taskData.priority,
        company: taskData.company
      },
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'TaskStorage',
        networkId: deployment.transactionDetails?.chainId
      }
    });

  } catch (error) {
    console.error('Error fetching task:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_task',
      recordId: req.params.recordId
    });
  }
});

// Tasks - Get task metadata only (without full data)
router.get('/:recordId/metadata', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-task.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Task contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('task');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if task exists
    const exists = await instance.methods.doesTaskExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `Task ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get task metadata
    const metadata = await instance.methods.getTaskMetadata(recordId).call();

    res.json({
      success: true,
      recordId: metadata.recordId,
      createdTimestamp: new Date(parseInt(metadata.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(metadata.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: metadata.modifiedBy,
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'TaskStorage'
      }
    });

  } catch (error) {
    console.error('Error fetching task metadata:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_task_metadata',
      recordId: req.params.recordId
    });
  }
});

// Tasks - Check if task exists
router.head('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-task.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).end();
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('task');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const exists = await instance.methods.doesTaskExist(recordId).call();

    if (exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }

  } catch (error) {
    console.error('Error checking task existence:', error.message);
    res.status(500).end();
  }
});

// Export router and initialization function
module.exports = {
  router,
  initTaskRoutes
};