// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeStorage {
    // Employee data structure - simplified to reduce gas
    struct Employee {
        string recordId;          // HR-EMP-00101
        uint256 createdTimestamp; // Unix timestamp
        uint256 modifiedTimestamp; // Unix timestamp
        string modifiedBy;        // Email address
        string allData;           // JSON string of all data
        bool exists;              // Track existence
    }
    
    // Mapping from employee record ID to employee data
    mapping(string => Employee) private employees;
    
    // Array to store all employee record IDs for enumeration
    string[] private employeeIds;
    
    // Events for logging
    event EmployeeStored(string indexed recordId, uint256 createdTimestamp, uint256 modifiedTimestamp);
    event EmployeeUpdated(string indexed recordId, uint256 modifiedTimestamp);
    
    // Store or update employee data
    function storeEmployee(
        string memory _recordId,
        uint256 _createdTimestamp,
        uint256 _modifiedTimestamp,
        string memory _modifiedBy,
        string memory _allData
    ) public returns (bool) {
        // Input validation
        require(bytes(_recordId).length > 0, "Record ID cannot be empty");
        require(bytes(_modifiedBy).length > 0, "Modified by cannot be empty");
        require(_createdTimestamp > 0, "Created timestamp must be positive");
        require(_modifiedTimestamp > 0, "Modified timestamp must be positive");
        
        // Check if this is a new employee
        bool isNewEmployee = !employees[_recordId].exists;
        
        // Store employee data
        employees[_recordId] = Employee({
            recordId: _recordId,
            createdTimestamp: _createdTimestamp,
            modifiedTimestamp: _modifiedTimestamp,
            modifiedBy: _modifiedBy,
            allData: _allData,
            exists: true
        });
        
        // If new employee, add to array
        if (isNewEmployee) {
            employeeIds.push(_recordId);
            emit EmployeeStored(_recordId, _createdTimestamp, _modifiedTimestamp);
        } else {
            emit EmployeeUpdated(_recordId, _modifiedTimestamp);
        }
        
        return true;
    }
    
    // Get employee data
    function getEmployee(string memory _recordId) public view returns (
        string memory recordId,
        uint256 createdTimestamp,
        uint256 modifiedTimestamp,
        string memory modifiedBy,
        string memory allData
    ) {
        require(employees[_recordId].exists, "Employee does not exist");
        
        Employee memory emp = employees[_recordId];
        return (
            emp.recordId,
            emp.createdTimestamp,
            emp.modifiedTimestamp,
            emp.modifiedBy,
            emp.allData
        );
    }
    
    // Get total number of employees
    function getTotalEmployees() public view returns (uint256) {
        return employeeIds.length;
    }
    
    // Get employee record ID by index
    function getEmployeeIdByIndex(uint256 _index) public view returns (string memory) {
        require(_index < employeeIds.length, "Index out of bounds");
        return employeeIds[_index];
    }
    
    // Get all employee IDs (limited to prevent gas issues)
    function getAllEmployeeIds() public view returns (string[] memory) {
        require(employeeIds.length <= 100, "Too many employees, use pagination");
        return employeeIds;
    }
    
    // Get employee IDs with pagination
    function getEmployeeIdsPaginated(uint256 _start, uint256 _limit) public view returns (string[] memory) {
        require(_start < employeeIds.length, "Start index out of bounds");
        
        uint256 end = _start + _limit;
        if (end > employeeIds.length) {
            end = employeeIds.length;
        }
        
        string[] memory result = new string[](end - _start);
        for (uint256 i = _start; i < end; i++) {
            result[i - _start] = employeeIds[i];
        }
        
        return result;
    }
    
    // Check if employee exists
    function doesEmployeeExist(string memory _recordId) public view returns (bool) {
        return employees[_recordId].exists;
    }
    
    // Get employee metadata only (without full data to save gas)
    function getEmployeeMetadata(string memory _recordId) public view returns (
        string memory recordId,
        uint256 createdTimestamp,
        uint256 modifiedTimestamp,
        string memory modifiedBy
    ) {
        require(employees[_recordId].exists, "Employee does not exist");
        
        Employee memory emp = employees[_recordId];
        return (
            emp.recordId,
            emp.createdTimestamp,
            emp.modifiedTimestamp,
            emp.modifiedBy
        );
    }
    
    // Remove employee (for cleanup if needed)
    function removeEmployee(string memory _recordId) public returns (bool) {
        require(employees[_recordId].exists, "Employee does not exist");
        
        // Mark as non-existent
        employees[_recordId].exists = false;
        
        // Remove from array (expensive operation, use carefully)
        for (uint256 i = 0; i < employeeIds.length; i++) {
            if (keccak256(bytes(employeeIds[i])) == keccak256(bytes(_recordId))) {
                // Move last element to this position and pop
                employeeIds[i] = employeeIds[employeeIds.length - 1];
                employeeIds.pop();
                break;
            }
        }
        
        return true;
    }
}