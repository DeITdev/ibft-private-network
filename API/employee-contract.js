require('dotenv').config();

const Web3 = require('web3');
const EEAClient = require("web3-eea");
const url = process.env.BLOCKCHAIN_URL;
const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID);

// Add connection error handling
let web3;
try {
  web3 = new EEAClient(new Web3(url), chainId);

  // Test connection
  web3.eth.net.isListening()
    .then(() => console.log("Connected to Ethereum node at", url))
    .catch(err => console.error("Failed to connect to Ethereum node:", err.message));
} catch (error) {
  console.error("Error initializing Web3:", error.message);
}

const Tx = require("ethereumjs-tx").Transaction
const Common = require('ethereumjs-common');
const contract = require("./employee-contract.json")

exports.deployEmployee = (privateKey) => {
  let besuAccount = web3.eth.accounts.privateKeyToAccount(privateKey)
  console.log(besuAccount)
  return web3.eth.getTransactionCount(besuAccount.address, "pending").then(async (txCount) => {
    let gasPrice = await web3.eth.getGasPrice();
    console.log("tx count", txCount);
    console.log("gasPrice", gasPrice)
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(2000000), // Increased gas limit for larger contract
      data: contract.bytecode,
      chainId: chainId
    };
    let custom = Common.default.forCustomChain(
      "mainnet",
      {
        networkId: 123,
        chainId: chainId,
        name: "besu-network"
      },
      "istanbul"
    );

    let tx = new Tx(txObj, { common: custom });
    let private = Buffer.from(privateKey, "hex");
    tx.sign(private);
    let serialized = tx.serialize();
    let rawSerialized = "0x" + serialized.toString("hex");

    return web3.eth.sendSignedTransaction(rawSerialized)
      .on("receipt", receipt => { console.log(receipt) })
      .catch(error => console.log(error));
  });
}

exports.storeEmployee = async (privateKey, contractAddress, id, firstName, gender, dateOfBirth, dateOfJoining, company) => {
  try {
    // Validate private key format (64 hex characters)
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error("Invalid private key - must be 64 hex characters without 0x prefix");
    }

    // Create account from private key (without 0x prefix)
    const besuAccount = web3.eth.accounts.privateKeyToAccount(privateKey);

    // Create contract instance
    const contractInstance = new web3.eth.Contract(contract.abi, contractAddress);

    // Encode the storeEmployee transaction
    const encoded = contractInstance.methods.storeEmployee(
      id,
      firstName,
      gender,
      dateOfBirth,
      dateOfJoining,
      company
    ).encodeABI();

    // Get transaction count and gas price
    const [txCount, gasPrice] = await Promise.all([
      web3.eth.getTransactionCount(besuAccount.address, "pending"),
      web3.eth.getGasPrice()
    ]);

    // Build transaction object
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(2000000), // Higher gas limit for storing data
      data: encoded,
      chainId: chainId,
      to: contractAddress
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

    // Create and sign transaction
    const tx = new Tx(txObj, { common: custom });
    const privateKeyBuffer = Buffer.from(privateKey, "hex");
    tx.sign(privateKeyBuffer);

    // Serialize and send transaction
    const serializedTx = tx.serialize();
    const rawTx = "0x" + serializedTx.toString("hex");

    return web3.eth.sendSignedTransaction(rawTx)
      .on("transactionHash", hash => console.log("Tx hash:", hash))
      .on("receipt", receipt => {
        console.log("Transaction successful:", receipt);
        return receipt;
      })
      .on("error", error => {
        console.error("Transaction error:", error);
        throw error;
      });

  } catch (error) {
    console.error("Store employee function error:", error);
    throw error;
  }
};

exports.getEmployee = async (contractAddress, id) => {
  try {
    // Ensure id is a proper number
    const employeeId = parseInt(id, 10);

    // Check if employeeId is a valid number
    if (isNaN(employeeId)) {
      throw new Error("Invalid employee ID: must be a number");
    }

    let contractInstance = new web3.eth.Contract(contract.abi, contractAddress);

    console.log(`Getting employee with ID: ${employeeId} (${typeof employeeId})`);

    const result = await contractInstance.methods.getEmployee(employeeId).call();

    // Format the result as a more usable object
    return {
      firstName: result.firstName,
      gender: result.gender,
      dateOfBirth: result.dateOfBirth.toString(),
      dateOfJoining: result.dateOfJoining.toString(),
      company: result.company
    };
  } catch (error) {
    console.error("Get employee function error:", error);
    throw error;
  }
};