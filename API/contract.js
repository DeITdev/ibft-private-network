const Web3 = require('web3');
const EEAClient = require("web3-eea");
const Tx = require("ethereumjs-tx").Transaction;
const Common = require('ethereumjs-common');

// Load Truffle build artifacts
const DocumentCertificate = require("./build/contracts/DocumentCertificate.json");
const SimpleStorage = require("./build/contracts/SimpleStorage.json");
const Migrations = require("./build/contracts/Migrations.json");

const url = "http://localhost:8545";
const chainId = 1337;
const web3 = new EEAClient(new Web3(url), chainId);

// Auto-detect contract type from address
function getContractByAddress(contractAddress) {
  const contracts = [
    { name: 'SimpleStorage', artifact: SimpleStorage },
    { name: 'DocumentCertificate', artifact: DocumentCertificate },
    { name: 'Migrations', artifact: Migrations }
  ];

  // Check if address matches any deployed contract
  for (const contract of contracts) {
    const deployedAddress = contract.artifact.networks[chainId]?.address;
    if (deployedAddress && deployedAddress.toLowerCase() === contractAddress.toLowerCase()) {
      console.log(`✓ Found contract: ${contract.name} at ${contractAddress}`);
      return {
        name: contract.name,
        abi: contract.artifact.abi,
        bytecode: contract.artifact.bytecode
      };
    }
  }

  // If not found, throw error with available addresses
  const availableContracts = contracts
    .map(c => `${c.name}: ${c.artifact.networks[chainId]?.address || 'Not deployed'}`)
    .join('\n');

  throw new Error(
    `Contract at ${contractAddress} not found.\n\nAvailable contracts:\n${availableContracts}`
  );
}

// Write/Store value to smart contract
exports.store = async (privateKey, contractAddress, value) => {
  try {
    const contract = getContractByAddress(contractAddress);
    let besuAccount = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`);
    let contractInstance = new web3.eth.Contract(contract.abi, contractAddress);

    // Verify contract has store method
    if (!contractInstance.methods.store) {
      throw new Error(`Contract ${contract.name} does not have a store() method`);
    }

    let encoded = contractInstance.methods.store(value).encodeABI();

    console.log(`📝 Storing value: ${value} to ${contract.name} at ${contractAddress}`);

    const txCount = await web3.eth.getTransactionCount(besuAccount.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    console.log("Transaction count:", txCount);
    console.log("Gas price:", gasPrice);

    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(4700000),
      data: encoded,
      chainId: chainId,
      to: contractAddress
    };

    let custom = Common.default.forCustomChain(
      "mainnet",
      {
        networkId: 1337,
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
      .on("receipt", receipt => {
        console.log("✓ Transaction successful:", receipt.transactionHash);
        return receipt;
      })
      .catch(error => {
        console.error("✗ Transaction error:", error.message);
        throw error;
      });
  } catch (error) {
    console.error("✗ Store error:", error.message);
    throw error;
  }
}

// Store document data to DocumentCertificate
exports.storeDocument = async (privateKey, contractAddress, documentData) => {
  try {
    const contract = getContractByAddress(contractAddress);
    let besuAccount = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`);
    let contractInstance = new web3.eth.Contract(contract.abi, contractAddress);

    // Verify contract has setDocument method
    if (!contractInstance.methods.setDocument) {
      throw new Error(`Contract ${contract.name} does not have a setDocument() method`);
    }

    const {
      cidAddress,
      cid,
      nik,
      from,
      category,
      status,
      action,
      details,
      did,
      date
    } = documentData;

    let encoded = contractInstance.methods.setDocument(
      cidAddress,
      cid,
      nik,
      from,
      category,
      status,
      action,
      details,
      did,
      date
    ).encodeABI();

    console.log(`📝 Storing document to ${contract.name} at ${contractAddress}`);

    const txCount = await web3.eth.getTransactionCount(besuAccount.address, "pending");
    const gasPrice = await web3.eth.getGasPrice();

    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(4700000),
      data: encoded,
      chainId: chainId,
      to: contractAddress
    };

    let custom = Common.default.forCustomChain(
      "mainnet",
      {
        networkId: 1337,
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
      .on("receipt", receipt => {
        console.log("✓ Document stored successfully:", receipt.transactionHash);
        return receipt;
      })
      .catch(error => {
        console.error("✗ Transaction error:", error.message);
        throw error;
      });
  } catch (error) {
    console.error("✗ Store document error:", error.message);
    throw error;
  }
}

/// Read value from smart contract
exports.read = async (contractAddress) => {
  try {
    const contract = getContractByAddress(contractAddress);
    let contractInstance = new web3.eth.Contract(contract.abi, contractAddress);

    console.log(`📖 Reading from ${contract.name} at ${contractAddress}`);

    // Verify contract has retrieve method
    if (!contractInstance.methods.retrieve) {
      const availableMethods = Object.keys(contractInstance.methods)
        .filter(m => !m.includes('(') && !m.startsWith('0x'))
        .join(', ');
      throw new Error(
        `Contract ${contract.name} does not have a retrieve() method.\nAvailable methods: ${availableMethods}`
      );
    }

    // Directly call retrieve without code check
    const value = await contractInstance.methods.retrieve().call();
    console.log(`✓ Retrieved value: ${value}`);

    return value;
  } catch (error) {
    console.error("✗ Read error:", error.message);
    throw error;
  }
}

// Helper: Get all deployed contracts
exports.getDeployedContracts = () => {
  return {
    SimpleStorage: SimpleStorage.networks[chainId]?.address,
    DocumentCertificate: DocumentCertificate.networks[chainId]?.address,
    Migrations: Migrations.networks[chainId]?.address
  };
}

// Export web3 instance for direct use if needed
exports.web3 = web3;