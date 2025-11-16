const Web3 = require('web3');
const EEAClient = require("web3-eea");
const url = "http://localhost:8545"
const chainId = 1337
const web3 = new EEAClient(new Web3(url), chainId);
const Tx = require("ethereumjs-tx").Transaction
const Common = require('ethereumjs-common');
const contract = require("./contract.json")


exports.deploy = (privateKey) => {
  let besuAccount = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`)
  console.log(besuAccount)
  return web3.eth.getTransactionCount(besuAccount.address, "pending").then(async (txCount) => {
    let gasPrice = await web3.eth.getGasPrice();
    console.log("tx count", txCount);
    console.log("gasPrice", gasPrice)
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(210000),
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

exports.store = async (privateKey, contractAddress, value) => {
  let besuAccount = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`)
  let contractInstance = new web3.eth.Contract(contract.abi, contractAddress);
  let encoded = contractInstance.methods.store(value).encodeABI();
  console.log(value)
  return web3.eth.getTransactionCount(besuAccount.address, "pending").then(async (txCount) => {
    let gasPrice = await web3.eth.getGasPrice();
    console.log("tx count", txCount);
    console.log("gasPrice", gasPrice)
    const txObj = {
      nonce: web3.utils.toHex(txCount),
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(210000),
      data: encoded,
      chainId: chainId,
      to: contractAddress
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

exports.read = async (contractAddress) => {
  let contractInstance = new web3.eth.Contract(contract.abi, contractAddress);
  return contractInstance.methods.retrieve().call().then(value => { return value });
}