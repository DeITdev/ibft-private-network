// compile-employee-contract.js
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Create compiled directory if it doesn't exist
const compiledDir = path.resolve(__dirname, 'compiled');
if (!fs.existsSync(compiledDir)) {
  fs.mkdirSync(compiledDir);
}

// Target contract
const contractName = 'EmployeeStorage.sol';
const contractPath = path.resolve(__dirname, 'contracts/employee', contractName);

// Verify that the contract file exists
if (!fs.existsSync(contractPath)) {
  console.error(`Error: Contract file not found at ${contractPath}`);
  console.error('Please make sure you have created the EmployeeStorage.sol file in the contracts directory');
  process.exit(1);
}

// Read contract source
const contractSource = fs.readFileSync(contractPath, 'utf8');
console.log(`Read contract source from ${contractPath}`);

// Function to find imports (for handling import statements in Solidity)
function findImports(importPath) {
  try {
    let fullPath = path.resolve(path.dirname(contractPath), importPath);
    return {
      contents: fs.readFileSync(fullPath, 'utf8')
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Prepare input for the compiler with optimizer enabled
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
console.log(`Compiling ${contractName} with optimizer enabled...`);
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

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
for (const fileName in output.contracts) {
  for (const contractName in output.contracts[fileName]) {
    const contract = output.contracts[fileName][contractName];
    const contractOutput = {
      abi: contract.abi,
      bytecode: '0x' + contract.evm.bytecode.object
    };

    const outputPath = path.join(compiledDir, `${contractName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(contractOutput, null, 2));
    console.log(`${contractName} compiled successfully to ${outputPath}`);

    // Log some useful info
    console.log(`Bytecode length: ${contract.evm.bytecode.object.length / 2} bytes`);
    console.log(`ABI methods: ${contract.abi.filter(item => item.type === 'function').length}`);
  }
}

console.log('Employee contract compilation completed successfully!');
console.log('Next steps:');
console.log('1. Run: node deploy-employee-contract.js');
console.log('2. Update your app.js with the new contract address');
console.log('3. Test the API endpoints');