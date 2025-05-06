// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeRegistry {
    // Employee metadata (minimal info stored in registry)
    struct EmployeeMetadata {
        uint256 id;
        string name;
        bool exists;
    }
    
    // Define contract types
    enum EmployeeContractType {
        BASIC_INFO,
        DATES,
        CONTACT_INFO,
        BASIC_EMPLOYMENT,
        CAREER,
        APPROVAL,
        FINANCIAL,
        PERSONAL
    }
    
    // Map employee ID to contract type to contract address
    mapping(uint256 => mapping(uint8 => address)) public employeeContracts;
    
    // Map employee ID to metadata
    mapping(uint256 => EmployeeMetadata) public employees;
    
    // List of all employee IDs
    uint256[] public employeeIds;
    
    // Events
    event EmployeeAdded(uint256 indexed id, string name);
    event EmployeeContractRegistered(uint256 indexed employeeId, uint8 indexed contractType, address contractAddress);
    
    // Register a new employee
    function registerEmployee(uint256 _id, string memory _name) public returns (bool) {
        if (!employees[_id].exists) {
            employees[_id] = EmployeeMetadata({
                id: _id,
                name: _name,
                exists: true
            });
            employeeIds.push(_id);
            emit EmployeeAdded(_id, _name);
        }
        return true;
    }
    
    // Register a storage contract for an employee's data group
    function registerEmployeeContract(uint256 _employeeId, uint8 _contractType, address _contractAddress) public returns (bool) {
        employeeContracts[_employeeId][_contractType] = _contractAddress;
        emit EmployeeContractRegistered(_employeeId, _contractType, _contractAddress);
        return true;
    }
    
    // Get the storage contract address for an employee's data group
    function getEmployeeContract(uint256 _employeeId, uint8 _contractType) public view returns (address) {
        return employeeContracts[_employeeId][_contractType];
    }
    
    // Get the number of registered employees
    function getEmployeeCount() public view returns (uint256) {
        return employeeIds.length;
    }
}