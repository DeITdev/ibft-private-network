// compile-employee-contracts.js
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Create compiled directory if it doesn't exist
const compiledDir = path.resolve(__dirname, 'compiled');
if (!fs.existsSync(compiledDir)) {
  fs.mkdirSync(compiledDir);
}

// Get all Solidity files
const contractsDir = path.resolve(__dirname, 'contracts');
const contractFiles = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));

// Function to find imports (for handling import statements in Solidity)
function findImports(importPath) {
  try {
    let fullPath = path.resolve(contractsDir, importPath);
    return {
      contents: fs.readFileSync(fullPath, 'utf8')
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Prepare input for the compiler with optimizer and viaIR enabled
const input = {
  language: 'Solidity',
  sources: {},
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    viaIR: true, // Enable IR-based code generation
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

// Add all contracts to the input
contractFiles.forEach(file => {
  const contractPath = path.join(contractsDir, file);
  input.sources[file] = {
    content: fs.readFileSync(contractPath, 'utf8')
  };
  console.log(`Added ${file} to compilation list`);
});

// Compile all contracts
console.log('Compiling contracts with optimizer and viaIR enabled...');
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
  }
}

console.log('All contracts compiled successfully!');