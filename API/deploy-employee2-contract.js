// deploy-employee-contract.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');

// Environment configuration
const url = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '1337');
const privateKey = process.env.PRIVATE_KEY;

// Validate private key
if (!privateKey) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Initialize web3
const web3 = new Web3(url);

// Path to compiled contract
const contractPath = path.resolve(__dirname, 'compiled', 'EmployeeContract.json');

// Check if contract exists
if (!fs.existsSync(contractPath)) {
  console.error(`Error: Compiled contract not found at ${contractPath}`);
  console.error('Make sure to compile the contract first with compile-employee-storage.js');
  process.exit(1);
}

// Load the contract
const contract = require(contractPath);

// Deploy the contract
async function deployEmployeeContract() {
  try {
    console.log('Connecting to blockchain at:', url);

    // Test connection
    try {
      await web3.eth.net.isListening();
      console.log('Connected to Ethereum node');
    } catch (error) {
      console.error('Error connecting to Ethereum node:', error.message);
      process.exit(1);
    }

    // Clean private key (remove 0x prefix if present)
    const cleanPrivateKey = privateKey.replace(/^0x/, '');

    // Create account from private key
    const besuAccount = web3.eth.accounts.privateKeyToAccount('0x' + cleanPrivateKey);
    console.log('Using account:', besuAccount.address);

    // Get transaction count and gas price
    const txCount = await web3.eth.getTransactionCount(besuAccount.address, 'pending');
    const gasPrice = await web3.eth.getGasPrice();

    console.log('Transaction count:', txCount);
    console.log('Gas price:', gasPrice);

    // Build transaction object with gas limit high enough for the contract
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(8000000), // Higher gas limit for combined contract
      data: contract.bytecode,
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
    const privateKeyBuffer = Buffer.from(cleanPrivateKey, "hex");
    tx.sign(privateKeyBuffer);

    const serialized = tx.serialize();
    const rawTx = "0x" + serialized.toString("hex");

    console.log('Sending transaction to deploy contract...');

    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    console.log('Employee contract deployed successfully!');
    console.log('Contract address:', receipt.contractAddress);

    // Save contract address to .env file
    updateEnvFile(receipt.contractAddress);
    updateConsumerEnvFile(receipt.contractAddress);

    return {
      success: true,
      employeeContractAddress: receipt.contractAddress
    };
  } catch (error) {
    console.error('Error deploying contract:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Update .env file with contract address
function updateEnvFile(contractAddress) {
  try {
    const envPath = path.resolve(__dirname, '.env');

    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');

      if (envContent.includes('EMPLOYEE_CONTRACT_ADDRESS=')) {
        // Replace existing entry
        envContent = envContent.replace(
          /EMPLOYEE_CONTRACT_ADDRESS=.*/,
          `EMPLOYEE_CONTRACT_ADDRESS=${contractAddress}`
        );
      } else {
        // Add new entry
        envContent += `\nEMPLOYEE_CONTRACT_ADDRESS=${contractAddress}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log('Updated .env file with new contract address');
    } else {
      fs.writeFileSync(envPath, `EMPLOYEE_CONTRACT_ADDRESS=${contractAddress}\n`);
      console.log('Created .env file with contract address');
    }
  } catch (error) {
    console.error('Error updating .env file:', error.message);
  }
}

// Update consumer .env file with contract address
function updateConsumerEnvFile(contractAddress) {
  try {
    const consumerEnvPath = path.resolve(__dirname, '..', 'consumer', '.env');

    if (fs.existsSync(consumerEnvPath)) {
      let envContent = fs.readFileSync(consumerEnvPath, 'utf8');

      if (envContent.includes('EMPLOYEE_CONTRACT_ADDRESS=')) {
        // Replace existing entry
        envContent = envContent.replace(
          /EMPLOYEE_CONTRACT_ADDRESS=.*/,
          `EMPLOYEE_CONTRACT_ADDRESS=${contractAddress}`
        );
      } else {
        // Add new entry
        envContent += `\nEMPLOYEE_CONTRACT_ADDRESS=${contractAddress}\n`;
      }

      fs.writeFileSync(consumerEnvPath, envContent);
      console.log('Updated consumer .env file with new contract address');
    } else {
      // Try to preserve existing consumer env settings
      let baseEnvContent = '';

      // Check if there are any env vars we should preserve
      const baseEnvPath = path.resolve(__dirname, '.env');
      if (fs.existsSync(baseEnvPath)) {
        const baseContent = fs.readFileSync(baseEnvPath, 'utf8');
        // Extract KAFKA_BROKER and API_ENDPOINT if they exist
        const kafkaBroker = baseContent.match(/KAFKA_BROKER=.*/);
        const apiEndpoint = baseContent.match(/API_ENDPOINT=.*/);
        const privateKey = baseContent.match(/PRIVATE_KEY=.*/);

        if (kafkaBroker) baseEnvContent += kafkaBroker[0] + '\n';
        if (apiEndpoint) baseEnvContent += apiEndpoint[0] + '\n';
        if (privateKey) baseEnvContent += privateKey[0] + '\n';
      }

      fs.writeFileSync(consumerEnvPath,
        `${baseEnvContent}EMPLOYEE_CONTRACT_ADDRESS=${contractAddress}\n`);
      console.log('Created consumer .env file with contract address');
    }
  } catch (error) {
    console.error('Error updating consumer .env file:', error.message);
  }
}

// Run the deployment
deployEmployeeContract()
  .then(result => {
    if (result.success) {
      console.log('\nDeployment Results:');
      console.log('Employee Contract:', result.employeeContractAddress);

      console.log('\nUpdate your .env file with:');
      console.log(`EMPLOYEE_CONTRACT_ADDRESS=${result.employeeContractAddress}`);

      console.log('\nDeployment completed successfully!');
      process.exit(0);
    } else {
      console.error('\nDeployment failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error during deployment:', error);
    process.exit(1);
  });