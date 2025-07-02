// deploy-employee-contract.js - Updated for your specific account
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');

// Environment configuration
const url = process.env.BLOCKCHAIN_URL;
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID, 10);
// Use the genesis account private key for deployment
const privateKey = process.env.PRIVATE_KEY || '8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63';
const expectedAccountAddress = '0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73'; // Genesis account address

console.log('🚀 Starting Employee Storage Contract Deployment');
console.log('📡 Connecting to blockchain at:', url);
console.log('🔢 Chain ID:', chainId);
console.log('👤 Using Genesis Account for Deployment');

// Validate environment variables
if (!url) {
  console.error('❌ BLOCKCHAIN_URL not found in .env file');
  process.exit(1);
}

if (isNaN(chainId)) {
  console.error('❌ BLOCKCHAIN_CHAIN_ID is not a valid number. Check your .env file.');
  process.exit(1);
}

if (!privateKey) {
  console.error('❌ PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!expectedAccountAddress) {
  console.log('⚠️  ACCOUNT_ADDRESS not specified, will validate against derived address');
}

// Initialize web3
const web3 = new Web3(url);

// Path to compiled contract
const contractPath = path.resolve(__dirname, 'compiled', 'EmployeeStorage.json');

// Check if contract exists
if (!fs.existsSync(contractPath)) {
  console.error(`❌ Compiled contract not found at ${contractPath}`);
  console.error('Make sure to compile the contract first with: node compile-employee-contract.js');
  process.exit(1);
}

// Load the contract
const contract = require(contractPath);

// Deploy the contract
async function deployEmployeeContract() {
  try {
    // Test connection
    try {
      await web3.eth.net.isListening();
      console.log('✅ Connected to Ethereum node');
    } catch (error) {
      console.error('❌ Error connecting to Ethereum node:', error.message);
      process.exit(1);
    }

    // Clean and validate private key
    const cleanPrivateKey = privateKey.trim().replace(/^0x/, '');
    console.log('🔑 Using private key (last 8 chars):', '...' + cleanPrivateKey.slice(-8));

    // Create account from private key and verify it matches expected address
    const besuAccount = web3.eth.accounts.privateKeyToAccount('0x' + cleanPrivateKey);
    console.log('👤 Derived account address:', besuAccount.address);
    console.log('👤 Expected account address:', expectedAccountAddress);

    // Verify the private key matches the expected account
    if (besuAccount.address.toLowerCase() !== expectedAccountAddress.toLowerCase()) {
      console.error('❌ CRITICAL ERROR: Private key does not match the expected account address!');
      console.error('   Derived address:', besuAccount.address);
      console.error('   Expected address:', expectedAccountAddress);
      console.error('   Please check your PRIVATE_KEY and ACCOUNT_ADDRESS in .env file');
      process.exit(1);
    }

    console.log('✅ Private key and account address match correctly');

    // Check account balance
    const balance = await web3.eth.getBalance(besuAccount.address);
    const balanceEth = web3.utils.fromWei(balance, 'ether');
    console.log('💰 Account balance:', balanceEth, 'ETH');

    if (balance === '0') {
      console.error('❌ Account has zero balance!');
      console.error('💡 Make sure the account has ETH in your Besu network');
      console.error('   You can transfer ETH to this account:', besuAccount.address);
      process.exit(1);
    }

    // Get transaction count
    const txCount = await web3.eth.getTransactionCount(besuAccount.address, 'pending');
    console.log('📊 Transaction count (nonce):', txCount);

    // Get and fix gas price
    let gasPrice = await web3.eth.getGasPrice();
    console.log('⛽ Original gas price:', gasPrice);

    // Fix zero gas price issue for local Besu - Use ZERO gas price for free deployment
    if (gasPrice === '0' || gasPrice === 0 || parseInt(gasPrice) === 0) {
      gasPrice = '0'; // Keep zero gas price for free deployment!
      console.log('💰 Using ZERO gas price for free deployment!');
    } else {
      // Force zero gas price for free deployment
      gasPrice = '0';
      console.log('💰 Forced gas price to ZERO for free deployment!');
    }

    // Estimate gas for deployment
    let gasEstimate;
    try {
      gasEstimate = await web3.eth.estimateGas({
        data: contract.bytecode,
        from: besuAccount.address
      });
      console.log('📈 Estimated gas:', gasEstimate);
    } catch (error) {
      console.log('⚠️  Gas estimation failed:', error.message);
      gasEstimate = 5000000; // Default high gas limit
      console.log('⚠️  Using default gas limit:', gasEstimate);
    }

    // Add buffer to gas estimate
    const gasLimit = gasEstimate + 500000; // Add 500k buffer
    console.log('⛽ Gas limit (with buffer):', gasLimit);

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(gasLimit),
      data: contract.bytecode,
      chainId: chainId
    };

    console.log('📋 Transaction details:');
    console.log('   From:', besuAccount.address);
    console.log('   Nonce:', txCount);
    console.log('   Gas Price:', gasPrice);
    console.log('   Gas Limit:', gasLimit);
    console.log('   Chain ID:', chainId);

    // Create custom chain configuration
    const custom = Common.default.forCustomChain(
      "mainnet",
      {
        networkId: chainId,
        chainId: chainId,
        name: "besu-local-network"
      },
      "istanbul"
    );

    // Create, sign, and send transaction
    console.log('✍️  Signing transaction...');
    const tx = new Tx(txObj, { common: custom });
    const privateKeyBuffer = Buffer.from(cleanPrivateKey, "hex");
    tx.sign(privateKeyBuffer);

    const serialized = tx.serialize();
    const rawTx = "0x" + serialized.toString("hex");

    console.log('📤 Sending deployment transaction...');
    console.log('💾 Contract bytecode size:', contract.bytecode.length / 2, 'bytes');

    // Send transaction and wait for receipt
    const receipt = await web3.eth.sendSignedTransaction(rawTx);

    console.log('\n🎉 Employee Storage contract deployed successfully!');
    console.log('📝 Contract address:', receipt.contractAddress);
    console.log('🧾 Transaction hash:', receipt.transactionHash);
    console.log('⛽ Gas used:', receipt.gasUsed, '/', gasLimit);
    console.log('🗃️  Block number:', receipt.blockNumber);
    console.log('💰 Gas cost:', web3.utils.fromWei((BigInt(receipt.gasUsed) * BigInt(gasPrice)).toString(), 'ether'), 'ETH');

    // Save deployment info to file
    const deploymentInfo = {
      contractAddress: receipt.contractAddress,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      gasLimit: gasLimit,
      deployerAddress: besuAccount.address,
      deploymentTime: new Date().toISOString(),
      network: {
        url: url,
        chainId: chainId
      }
    };

    const deploymentFile = path.resolve(__dirname, 'employee-contract-deployment.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log('💾 Deployment info saved to:', deploymentFile);

    // Test the deployed contract
    console.log('\n🔍 Testing deployed contract...');
    const contractInstance = new web3.eth.Contract(contract.abi, receipt.contractAddress);

    try {
      const totalEmployees = await contractInstance.methods.getTotalEmployees().call();
      console.log('✅ Contract test successful - Total employees:', totalEmployees);
    } catch (error) {
      console.log('⚠️  Contract test failed:', error.message);
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Update your .env file with the new contract address:');
    console.log(`   CONTRACT_ADDRESS=${receipt.contractAddress}`);
    console.log('2. Restart your API server: node app.js');
    console.log('3. Test the employee endpoints with Postman');

    console.log('\n📝 Updated .env entry:');
    console.log(`CONTRACT_ADDRESS=${receipt.contractAddress}`);

    return receipt;

  } catch (error) {
    console.error('\n❌ Error deploying contract:', error);

    // Detailed error analysis
    if (error.message.includes('insufficient funds')) {
      console.error('\n💰 Insufficient funds error:');
      console.error('   Your account:', expectedAccountAddress);
      console.error('   Current balance:', balanceEth || 'unknown', 'ETH');
      console.error('   Required: At least 0.005 ETH for deployment');
      console.error('   Solution: Transfer ETH to this account on your Besu network');
    } else if (error.message.includes('Internal error')) {
      console.error('\n🔍 Internal error suggests:');
      console.error('   - Besu network configuration issue');
      console.error('   - Chain ID mismatch');
      console.error('   - Account not recognized by Besu');
    } else if (error.message.includes('nonce')) {
      console.error('\n🔢 Nonce issue:');
      console.error('   Try restarting Besu or waiting for pending transactions');
    }

    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Verify Besu is running:', url);
    console.error('2. Check account balance:', expectedAccountAddress);
    console.error('3. Verify chain ID matches Besu config:', chainId);
    console.error('4. Check Besu logs for errors');

    process.exit(1);
  }
}

// Run deployment
deployEmployeeContract()
  .then(() => {
    console.log('\n✅ Deployment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });