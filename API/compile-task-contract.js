// compile-task-contract.js - Fixed for Besu compatibility
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Create compiled directory if it doesn't exist
const compiledDir = path.resolve(__dirname, 'compiled');
if (!fs.existsSync(compiledDir)) {
  fs.mkdirSync(compiledDir);
}

// Target contract
const contractName = 'TaskStorage.sol';
const contractPath = path.resolve(__dirname, 'contracts/Project', contractName);

// Verify that the contract file exists
if (!fs.existsSync(contractPath)) {
  console.error(`Error: Contract file not found at ${contractPath}`);
  console.error('Please make sure you have created the TaskStorage.sol file in the contracts/Project directory');
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

    console.log(`${contractName} compiled successfully!`);
    console.log(`Output: ${outputPath}`);
    console.log(`Bytecode length: ${contract.evm.bytecode.object.length / 2} bytes`);
    console.log(`EVM Version: Istanbul (Besu compatible)`);
    console.log(`ABI methods: ${contract.abi.filter(item => item.type === 'function').length}`);

    // Validate bytecode
    if (contract.evm.bytecode.object.length < 100) {
      console.warn('Warning: Bytecode seems very short, check compilation');
    } else {
      console.log('Bytecode looks valid');
    }
  }
}

console.log('\nNext steps:');
console.log('1. Start server: node app.js');
console.log('2. Deploy via Postman using /deploy endpoint with contractType: "task"');
console.log('3. Test task contract interactions');