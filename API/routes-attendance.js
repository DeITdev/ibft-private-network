// routes-attendance.js - Attendance management routes
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Helper function to load contract (will be injected from app.js)
let loadContract, sendTransaction, web3;

// Initialize route dependencies
function initAttendanceRoutes(dependencies) {
  loadContract = dependencies.loadContract;
  sendTransaction = dependencies.sendTransaction;
  web3 = dependencies.web3;
}

// =================================
// ATTENDANCE CONTRACT ROUTES
// =================================

// Attendances - List all attendances
router.get('/', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'contract-deployment-attendance.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Attendance contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('attendance');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalAttendances().call();
    if (total === '0') {
      return res.json({ success: true, attendances: [], total: 0 });
    }

    const ids = await instance.methods.getAllAttendanceIds().call();
    const attendances = [];

    for (const id of ids) {
      try {
        const attendance = await instance.methods.getAttendance(id).call();
        attendances.push({
          recordId: attendance.recordId,
          createdTimestamp: new Date(parseInt(attendance.createdTimestamp) * 1000).toISOString(),
          modifiedTimestamp: new Date(parseInt(attendance.modifiedTimestamp) * 1000).toISOString(),
          modifiedBy: attendance.modifiedBy,
          allData: JSON.parse(attendance.allData)
        });
      } catch (err) {
        console.error(`Error loading attendance ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      attendances,
      total: attendances.length,
      contractAddress: deployment.contractAddress,
      metadata: {
        blockchainNetwork: deployment.transactionDetails?.chainId || 'unknown',
        contractType: 'AttendanceStorage',
        deploymentTime: deployment.deploymentTime
      }
    });

  } catch (error) {
    console.error('Error fetching attendances:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'list_attendances'
    });
  }
});

// Attendances - Store new attendance data
router.post('/', async (req, res) => {
  try {
    const { privateKey, attendanceData } = req.body;

    // Validation
    if (!privateKey) {
      return res.status(400).json({ error: 'privateKey required' });
    }
    if (!attendanceData?.recordId) {
      return res.status(400).json({ error: 'attendanceData with recordId required' });
    }

    const deployFile = path.join(__dirname, 'contract-deployment-attendance.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Attendance contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('attendance');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const { recordId, createdTimestamp, modifiedTimestamp, modifiedBy, allData } = attendanceData;

    // Convert timestamps to Unix format
    const createdUnix = Math.floor(new Date(createdTimestamp).getTime() / 1000);
    const modifiedUnix = Math.floor(new Date(modifiedTimestamp).getTime() / 1000);
    const dataString = typeof allData === 'string' ? allData : JSON.stringify(allData);

    // Encode the transaction
    const data = instance.methods.storeAttendance(
      recordId, createdUnix, modifiedUnix, modifiedBy, dataString
    ).encodeABI();

    console.log(`Storing attendance data: ${recordId}`);
    console.log(`  Employee: ${allData.employee || 'N/A'}`);
    console.log(`  Employee Name: ${allData.employee_name || 'N/A'}`);
    console.log(`  Date: ${allData.attendance_date || 'N/A'}`);
    console.log(`  Status: ${allData.status || 'N/A'}`);
    console.log(`  Department: ${allData.department || 'N/A'}`);

    // Send transaction
    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data);
    console.log('Attendance data stored successfully on blockchain!');

    res.json({
      success: true,
      operation: 'store_attendance',
      recordId,
      attendanceInfo: {
        employee: allData.employee,
        employee_name: allData.employee_name,
        attendance_date: allData.attendance_date,
        status: allData.status,
        department: allData.department,
        working_hours: allData.working_hours,
        in_time: allData.in_time,
        out_time: allData.out_time
      },
      blockchain: {
        contractAddress: deployment.contractAddress,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Attendance store failed:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'store_attendance'
    });
  }
});

// Attendances - Get attendance by ID
router.get('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-attendance.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Attendance contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('attendance');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if attendance exists
    const exists = await instance.methods.doesAttendanceExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `Attendance ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get attendance data
    const attendance = await instance.methods.getAttendance(recordId).call();
    const attendanceData = JSON.parse(attendance.allData);

    res.json({
      success: true,
      recordId: attendance.recordId,
      createdTimestamp: new Date(parseInt(attendance.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(attendance.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: attendance.modifiedBy,
      allData: attendanceData,
      attendanceInfo: {
        employee: attendanceData.employee,
        employee_name: attendanceData.employee_name,
        attendance_date: attendanceData.attendance_date,
        status: attendanceData.status,
        department: attendanceData.department,
        company: attendanceData.company,
        working_hours: attendanceData.working_hours,
        in_time: attendanceData.in_time,
        out_time: attendanceData.out_time,
        late_entry: attendanceData.late_entry,
        early_exit: attendanceData.early_exit
      },
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'AttendanceStorage',
        networkId: deployment.transactionDetails?.chainId
      }
    });

  } catch (error) {
    console.error('Error fetching attendance:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_attendance',
      recordId: req.params.recordId
    });
  }
});

// Attendances - Get attendance metadata only (without full data)
router.get('/:recordId/metadata', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-attendance.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Attendance contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('attendance');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if attendance exists
    const exists = await instance.methods.doesAttendanceExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `Attendance ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get attendance metadata
    const metadata = await instance.methods.getAttendanceMetadata(recordId).call();

    res.json({
      success: true,
      recordId: metadata.recordId,
      createdTimestamp: new Date(parseInt(metadata.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(metadata.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: metadata.modifiedBy,
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'AttendanceStorage'
      }
    });

  } catch (error) {
    console.error('Error fetching attendance metadata:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_attendance_metadata',
      recordId: req.params.recordId
    });
  }
});

// Attendances - Get attendances by employee
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-attendance.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Attendance contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('attendance');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalAttendances().call();
    if (total === '0') {
      return res.json({ success: true, attendances: [], total: 0 });
    }

    const ids = await instance.methods.getAllAttendanceIds().call();
    const employeeAttendances = [];

    for (const id of ids) {
      try {
        const attendance = await instance.methods.getAttendance(id).call();
        const attendanceData = JSON.parse(attendance.allData);

        // Filter by employee ID
        if (attendanceData.employee === employeeId) {
          employeeAttendances.push({
            recordId: attendance.recordId,
            createdTimestamp: new Date(parseInt(attendance.createdTimestamp) * 1000).toISOString(),
            modifiedTimestamp: new Date(parseInt(attendance.modifiedTimestamp) * 1000).toISOString(),
            modifiedBy: attendance.modifiedBy,
            allData: attendanceData
          });
        }
      } catch (err) {
        console.error(`Error loading attendance ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      employeeId,
      attendances: employeeAttendances,
      total: employeeAttendances.length,
      contractAddress: deployment.contractAddress
    });

  } catch (error) {
    console.error('Error fetching employee attendances:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_employee_attendances',
      employeeId: req.params.employeeId
    });
  }
});

// Attendances - Get attendances by date range
router.get('/date/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-attendance.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Attendance contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('attendance');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalAttendances().call();
    if (total === '0') {
      return res.json({ success: true, attendances: [], total: 0 });
    }

    const ids = await instance.methods.getAllAttendanceIds().call();
    const dateRangeAttendances = [];

    for (const id of ids) {
      try {
        const attendance = await instance.methods.getAttendance(id).call();
        const attendanceData = JSON.parse(attendance.allData);

        // Filter by date range (assuming attendance_date is in YYYY-MM-DD format)
        const attendanceDate = attendanceData.attendance_date;
        if (attendanceDate >= startDate && attendanceDate <= endDate) {
          dateRangeAttendances.push({
            recordId: attendance.recordId,
            createdTimestamp: new Date(parseInt(attendance.createdTimestamp) * 1000).toISOString(),
            modifiedTimestamp: new Date(parseInt(attendance.modifiedTimestamp) * 1000).toISOString(),
            modifiedBy: attendance.modifiedBy,
            allData: attendanceData
          });
        }
      } catch (err) {
        console.error(`Error loading attendance ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      dateRange: { startDate, endDate },
      attendances: dateRangeAttendances,
      total: dateRangeAttendances.length,
      contractAddress: deployment.contractAddress
    });

  } catch (error) {
    console.error('Error fetching date range attendances:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_date_range_attendances',
      dateRange: { startDate: req.params.startDate, endDate: req.params.endDate }
    });
  }
});

// Attendances - Check if attendance exists
router.head('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-attendance.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).end();
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('attendance');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const exists = await instance.methods.doesAttendanceExist(recordId).call();

    if (exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }

  } catch (error) {
    console.error('Error checking attendance existence:', error.message);
    res.status(500).end();
  }
});

// Export router and initialization function
module.exports = {
  router,
  initAttendanceRoutes
};