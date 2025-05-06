// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeePersonalStorage {
    // Personal details structure
    struct Personal {
        string maritalStatus;
        string familyBackground;
        string bloodGroup;
        string healthDetails;
        string passportNumber;
        string validUpto;
        string dateOfIssue;
        string placeOfIssue;
        string bio;
        string attendanceDeviceId;
        string holidayList;
    }
    
    // Mapping from employee ID to personal details
    mapping(uint256 => Personal) public employeePersonal;
    
    // Event emitted when personal details are updated
    event EmployeePersonalUpdated(uint256 indexed employeeId);
    
    // Store or update employee personal details
    function storePersonal(
        uint256 _employeeId,
        string memory _maritalStatus,
        string memory _familyBackground,
        string memory _bloodGroup,
        string memory _healthDetails,
        string memory _passportNumber,
        string memory _validUpto,
        string memory _dateOfIssue,
        string memory _placeOfIssue,
        string memory _bio,
        string memory _attendanceDeviceId,
        string memory _holidayList
    ) public returns (bool) {
        Personal storage details = employeePersonal[_employeeId];
        
        details.maritalStatus = _maritalStatus;
        details.familyBackground = _familyBackground;
        details.bloodGroup = _bloodGroup;
        details.healthDetails = _healthDetails;
        details.passportNumber = _passportNumber;
        details.validUpto = _validUpto;
        details.dateOfIssue = _dateOfIssue;
        details.placeOfIssue = _placeOfIssue;
        details.bio = _bio;
        details.attendanceDeviceId = _attendanceDeviceId;
        details.holidayList = _holidayList;
        
        emit EmployeePersonalUpdated(_employeeId);
        return true;
    }
    
    // Get employee personal details
    function getPersonal(uint256 _employeeId) public view returns (
        string memory maritalStatus,
        string memory familyBackground,
        string memory bloodGroup,
        string memory healthDetails,
        string memory passportNumber,
        string memory validUpto,
        string memory dateOfIssue,
        string memory placeOfIssue,
        string memory bio,
        string memory attendanceDeviceId,
        string memory holidayList
    ) {
        Personal storage details = employeePersonal[_employeeId];
        return (
            details.maritalStatus,
            details.familyBackground,
            details.bloodGroup,
            details.healthDetails,
            details.passportNumber,
            details.validUpto,
            details.dateOfIssue,
            details.placeOfIssue,
            details.bio,
            details.attendanceDeviceId,
            details.holidayList
        );
    }
}