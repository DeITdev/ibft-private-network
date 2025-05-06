require('dotenv').config();

const Web3 = require('web3');
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');
const fs = require('fs');
const path = require('path');

// Connection setup
const url = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '1337');

// Create web3 instance with error handling
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

// Load compiled contracts
const contracts = {};
const compiledDir = path.resolve(__dirname, 'compiled');

// Contract type enum (must match the one in EmployeeRegistry.sol)
const CONTRACT_TYPES = {
  BASIC_INFO: 0,
  DATES: 1,
  CONTACT_INFO: 2,
  BASIC_EMPLOYMENT: 3,
  CAREER: 4,
  APPROVAL: 5,
  FINANCIAL: 6,
  PERSONAL: 7
};

// Load all compiled contracts
try {
  const contractFiles = fs.readdirSync(compiledDir).filter(file => file.endsWith('.json'));

  contractFiles.forEach(file => {
    const contractName = file.replace('.json', '');
    const contractData = require(path.join(compiledDir, file));
    contracts[contractName] = contractData;
  });

  console.log('Loaded contracts:', Object.keys(contracts).join(', '));
} catch (error) {
  console.error('Error loading compiled contracts:', error);
}

// Helper function to deploy a contract
async function deployContract(privateKey, contractName) {
  console.log(`Deploying ${contractName} contract...`);

  if (!contracts[contractName]) {
    throw new Error(`Contract ${contractName} not found in compiled contracts`);
  }

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    console.log("Using account:", account.address);

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    console.log("Transaction count:", txCount);
    console.log("Gas price:", gasPrice || "0x1");

    // Build transaction object with modest gas limit
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'), // Ensure non-zero gas price
      gasLimit: web3.utils.toHex(2000000), // Moderate gas limit for deployment
      data: contracts[contractName].bytecode,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log(`${contractName} deployed at:`, receipt.contractAddress);
    return receipt.contractAddress;
  } catch (error) {
    console.error(`Error deploying ${contractName}:`, error);
    throw error;
  }
}

// Helper function to register a contract in the registry
async function registerContract(privateKey, registryAddress, employeeId, contractType, contractAddress) {
  console.log(`Registering contract type ${contractType} for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create registry contract instance
    const registry = new web3.eth.Contract(contracts.EmployeeRegistry.abi, registryAddress);

    // Encode function call
    const encodedCall = registry.methods.registerEmployeeContract(
      employeeId,
      contractType,
      contractAddress
    ).encodeABI();

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(500000), // Lower gas limit for interaction
      data: encodedCall,
      to: registryAddress,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Contract registered successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error registering contract:", error);
    throw error;
  }
}

// Deploy all contracts for an employee
async function deployEmployeeContracts(privateKey) {
  try {
    // Deploy registry if not already deployed
    let registryAddress = process.env.REGISTRY_CONTRACT_ADDRESS;
    if (!registryAddress) {
      registryAddress = await deployContract(privateKey, 'EmployeeRegistry');
      console.log(`Registry deployed at ${registryAddress}`);
    } else {
      console.log(`Using existing registry at ${registryAddress}`);
    }

    // Deploy all specialized contracts
    const basicInfoAddress = await deployContract(privateKey, 'EmployeeBasicInfoStorage');
    const datesAddress = await deployContract(privateKey, 'EmployeeDatesStorage');
    const contactInfoAddress = await deployContract(privateKey, 'EmployeeContactInfoStorage');
    const basicEmploymentAddress = await deployContract(privateKey, 'EmployeeBasicEmploymentStorage');
    const careerAddress = await deployContract(privateKey, 'EmployeeCareerStorage');
    const approvalAddress = await deployContract(privateKey, 'EmployeeApprovalStorage');
    const financialAddress = await deployContract(privateKey, 'EmployeeFinancialStorage');
    const personalAddress = await deployContract(privateKey, 'EmployeePersonalStorage');

    return {
      registryAddress,
      basicInfoAddress,
      datesAddress,
      contactInfoAddress,
      basicEmploymentAddress,
      careerAddress,
      approvalAddress,
      financialAddress,
      personalAddress
    };
  } catch (error) {
    console.error("Error deploying employee contracts:", error);
    throw error;
  }
}

// Register an employee and all their contracts
async function setupEmployee(privateKey, registryAddress, employeeId, employeeName, contractAddresses) {
  try {
    // Create account from private key
    privateKey = privateKey.replace(/^0x/, '');
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create registry contract instance
    const registry = new web3.eth.Contract(contracts.EmployeeRegistry.abi, registryAddress);

    // Register the employee
    const registerEmployeeEncoded = registry.methods.registerEmployee(
      employeeId,
      employeeName
    ).encodeABI();

    // Check and register each contract only if the address is valid
    if (contractAddresses.basicInfoAddress) {
      await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.BASIC_INFO, contractAddresses.basicInfoAddress);
    }

    if (contractAddresses.datesAddress) {
      await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.DATES, contractAddresses.datesAddress);
    }

    if (contractAddresses.contactInfoAddress) {
      await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.CONTACT_INFO, contractAddresses.contactInfoAddress);
    }

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(500000),
      data: registerEmployeeEncoded,
      to: registryAddress,
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

    // Send transaction
    await web3.eth.sendSignedTransaction(rawTx);
    console.log(`Employee ${employeeId} (${employeeName}) registered successfully`);

    // Register all contracts
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.BASIC_INFO, contractAddresses.basicInfoAddress);
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.DATES, contractAddresses.datesAddress);
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.CONTACT_INFO, contractAddresses.contactInfoAddress);
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.BASIC_EMPLOYMENT, contractAddresses.basicEmploymentAddress);
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.CAREER, contractAddresses.careerAddress);
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.APPROVAL, contractAddresses.approvalAddress);
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.FINANCIAL, contractAddresses.financialAddress);
    await registerContract(privateKey, registryAddress, employeeId, CONTRACT_TYPES.PERSONAL, contractAddresses.personalAddress);

    return {
      success: true,
      employeeId,
      employeeName,
      registryAddress,
      contractAddresses
    };
  } catch (error) {
    console.error("Error setting up employee:", error);
    throw error;
  }
}

// Complete setup function that does everything
async function setupEmployeeComplete(privateKey, employeeData) {
  try {
    // Extract employee ID and name
    const employeeId = parseInt(employeeData.name.replace(/\D/g, ''), 10) || 1;
    const employeeName = employeeData.employee_name || employeeData.first_name || "Employee";

    console.log(`Setting up contracts for employee ${employeeId} (${employeeName})...`);

    // Step 1: Deploy all contracts if not already deployed
    const contractAddresses = await deployEmployeeContracts(privateKey);

    // Step 2: Register the employee and their contracts
    await setupEmployee(privateKey, contractAddresses.registryAddress, employeeId, employeeName, contractAddresses);

    // Step 3: Store all employee data
    await storeEmployeeData(privateKey, contractAddresses, employeeId, employeeData);

    return {
      success: true,
      employeeId,
      employeeName,
      ...contractAddresses
    };
  } catch (error) {
    console.error("Error in complete employee setup:", error);
    throw error;
  }
}

// Store all employee data across the multiple contracts
async function storeEmployeeData(privateKey, contractAddresses, employeeId, employeeData) {
  try {
    // Store basic info
    await storeBasicInfo(privateKey, contractAddresses.basicInfoAddress, employeeId, employeeData);

    // Store dates
    await storeDates(privateKey, contractAddresses.datesAddress, employeeId, employeeData);

    // Store contact info
    await storeContactInfo(privateKey, contractAddresses.contactInfoAddress, employeeId, employeeData);

    // Store basic employment
    await storeBasicEmployment(privateKey, contractAddresses.basicEmploymentAddress, employeeId, employeeData);

    // Store career info
    await storeCareer(privateKey, contractAddresses.careerAddress, employeeId, employeeData);

    // Store approval info
    await storeApproval(privateKey, contractAddresses.approvalAddress, employeeId, employeeData);

    // Store financial info
    await storeFinancial(privateKey, contractAddresses.financialAddress, employeeId, employeeData);

    // Store personal info
    await storePersonal(privateKey, contractAddresses.personalAddress, employeeId, employeeData);

    console.log(`All data stored for employee ${employeeId}`);
    return true;
  } catch (error) {
    console.error("Error storing employee data:", error);
    throw error;
  }
}

// Store basic info
async function storeBasicInfo(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing basic info for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const basicInfoContract = new web3.eth.Contract(contracts.EmployeeBasicInfoStorage.abi, contractAddress);

    // Extract fields from employeeData, using empty strings for null values
    const firstName = employeeData.firstName || employeeData.first_name || "";
    const middleName = employeeData.middleName || employeeData.middle_name || "";
    const lastName = employeeData.lastName || employeeData.last_name || "";
    const fullName = employeeData.fullName || employeeData.employee_name || "";
    const gender = employeeData.gender || "";
    const salutation = employeeData.salutation || "";
    const company = employeeData.company || "";
    const department = employeeData.department || "";
    const designation = employeeData.designation || "";
    const status = employeeData.status || "";

    // Encode function call
    const encodedCall = basicInfoContract.methods.storeBasicInfo(
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

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedCall,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Basic info stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing basic info:", error);
    throw error;
  }
}

// Store dates
async function storeDates(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing dates for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const datesContract = new web3.eth.Contract(contracts.EmployeeDatesStorage.abi, contractAddress);

    // First store basic dates
    // Extract dates, using 0 for null values
    const dateOfBirth = employeeData.dateOfBirth || employeeData.date_of_birth || 0;
    const dateOfJoining = employeeData.dateOfJoining || employeeData.date_of_joining || 0;
    const dateOfRetirement = employeeData.dateOfRetirement || employeeData.date_of_retirement || 0;
    const creationDate = employeeData.creationDate || employeeData.creation || 0;
    const modificationDate = employeeData.modificationDate || employeeData.modified || 0;

    // Encode function call for basic dates
    const encodedBasicCall = datesContract.methods.storeBasicDates(
      employeeId,
      dateOfBirth,
      dateOfJoining,
      dateOfRetirement,
      creationDate,
      modificationDate
    ).encodeABI();

    // Get transaction count and gas price
    let txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object for basic dates
    let txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedBasicCall,
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

    // Create, sign, and send transaction for basic dates
    let tx = new Tx(txObj, { common: custom });
    const privateKeyBuffer = Buffer.from(privateKey, "hex");
    tx.sign(privateKeyBuffer);

    let serialized = tx.serialize();
    let rawTx = "0x" + serialized.toString("hex");

    // Send transaction for basic dates
    let receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Basic dates stored successfully:", receipt.transactionHash);

    // Now store additional dates
    // Extract additional dates, using 0 for null values
    const scheduledConfirmationDate = employeeData.scheduledConfirmationDate || employeeData.scheduled_confirmation_date || 0;
    const finalConfirmationDate = employeeData.finalConfirmationDate || employeeData.final_confirmation_date || 0;
    const contractEndDate = employeeData.contractEndDate || employeeData.contract_end_date || 0;
    const resignationLetterDate = employeeData.resignationLetterDate || employeeData.resignation_letter_date || 0;
    const relievingDate = employeeData.relievingDate || employeeData.relieving_date || 0;
    const encashmentDate = employeeData.encashmentDate || employeeData.encashment_date || 0;
    const heldOnDate = employeeData.heldOnDate || employeeData.held_on || 0;

    // Encode function call for additional dates
    const encodedAdditionalCall = datesContract.methods.storeAdditionalDates(
      employeeId,
      scheduledConfirmationDate,
      finalConfirmationDate,
      contractEndDate,
      resignationLetterDate,
      relievingDate,
      encashmentDate,
      heldOnDate
    ).encodeABI();

    // Update transaction count
    txCount = await web3.eth.getTransactionCount(account.address, "pending");

    // Build transaction object for additional dates
    txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedAdditionalCall,
      to: contractAddress,
      chainId: chainId
    };

    // Create, sign, and send transaction for additional dates
    tx = new Tx(txObj, { common: custom });
    tx.sign(privateKeyBuffer);

    serialized = tx.serialize();
    rawTx = "0x" + serialized.toString("hex");

    // Send transaction for additional dates
    receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Additional dates stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing dates:", error);
    throw error;
  }
}

// Store contact info
async function storeContactInfo(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing contact info for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const contactInfoContract = new web3.eth.Contract(contracts.EmployeeContactInfoStorage.abi, contractAddress);

    // Extract contact info fields, using empty strings for null values
    const cellNumber = employeeData.cellNumber || employeeData.cell_number || "";
    const personalEmail = employeeData.personalEmail || employeeData.personal_email || "";
    const companyEmail = employeeData.companyEmail || employeeData.company_email || "";
    const preferredContactEmail = employeeData.preferredContactEmail || employeeData.prefered_contact_email || "";
    const currentAddress = employeeData.currentAddress || employeeData.current_address || "";
    const currentAccommodationType = employeeData.currentAccommodationType || employeeData.current_accommodation_type || "";
    const permanentAddress = employeeData.permanentAddress || employeeData.permanent_address || "";
    const permanentAccommodationType = employeeData.permanentAccommodationType || employeeData.permanent_accommodation_type || "";
    const personToBeContacted = employeeData.personToBeContacted || employeeData.person_to_be_contacted || "";
    const emergencyPhoneNumber = employeeData.emergencyPhoneNumber || employeeData.emergency_phone_number || "";
    const relation = employeeData.relation || "";

    // Encode function call
    const encodedCall = contactInfoContract.methods.storeContactInfo(
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

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedCall,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Contact info stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing contact info:", error);
    throw error;
  }
}

// Store basic employment
async function storeBasicEmployment(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing basic employment for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const basicEmploymentContract = new web3.eth.Contract(contracts.EmployeeBasicEmploymentStorage.abi, contractAddress);

    // Extract basic employment fields, using defaults for null values
    const employeeNumber = employeeData.employeeNumber || employeeData.employee_number || "";
    const reportsTo = employeeData.reportsTo || employeeData.reports_to || "";
    const branch = employeeData.branch || "";
    const noticeNumberOfDays = employeeData.noticeNumberOfDays || employeeData.notice_number_of_days || 0;
    const newWorkplace = employeeData.newWorkplace || employeeData.new_workplace || "";
    const leaveEncashed = employeeData.leaveEncashed === "1" || employeeData.leave_encashed === "1" || false;

    // Encode function call
    const encodedCall = basicEmploymentContract.methods.storeBasicEmployment(
      employeeId,
      employeeNumber,
      reportsTo,
      branch,
      noticeNumberOfDays,
      newWorkplace,
      leaveEncashed
    ).encodeABI();

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedCall,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Basic employment stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing basic employment:", error);
    throw error;
  }
}

// Store career info
async function storeCareer(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing career info for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const careerContract = new web3.eth.Contract(contracts.EmployeeCareerStorage.abi, contractAddress);

    // Extract career fields, using empty strings for null values
    const reasonForLeaving = employeeData.reasonForLeaving || employeeData.reason_for_leaving || "";
    const feedback = employeeData.feedback || "";
    const employmentType = employeeData.employmentType || employeeData.employment_type || "";
    const grade = employeeData.grade || "";
    const jobApplicant = employeeData.jobApplicant || employeeData.job_applicant || "";
    const defaultShift = employeeData.defaultShift || employeeData.default_shift || "";

    // Encode function call
    const encodedCall = careerContract.methods.storeCareer(
      employeeId,
      reasonForLeaving,
      feedback,
      employmentType,
      grade,
      jobApplicant,
      defaultShift
    ).encodeABI();

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedCall,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Career info stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing career info:", error);
    throw error;
  }
}

// Store approval info
async function storeApproval(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing approval info for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const approvalContract = new web3.eth.Contract(contracts.EmployeeApprovalStorage.abi, contractAddress);

    // Extract approval fields, using empty strings for null values
    const expenseApprover = employeeData.expenseApprover || employeeData.expense_approver || "";
    const leaveApprover = employeeData.leaveApprover || employeeData.leave_approver || "";
    const shiftRequestApprover = employeeData.shiftRequestApprover || employeeData.shift_request_approver || "";
    const payrollCostCenter = employeeData.payrollCostCenter || employeeData.payroll_cost_center || "";
    const healthInsuranceProvider = employeeData.healthInsuranceProvider || employeeData.health_insurance_provider || "";
    const healthInsuranceNo = employeeData.healthInsuranceNo || employeeData.health_insurance_no || "";

    // Encode function call
    const encodedCall = approvalContract.methods.storeApproval(
      employeeId,
      expenseApprover,
      leaveApprover,
      shiftRequestApprover,
      payrollCostCenter,
      healthInsuranceProvider,
      healthInsuranceNo
    ).encodeABI();

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedCall,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Approval info stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing approval info:", error);
    throw error;
  }
}

// Store financial info
async function storeFinancial(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing financial info for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const financialContract = new web3.eth.Contract(contracts.EmployeeFinancialStorage.abi, contractAddress);

    // Extract financial fields, using empty strings for null values
    const salaryCurrency = employeeData.salaryCurrency || employeeData.salary_currency || "";
    const salaryMode = employeeData.salaryMode || employeeData.salary_mode || "";
    const bankName = employeeData.bankName || employeeData.bank_name || "";
    const bankAccountNo = employeeData.bankAccountNo || employeeData.bank_ac_no || "";
    const iban = employeeData.iban || "";

    // Encode function call
    const encodedCall = financialContract.methods.storeFinancial(
      employeeId,
      salaryCurrency,
      salaryMode,
      bankName,
      bankAccountNo,
      iban
    ).encodeABI();

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedCall,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Financial info stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing financial info:", error);
    throw error;
  }
}

// Store personal info
async function storePersonal(privateKey, contractAddress, employeeId, employeeData) {
  console.log(`Storing personal info for employee ${employeeId}...`);

  // Clean private key (remove 0x prefix if present)
  privateKey = privateKey.replace(/^0x/, '');

  try {
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);

    // Create contract instance
    const personalContract = new web3.eth.Contract(contracts.EmployeePersonalStorage.abi, contractAddress);

    // Extract personal fields, using empty strings for null values
    const maritalStatus = employeeData.maritalStatus || employeeData.marital_status || "";
    const familyBackground = employeeData.familyBackground || employeeData.family_background || "";
    const bloodGroup = employeeData.bloodGroup || employeeData.blood_group || "";
    const healthDetails = employeeData.healthDetails || employeeData.health_details || "";
    const passportNumber = employeeData.passportNumber || employeeData.passport_number || "";
    const validUpto = employeeData.validUpto || employeeData.valid_upto || "";
    const dateOfIssue = employeeData.dateOfIssue || employeeData.date_of_issue || "";
    const placeOfIssue = employeeData.placeOfIssue || employeeData.place_of_issue || "";
    const bio = employeeData.bio || "";
    const attendanceDeviceId = employeeData.attendanceDeviceId || employeeData.attendance_device_id || "";
    const holidayList = employeeData.holidayList || employeeData.holiday_list || "";

    // Encode function call
    const encodedCall = personalContract.methods.storePersonal(
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

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(account.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(300000), // Lower gas limit for data storage
      data: encodedCall,
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

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("Personal info stored successfully:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error("Error storing personal info:", error);
    throw error;
  }
}

// Export the API
module.exports = {
  deployContract,
  registerContract,
  deployEmployeeContracts,
  setupEmployee,
  setupEmployeeComplete,
  storeEmployeeData,
  CONTRACT_TYPES,
  // Add these exports:
  storeBasicInfo,
  storeDates,
  storeContactInfo,
  storeBasicEmployment,
  storeCareer,
  storeApproval,
  storeFinancial,
  storePersonal
};