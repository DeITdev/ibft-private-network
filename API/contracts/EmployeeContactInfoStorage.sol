// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeContactInfoStorage {
    // Contact info structure
    struct ContactInfo {
        string cellNumber;
        string personalEmail;
        string companyEmail;
        string preferredContactEmail;
        string currentAddress;
        string currentAccommodationType;
        string permanentAddress;
        string permanentAccommodationType;
        string personToBeContacted;
        string emergencyPhoneNumber;
        string relation;
    }
    
    // Mapping from employee ID to contact info
    mapping(uint256 => ContactInfo) public employeeContactInfo;
    
    // Event emitted when contact info is updated
    event EmployeeContactInfoUpdated(uint256 indexed employeeId);
    
    // Store or update employee contact information
    function storeContactInfo(
        uint256 _employeeId,
        string memory _cellNumber,
        string memory _personalEmail,
        string memory _companyEmail,
        string memory _preferredContactEmail,
        string memory _currentAddress,
        string memory _currentAccommodationType,
        string memory _permanentAddress,
        string memory _permanentAccommodationType,
        string memory _personToBeContacted,
        string memory _emergencyPhoneNumber,
        string memory _relation
    ) public returns (bool) {
        ContactInfo storage info = employeeContactInfo[_employeeId];
        
        info.cellNumber = _cellNumber;
        info.personalEmail = _personalEmail;
        info.companyEmail = _companyEmail;
        info.preferredContactEmail = _preferredContactEmail;
        info.currentAddress = _currentAddress;
        info.currentAccommodationType = _currentAccommodationType;
        info.permanentAddress = _permanentAddress;
        info.permanentAccommodationType = _permanentAccommodationType;
        info.personToBeContacted = _personToBeContacted;
        info.emergencyPhoneNumber = _emergencyPhoneNumber;
        info.relation = _relation;
        
        emit EmployeeContactInfoUpdated(_employeeId);
        return true;
    }
    
    // Get employee contact information
    function getContactInfo(uint256 _employeeId) public view returns (
        string memory cellNumber,
        string memory personalEmail,
        string memory companyEmail,
        string memory preferredContactEmail,
        string memory currentAddress,
        string memory currentAccommodationType,
        string memory permanentAddress,
        string memory permanentAccommodationType,
        string memory personToBeContacted,
        string memory emergencyPhoneNumber,
        string memory relation
    ) {
        ContactInfo storage info = employeeContactInfo[_employeeId];
        return (
            info.cellNumber,
            info.personalEmail,
            info.companyEmail,
            info.preferredContactEmail,
            info.currentAddress,
            info.currentAccommodationType,
            info.permanentAddress,
            info.permanentAccommodationType,
            info.personToBeContacted,
            info.emergencyPhoneNumber,
            info.relation
        );
    }
}