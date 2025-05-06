// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnhancedAttendanceStorage {
    // Struct to store attendance record data
    struct AttendanceRecord {
        string name;             // HR-ATT-2025-00004
        string employeeId;       // HR-EMP-00001
        string employeeName;     // Employee name
        uint256 attendanceDate;  // Date timestamp
        string status;           // Present, Absent, etc.
        string company;          // Company name
        string details;          // Additional details like "Late entry"
        string shift;            // Shift information
        string amendedFrom;      // If amended from previous status
        bool exists;             // Flag to check if record exists
    }
    
    // Mapping from record ID to attendance record
    mapping(uint256 => AttendanceRecord) public attendanceRecords;
    
    // Mapping from employee ID to array of their attendance record IDs
    mapping(string => uint256[]) public employeeAttendanceIds;
    
    // Counter for total attendance records
    uint256 public attendanceCount;
    
    // Events
    event AttendanceRecorded(uint256 indexed id, string employeeId, uint256 attendanceDate, string status);
    event AttendanceUpdated(uint256 indexed id, string employeeId, uint256 attendanceDate, string status);
    
    // Store a new attendance record
    function storeAttendance(
        uint256 id,
        string memory _name,
        string memory _employeeId,
        string memory _employeeName,
        uint256 _attendanceDate,
        string memory _status,
        string memory _company,
        string memory _details,
        string memory _shift,
        string memory _amendedFrom
    ) public returns (bool) {
        // Check if this is a new record or update
        bool isNew = !attendanceRecords[id].exists;
        
        // Store the attendance record
        AttendanceRecord storage record = attendanceRecords[id];
        record.name = _name;
        record.employeeId = _employeeId;
        record.employeeName = _employeeName;
        record.attendanceDate = _attendanceDate;
        record.status = _status;
        record.company = _company;
        record.details = _details;
        record.shift = _shift;
        record.amendedFrom = _amendedFrom;
        record.exists = true;
        
        // If new record, update counts and lists
        if (isNew) {
            // Increment the attendance count
            attendanceCount++;
            
            // Add to employee's attendance list
            employeeAttendanceIds[_employeeId].push(id);
            
            // Emit event
            emit AttendanceRecorded(id, _employeeId, _attendanceDate, _status);
        } else {
            // Emit update event
            emit AttendanceUpdated(id, _employeeId, _attendanceDate, _status);
        }
        
        return true;
    }
    
    // Get attendance record by ID
    function getAttendance(uint256 id) public view returns (
        string memory name,
        string memory employeeId,
        string memory employeeName,
        uint256 attendanceDate,
        string memory status,
        string memory company,
        string memory details,
        string memory shift,
        string memory amendedFrom
    ) {
        require(attendanceRecords[id].exists, "Attendance record does not exist");
        
        AttendanceRecord storage record = attendanceRecords[id];
        return (
            record.name,
            record.employeeId,
            record.employeeName,
            record.attendanceDate,
            record.status,
            record.company,
            record.details,
            record.shift,
            record.amendedFrom
        );
    }
    
    // Get all attendance records for an employee
    function getEmployeeAttendanceCount(string memory employeeId) public view returns (uint256) {
        return employeeAttendanceIds[employeeId].length;
    }
    
    // Get an employee's attendance record by index
    function getEmployeeAttendanceId(string memory employeeId, uint256 index) public view returns (uint256) {
        require(index < employeeAttendanceIds[employeeId].length, "Index out of bounds");
        return employeeAttendanceIds[employeeId][index];
    }
    
    // Get attendance status for employee on specific date
    function getAttendanceStatusOnDate(string memory employeeId, uint256 date) public view returns (string memory) {
        // Get all attendance IDs for this employee
        uint256[] storage ids = employeeAttendanceIds[employeeId];
        
        // Look for attendance record on the specific date
        for (uint256 i = 0; i < ids.length; i++) {
            AttendanceRecord storage record = attendanceRecords[ids[i]];
            
            // If dates match (compare only the date portion)
            if (record.attendanceDate == date) {
                return record.status;
            }
        }
        
        // Return "Not Recorded" if no record found
        return "Not Recorded";
    }
    
    // Get employee attendance statistics
    function getAttendanceStats(string memory employeeId) public view returns (
        uint256 totalRecords,
        uint256 presentCount,
        uint256 absentCount,
        uint256 lateCount
    ) {
        uint256[] storage ids = employeeAttendanceIds[employeeId];
        totalRecords = ids.length;
        
        // Count different attendance types
        for (uint256 i = 0; i < ids.length; i++) {
            AttendanceRecord storage record = attendanceRecords[ids[i]];
            
            // Compare strings to count different statuses
            if (compareStrings(record.status, "Present")) {
                presentCount++;
                
                // Check if it's a late entry
                if (bytes(record.details).length > 0 && 
                    (compareStrings(record.details, "Late entry") || 
                     compareStrings(record.details, "Late entry or early exit"))) {
                    lateCount++;
                }
            } else if (compareStrings(record.status, "Absent")) {
                absentCount++;
            }
        }
        
        return (totalRecords, presentCount, absentCount, lateCount);
    }
    
    // Helper function to compare strings
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}