#!/usr/bin/env node
// deploy-contract.js - Generic deployment script for storage contracts (Option B)
// Usage examples:
//   node deploy-contract.js --type user --pk 0xABC... --rpc http://localhost:8545
//   node deploy-contract.js --type attendance --args "[]"
// Private key can be provided via --pk or env PRIVATE_KEY.
// RPC via --rpc or env RPC_URL or BLOCKCHAIN_URL.
// Chain ID via --chain-id or env BLOCKCHAIN_CHAIN_ID (default 1337).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

// Contract config mapping (keep in sync with app.js)
const CONTRACTS = {
  simple: { name: 'SimpleStorage', file: 'SimpleStorage.json', defaultArgs: [], gasLimit: 5_000_000 },
  employee: { name: 'EmployeeStorage', file: 'EmployeeStorage.json', defaultArgs: [], gasLimit: 8_000_000 },
  user: { name: 'UserStorage', file: 'UserStorage.json', defaultArgs: [], gasLimit: 8_000_000 },
  task: { name: 'TaskStorage', file: 'TaskStorage.json', defaultArgs: [], gasLimit: 8_000_000 },
  company: { name: 'CompanyStorage', file: 'CompanyStorage.json', defaultArgs: [], gasLimit: 8_000_000 },
  attendance: { name: 'AttendanceStorage', file: 'AttendanceStorage.json', defaultArgs: [], gasLimit: 8_000_000 }
};

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--type') out.type = argv[++i];
    else if (a === '--pk') out.privateKey = argv[++i];
    else if (a === '--rpc') out.rpc = argv[++i];
    else if (a === '--chain-id') out.chainId = argv[++i];
    else if (a === '--args') out.args = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else {
      console.warn(`Unknown arg: ${a}`);
    }
  }
  return out;
}

function printHelp() {
  console.log(`Generic Contract Deployment\n\n` +
    `Required:\n  --type <contractType>        One of: ${Object.keys(CONTRACTS).join(', ')}\n\n` +
    `Optional:\n  --pk <privateKey>            Hex private key (fallback env PRIVATE_KEY)\n  --rpc <url>                  RPC URL (fallback env RPC_URL or BLOCKCHAIN_URL, default http://localhost:8545)\n  --chain-id <id>              Chain ID (fallback env BLOCKCHAIN_CHAIN_ID, default 1337)\n  --args "[ ... ]"             JSON array for constructor args\n\nExamples:\n  node deploy-contract.js --type user\n  node deploy-contract.js --type attendance --pk 0xABC... --rpc http://localhost:8545\n  node deploy-contract.js --type simple --args "[123]"\n`);
}

(async () => {
  const args = parseArgs(process.argv);
  if (args.help || !args.type) {
    printHelp();
    if (!args.type) process.exit(1);
  }

  const type = args.type;
  const config = CONTRACTS[type];
  if (!config) {
    console.error(`Unknown contract type: ${type}`);
    printHelp();
    process.exit(1);
  }

  let privateKey = args.privateKey || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Missing private key: provide via --pk or env PRIVATE_KEY');
    process.exit(1);
  }
  privateKey = privateKey.replace(/^0x/, '');

  const rpc = args.rpc || process.env.RPC_URL || process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
  const chainId = parseInt(args.chainId || process.env.BLOCKCHAIN_CHAIN_ID || '1337', 10);

  let constructorArgs = config.defaultArgs || [];
  if (args.args) {
    try {
      constructorArgs = JSON.parse(args.args);
      if (!Array.isArray(constructorArgs)) throw new Error('Args JSON must be an array');
    } catch (e) {
      console.error(`Failed to parse --args JSON: ${e.message}`);
      process.exit(1);
    }
  }

  const compiledPath = path.join(__dirname, 'compiled', config.file);
  if (!fs.existsSync(compiledPath)) {
    console.error(`Compiled artifact not found: ${compiledPath}`);
    console.error('Run the corresponding compile-<type>-contract.js script first.');
    process.exit(1);
  }

  const artifactRaw = fs.readFileSync(compiledPath, 'utf8');
  let artifact;
  try { artifact = JSON.parse(artifactRaw); } catch (e) { console.error('Invalid JSON in artifact'); process.exit(1); }
  const abi = artifact.abi;
  const bytecode = artifact.bytecode || artifact.evm?.bytecode?.object;
  if (!abi || !bytecode) {
    console.error('Artifact missing abi or bytecode');
    process.exit(1);
  }

  const web3 = new Web3(rpc);
  const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
  console.log(`Deploying ${config.name} (type: ${type})`);
  console.log(`  RPC:       ${rpc}`);
  console.log(`  Chain ID:  ${chainId}`);
  console.log(`  Deployer:  ${account.address}`);
  console.log(`  Args:      ${JSON.stringify(constructorArgs)}`);

  const contract = new web3.eth.Contract(abi);
  const deployTx = contract.deploy({ data: bytecode, arguments: constructorArgs });

  let gasEstimate;
  try {
    gasEstimate = await deployTx.estimateGas({ from: account.address });
  } catch (e) {
    console.error('Gas estimation failed:', e.message);
    process.exit(1);
  }

  let gasPrice = await web3.eth.getGasPrice();
  if (!gasPrice || gasPrice === '0') gasPrice = '1000000000'; // 1 Gwei fallback

  const gasLimit = Math.min(config.gasLimit || 8_000_000, Math.floor(gasEstimate * 1.2));
  const nonce = await web3.eth.getTransactionCount(account.address, 'pending');

  const rawTx = {
    from: account.address,
    data: deployTx.encodeABI(),
    gas: web3.utils.toHex(gasLimit),
    gasPrice: web3.utils.toHex(gasPrice),
    nonce: web3.utils.toHex(nonce),
    chainId
  };

  console.log(`  Gas Est.:  ${gasEstimate}`);
  console.log(`  Gas Limit: ${gasLimit}`);
  console.log(`  Gas Price: ${gasPrice}`);
  console.log('Signing & sending transaction...');

  const signed = await web3.eth.accounts.signTransaction(rawTx, '0x' + privateKey);

  let receipt;
  try {
    receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
  } catch (e) {
    console.error('Deployment failed:', e.message);
    process.exit(1);
  }

  if (!receipt.contractAddress) {
    console.error('No contractAddress in receipt; deployment may have failed.');
    process.exit(1);
  }

  console.log('Deployment success!');
  console.log(`  Address: ${receipt.contractAddress}`);
  console.log(`  TxHash : ${receipt.transactionHash}`);
  console.log(`  Block  : ${receipt.blockNumber}`);
  console.log(`  GasUsed: ${receipt.gasUsed}`);

  const out = {
    success: true,
    contractType: type,
    contractName: config.name,
    contractAddress: receipt.contractAddress,
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    gasUsed: receipt.gasUsed,
    gasLimit: gasLimit,
    gasPrice: gasPrice.toString(),
    deployerAddress: account.address,
    deploymentTime: new Date().toISOString(),
    constructorArgs: constructorArgs,
    transactionDetails: {
      nonce,
      cumulativeGasUsed: receipt.cumulativeGasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice || gasPrice,
      status: receipt.status,
      chainId
    }
  };

  const outFile = path.join(__dirname, `contract-deployment-${type}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`Saved deployment info -> ${outFile}`);
})();
