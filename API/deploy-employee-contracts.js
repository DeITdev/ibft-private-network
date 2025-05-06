require('dotenv').config();
const factory = require('./employee-contract-factory');

// Deploy all employee contracts
async function deployAllContracts() {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable not set');
    }

    console.log('Deploying all employee contracts...');
    const contracts = await factory.deployEmployeeContracts(privateKey);

    console.log('\nDeployment Results:');
    console.log('Registry:', contracts.registryAddress);
    console.log('BasicInfo:', contracts.basicInfoAddress);
    console.log('Dates:', contracts.datesAddress);
    console.log('ContactInfo:', contracts.contactInfoAddress);
    console.log('BasicEmployment:', contracts.basicEmploymentAddress);
    console.log('Career:', contracts.careerAddress);
    console.log('Approval:', contracts.approvalAddress);
    console.log('Financial:', contracts.financialAddress);
    console.log('Personal:', contracts.personalAddress);

    console.log('\nUpdate your .env file with:');
    console.log(`REGISTRY_CONTRACT_ADDRESS=${contracts.registryAddress}`);

    return contracts;
  } catch (error) {
    console.error('Error deploying contracts:', error);
    process.exit(1);
  }
}

// Run the deployment
deployAllContracts();