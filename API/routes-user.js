// routes-user.js - User management routes
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Helper function to load contract (will be injected from app.js)
let loadContract, sendTransaction, web3;

// Initialize route dependencies
function initUserRoutes(dependencies) {
  loadContract = dependencies.loadContract;
  sendTransaction = dependencies.sendTransaction;
  web3 = dependencies.web3;
}

// =================================
// USER CONTRACT ROUTES
// =================================

// Users - List all users
router.get('/', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'User contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalUsers().call();
    if (total === '0') {
      return res.json({ success: true, users: [], total: 0 });
    }

    const ids = await instance.methods.getAllUserIds().call();
    const users = [];

    for (const id of ids) {
      try {
        const user = await instance.methods.getUser(id).call();
        users.push({
          recordId: user.recordId,
          createdTimestamp: new Date(parseInt(user.createdTimestamp) * 1000).toISOString(),
          modifiedTimestamp: new Date(parseInt(user.modifiedTimestamp) * 1000).toISOString(),
          modifiedBy: user.modifiedBy,
          allData: JSON.parse(user.allData)
        });
      } catch (err) {
        console.error(`Error loading user ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      users,
      total: users.length,
      contractAddress: deployment.contractAddress,
      metadata: {
        blockchainNetwork: deployment.transactionDetails?.chainId || 'unknown',
        contractType: 'UserStorage',
        deploymentTime: deployment.deploymentTime
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'list_users'
    });
  }
});

// Users - Store new user data
router.post('/', async (req, res) => {
  try {
    const { privateKey, userData } = req.body;

    // Validation
    if (!privateKey) {
      return res.status(400).json({ error: 'privateKey required' });
    }
    if (!userData?.recordId) {
      return res.status(400).json({ error: 'userData with recordId required' });
    }

    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'User contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const { recordId, createdTimestamp, modifiedTimestamp, modifiedBy, allData } = userData;

    // Convert timestamps to Unix format
    const createdUnix = Math.floor(new Date(createdTimestamp).getTime() / 1000);
    const modifiedUnix = Math.floor(new Date(modifiedTimestamp).getTime() / 1000);
    const dataString = typeof allData === 'string' ? allData : JSON.stringify(allData);

    // Encode the transaction
    const data = instance.methods.storeUser(
      recordId, createdUnix, modifiedUnix, modifiedBy, dataString
    ).encodeABI();

    console.log(`Storing user data: ${recordId}`);
    console.log(`  Email: ${allData.email || 'N/A'}`);
    console.log(`  Full Name: ${allData.full_name || 'N/A'}`);
    console.log(`  User Type: ${allData.user_type || 'N/A'}`);
    console.log(`  Enabled: ${allData.enabled !== undefined ? allData.enabled : 'N/A'}`);
    console.log(`  Role Profile: ${allData.role_profile_name || 'N/A'}`);

    // Send transaction
    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data);
    console.log('User data stored successfully on blockchain!');

    res.json({
      success: true,
      operation: 'store_user',
      recordId,
      userInfo: {
        email: allData.email,
        full_name: allData.full_name,
        user_type: allData.user_type,
        enabled: allData.enabled,
        role_profile_name: allData.role_profile_name,
        language: allData.language,
        time_zone: allData.time_zone
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
    console.error('User store failed:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'store_user'
    });
  }
});

// Users - Get user by ID
router.get('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'User contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if user exists
    const exists = await instance.methods.doesUserExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `User ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get user data
    const user = await instance.methods.getUser(recordId).call();
    const userData = JSON.parse(user.allData);

    res.json({
      success: true,
      recordId: user.recordId,
      createdTimestamp: new Date(parseInt(user.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(user.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: user.modifiedBy,
      allData: userData,
      userInfo: {
        email: userData.email,
        full_name: userData.full_name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: userData.user_type,
        enabled: userData.enabled,
        role_profile_name: userData.role_profile_name,
        language: userData.language,
        time_zone: userData.time_zone,
        phone: userData.phone,
        mobile_no: userData.mobile_no,
        birth_date: userData.birth_date,
        gender: userData.gender
      },
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'UserStorage',
        networkId: deployment.transactionDetails?.chainId
      }
    });

  } catch (error) {
    console.error('Error fetching user:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_user',
      recordId: req.params.recordId
    });
  }
});

// Users - Get user metadata only (without full data)
router.get('/:recordId/metadata', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'User contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if user exists
    const exists = await instance.methods.doesUserExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `User ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get user metadata
    const metadata = await instance.methods.getUserMetadata(recordId).call();

    res.json({
      success: true,
      recordId: metadata.recordId,
      createdTimestamp: new Date(parseInt(metadata.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(metadata.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: metadata.modifiedBy,
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'UserStorage'
      }
    });

  } catch (error) {
    console.error('Error fetching user metadata:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_user_metadata',
      recordId: req.params.recordId
    });
  }
});

// Users - Get users by role
router.get('/role/:roleName', async (req, res) => {
  try {
    const { roleName } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'User contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalUsers().call();
    if (total === '0') {
      return res.json({ success: true, users: [], total: 0 });
    }

    const ids = await instance.methods.getAllUserIds().call();
    const roleUsers = [];

    for (const id of ids) {
      try {
        const user = await instance.methods.getUser(id).call();
        const userData = JSON.parse(user.allData);

        // Filter by role profile name
        if (userData.role_profile_name === roleName) {
          roleUsers.push({
            recordId: user.recordId,
            createdTimestamp: new Date(parseInt(user.createdTimestamp) * 1000).toISOString(),
            modifiedTimestamp: new Date(parseInt(user.modifiedTimestamp) * 1000).toISOString(),
            modifiedBy: user.modifiedBy,
            allData: userData
          });
        }
      } catch (err) {
        console.error(`Error loading user ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      roleName,
      users: roleUsers,
      total: roleUsers.length,
      contractAddress: deployment.contractAddress
    });

  } catch (error) {
    console.error('Error fetching role users:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_role_users',
      roleName: req.params.roleName
    });
  }
});

// Users - Get users by type (System User, Website User)
router.get('/type/:userType', async (req, res) => {
  try {
    const { userType } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'User contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalUsers().call();
    if (total === '0') {
      return res.json({ success: true, users: [], total: 0 });
    }

    const ids = await instance.methods.getAllUserIds().call();
    const typeUsers = [];

    for (const id of ids) {
      try {
        const user = await instance.methods.getUser(id).call();
        const userData = JSON.parse(user.allData);

        // Filter by user type
        if (userData.user_type === userType) {
          typeUsers.push({
            recordId: user.recordId,
            createdTimestamp: new Date(parseInt(user.createdTimestamp) * 1000).toISOString(),
            modifiedTimestamp: new Date(parseInt(user.modifiedTimestamp) * 1000).toISOString(),
            modifiedBy: user.modifiedBy,
            allData: userData
          });
        }
      } catch (err) {
        console.error(`Error loading user ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      userType,
      users: typeUsers,
      total: typeUsers.length,
      contractAddress: deployment.contractAddress
    });

  } catch (error) {
    console.error('Error fetching type users:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_type_users',
      userType: req.params.userType
    });
  }
});

// Users - Get enabled/disabled users
router.get('/status/:enabled', async (req, res) => {
  try {
    const { enabled } = req.params;
    const isEnabled = enabled === 'true' || enabled === '1';

    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'User contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalUsers().call();
    if (total === '0') {
      return res.json({ success: true, users: [], total: 0 });
    }

    const ids = await instance.methods.getAllUserIds().call();
    const statusUsers = [];

    for (const id of ids) {
      try {
        const user = await instance.methods.getUser(id).call();
        const userData = JSON.parse(user.allData);

        // Filter by enabled status
        if (userData.enabled === isEnabled) {
          statusUsers.push({
            recordId: user.recordId,
            createdTimestamp: new Date(parseInt(user.createdTimestamp) * 1000).toISOString(),
            modifiedTimestamp: new Date(parseInt(user.modifiedTimestamp) * 1000).toISOString(),
            modifiedBy: user.modifiedBy,
            allData: userData
          });
        }
      } catch (err) {
        console.error(`Error loading user ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      enabled: isEnabled,
      users: statusUsers,
      total: statusUsers.length,
      contractAddress: deployment.contractAddress
    });

  } catch (error) {
    console.error('Error fetching status users:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_status_users',
      enabled: req.params.enabled
    });
  }
});

// Users - Check if user exists
router.head('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-user.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).end();
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('user');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const exists = await instance.methods.doesUserExist(recordId).call();

    if (exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }

  } catch (error) {
    console.error('Error checking user existence:', error.message);
    res.status(500).end();
  }
});

// Export router and initialization function
module.exports = {
  router,
  initUserRoutes
};