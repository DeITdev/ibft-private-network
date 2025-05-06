// compile-attendance-contract.js
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Path to source contract
const contractPath = path.resolve(__dirname, 'contracts', 'AttendanceStorage.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Solidity compiler input format
const input = {
  language: 'Solidity',
  sources: {
    'AttendanceStorage.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object']
      }
    },
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

console.log('Compiling AttendanceStorage contract...');

try {
  // Compile the contract
  const compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for errors
  if (compiledContract.errors) {
    compiledContract.errors.forEach(error => {
      console.log(error.formattedMessage);
    });

    // Check if there are serious errors
    const hasError = compiledContract.errors.some(e => e.severity === 'error');
    if (hasError) {
      console.error('Compilation failed due to errors');
      process.exit(1);
    }
  }

  // Get contract artifacts
  const contractName = 'AttendanceStorage';
  const artifact = compiledContract.contracts['AttendanceStorage.sol'][contractName];

  // Create output folder if it doesn't exist
  const outputFolder = path.resolve(__dirname, 'compiled');
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  // Save the bytecode and ABI
  const output = {
    abi: artifact.abi,
    bytecode: '0x' + artifact.evm.bytecode.object
  };

  fs.writeFileSync(
    path.resolve(outputFolder, 'attendance-contract.json'),
    JSON.stringify(output, null, 2)
  );

  console.log(`Contract compiled successfully and saved to ./compiled/attendance-contract.json`);

} catch (error) {
  console.error('Compilation error:', error);
  process.exit(1);
}