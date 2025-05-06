const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const { deploy, store, read } = require('./contract');
const { deployAttendance, storeAttendance, getAttendance } = require('./attendance-contract');
const employeeApiV2 = require('./employee-api');

// Configure middleware
app.use(bodyparser.json({ limit: '50mb' }));
app.use(bodyparser.urlencoded({ extended: true, limit: '50mb' }));

// Handle CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

// Existing endpoints
app.post("/deploy", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let result = await deploy(privateKey);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/store", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let contractAddress = req.body.contractAddress;
    let value = req.body.value;
    let result = await store(privateKey, contractAddress, value);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/read", async (req, res) => {
  try {
    let contractAddress = req.query.contractAddress;
    let result = await read(contractAddress);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Legacy employee endpoints
app.post("/deploy-employee", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let result = await deployEmployee(privateKey);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/store-employee", async (req, res) => {
  try {
    const privateKey = req.body.privateKey;
    const contractAddress = req.body.contractAddress;
    const employeeData = req.body.employeeData || {
      id: req.body.id,
      firstName: req.body.firstName,
      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth,
      dateOfJoining: req.body.dateOfJoining,
      company: req.body.company
    };

    // Mention the multi-contract approach
    console.log("Note: Consider using the multi-contract approach for better gas efficiency.");
    console.log("Available at /api/v2/employee/setup-employee-complete");

    let result = await storeEmployee(privateKey, contractAddress, employeeData);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/get-employee", async (req, res) => {
  try {
    const contractAddress = req.query.contractAddress;
    const id = req.query.id;

    if (!contractAddress || !id) {
      return res.status(400).send({ error: "Missing required parameters: contractAddress and id" });
    }

    const result = await getEmployee(contractAddress, id);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Attendance endpoints
app.post("/deploy-attendance", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let result = await deployAttendance(privateKey);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/store-attendance", async (req, res) => {
  try {
    const { privateKey, contractAddress, id, employeeName, attendanceDate, status, company } = req.body;
    let result = await storeAttendance(privateKey, contractAddress, id, employeeName, attendanceDate, status, company);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/get-attendance", async (req, res) => {
  try {
    const contractAddress = req.query.contractAddress;
    const id = req.query.id;

    if (!contractAddress || !id) {
      return res.status(400).send({ error: "Missing required parameters: contractAddress and id" });
    }

    const result = await getAttendance(contractAddress, id);
    res.send(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// Mount the new multi-contract employee API
app.use('/api/v2/employee', employeeApiV2);

// Health check endpoint
app.get("/health", (req, res) => {
  res.send({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Blockchain API server running on port ${PORT}`);
});