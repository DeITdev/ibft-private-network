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

// Local module no longer defines sendTransaction; it will be injected.

// Routes for Employee module
module.exports = (web3, sendTransaction) => {

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
      const receipt = await sendTransaction(privateKey, deployment.contractAddress, data);
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