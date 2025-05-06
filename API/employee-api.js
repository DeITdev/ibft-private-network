const express = require('express');
const router = express.Router();
const employeeFactory = require('./employee-contract-factory');

// Deploy registry contract
router.post("/deploy-registry", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;

    if (!privateKey) {
      return res.status(400).send({ error: "Missing private key" });
    }

    // Deploy the registry contract
    const registryAddress = await employeeFactory.deployContract(privateKey, 'EmployeeRegistry');

    res.send({
      success: true,
      registryAddress: registryAddress,
      message: "Employee registry deployed successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Deploy all employee contracts
router.post("/deploy-all-contracts", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;

    if (!privateKey) {
      return res.status(400).send({ error: "Missing private key" });
    }

    // Deploy all contracts
    const contracts = await employeeFactory.deployEmployeeContracts(privateKey);

    res.send({
      success: true,
      ...contracts,
      message: "All employee contracts deployed successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Deploy a specific storage contract
router.post("/deploy-contract", async (req, res) => {
  try {
    const { privateKey, contractName } = req.body;

    if (!privateKey || !contractName) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey and contractName"
      });
    }

    // Validate contract name
    const validNames = [
      'EmployeeRegistry',
      'EmployeeBasicInfoStorage',
      'EmployeeDatesStorage',
      'EmployeeContactInfoStorage',
      'EmployeeBasicEmploymentStorage',
      'EmployeeCareerStorage',
      'EmployeeApprovalStorage',
      'EmployeeFinancialStorage',
      'EmployeePersonalStorage'
    ];

    if (!validNames.includes(contractName)) {
      return res.status(400).send({
        error: `Invalid contract name. Must be one of: ${validNames.join(', ')}`
      });
    }

    // Deploy the requested contract
    const contractAddress = await employeeFactory.deployContract(privateKey, contractName);

    res.send({
      success: true,
      contractName: contractName,
      contractAddress: contractAddress,
      message: `${contractName} deployed successfully`
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Register an employee in the registry
router.post("/register-employee", async (req, res) => {
  try {
    const { privateKey, registryAddress, employeeId, employeeName } = req.body;

    if (!privateKey || !registryAddress || !employeeId || !employeeName) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, registryAddress, employeeId, employeeName"
      });
    }

    // Call the factory to register the employee
    await employeeFactory.setupEmployee(
      privateKey,
      registryAddress,
      parseInt(employeeId, 10),
      employeeName,
      {}
    );

    res.send({
      success: true,
      registryAddress: registryAddress,
      employeeId: employeeId,
      employeeName: employeeName,
      message: "Employee registered successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Register a contract in the registry
router.post("/register-contract-in-registry", async (req, res) => {
  try {
    const { privateKey, registryAddress, employeeId, contractType, contractAddress } = req.body;

    if (!privateKey || !registryAddress || !employeeId || contractType === undefined || !contractAddress) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, registryAddress, employeeId, contractType, contractAddress"
      });
    }

    // Call the factory to register the contract
    await employeeFactory.registerContract(
      privateKey,
      registryAddress,
      parseInt(employeeId, 10),
      parseInt(contractType, 10),
      contractAddress
    );

    res.send({
      success: true,
      registryAddress: registryAddress,
      employeeId: employeeId,
      contractType: contractType,
      contractAddress: contractAddress,
      message: "Contract registered successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Store basic info for an employee
router.post("/store-basic-info", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, basicInfo } = req.body;

    if (!privateKey || !contractAddress || !employeeId || !basicInfo) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId, basicInfo"
      });
    }

    // Call the factory to store basic info
    await employeeFactory.storeBasicInfo(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      basicInfo
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Basic info stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Complete setup for an employee (deploy, register, store all data)
router.post("/setup-employee-complete", async (req, res) => {
  try {
    const { privateKey, employeeData } = req.body;

    if (!privateKey || !employeeData) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, employeeData"
      });
    }

    // Call the factory to complete the setup
    const result = await employeeFactory.setupEmployeeComplete(privateKey, employeeData);

    res.send({
      success: true,
      ...result,
      message: "Employee setup completed successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Additional endpoints for individual data storage
router.post("/store-dates", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, dates } = req.body;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Call the factory to store dates
    await employeeFactory.storeDates(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      dates || req.body
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Dates stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post("/store-contact-info", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, contactInfo } = req.body;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Call the factory to store contact info
    await employeeFactory.storeContactInfo(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      contactInfo || req.body
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Contact info stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post("/store-basic-employment", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, basicEmployment } = req.body;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Call the factory to store basic employment
    await employeeFactory.storeBasicEmployment(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      basicEmployment || req.body
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Basic employment stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post("/store-career", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, career } = req.body;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Call the factory to store career
    await employeeFactory.storeCareer(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      career || req.body
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Career info stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post("/store-approval", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, approval } = req.body;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Call the factory to store approval
    await employeeFactory.storeApproval(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      approval || req.body
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Approval info stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post("/store-financial", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, financial } = req.body;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Call the factory to store financial
    await employeeFactory.storeFinancial(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      financial || req.body
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Financial info stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post("/store-personal", async (req, res) => {
  try {
    const { privateKey, contractAddress, employeeId, personal } = req.body;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Call the factory to store personal
    await employeeFactory.storePersonal(
      privateKey,
      contractAddress,
      parseInt(employeeId, 10),
      personal || req.body
    );

    res.send({
      success: true,
      contractAddress: contractAddress,
      employeeId: employeeId,
      message: "Personal info stored successfully"
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;