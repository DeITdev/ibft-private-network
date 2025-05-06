// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeBasicInfoStorage {
    // Basic info structure
    struct BasicInfo {
        string firstName;
        string middleName;
        string lastName;
        string fullName;
        string gender;
        string salutation;
        string company;
        string department;
        string designation;
        string status;
    }
    
    // Mapping from employee ID to basic info
    mapping(uint256 => BasicInfo) public employeeBasicInfo;
    
    // Event emitted when info is updated
    event EmployeeBasicInfoUpdated(uint256 indexed employeeId);
    
    // Store or update basic employee information
    function storeBasicInfo(
        uint256 _employeeId,
        string memory _firstName,
        string memory _middleName,
        string memory _lastName,
        string memory _fullName,
        string memory _gender,
        string memory _salutation,
        string memory _company,
        string memory _department,
        string memory _designation,
        string memory _status
    ) public returns (bool) {
        BasicInfo storage info = employeeBasicInfo[_employeeId];
        
        info.firstName = _firstName;
        info.middleName = _middleName;
        info.lastName = _lastName;
        info.fullName = _fullName;
        info.gender = _gender;
        info.salutation = _salutation;
        info.company = _company;
        info.department = _department;
        info.designation = _designation;
        info.status = _status;
        
        emit EmployeeBasicInfoUpdated(_employeeId);
        return true;
    }
    
    // Get basic employee information
    function getBasicInfo(uint256 _employeeId) public view returns (
        string memory firstName,
        string memory middleName,
        string memory lastName,
        string memory fullName,
        string memory gender,
        string memory salutation,
        string memory company,
        string memory department,
        string memory designation,
        string memory status
    ) {
        BasicInfo storage info = employeeBasicInfo[_employeeId];
        return (
            info.firstName,
            info.middleName,
            info.lastName,
            info.fullName,
            info.gender,
            info.salutation,
            info.company,
            info.department,
            info.designation,
            info.status
        );
    }
}