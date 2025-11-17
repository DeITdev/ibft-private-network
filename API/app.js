const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const { store, read, storeDocument } = require('./contract');

app.use(bodyparser.json());

// Write/Store value to SimpleStorage
app.post("/store", async (req, res) => {
  try {
    const { privateKey, contractAddress, value } = req.body;

    if (!privateKey || !contractAddress || value === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: privateKey, contractAddress, value"
      });
    }

    let result = await store(privateKey, contractAddress, value);

    res.json({
      success: true,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      contractAddress: contractAddress,
      storedValue: value
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Store document to DocumentCertificate
app.post("/store-document", async (req, res) => {
  try {
    const { privateKey, contractAddress, documentData } = req.body;

    if (!privateKey || !contractAddress || !documentData) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: privateKey, contractAddress, documentData"
      });
    }

    let result = await storeDocument(privateKey, contractAddress, documentData);

    res.json({
      success: true,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      contractAddress: contractAddress,
      documentData: documentData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Read value from smart contract
app.get("/read", async (req, res) => {
  try {
    const { contractAddress } = req.query;

    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: contractAddress"
      });
    }

    let result = await read(contractAddress);

    res.json({
      success: true,
      contractAddress: contractAddress,
      value: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(4000, () => {
  console.log("Server started on http://localhost:4000");
});