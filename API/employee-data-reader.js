// employee-data-reader.js
require('dotenv').config();

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Initialize Web3 with your blockchain URL
const web3Url = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
const web3 = new Web3(web3Url);

// Contract address for the single EmployeeContract
const employeeContractAddress = process.env.EMPLOYEE_CONTRACT_ADDRESS || '0x0';

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

// Create contract instance
const employeeContract = new web3.eth.Contract(employeeContractAbi, employeeContractAddress);

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

// Get employee IDs from the contract
async function listEmployees() {
  try {
    console.log(`Reading employee registry from ${employeeContractAddress}...`);
    const count = await employeeContract.methods.getEmployeeCount().call();
    console.log(`Found ${count} employees in registry`);

    const employees = [];
    for (let i = 0; i < count; i++) {
      try {
        const id = await employeeContract.methods.employeeIds(i).call();
        const employee = await employeeContract.methods.employees(id).call();

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

// Read all employee data from the single contract
async function readAllEmployeeData(employeeId) {
  try {
    console.log(`\n=== Reading all data for Employee ID: ${employeeId} ===\n`);

    // Get employee summary
    let summary;
    try {
      summary = await employeeContract.methods.getEmployeeSummary(employeeId).call();
      if (summary.exists) {
        console.log(`Found employee in registry: ID ${employeeId}, Name: ${summary.name}`);
      } else {
        console.log(`⚠️ Warning: Employee ID ${employeeId} not found in the contract`);
        return null;
      }
    } catch (error) {
      console.log(`⚠️ Warning: Could not get employee summary: ${error.message}`);
      return null;
    }

    console.log(`Reading data for employee ${employeeId} - ${summary.name}...`);

    // Get all employee data from the single contract
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

    // Format the data for display and storage
    const formattedData = {
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

    // Format and display results
    console.log('\n=== 1. BASIC INFORMATION ===');
    console.log(`Full Name: ${formattedData.basicInfo.fullName}`);
    console.log(`First Name: ${formattedData.basicInfo.firstName}`);
    console.log(`Middle Name: ${formattedData.basicInfo.middleName}`);
    console.log(`Last Name: ${formattedData.basicInfo.lastName}`);
    console.log(`Gender: ${formattedData.basicInfo.gender}`);
    console.log(`Salutation: ${formattedData.basicInfo.salutation}`);
    console.log(`Company: ${formattedData.basicInfo.company}`);
    console.log(`Department: ${formattedData.basicInfo.department}`);
    console.log(`Designation: ${formattedData.basicInfo.designation}`);
    console.log(`Status: ${formattedData.basicInfo.status}`);

    console.log('\n=== 2. DATES ===');
    console.log(`Date of Birth: ${formattedData.dates.dateOfBirth}`);
    console.log(`Date of Joining: ${formattedData.dates.dateOfJoining}`);
    console.log(`Date of Retirement: ${formattedData.dates.dateOfRetirement}`);
    console.log(`Creation Date: ${formattedData.dates.creationDate}`);
    console.log(`Last Modified: ${formattedData.dates.modificationDate}`);

    if (!isEmpty(formattedData.dates.scheduledConfirmationDate) ||
      !isEmpty(formattedData.dates.finalConfirmationDate) ||
      !isEmpty(formattedData.dates.contractEndDate)) {
      console.log('\nAdditional Dates:');
      console.log(`Scheduled Confirmation: ${formattedData.dates.scheduledConfirmationDate}`);
      console.log(`Final Confirmation: ${formattedData.dates.finalConfirmationDate}`);
      console.log(`Contract End: ${formattedData.dates.contractEndDate}`);
      console.log(`Resignation Letter: ${formattedData.dates.resignationLetterDate}`);
      console.log(`Relieving Date: ${formattedData.dates.relievingDate}`);
      console.log(`Encashment Date: ${formattedData.dates.encashmentDate}`);
      console.log(`Held On Date: ${formattedData.dates.heldOnDate}`);
    }

    console.log('\n=== 3. CONTACT INFORMATION ===');
    console.log(`Cell Number: ${formattedData.contactInfo.cellNumber}`);
    console.log(`Personal Email: ${formattedData.contactInfo.personalEmail}`);
    console.log(`Company Email: ${formattedData.contactInfo.companyEmail}`);
    console.log(`Preferred Email: ${formattedData.contactInfo.preferredContactEmail}`);

    if (!isEmpty(formattedData.contactInfo.currentAddress) ||
      !isEmpty(formattedData.contactInfo.permanentAddress)) {
      console.log('\nAddresses:');
      console.log(`Current Address: ${formattedData.contactInfo.currentAddress}`);
      console.log(`Current Accommodation: ${formattedData.contactInfo.currentAccommodationType}`);
      console.log(`Permanent Address: ${formattedData.contactInfo.permanentAddress}`);
      console.log(`Permanent Accommodation: ${formattedData.contactInfo.permanentAccommodationType}`);
    }

    if (!isEmpty(formattedData.contactInfo.personToBeContacted) ||
      !isEmpty(formattedData.contactInfo.emergencyPhoneNumber)) {
      console.log('\nEmergency Contact:');
      console.log(`Contact Person: ${formattedData.contactInfo.personToBeContacted}`);
      console.log(`Emergency Phone: ${formattedData.contactInfo.emergencyPhoneNumber}`);
      console.log(`Relation: ${formattedData.contactInfo.relation}`);
    }

    console.log('\n=== 4. EMPLOYMENT DETAILS ===');
    console.log(`Employee Number: ${formattedData.employment.employeeNumber}`);
    console.log(`Reports To: ${formattedData.employment.reportsTo}`);
    console.log(`Branch: ${formattedData.employment.branch}`);
    console.log(`Notice Period (days): ${formattedData.employment.noticeNumberOfDays}`);
    console.log(`New Workplace: ${formattedData.employment.newWorkplace}`);
    console.log(`Leave Encashed: ${formattedData.employment.leaveEncashed}`);

    console.log('\n=== 5. CAREER INFORMATION ===');
    console.log(`Employment Type: ${formattedData.career.employmentType}`);
    console.log(`Grade: ${formattedData.career.grade}`);
    console.log(`Job Applicant: ${formattedData.career.jobApplicant}`);
    console.log(`Default Shift: ${formattedData.career.defaultShift}`);
    console.log(`Reason for Leaving: ${formattedData.career.reasonForLeaving}`);
    console.log(`Feedback: ${formattedData.career.feedback}`);

    console.log('\n=== 6. APPROVAL INFORMATION ===');
    console.log(`Expense Approver: ${formattedData.approval.expenseApprover}`);
    console.log(`Leave Approver: ${formattedData.approval.leaveApprover}`);
    console.log(`Shift Request Approver: ${formattedData.approval.shiftRequestApprover}`);
    console.log(`Payroll Cost Center: ${formattedData.approval.payrollCostCenter}`);
    console.log(`Health Insurance Provider: ${formattedData.approval.healthInsuranceProvider}`);
    console.log(`Health Insurance Number: ${formattedData.approval.healthInsuranceNo}`);

    console.log('\n=== 7. FINANCIAL INFORMATION ===');
    console.log(`Salary Currency: ${formattedData.financial.salaryCurrency}`);
    console.log(`Salary Mode: ${formattedData.financial.salaryMode}`);
    console.log(`Bank Name: ${formattedData.financial.bankName}`);
    console.log(`Bank Account Number: ${formattedData.financial.bankAccountNo}`);
    console.log(`IBAN: ${formattedData.financial.iban}`);

    console.log('\n=== 8. PERSONAL INFORMATION ===');
    console.log(`Marital Status: ${formattedData.personal.maritalStatus}`);
    console.log(`Family Background: ${formattedData.personal.familyBackground}`);
    console.log(`Blood Group: ${formattedData.personal.bloodGroup}`);
    console.log(`Health Details: ${formattedData.personal.healthDetails}`);

    if (!isEmpty(formattedData.personal.passportNumber)) {
      console.log('\nPassport Details:');
      console.log(`Passport Number: ${formattedData.personal.passportNumber}`);
      console.log(`Valid Until: ${formattedData.personal.validUpto}`);
      console.log(`Date of Issue: ${formattedData.personal.dateOfIssue}`);
      console.log(`Place of Issue: ${formattedData.personal.placeOfIssue}`);
    }

    console.log('\nOther Details:');
    console.log(`Bio: ${formattedData.personal.bio}`);
    console.log(`Attendance Device ID: ${formattedData.personal.attendanceDeviceId}`);
    console.log(`Holiday List: ${formattedData.personal.holidayList}`);

    // Save to file
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputFile = path.join(outputDir, `employee_${employeeId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(formattedData, null, 2));
    console.log(`\nData saved to ${outputFile}`);

    return formattedData;
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

    // Display contract address
    console.log('\nContract Address:');
    console.log(`Employee Contract: ${employeeContractAddress}`);

    // List employees from the contract
    console.log('\nListing employees from the contract:');
    let employees = [];
    try {
      employees = await listEmployees();
    } catch (error) {
      console.error('Error listing employees from the contract:', error.message);
    }

    if (employees.length === 0) {
      console.log('No employees found in the contract or contract not accessible.');
      console.log('Using default employee ID: 1');

      // Read data for employee ID 1
      await readAllEmployeeData(1);
    } else {
      // Display employees
      console.log('Employees in contract:');
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