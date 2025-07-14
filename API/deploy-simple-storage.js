// deploy-simple-storage.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const EEAClient = require("web3-eea");
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');

// --- Configuration ---
const url = process.env.BLOCKCHAIN_URL;
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID, 10);
const privateKey = process.env.PRIVATE_KEY;
const initialValue = 123; // The initial value for the constructor
// ---------------------

console.log('--- SimpleStorage Contract Deployment ---');
console.log('Connecting to blockchain at:', url);

// Initialize Web3 with EEAClient
const web3 = new EEAClient(new Web3(url), chainId);

// Load compiled contract
const contractPath = path.resolve(__dirname, 'compiled', 'SimpleStorage.json');
if (!fs.existsSync(contractPath)) {
  console.error(`Compiled contract not found at ${contractPath}. Run compile script first.`);
  process.exit(1);
}
const contract = require(contractPath);

async function deploy() {
  try {
    // Get account from private key
    const deployerAccount = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`);
    const deployerAddress = deployerAccount.address;
    console.log(`Deploying from account: ${deployerAddress}`);

    // Get transaction count (nonce)
    const txCount = await web3.eth.getTransactionCount(deployerAddress, "pending");
    console.log("Nonce:", txCount);

    // Get gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log("Gas Price:", gasPrice);

    // Create contract instance to encode constructor arguments
    const contractInstance = new web3.eth.Contract(contract.abi);
    const deployTx = contractInstance.deploy({
      data: contract.bytecode,
      arguments: [initialValue]
    });
    const encodedData = deployTx.encodeABI();

    // Build the transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(3000000), // Generous gas limit for deployment
      data: encodedData,
      chainId: chainId
    };

    // Define custom chain using the successful "istanbul" setting
    const custom = Common.default.forCustomChain("mainnet", { chainId: chainId }, "istanbul");

    // Create, sign, and serialize the transaction
    const tx = new Tx(txObj, { common: custom });
    const privateKeyBuffer = Buffer.from(privateKey, "hex");
    tx.sign(privateKeyBuffer);
    const serializedTx = "0x" + tx.serialize().toString("hex");

    // Send the transaction
    console.log('Deploying contract...');
    const receipt = await web3.eth.sendSignedTransaction(serializedTx);

    console.log('\n--- Deployment Successful! ---');
    console.log('Contract Address:', receipt.contractAddress);
    console.log('Transaction Hash:', receipt.transactionHash);
    console.log('---------------------------------');

  } catch (error) {
    console.error('\nDeployment failed:', error);
  }
}

deploy();
