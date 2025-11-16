// compile-simple-storage.js - Fixed for Besu compatibility
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
const contractPath = path.resolve(__dirname, 'contracts', 'Simple', contractName);

// Verify that the contract file exists
if (!fs.existsSync(contractPath)) {
  console.error(`Error: Contract file not found at ${contractPath}`);
  process.exit(1);
}

// Read contract source
const contractSource = fs.readFileSync(contractPath, 'utf8');
console.log(`Read contract source from ${contractPath}`);

// Prepare input for the compiler with Besu-compatible settings
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
    evmVersion: 'istanbul', // Use Istanbul EVM for Besu compatibility
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

// Compile the contract
console.log(`Compiling ${contractName} with Istanbul EVM for Besu compatibility...`);
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

console.log(`SimpleStorage compiled successfully!`);
console.log(`Output: ${outputPath}`);
console.log(`Bytecode length: ${compiledContract.evm.bytecode.object.length / 2} bytes`);
console.log(`EVM Version: Istanbul (Besu compatible)`);
console.log(`ABI methods: ${compiledContract.abi.filter(item => item.type === 'function').length}`);

// Validate bytecode
if (compiledContract.evm.bytecode.object.length < 100) {
  console.warn('Warning: Bytecode seems very short, check compilation');
} else {
  console.log('Bytecode looks valid');
}