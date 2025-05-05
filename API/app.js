const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const { deploy, store, read } = require('./contract');
const { deployEmployee, storeEmployee, getEmployee } = require('./employee-contract');
const { deployAttendance, storeAttendance, getAttendance } = require('./attendance-contract');

app.use(bodyparser.json());

// Existing endpoints
app.post("/deploy", async (req, res) => {
  let privateKey = req.body.privateKey;
  let result = await deploy(privateKey);
  res.send(result);
});

app.post("/store", async (req, res) => {
  let privateKey = req.body.privateKey;
  let contractAddress = req.body.contractAddress;
  let value = req.body.value;
  let result = await store(privateKey, contractAddress, value)
  res.send(result);
});

app.get("/read", async (req, res) => {
  let contractAddress = req.query.contractAddress;
  let result = await read(contractAddress);
  res.send(result);
});

app.post("/deploySimple", async (req, res) => {
  let privateKey = req.body.privateKey;
  let result = await deploySimple(privateKey);
  res.send(result);
});

// New endpoints for Employee contract
app.post("/deploy-employee", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let result = await deployEmployee(privateKey);
    res.send(result);
  } catch (error) {
    console.error("Error deploying employee contract:", error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/store-employee", async (req, res) => {
  try {
    const {
      privateKey,
      contractAddress,
      id,
      firstName,
      gender,
      dateOfBirth,
      dateOfJoining,
      company
    } = req.body;

    // Validate required fields
    if (!privateKey || !contractAddress || id === undefined) {
      return res.status(400).send({
        error: "Missing required fields: privateKey, contractAddress, and id are required"
      });
    }

    // Parse ID to number
    const employeeId = parseInt(id, 10);
    if (isNaN(employeeId)) {
      return res.status(400).send({ error: "Invalid employee ID: must be a number" });
    }

    // Validate and parse date fields
    const dob = dateOfBirth ? parseInt(dateOfBirth, 10) : 0;
    const doj = dateOfJoining ? parseInt(dateOfJoining, 10) : 0;

    if (isNaN(dob) || isNaN(doj)) {
      return res.status(400).send({ error: "Invalid date format: dates must be numeric timestamps" });
    }

    const result = await storeEmployee(
      privateKey,
      contractAddress,
      employeeId,
      firstName || "",
      gender || "",
      dob,
      doj,
      company || ""
    );

    res.send(result);
  } catch (error) {
    console.error("Error storing employee data:", error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/get-employee", async (req, res) => {
  try {
    const contractAddress = req.query.contractAddress;
    const id = req.query.id;

    // Validate inputs
    if (!contractAddress) {
      return res.status(400).send({ error: "Contract address is required" });
    }

    if (!id) {
      return res.status(400).send({ error: "Employee ID is required" });
    }

    // Parse ID to make sure it's a valid number
    const employeeId = parseInt(id, 10);
    if (isNaN(employeeId)) {
      return res.status(400).send({ error: "Invalid employee ID: must be a number" });
    }

    const result = await getEmployee(contractAddress, employeeId);
    res.send(result);
  } catch (error) {
    console.error("Error getting employee data:", error);
    res.status(500).send({ error: error.message });
  }
});

// Deploy Attendance Contract
app.post("/deploy-attendance", async (req, res) => {
  try {
    let privateKey = req.body.privateKey;
    let result = await deployAttendance(privateKey);
    res.send(result);
  } catch (error) {
    console.error("Error deploying attendance contract:", error);
    res.status(500).send({ error: error.message });
  }
});

// Store Attendance Record
app.post("/store-attendance", async (req, res) => {
  try {
    const {
      privateKey,
      contractAddress,
      id,
      employeeName,
      attendanceDate,
      status,
      company
    } = req.body;

    // Validate required fields
    if (!privateKey || !contractAddress || id === undefined) {
      return res.status(400).send({
        error: "Missing required fields: privateKey, contractAddress, and id are required"
      });
    }

    // Parse ID to number
    const attendanceId = parseInt(id, 10);
    if (isNaN(attendanceId)) {
      return res.status(400).send({ error: "Invalid attendance ID: must be a number" });
    }

    // Validate and parse date field
    const attDate = attendanceDate ? parseInt(attendanceDate, 10) : 0;

    if (isNaN(attDate)) {
      return res.status(400).send({ error: "Invalid date format: date must be a numeric timestamp" });
    }

    const result = await storeAttendance(
      privateKey,
      contractAddress,
      attendanceId,
      employeeName || "",
      attDate,
      status || "",
      company || ""
    );

    res.send(result);
  } catch (error) {
    console.error("Error storing attendance data:", error);
    res.status(500).send({ error: error.message });
  }
});

// Get Attendance Record
app.get("/get-attendance", async (req, res) => {
  try {
    const contractAddress = req.query.contractAddress;
    const id = req.query.id;

    // Validate inputs
    if (!contractAddress) {
      return res.status(400).send({ error: "Contract address is required" });
    }

    if (!id) {
      return res.status(400).send({ error: "Attendance ID is required" });
    }

    // Parse ID to make sure it's a valid number
    const attendanceId = parseInt(id, 10);
    if (isNaN(attendanceId)) {
      return res.status(400).send({ error: "Invalid attendance ID: must be a number" });
    }

    const result = await getAttendance(contractAddress, attendanceId);
    res.send(result);
  } catch (error) {
    console.error("Error getting attendance data:", error);
    res.status(500).send({ error: error.message });
  }
});

app.listen(4001, () => {
  console.log("server started");
});