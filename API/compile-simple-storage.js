// compile-simple-storage.js
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Create compiled directory if it doesn't exist
const compiledDir = path.resolve(__dirname, 'compiled');
if (!fs.existsSync(compiledDir)) {
  fs.mkdirSync(compiledDir);
}

// Path to contract
const contractName = 'SimpleStorage.sol';
const contractPath = path.resolve(__dirname, 'contracts', 'simple', contractName);

// Verify that the contract file exists
if (!fs.existsSync(contractPath)) {
  console.error(`Error: Contract file not found at ${contractPath}`);
  process.exit(1);
}

// Read contract source
const contractSource = fs.readFileSync(contractPath, 'utf8');
console.log(`Read contract source from ${contractPath}`);

// Prepare input for the compiler
const input = {
  language: 'Solidity',
  sources: {
    [contractName]: {
      content: contractSource
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

// Compile the contract
console.log(`Compiling ${contractName}...`);
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  let hasError = false;
  output.errors.forEach(error => {
    console.log(error.formattedMessage);
    if (error.severity === 'error') {
      hasError = true;
    }
  });
  if (hasError) {
    console.error('Compilation failed with errors!');
    process.exit(1);
  }
}

// Save compilation results
const compiledContract = output.contracts[contractName]['SimpleStorage'];
const contractOutput = {
  abi: compiledContract.abi,
  bytecode: '0x' + compiledContract.evm.bytecode.object
};

const outputPath = path.join(compiledDir, 'SimpleStorage.json');
fs.writeFileSync(outputPath, JSON.stringify(contractOutput, null, 2));
console.log(`SimpleStorage compiled successfully to ${outputPath}`);
