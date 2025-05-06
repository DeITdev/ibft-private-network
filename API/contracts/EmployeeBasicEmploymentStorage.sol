// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeBasicEmploymentStorage {
    // Basic employment structure
    struct BasicEmployment {
        string employeeNumber;
        string reportsTo;
        string branch;
        uint256 noticeNumberOfDays;
        string newWorkplace;
        bool leaveEncashed;
    }
    
    // Mapping from employee ID to basic employment info
    mapping(uint256 => BasicEmployment) public employeeBasicEmployment;
    
    // Event emitted when basic employment info is updated
    event EmployeeBasicEmploymentUpdated(uint256 indexed employeeId);
    
    // Store or update basic employment information
    function storeBasicEmployment(
        uint256 _employeeId,
        string memory _employeeNumber,
        string memory _reportsTo,
        string memory _branch,
        uint256 _noticeNumberOfDays,
        string memory _newWorkplace,
        bool _leaveEncashed
    ) public returns (bool) {
        BasicEmployment storage info = employeeBasicEmployment[_employeeId];
        
        info.employeeNumber = _employeeNumber;
        info.reportsTo = _reportsTo;
        info.branch = _branch;
        info.noticeNumberOfDays = _noticeNumberOfDays;
        info.newWorkplace = _newWorkplace;
        info.leaveEncashed = _leaveEncashed;
        
        emit EmployeeBasicEmploymentUpdated(_employeeId);
        return true;
    }
    
    // Get basic employment information
    function getBasicEmployment(uint256 _employeeId) public view returns (
        string memory employeeNumber,
        string memory reportsTo,
        string memory branch,
        uint256 noticeNumberOfDays,
        string memory newWorkplace,
        bool leaveEncashed
    ) {
        BasicEmployment storage info = employeeBasicEmployment[_employeeId];
        return (
            info.employeeNumber,
            info.reportsTo,
            info.branch,
            info.noticeNumberOfDays,
            info.newWorkplace,
            info.leaveEncashed
        );
    }
}