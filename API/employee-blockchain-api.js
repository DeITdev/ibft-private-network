// employee-blockchain-api.js - to be included in app.js or as a separate module
require('dotenv').config();

const Web3 = require('web3');
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');
const fs = require('fs');
const path = require('path');

// Configuration
const url = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '1337');

// Initialize web3
const web3 = new Web3(url);

// Load contract ABI
const employeeContractPath = path.resolve(__dirname, 'compiled', 'EmployeeContract.json');
let employeeContractAbi = [];

try {
  if (fs.existsSync(employeeContractPath)) {
    const contractJson = require(employeeContractPath);
    employeeContractAbi = contractJson.abi;
  } else {
    console.warn(`Warning: Contract not found at ${employeeContractPath}`);
  }
} catch (error) {
  console.error(`Error loading contract ABI: ${error.message}`);
}

// Helper function to create a transaction
async function createTransaction(privateKey, contractAddress, encodedData) {
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
    gasLimit: web3.utils.toHex(500000),
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

  return rawTx;
}

// Store employee function
const storeEmployee = async (privateKey, contractAddress, employeeData) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract basic info, primarily the employee ID and name
    const employeeId = employeeData.id || parseInt(employeeData.name?.replace(/\D/g, '') || '0', 10) || 1;
    const employeeName = employeeData.employeeName || employeeData.employee_name ||
      `${employeeData.firstName || employeeData.first_name || ''} ${employeeData.lastName || employeeData.last_name || ''}`.trim();

    // Encode the register employee function call
    const encodedCall = employeeContract.methods.registerEmployee(
      employeeId,
      employeeName
    ).encodeABI();

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      employeeId: employeeId,
      name: employeeName
    };
  } catch (error) {
    console.error("Error storing employee:", error);
    throw error;
  }
};

// Store basic info function
const storeEmployeeBasicInfo = async (privateKey, contractAddress, employeeId, basicInfo) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract basic info fields
    const firstName = basicInfo.firstName || '';
    const middleName = basicInfo.middleName || '';
    const lastName = basicInfo.lastName || '';
    const fullName = basicInfo.fullName || `${firstName} ${lastName}`.trim();
    const gender = basicInfo.gender || '';
    const salutation = basicInfo.salutation || '';
    const company = basicInfo.company || '';
    const department = basicInfo.department || '';
    const designation = basicInfo.designation || '';
    const status = basicInfo.status || 'Active';

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

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing basic info:", error);
    throw error;
  }
};

// Store dates function
const storeEmployeeDates = async (privateKey, contractAddress, employeeId, dates) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract basic dates
    const dateOfBirth = dates.dateOfBirth || 0;
    const dateOfJoining = dates.dateOfJoining || 0;
    const dateOfRetirement = dates.dateOfRetirement || 0;
    const creationDate = dates.creationDate || 0;
    const modificationDate = dates.modificationDate || 0;

    // Encode the basic dates function call
    const encodedBasicCall = employeeContract.methods.storeBasicDates(
      employeeId,
      dateOfBirth,
      dateOfJoining,
      dateOfRetirement,
      creationDate,
      modificationDate
    ).encodeABI();

    // Create and send transaction for basic dates
    const rawBasicTx = await createTransaction(privateKey, contractAddress, encodedBasicCall);
    const basicReceipt = await web3.eth.sendSignedTransaction(rawBasicTx);

    // Extract additional dates
    const scheduledConfirmationDate = dates.scheduledConfirmationDate || 0;
    const finalConfirmationDate = dates.finalConfirmationDate || 0;
    const contractEndDate = dates.contractEndDate || 0;
    const resignationLetterDate = dates.resignationLetterDate || 0;
    const relievingDate = dates.relievingDate || 0;
    const encashmentDate = dates.encashmentDate || 0;
    const heldOnDate = dates.heldOnDate || 0;

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

    // Create and send transaction for additional dates
    const rawAdditionalTx = await createTransaction(privateKey, contractAddress, encodedAdditionalCall);
    const additionalReceipt = await web3.eth.sendSignedTransaction(rawAdditionalTx);

    return {
      success: true,
      basicDatesHash: basicReceipt.transactionHash,
      additionalDatesHash: additionalReceipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing dates:", error);
    throw error;
  }
};

// Store contact info function
const storeEmployeeContact = async (privateKey, contractAddress, employeeId, contactInfo) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract contact info fields
    const cellNumber = contactInfo.cellNumber || '';
    const personalEmail = contactInfo.personalEmail || '';
    const companyEmail = contactInfo.companyEmail || '';
    const preferredContactEmail = contactInfo.preferredContactEmail || '';
    const currentAddress = contactInfo.currentAddress || '';
    const currentAccommodationType = contactInfo.currentAccommodationType || '';
    const permanentAddress = contactInfo.permanentAddress || '';
    const permanentAccommodationType = contactInfo.permanentAccommodationType || '';
    const personToBeContacted = contactInfo.personToBeContacted || '';
    const emergencyPhoneNumber = contactInfo.emergencyPhoneNumber || '';
    const relation = contactInfo.relation || '';

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

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing contact info:", error);
    throw error;
  }
};

// Store basic employment function
const storeEmployeeEmployment = async (privateKey, contractAddress, employeeId, employment) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract employment fields
    const employeeNumber = employment.employeeNumber || '';
    const reportsTo = employment.reportsTo || '';
    const branch = employment.branch || '';
    const noticeNumberOfDays = employment.noticeNumberOfDays || 0;
    const newWorkplace = employment.newWorkplace || '';
    const leaveEncashed = employment.leaveEncashed || false;

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

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing employment info:", error);
    throw error;
  }
};

// Store career function
const storeEmployeeCareer = async (privateKey, contractAddress, employeeId, career) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract career fields
    const reasonForLeaving = career.reasonForLeaving || '';
    const feedback = career.feedback || '';
    const employmentType = career.employmentType || '';
    const grade = career.grade || '';
    const jobApplicant = career.jobApplicant || '';
    const defaultShift = career.defaultShift || '';

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

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing career info:", error);
    throw error;
  }
};

// Store approval function
const storeEmployeeApproval = async (privateKey, contractAddress, employeeId, approval) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract approval fields
    const expenseApprover = approval.expenseApprover || '';
    const leaveApprover = approval.leaveApprover || '';
    const shiftRequestApprover = approval.shiftRequestApprover || '';
    const payrollCostCenter = approval.payrollCostCenter || '';
    const healthInsuranceProvider = approval.healthInsuranceProvider || '';
    const healthInsuranceNo = approval.healthInsuranceNo || '';

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

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing approval info:", error);
    throw error;
  }
};

// Store financial function
const storeEmployeeFinancial = async (privateKey, contractAddress, employeeId, financial) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract financial fields
    const salaryCurrency = financial.salaryCurrency || '';
    const salaryMode = financial.salaryMode || '';
    const bankName = financial.bankName || '';
    const bankAccountNo = financial.bankAccountNo || '';
    const iban = financial.iban || '';

    // Encode the function call
    const encodedCall = employeeContract.methods.storeFinancial(
      employeeId,
      salaryCurrency,
      salaryMode,
      bankName,
      bankAccountNo,
      iban
    ).encodeABI();

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing financial info:", error);
    throw error;
  }
};

// Store personal function
const storeEmployeePersonal = async (privateKey, contractAddress, employeeId, personal) => {
  try {
    // Create contract instance
    const employeeContract = new web3.eth.Contract(employeeContractAbi, contractAddress);

    // Extract personal fields
    const maritalStatus = personal.maritalStatus || '';
    const familyBackground = personal.familyBackground || '';
    const bloodGroup = personal.bloodGroup || '';
    const healthDetails = personal.healthDetails || '';
    const passportNumber = personal.passportNumber || '';
    const validUpto = personal.validUpto || '';
    const dateOfIssue = personal.dateOfIssue || '';
    const placeOfIssue = personal.placeOfIssue || '';
    const bio = personal.bio || '';
    const attendanceDeviceId = personal.attendanceDeviceId || '';
    const holidayList = personal.holidayList || '';

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

    // Create and send transaction
    const rawTx = await createTransaction(privateKey, contractAddress, encodedCall);
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error("Error storing personal info:", error);
    throw error;
  }
};

// Export all the functions
module.exports = {
  storeEmployee,
  storeEmployeeBasicInfo,
  storeEmployeeDates,
  storeEmployeeContact,
  storeEmployeeEmployment,
  storeEmployeeCareer,
  storeEmployeeApproval,
  storeEmployeeFinancial,
  storeEmployeePersonal
};