const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const { deploy, store, read } = require('./contract');
const { deployAttendance, storeAttendance, getAttendance } = require('./attendance-contract');
const Web3 = require('web3');
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');
const fs = require('fs');
const path = require('path');

// Configure middleware
app.use(bodyparser.json({ limit: '50mb' }));
app.use(bodyparser.urlencoded({ extended: true, limit: '50mb' }));

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

// Connection setup for blockchain
const url = process.env.BLOCKCHAIN_URL || 'http://localhost:8545'; //change this to your blockchain node URL
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '1337');

// Initialize web3 with error handling
let web3;
try {
  web3 = new Web3(url);

  // Test connection
  web3.eth.net.isListening()
    .then(() => console.log("Connected to Ethereum node at", url))
    .catch(err => console.error("Failed to connect to Ethereum node:", err.message));
} catch (error) {
  console.error("Error initializing Web3:", error.message);
}

// Load the contract ABI for the single EmployeeContract
const employeeContractPath = path.resolve(__dirname, 'compiled', 'EmployeeContract.json');
let employeeContractAbi = [];

try {
  if (fs.existsSync(employeeContractPath)) {
    const contractJson = require(employeeContractPath);
    employeeContractAbi = contractJson.abi;
    console.log("Employee contract ABI loaded successfully");
  } else {
    console.warn(`Warning: Employee contract not found at ${employeeContractPath}`);
  }
} catch (error) {
  console.error(`Error loading contract ABI: ${error.message}`);
}

// Create a wrapper function to handle transaction submission with better details
async function executeTransaction(privateKey, contractAddress, encodedData, gasLimit = 500000) {
  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  // Create account from private key
  const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

  // Get transaction count and gas price
  const txCount = await web3.eth.getTransactionCount(account.address, "pending");
  const gasPrice = await web3.eth.getGasPrice();

  // Build transaction object
  const txObj = {
    nonce: web3.utils.toHex(txCount),
    gasPrice: web3.utils.toHex(gasPrice || '0x1'),
    gasLimit: web3.utils.toHex(gasLimit),
    data: encodedData,
    to: contractAddress,
    chainId: chainId
  };

  // Create custom chain configuration
  const custom = Common.default.forCustomChain(
    "mainnet",
    {
      networkId: 123,
      chainId: chainId,
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

  // Send the transaction
  try {
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status ? 'Succeeded' : 'Failed'
    };
  } catch (error) {
    console.error("Transaction error:", error);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

// Existing endpoints
app.post("/deploy", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let result = await deploy(privateKey);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/store", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let contractAddress = req.body.contractAddress;
    let value = req.body.value;
    let result = await store(privateKey, contractAddress, value);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/read", async (req, res) => {
  try {
    let contractAddress = req.query.contractAddress;
    let result = await read(contractAddress);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Attendance endpoints
app.post("/deploy-attendance", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let result = await deployAttendance(privateKey);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/store-attendance", async (req, res) => {
  try {
    const { privateKey, contractAddress, id, employeeName, attendanceDate, status, company } = req.body;
    let result = await storeAttendance(privateKey, contractAddress, id, employeeName, attendanceDate, status, company);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/get-attendance", async (req, res) => {
  try {
    const contractAddress = req.query.contractAddress;
    const id = req.query.id;

    if (!contractAddress || !id) {
      return res.status(400).send({ error: "Missing required parameters: contractAddress and id" });
    }

    const result = await getAttendance(contractAddress, id);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ---- EMPLOYEE SINGLE CONTRACT ENDPOINTS ----

// Register or store a new employee
app.post("/store-employee", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;
    const employeeName = req.body.employeeName;

    if (!privateKey || !contractAddress || !employeeId || !employeeName) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId, employeeName"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Encode the register employee function call
    const encodedCall = employeeContract.methods.registerEmployee(
      employeeId,
      employeeName
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId,
      name: employeeName
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee basic info
app.post("/store-employee-basic-info", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract fields from the request
    const firstName = req.body.firstName || '';
    const middleName = req.body.middleName || '';
    const lastName = req.body.lastName || '';
    const fullName = req.body.fullName || `${firstName} ${lastName}`.trim();
    const gender = req.body.gender || '';
    const salutation = req.body.salutation || '';
    const company = req.body.company || '';
    const department = req.body.department || '';
    const designation = req.body.designation || '';
    const status = req.body.status || 'Active';

    // Encode the function call
    const encodedCall = employeeContract.methods.storeBasicInfo(
      employeeId,
      firstName,
      middleName,
      lastName,
      fullName,
      gender,
      salutation,
      company,
      department,
      designation,
      status
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee dates
app.post("/store-employee-dates", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract basic dates
    const dateOfBirth = req.body.dateOfBirth || 0;
    const dateOfJoining = req.body.dateOfJoining || 0;
    const dateOfRetirement = req.body.dateOfRetirement || 0;
    const creationDate = req.body.creationDate || 0;
    const modificationDate = req.body.modificationDate || 0;

    // Encode the basic dates function call
    const encodedBasicCall = employeeContract.methods.storeBasicDates(
      employeeId,
      dateOfBirth,
      dateOfJoining,
      dateOfRetirement,
      creationDate,
      modificationDate
    ).encodeABI();

    // Execute transaction for basic dates
    const basicTransactionResult = await executeTransaction(privateKey, contractAddress, encodedBasicCall);

    // Extract additional dates
    const scheduledConfirmationDate = req.body.scheduledConfirmationDate || 0;
    const finalConfirmationDate = req.body.finalConfirmationDate || 0;
    const contractEndDate = req.body.contractEndDate || 0;
    const resignationLetterDate = req.body.resignationLetterDate || 0;
    const relievingDate = req.body.relievingDate || 0;
    const encashmentDate = req.body.encashmentDate || 0;
    const heldOnDate = req.body.heldOnDate || 0;

    // Encode the additional dates function call
    const encodedAdditionalCall = employeeContract.methods.storeAdditionalDates(
      employeeId,
      scheduledConfirmationDate,
      finalConfirmationDate,
      contractEndDate,
      resignationLetterDate,
      relievingDate,
      encashmentDate,
      heldOnDate
    ).encodeABI();

    // Execute transaction for additional dates
    const additionalTransactionResult = await executeTransaction(privateKey, contractAddress, encodedAdditionalCall);

    // Include both transaction details in the response
    res.send({
      success: true,
      basicDates: {
        transactionHash: basicTransactionResult.transactionHash,
        blockNumber: basicTransactionResult.blockNumber,
        gasUsed: basicTransactionResult.gasUsed,
        status: basicTransactionResult.status
      },
      additionalDates: {
        transactionHash: additionalTransactionResult.transactionHash,
        blockNumber: additionalTransactionResult.blockNumber,
        gasUsed: additionalTransactionResult.gasUsed,
        status: additionalTransactionResult.status
      },
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee contact info
app.post("/store-employee-contact", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract fields
    const cellNumber = req.body.cellNumber || '';
    const personalEmail = req.body.personalEmail || '';
    const companyEmail = req.body.companyEmail || '';
    const preferredContactEmail = req.body.preferredContactEmail || '';
    const currentAddress = req.body.currentAddress || '';
    const currentAccommodationType = req.body.currentAccommodationType || '';
    const permanentAddress = req.body.permanentAddress || '';
    const permanentAccommodationType = req.body.permanentAccommodationType || '';
    const personToBeContacted = req.body.personToBeContacted || '';
    const emergencyPhoneNumber = req.body.emergencyPhoneNumber || '';
    const relation = req.body.relation || '';

    // Encode the function call
    const encodedCall = employeeContract.methods.storeContactInfo(
      employeeId,
      cellNumber,
      personalEmail,
      companyEmail,
      preferredContactEmail,
      currentAddress,
      currentAccommodationType,
      permanentAddress,
      permanentAccommodationType,
      personToBeContacted,
      emergencyPhoneNumber,
      relation
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee employment information
app.post("/store-employee-employment", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract fields
    const employeeNumber = req.body.employeeNumber || '';
    const reportsTo = req.body.reportsTo || '';
    const branch = req.body.branch || '';
    const noticeNumberOfDays = req.body.noticeNumberOfDays || 0;
    const newWorkplace = req.body.newWorkplace || '';
    const leaveEncashed = req.body.leaveEncashed || false;

    // Encode the function call
    const encodedCall = employeeContract.methods.storeBasicEmployment(
      employeeId,
      employeeNumber,
      reportsTo,
      branch,
      noticeNumberOfDays,
      newWorkplace,
      leaveEncashed
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee career information
app.post("/store-employee-career", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract fields
    const reasonForLeaving = req.body.reasonForLeaving || '';
    const feedback = req.body.feedback || '';
    const employmentType = req.body.employmentType || '';
    const grade = req.body.grade || '';
    const jobApplicant = req.body.jobApplicant || '';
    const defaultShift = req.body.defaultShift || '';

    // Encode the function call
    const encodedCall = employeeContract.methods.storeCareer(
      employeeId,
      reasonForLeaving,
      feedback,
      employmentType,
      grade,
      jobApplicant,
      defaultShift
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee approval information
app.post("/store-employee-approval", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract fields
    const expenseApprover = req.body.expenseApprover || '';
    const leaveApprover = req.body.leaveApprover || '';
    const shiftRequestApprover = req.body.shiftRequestApprover || '';
    const payrollCostCenter = req.body.payrollCostCenter || '';
    const healthInsuranceProvider = req.body.healthInsuranceProvider || '';
    const healthInsuranceNo = req.body.healthInsuranceNo || '';

    // Encode the function call
    const encodedCall = employeeContract.methods.storeApproval(
      employeeId,
      expenseApprover,
      leaveApprover,
      shiftRequestApprover,
      payrollCostCenter,
      healthInsuranceProvider,
      healthInsuranceNo
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee financial information
app.post("/store-employee-financial", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract fields
    const salaryCurrency = req.body.salaryCurrency || '';
    const salaryMode = req.body.salaryMode || '';
    const bankName = req.body.bankName || '';
    const bankAccountNo = req.body.bankAccountNo || '';
    const iban = req.body.iban || '';

    // Encode the function call
    const encodedCall = employeeContract.methods.storeFinancial(
      employeeId,
      salaryCurrency,
      salaryMode,
      bankName,
      bankAccountNo,
      iban
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store employee personal information
app.post("/store-employee-personal", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeId = req.body.employeeId;

    if (!privateKey || !contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: privateKey, contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract fields
    const maritalStatus = req.body.maritalStatus || '';
    const familyBackground = req.body.familyBackground || '';
    const bloodGroup = req.body.bloodGroup || '';
    const healthDetails = req.body.healthDetails || '';
    const passportNumber = req.body.passportNumber || '';
    const validUpto = req.body.validUpto || '';
    const dateOfIssue = req.body.dateOfIssue || '';
    const placeOfIssue = req.body.placeOfIssue || '';
    const bio = req.body.bio || '';
    const attendanceDeviceId = req.body.attendanceDeviceId || '';
    const holidayList = req.body.holidayList || '';

    // Encode the function call
    const encodedCall = employeeContract.methods.storePersonal(
      employeeId,
      maritalStatus,
      familyBackground,
      bloodGroup,
      healthDetails,
      passportNumber,
      validUpto,
      dateOfIssue,
      placeOfIssue,
      bio,
      attendanceDeviceId,
      holidayList
    ).encodeABI();

    // Execute transaction with detailed result
    const transactionResult = await executeTransaction(privateKey, contractAddress, encodedCall);

    // Include transaction details in the response
    res.send({
      success: true,
      transactionHash: transactionResult.transactionHash,
      blockNumber: transactionResult.blockNumber,
      gasUsed: transactionResult.gasUsed,
      status: transactionResult.status,
      employeeId: employeeId
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Retrieve employee data
app.get("/get-employee", async (req, res) => {
  try {
    const contractAddress = req.query.contractAddress;
    const employeeId = req.query.employeeId;

    if (!contractAddress || !employeeId) {
      return res.status(400).send({
        error: "Missing required parameters: contractAddress, employeeId"
      });
    }

    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Get all employee data
    const summary = await employeeContract.methods.getEmployeeSummary(employeeId).call();

    if (!summary.exists) {
      return res.status(404).send({
        error: `Employee with ID ${employeeId} not found`
      });
    }

    // Get detailed information
    const [basicInfo, basicDates, additionalDates, contactInfo, basicEmployment, career, approval, financial, personal] =
      await Promise.all([
        employeeContract.methods.getBasicInfo(employeeId).call(),
        employeeContract.methods.getBasicDates(employeeId).call(),
        employeeContract.methods.getAdditionalDates(employeeId).call(),
        employeeContract.methods.getContactInfo(employeeId).call(),
        employeeContract.methods.getBasicEmployment(employeeId).call(),
        employeeContract.methods.getCareer(employeeId).call(),
        employeeContract.methods.getApproval(employeeId).call(),
        employeeContract.methods.getFinancial(employeeId).call(),
        employeeContract.methods.getPersonal(employeeId).call()
      ]);

    // Format the date fields for better readability
    const formatDate = (timestamp) => {
      if (!timestamp || timestamp === '0') return 'Not set';
      try {
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleDateString();
      } catch (error) {
        return timestamp;
      }
    };

    // Format the response
    const response = {
      employeeId: employeeId,
      name: summary.name,
      status: summary.status,
      basicInfo: {
        firstName: basicInfo[0] || 'Not set',
        middleName: basicInfo[1] || 'Not set',
        lastName: basicInfo[2] || 'Not set',
        fullName: basicInfo[3] || 'Not set',
        gender: basicInfo[4] || 'Not set',
        salutation: basicInfo[5] || 'Not set',
        company: basicInfo[6] || 'Not set',
        department: basicInfo[7] || 'Not set',
        designation: basicInfo[8] || 'Not set',
        status: basicInfo[9] || 'Not set'
      },
      dates: {
        dateOfBirth: formatDate(basicDates[0]),
        dateOfJoining: formatDate(basicDates[1]),
        dateOfRetirement: formatDate(basicDates[2]),
        creationDate: formatDate(basicDates[3]),
        modificationDate: formatDate(basicDates[4]),
        scheduledConfirmationDate: formatDate(additionalDates[0]),
        finalConfirmationDate: formatDate(additionalDates[1]),
        contractEndDate: formatDate(additionalDates[2]),
        resignationLetterDate: formatDate(additionalDates[3]),
        relievingDate: formatDate(additionalDates[4]),
        encashmentDate: formatDate(additionalDates[5]),
        heldOnDate: formatDate(additionalDates[6])
      },
      // Include all other data categories with similar formatting
      contactInfo: {
        cellNumber: contactInfo[0] || 'Not set',
        personalEmail: contactInfo[1] || 'Not set',
        companyEmail: contactInfo[2] || 'Not set',
        preferredContactEmail: contactInfo[3] || 'Not set',
        currentAddress: contactInfo[4] || 'Not set',
        currentAccommodationType: contactInfo[5] || 'Not set',
        permanentAddress: contactInfo[6] || 'Not set',
        permanentAccommodationType: contactInfo[7] || 'Not set',
        personToBeContacted: contactInfo[8] || 'Not set',
        emergencyPhoneNumber: contactInfo[9] || 'Not set',
        relation: contactInfo[10] || 'Not set'
      },
      employment: {
        employeeNumber: basicEmployment[0] || 'Not set',
        reportsTo: basicEmployment[1] || 'Not set',
        branch: basicEmployment[2] || 'Not set',
        noticeNumberOfDays: basicEmployment[3] || '0',
        newWorkplace: basicEmployment[4] || 'Not set',
        leaveEncashed: basicEmployment[5] ? 'Yes' : 'No'
      },
      career: {
        reasonForLeaving: career[0] || 'Not set',
        feedback: career[1] || 'Not set',
        employmentType: career[2] || 'Not set',
        grade: career[3] || 'Not set',
        jobApplicant: career[4] || 'Not set',
        defaultShift: career[5] || 'Not set'
      },
      approval: {
        expenseApprover: approval[0] || 'Not set',
        leaveApprover: approval[1] || 'Not set',
        shiftRequestApprover: approval[2] || 'Not set',
        payrollCostCenter: approval[3] || 'Not set',
        healthInsuranceProvider: approval[4] || 'Not set',
        healthInsuranceNo: approval[5] || 'Not set'
      },
      financial: {
        salaryCurrency: financial[0] || 'Not set',
        salaryMode: financial[1] || 'Not set',
        bankName: financial[2] || 'Not set',
        bankAccountNo: financial[3] || 'Not set',
        iban: financial[4] || 'Not set'
      },
      personal: {
        maritalStatus: personal[0] || 'Not set',
        familyBackground: personal[1] || 'Not set',
        bloodGroup: personal[2] || 'Not set',
        healthDetails: personal[3] || 'Not set',
        passportNumber: personal[4] || 'Not set',
        validUpto: personal[5] || 'Not set',
        dateOfIssue: personal[6] || 'Not set',
        placeOfIssue: personal[7] || 'Not set',
        bio: personal[8] || 'Not set',
        attendanceDeviceId: personal[9] || 'Not set',
        holidayList: personal[10] || 'Not set'
      }
    };

    res.send(response);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.send({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Blockchain API server running on port ${PORT}`);
});