const DocumentCertificate = artifacts.require("DocumentCertificate");
const SimpleStorage = artifacts.require("SimpleStorage");
// Add more contracts here if needed
// const AnotherContract = artifacts.require("AnotherContract");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(DocumentCertificate);
  deployer.deploy(SimpleStorage);
  // deployer.deploy(AnotherContract);
};