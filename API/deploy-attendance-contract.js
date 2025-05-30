// deploy-attendance-contract.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');

// Get environment config
const url = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '1337');
const privateKey = process.env.PRIVATE_KEY || '';

// Check if private key is provided
if (!privateKey) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Initialize web3
const web3 = new Web3(url);

// Path to compiled contract - Updated to use the correct file name
const contractPath = path.resolve(__dirname, 'compiled', 'AttendanceStorage.json');
if (!fs.existsSync(contractPath)) {
  console.error('Error: Compiled contract not found at:', contractPath);
  process.exit(1);
}

// Load the contract
const contract = require(contractPath);

async function deployContract() {
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

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice || '0x1'),
      gasLimit: web3.utils.toHex(5000000), // Higher gas limit for complex contract
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

    console.log('AttendanceStorage contract deployed successfully!');
    console.log('Contract address:', receipt.contractAddress);

    // Save contract address to .env file and update both API and consumer environment
    updateEnvFile(receipt.contractAddress);
    updateConsumerEnvFile(receipt.contractAddress);

    return {
      success: true,
      contractAddress: receipt.contractAddress
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

      if (envContent.includes('CONTRACT_ADDRESS_ATTENDANCE=')) {
        // Replace existing entry
        envContent = envContent.replace(
          /CONTRACT_ADDRESS_ATTENDANCE=.*/,
          `CONTRACT_ADDRESS_ATTENDANCE=${contractAddress}`
        );
      } else {
        // Add new entry
        envContent += `\nCONTRACT_ADDRESS_ATTENDANCE=${contractAddress}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log('Updated API .env file with new contract address');
    } else {
      fs.writeFileSync(envPath, `CONTRACT_ADDRESS_ATTENDANCE=${contractAddress}\n`);
      console.log('Created API .env file with contract address');
    }
  } catch (error) {
    console.error('Error updating API .env file:', error.message);
  }
}

// Update consumer .env file with contract address
function updateConsumerEnvFile(contractAddress) {
  try {
    const consumerEnvPath = path.resolve(__dirname, '..', 'consumer', '.env');

    if (fs.existsSync(consumerEnvPath)) {
      let envContent = fs.readFileSync(consumerEnvPath, 'utf8');

      if (envContent.includes('CONTRACT_ADDRESS_ATTENDANCE=')) {
        // Replace existing entry
        envContent = envContent.replace(
          /CONTRACT_ADDRESS_ATTENDANCE=.*/,
          `CONTRACT_ADDRESS_ATTENDANCE=${contractAddress}`
        );
      } else {
        // Add new entry
        envContent += `\nCONTRACT_ADDRESS_ATTENDANCE=${contractAddress}\n`;
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
        `${baseEnvContent}CONTRACT_ADDRESS_ATTENDANCE=${contractAddress}\n`);
      console.log('Created consumer .env file with contract address');
    }
  } catch (error) {
    console.error('Error updating consumer .env file:', error.message);
  }
}

// Run the deployment
deployContract()
  .then(result => {
    if (result.success) {
      console.log('Deployment completed successfully!');
      process.exit(0);
    } else {
      console.error('Deployment failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error during deployment:', error);
    process.exit(1);
  });