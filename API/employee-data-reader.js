// employee-data-reader.js
require('dotenv').config();

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Initialize Web3 with your blockchain URL
const web3Url = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
const web3 = new Web3(web3Url);

// Contract addresses
const registryAddress = process.env.REGISTRY_CONTRACT_ADDRESS || '0xDE87AF9156a223404885002669D3bE239313Ae33';
const basicInfoAddress = process.env.BASIC_INFO_CONTRACT_ADDRESS || '0x686AfD6e502A81D2e77f2e038A23C0dEf4949A20';
const datesAddress = process.env.DATES_CONTRACT_ADDRESS || '0x664D6EbAbbD5cf656eD07A509AFfBC81f9615741';
const contactInfoAddress = process.env.CONTACT_INFO_CONTRACT_ADDRESS || '0x37A49B1F380c74e47A1544Ac2BB5404FF159275c';
const basicEmploymentAddress = process.env.BASIC_EMPLOYMENT_CONTRACT_ADDRESS || '0x1Be01cBe5a96FBAc978B3f25C3eB5d541233Ab27';
const careerAddress = process.env.CAREER_CONTRACT_ADDRESS || '0x1024d31846670b356f952F4c002E3758Ab9c4FFC';
const approvalAddress = process.env.APPROVAL_CONTRACT_ADDRESS || '0xE6BAb1eAc80e9d68BD76c3bb61abad86133109DD';
const financialAddress = process.env.FINANCIAL_CONTRACT_ADDRESS || '0x0d8425cEa91B9c8d7Dd2bE278Fb945aF78Aba57b';
const personalAddress = process.env.PERSONAL_CONTRACT_ADDRESS || '0x520F3536Ce622A9C90d9E355b2547D9e5cfb76fE';

// Define ABIs for each contract
// These are simplified ABIs with just the methods we need to read data
const registryAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "employeeIds",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "employees",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "bool", "name": "exists", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getEmployeeCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const basicInfoAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getBasicInfo",
    "outputs": [
      { "internalType": "string", "name": "firstName", "type": "string" },
      { "internalType": "string", "name": "middleName", "type": "string" },
      { "internalType": "string", "name": "lastName", "type": "string" },
      { "internalType": "string", "name": "fullName", "type": "string" },
      { "internalType": "string", "name": "gender", "type": "string" },
      { "internalType": "string", "name": "salutation", "type": "string" },
      { "internalType": "string", "name": "company", "type": "string" },
      { "internalType": "string", "name": "department", "type": "string" },
      { "internalType": "string", "name": "designation", "type": "string" },
      { "internalType": "string", "name": "status", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const datesAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getBasicDates",
    "outputs": [
      { "internalType": "uint256", "name": "dateOfBirth", "type": "uint256" },
      { "internalType": "uint256", "name": "dateOfJoining", "type": "uint256" },
      { "internalType": "uint256", "name": "dateOfRetirement", "type": "uint256" },
      { "internalType": "uint256", "name": "creationDate", "type": "uint256" },
      { "internalType": "uint256", "name": "modificationDate", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getAdditionalDates",
    "outputs": [
      { "internalType": "uint256", "name": "scheduledConfirmationDate", "type": "uint256" },
      { "internalType": "uint256", "name": "finalConfirmationDate", "type": "uint256" },
      { "internalType": "uint256", "name": "contractEndDate", "type": "uint256" },
      { "internalType": "uint256", "name": "resignationLetterDate", "type": "uint256" },
      { "internalType": "uint256", "name": "relievingDate", "type": "uint256" },
      { "internalType": "uint256", "name": "encashmentDate", "type": "uint256" },
      { "internalType": "uint256", "name": "heldOnDate", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const contactInfoAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getContactInfo",
    "outputs": [
      { "internalType": "string", "name": "cellNumber", "type": "string" },
      { "internalType": "string", "name": "personalEmail", "type": "string" },
      { "internalType": "string", "name": "companyEmail", "type": "string" },
      { "internalType": "string", "name": "preferredContactEmail", "type": "string" },
      { "internalType": "string", "name": "currentAddress", "type": "string" },
      { "internalType": "string", "name": "currentAccommodationType", "type": "string" },
      { "internalType": "string", "name": "permanentAddress", "type": "string" },
      { "internalType": "string", "name": "permanentAccommodationType", "type": "string" },
      { "internalType": "string", "name": "personToBeContacted", "type": "string" },
      { "internalType": "string", "name": "emergencyPhoneNumber", "type": "string" },
      { "internalType": "string", "name": "relation", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const basicEmploymentAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getBasicEmployment",
    "outputs": [
      { "internalType": "string", "name": "employeeNumber", "type": "string" },
      { "internalType": "string", "name": "reportsTo", "type": "string" },
      { "internalType": "string", "name": "branch", "type": "string" },
      { "internalType": "uint256", "name": "noticeNumberOfDays", "type": "uint256" },
      { "internalType": "string", "name": "newWorkplace", "type": "string" },
      { "internalType": "bool", "name": "leaveEncashed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const careerAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getCareer",
    "outputs": [
      { "internalType": "string", "name": "reasonForLeaving", "type": "string" },
      { "internalType": "string", "name": "feedback", "type": "string" },
      { "internalType": "string", "name": "employmentType", "type": "string" },
      { "internalType": "string", "name": "grade", "type": "string" },
      { "internalType": "string", "name": "jobApplicant", "type": "string" },
      { "internalType": "string", "name": "defaultShift", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const approvalAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getApproval",
    "outputs": [
      { "internalType": "string", "name": "expenseApprover", "type": "string" },
      { "internalType": "string", "name": "leaveApprover", "type": "string" },
      { "internalType": "string", "name": "shiftRequestApprover", "type": "string" },
      { "internalType": "string", "name": "payrollCostCenter", "type": "string" },
      { "internalType": "string", "name": "healthInsuranceProvider", "type": "string" },
      { "internalType": "string", "name": "healthInsuranceNo", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const financialAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getFinancial",
    "outputs": [
      { "internalType": "string", "name": "salaryCurrency", "type": "string" },
      { "internalType": "string", "name": "salaryMode", "type": "string" },
      { "internalType": "string", "name": "bankName", "type": "string" },
      { "internalType": "string", "name": "bankAccountNo", "type": "string" },
      { "internalType": "string", "name": "iban", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const personalAbi = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_employeeId", "type": "uint256" }],
    "name": "getPersonal",
    "outputs": [
      { "internalType": "string", "name": "maritalStatus", "type": "string" },
      { "internalType": "string", "name": "familyBackground", "type": "string" },
      { "internalType": "string", "name": "bloodGroup", "type": "string" },
      { "internalType": "string", "name": "healthDetails", "type": "string" },
      { "internalType": "string", "name": "passportNumber", "type": "string" },
      { "internalType": "string", "name": "validUpto", "type": "string" },
      { "internalType": "string", "name": "dateOfIssue", "type": "string" },
      { "internalType": "string", "name": "placeOfIssue", "type": "string" },
      { "internalType": "string", "name": "bio", "type": "string" },
      { "internalType": "string", "name": "attendanceDeviceId", "type": "string" },
      { "internalType": "string", "name": "holidayList", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Create contract instances
const registryContract = new web3.eth.Contract(registryAbi, registryAddress);
const basicInfoContract = new web3.eth.Contract(basicInfoAbi, basicInfoAddress);
const datesContract = new web3.eth.Contract(datesAbi, datesAddress);
const contactInfoContract = new web3.eth.Contract(contactInfoAbi, contactInfoAddress);
const basicEmploymentContract = new web3.eth.Contract(basicEmploymentAbi, basicEmploymentAddress);
const careerContract = new web3.eth.Contract(careerAbi, careerAddress);
const approvalContract = new web3.eth.Contract(approvalAbi, approvalAddress);
const financialContract = new web3.eth.Contract(financialAbi, financialAddress);
const personalContract = new web3.eth.Contract(personalAbi, personalAddress);

// Format date from timestamp
function formatDate(timestamp) {
  if (!timestamp || timestamp === '0') return 'Not set';
  try {
    // Handle both string and number types
    const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
    if (isNaN(ts) || ts === 0) return 'Not set';

    return new Date(ts * 1000).toLocaleDateString();
  } catch (error) {
    return `${timestamp} (Error formatting date)`;
  }
}

// Helper to check if a string is empty or not
function isEmpty(str) {
  return !str || str === '' || str === '0' || str === 'Not set';
}

// Read employee basic info
async function readBasicInfo(employeeId) {
  try {
    console.log(`Reading basic info from ${basicInfoAddress}...`);
    const result = await basicInfoContract.methods.getBasicInfo(employeeId).call();

    return {
      firstName: result[0] || 'Not set',
      middleName: result[1] || 'Not set',
      lastName: result[2] || 'Not set',
      fullName: result[3] || 'Not set',
      gender: result[4] || 'Not set',
      salutation: result[5] || 'Not set',
      company: result[6] || 'Not set',
      department: result[7] || 'Not set',
      designation: result[8] || 'Not set',
      status: result[9] || 'Not set'
    };
  } catch (error) {
    console.error('Error reading basic info:', error.message);
    return null;
  }
}

// Read employee dates
async function readDates(employeeId) {
  try {
    console.log(`Reading dates from ${datesAddress}...`);
    const basicDates = await datesContract.methods.getBasicDates(employeeId).call();
    const additionalDates = await datesContract.methods.getAdditionalDates(employeeId).call();

    return {
      // Basic dates
      dateOfBirth: formatDate(basicDates[0]),
      dateOfJoining: formatDate(basicDates[1]),
      dateOfRetirement: formatDate(basicDates[2]),
      creationDate: formatDate(basicDates[3]),
      modificationDate: formatDate(basicDates[4]),

      // Additional dates
      scheduledConfirmationDate: formatDate(additionalDates[0]),
      finalConfirmationDate: formatDate(additionalDates[1]),
      contractEndDate: formatDate(additionalDates[2]),
      resignationLetterDate: formatDate(additionalDates[3]),
      relievingDate: formatDate(additionalDates[4]),
      encashmentDate: formatDate(additionalDates[5]),
      heldOnDate: formatDate(additionalDates[6])
    };
  } catch (error) {
    console.error('Error reading dates:', error.message);
    return null;
  }
}

// Read employee contact info
async function readContactInfo(employeeId) {
  try {
    console.log(`Reading contact info from ${contactInfoAddress}...`);
    const result = await contactInfoContract.methods.getContactInfo(employeeId).call();

    return {
      cellNumber: result[0] || 'Not set',
      personalEmail: result[1] || 'Not set',
      companyEmail: result[2] || 'Not set',
      preferredContactEmail: result[3] || 'Not set',
      currentAddress: result[4] || 'Not set',
      currentAccommodationType: result[5] || 'Not set',
      permanentAddress: result[6] || 'Not set',
      permanentAccommodationType: result[7] || 'Not set',
      personToBeContacted: result[8] || 'Not set',
      emergencyPhoneNumber: result[9] || 'Not set',
      relation: result[10] || 'Not set'
    };
  } catch (error) {
    console.error('Error reading contact info:', error.message);
    return null;
  }
}

// Read employee basic employment
async function readBasicEmployment(employeeId) {
  try {
    console.log(`Reading basic employment from ${basicEmploymentAddress}...`);
    const result = await basicEmploymentContract.methods.getBasicEmployment(employeeId).call();

    return {
      employeeNumber: result[0] || 'Not set',
      reportsTo: result[1] || 'Not set',
      branch: result[2] || 'Not set',
      noticeNumberOfDays: result[3] || '0',
      newWorkplace: result[4] || 'Not set',
      leaveEncashed: result[5] ? 'Yes' : 'No'
    };
  } catch (error) {
    console.error('Error reading basic employment:', error.message);
    return null;
  }
}

// Read employee career info
async function readCareer(employeeId) {
  try {
    console.log(`Reading career info from ${careerAddress}...`);
    const result = await careerContract.methods.getCareer(employeeId).call();

    return {
      reasonForLeaving: result[0] || 'Not set',
      feedback: result[1] || 'Not set',
      employmentType: result[2] || 'Not set',
      grade: result[3] || 'Not set',
      jobApplicant: result[4] || 'Not set',
      defaultShift: result[5] || 'Not set'
    };
  } catch (error) {
    console.error('Error reading career info:', error.message);
    return null;
  }
}

// Read employee approval info
async function readApproval(employeeId) {
  try {
    console.log(`Reading approval info from ${approvalAddress}...`);
    const result = await approvalContract.methods.getApproval(employeeId).call();

    return {
      expenseApprover: result[0] || 'Not set',
      leaveApprover: result[1] || 'Not set',
      shiftRequestApprover: result[2] || 'Not set',
      payrollCostCenter: result[3] || 'Not set',
      healthInsuranceProvider: result[4] || 'Not set',
      healthInsuranceNo: result[5] || 'Not set'
    };
  } catch (error) {
    console.error('Error reading approval info:', error.message);
    return null;
  }
}

// Read employee financial info
async function readFinancial(employeeId) {
  try {
    console.log(`Reading financial info from ${financialAddress}...`);
    const result = await financialContract.methods.getFinancial(employeeId).call();

    return {
      salaryCurrency: result[0] || 'Not set',
      salaryMode: result[1] || 'Not set',
      bankName: result[2] || 'Not set',
      bankAccountNo: result[3] || 'Not set',
      iban: result[4] || 'Not set'
    };
  } catch (error) {
    console.error('Error reading financial info:', error.message);
    return null;
  }
}

// Read employee personal info
async function readPersonal(employeeId) {
  try {
    console.log(`Reading personal info from ${personalAddress}...`);
    const result = await personalContract.methods.getPersonal(employeeId).call();

    return {
      maritalStatus: result[0] || 'Not set',
      familyBackground: result[1] || 'Not set',
      bloodGroup: result[2] || 'Not set',
      healthDetails: result[3] || 'Not set',
      passportNumber: result[4] || 'Not set',
      validUpto: result[5] || 'Not set',
      dateOfIssue: result[6] || 'Not set',
      placeOfIssue: result[7] || 'Not set',
      bio: result[8] || 'Not set',
      attendanceDeviceId: result[9] || 'Not set',
      holidayList: result[10] || 'Not set'
    };
  } catch (error) {
    console.error('Error reading personal info:', error.message);
    return null;
  }
}

// Get employee IDs from registry
async function listEmployees() {
  try {
    console.log(`Reading employee registry from ${registryAddress}...`);
    const count = await registryContract.methods.getEmployeeCount().call();
    console.log(`Found ${count} employees in registry`);

    const employees = [];
    for (let i = 0; i < count; i++) {
      try {
        const id = await registryContract.methods.employeeIds(i).call();
        const employee = await registryContract.methods.employees(id).call();

        if (employee.exists) {
          employees.push({
            id: employee.id,
            name: employee.name
          });
        }
      } catch (error) {
        console.error(`Error reading employee at index ${i}:`, error.message);
      }
    }

    return employees;
  } catch (error) {
    console.error('Error listing employees:', error.message);
    return [];
  }
}

// Read all employee data from all contracts
async function readAllEmployeeData(employeeId) {
  try {
    console.log(`\n=== Reading all data for Employee ID: ${employeeId} ===\n`);

    // Check if registry has the employee
    let employeeName = 'Unknown';
    if (registryContract) {
      try {
        const employee = await registryContract.methods.employees(employeeId).call();
        if (employee.exists) {
          employeeName = employee.name;
          console.log(`Found employee in registry: ID ${employee.id}, Name: ${employeeName}`);
        } else {
          console.log(`⚠️ Warning: Employee ID ${employeeId} not found in registry`);
        }
      } catch (error) {
        console.log(`⚠️ Warning: Could not check registry for employee: ${error.message}`);
      }
    }

    console.log(`Reading data for employee ${employeeId} - ${employeeName}...`);

    // Read data from all contracts
    const basicInfo = await readBasicInfo(employeeId);
    const dates = await readDates(employeeId);
    const contactInfo = await readContactInfo(employeeId);
    const basicEmployment = await readBasicEmployment(employeeId);
    const career = await readCareer(employeeId);
    const approval = await readApproval(employeeId);
    const financial = await readFinancial(employeeId);
    const personal = await readPersonal(employeeId);

    // Format and display results
    console.log('\n=== 1. BASIC INFORMATION ===');
    if (basicInfo) {
      console.log(`Full Name: ${basicInfo.fullName}`);
      console.log(`First Name: ${basicInfo.firstName}`);
      console.log(`Middle Name: ${basicInfo.middleName}`);
      console.log(`Last Name: ${basicInfo.lastName}`);
      console.log(`Gender: ${basicInfo.gender}`);
      console.log(`Salutation: ${basicInfo.salutation}`);
      console.log(`Company: ${basicInfo.company}`);
      console.log(`Department: ${basicInfo.department}`);
      console.log(`Designation: ${basicInfo.designation}`);
      console.log(`Status: ${basicInfo.status}`);
    } else {
      console.log('No basic information available');
    }

    console.log('\n=== 2. DATES ===');
    if (dates) {
      console.log(`Date of Birth: ${dates.dateOfBirth}`);
      console.log(`Date of Joining: ${dates.dateOfJoining}`);
      console.log(`Date of Retirement: ${dates.dateOfRetirement}`);
      console.log(`Creation Date: ${dates.creationDate}`);
      console.log(`Last Modified: ${dates.modificationDate}`);

      if (!isEmpty(dates.scheduledConfirmationDate) ||
        !isEmpty(dates.finalConfirmationDate) ||
        !isEmpty(dates.contractEndDate)) {
        console.log('\nAdditional Dates:');
        console.log(`Scheduled Confirmation: ${dates.scheduledConfirmationDate}`);
        console.log(`Final Confirmation: ${dates.finalConfirmationDate}`);
        console.log(`Contract End: ${dates.contractEndDate}`);
        console.log(`Resignation Letter: ${dates.resignationLetterDate}`);
        console.log(`Relieving Date: ${dates.relievingDate}`);
        console.log(`Encashment Date: ${dates.encashmentDate}`);
        console.log(`Held On Date: ${dates.heldOnDate}`);
      }
    } else {
      console.log('No date information available');
    }

    console.log('\n=== 3. CONTACT INFORMATION ===');
    if (contactInfo) {
      console.log(`Cell Number: ${contactInfo.cellNumber}`);
      console.log(`Personal Email: ${contactInfo.personalEmail}`);
      console.log(`Company Email: ${contactInfo.companyEmail}`);
      console.log(`Preferred Email: ${contactInfo.preferredContactEmail}`);

      if (!isEmpty(contactInfo.currentAddress) ||
        !isEmpty(contactInfo.permanentAddress)) {
        console.log('\nAddresses:');
        console.log(`Current Address: ${contactInfo.currentAddress}`);
        console.log(`Current Accommodation: ${contactInfo.currentAccommodationType}`);
        console.log(`Permanent Address: ${contactInfo.permanentAddress}`);
        console.log(`Permanent Accommodation: ${contactInfo.permanentAccommodationType}`);
      }

      if (!isEmpty(contactInfo.personToBeContacted) ||
        !isEmpty(contactInfo.emergencyPhoneNumber)) {
        console.log('\nEmergency Contact:');
        console.log(`Contact Person: ${contactInfo.personToBeContacted}`);
        console.log(`Emergency Phone: ${contactInfo.emergencyPhoneNumber}`);
        console.log(`Relation: ${contactInfo.relation}`);
      }
    } else {
      console.log('No contact information available');
    }

    console.log('\n=== 4. EMPLOYMENT DETAILS ===');
    if (basicEmployment) {
      console.log(`Employee Number: ${basicEmployment.employeeNumber}`);
      console.log(`Reports To: ${basicEmployment.reportsTo}`);
      console.log(`Branch: ${basicEmployment.branch}`);
      console.log(`Notice Period (days): ${basicEmployment.noticeNumberOfDays}`);
      console.log(`New Workplace: ${basicEmployment.newWorkplace}`);
      console.log(`Leave Encashed: ${basicEmployment.leaveEncashed}`);
    } else {
      console.log('No employment details available');
    }

    console.log('\n=== 5. CAREER INFORMATION ===');
    if (career) {
      console.log(`Employment Type: ${career.employmentType}`);
      console.log(`Grade: ${career.grade}`);
      console.log(`Job Applicant: ${career.jobApplicant}`);
      console.log(`Default Shift: ${career.defaultShift}`);
      console.log(`Reason for Leaving: ${career.reasonForLeaving}`);
      console.log(`Feedback: ${career.feedback}`);
    } else {
      console.log('No career information available');
    }

    console.log('\n=== 6. APPROVAL INFORMATION ===');
    if (approval) {
      console.log(`Expense Approver: ${approval.expenseApprover}`);
      console.log(`Leave Approver: ${approval.leaveApprover}`);
      console.log(`Shift Request Approver: ${approval.shiftRequestApprover}`);
      console.log(`Payroll Cost Center: ${approval.payrollCostCenter}`);
      console.log(`Health Insurance Provider: ${approval.healthInsuranceProvider}`);
      console.log(`Health Insurance Number: ${approval.healthInsuranceNo}`);
    } else {
      console.log('No approval information available');
    }

    console.log('\n=== 7. FINANCIAL INFORMATION ===');
    if (financial) {
      console.log(`Salary Currency: ${financial.salaryCurrency}`);
      console.log(`Salary Mode: ${financial.salaryMode}`);
      console.log(`Bank Name: ${financial.bankName}`);
      console.log(`Bank Account Number: ${financial.bankAccountNo}`);
      console.log(`IBAN: ${financial.iban}`);
    } else {
      console.log('No financial information available');
    }

    console.log('\n=== 8. PERSONAL INFORMATION ===');
    if (personal) {
      console.log(`Marital Status: ${personal.maritalStatus}`);
      console.log(`Family Background: ${personal.familyBackground}`);
      console.log(`Blood Group: ${personal.bloodGroup}`);
      console.log(`Health Details: ${personal.healthDetails}`);

      if (!isEmpty(personal.passportNumber)) {
        console.log('\nPassport Details:');
        console.log(`Passport Number: ${personal.passportNumber}`);
        console.log(`Valid Until: ${personal.validUpto}`);
        console.log(`Date of Issue: ${personal.dateOfIssue}`);
        console.log(`Place of Issue: ${personal.placeOfIssue}`);
      }

      console.log('\nOther Details:');
      console.log(`Bio: ${personal.bio}`);
      console.log(`Attendance Device ID: ${personal.attendanceDeviceId}`);
      console.log(`Holiday List: ${personal.holidayList}`);
    } else {
      console.log('No personal information available');
    }

    console.log('\n=== EMPLOYEE DATA SUMMARY ===');
    console.log(`Basic Info: ${basicInfo ? '✓' : '✗'}`);
    console.log(`Basic Info: ${basicInfo ? '✓' : '✗'}`);
    console.log(`Dates: ${dates ? '✓' : '✗'}`);
    console.log(`Contact: ${contactInfo ? '✓' : '✗'}`);
    console.log(`Employment: ${basicEmployment ? '✓' : '✗'}`);
    console.log(`Career: ${career ? '✓' : '✗'}`);
    console.log(`Approval: ${approval ? '✓' : '✗'}`);
    console.log(`Financial: ${financial ? '✓' : '✗'}`);
    console.log(`Personal: ${personal ? '✓' : '✗'}`);

    // Generate JSON output file
    const outputData = {
      employeeId: employeeId,
      name: employeeName,
      basicInfo,
      dates,
      contactInfo,
      basicEmployment,
      career,
      approval,
      financial,
      personal
    };

    // Save to file
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputFile = path.join(outputDir, `employee_${employeeId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`\nData saved to ${outputFile}`);

    return outputData;
  } catch (error) {
    console.error('Error reading all employee data:', error);
    return null;
  }
}

// Main function
async function main() {
  try {
    console.log('Connecting to blockchain at:', web3Url);
    console.log('Checking connection...');

    try {
      const networkId = await web3.eth.net.getId();
      console.log(`Connected to network ID: ${networkId}`);
    } catch (error) {
      console.error('Error connecting to blockchain:', error.message);
      console.log('Will attempt to continue anyway...');
    }

    // Display contract addresses
    console.log('\nContract Addresses:');
    console.log(`Registry: ${registryAddress}`);
    console.log(`Basic Info: ${basicInfoAddress}`);
    console.log(`Dates: ${datesAddress}`);
    console.log(`Contact Info: ${contactInfoAddress}`);
    console.log(`Basic Employment: ${basicEmploymentAddress}`);
    console.log(`Career: ${careerAddress}`);
    console.log(`Approval: ${approvalAddress}`);
    console.log(`Financial: ${financialAddress}`);
    console.log(`Personal: ${personalAddress}`);

    // List employees from registry
    console.log('\nListing employees from registry:');
    let employees = [];
    try {
      employees = await listEmployees();
    } catch (error) {
      console.error('Error listing employees from registry:', error.message);
    }

    if (employees.length === 0) {
      console.log('No employees found in registry or registry not accessible.');
      console.log('Using default employee ID: 1');

      // Read data for employee ID 1
      await readAllEmployeeData(1);
    } else {
      // Display employees
      console.log('Employees in registry:');
      employees.forEach(employee => {
        console.log(`ID: ${employee.id}, Name: ${employee.name}`);
      });

      // Read data for all employees
      for (const employee of employees) {
        await readAllEmployeeData(employee.id);
      }
    }

    console.log('\nData retrieval complete!');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});