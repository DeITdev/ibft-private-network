// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeDatesStorage {
    // Basic dates structure
    struct BasicDates {
        uint256 dateOfBirth;
        uint256 dateOfJoining;
        uint256 dateOfRetirement;
        uint256 creationDate;
        uint256 modificationDate;
    }
    
    // Additional dates structure
    struct AdditionalDates {
        uint256 scheduledConfirmationDate;
        uint256 finalConfirmationDate;
        uint256 contractEndDate;
        uint256 resignationLetterDate;
        uint256 relievingDate;
        uint256 encashmentDate;
        uint256 heldOnDate;
    }
    
    // Mapping from employee ID to dates
    mapping(uint256 => BasicDates) public employeeBasicDates;
    mapping(uint256 => AdditionalDates) public employeeAdditionalDates;
    
    // Events
    event EmployeeBasicDatesUpdated(uint256 indexed employeeId);
    event EmployeeAdditionalDatesUpdated(uint256 indexed employeeId);
    
    // Store basic dates
    function storeBasicDates(
        uint256 _employeeId,
        uint256 _dateOfBirth,
        uint256 _dateOfJoining,
        uint256 _dateOfRetirement,
        uint256 _creationDate,
        uint256 _modificationDate
    ) public returns (bool) {
        BasicDates storage dates = employeeBasicDates[_employeeId];
        
        dates.dateOfBirth = _dateOfBirth;
        dates.dateOfJoining = _dateOfJoining;
        dates.dateOfRetirement = _dateOfRetirement;
        dates.creationDate = _creationDate;
        dates.modificationDate = _modificationDate;
        
        emit EmployeeBasicDatesUpdated(_employeeId);
        return true;
    }
    
    // Store additional dates
    function storeAdditionalDates(
        uint256 _employeeId,
        uint256 _scheduledConfirmationDate,
        uint256 _finalConfirmationDate,
        uint256 _contractEndDate,
        uint256 _resignationLetterDate,
        uint256 _relievingDate,
        uint256 _encashmentDate,
        uint256 _heldOnDate
    ) public returns (bool) {
        AdditionalDates storage dates = employeeAdditionalDates[_employeeId];
        
        dates.scheduledConfirmationDate = _scheduledConfirmationDate;
        dates.finalConfirmationDate = _finalConfirmationDate;
        dates.contractEndDate = _contractEndDate;
        dates.resignationLetterDate = _resignationLetterDate;
        dates.relievingDate = _relievingDate;
        dates.encashmentDate = _encashmentDate;
        dates.heldOnDate = _heldOnDate;
        
        emit EmployeeAdditionalDatesUpdated(_employeeId);
        return true;
    }
    
    // Get basic dates
    function getBasicDates(uint256 _employeeId) public view returns (
        uint256 dateOfBirth,
        uint256 dateOfJoining,
        uint256 dateOfRetirement,
        uint256 creationDate,
        uint256 modificationDate
    ) {
        BasicDates storage dates = employeeBasicDates[_employeeId];
        return (
            dates.dateOfBirth,
            dates.dateOfJoining,
            dates.dateOfRetirement,
            dates.creationDate,
            dates.modificationDate
        );
    }
    
    // Get additional dates
    function getAdditionalDates(uint256 _employeeId) public view returns (
        uint256 scheduledConfirmationDate,
        uint256 finalConfirmationDate,
        uint256 contractEndDate,
        uint256 resignationLetterDate,
        uint256 relievingDate,
        uint256 encashmentDate,
        uint256 heldOnDate
    ) {
        AdditionalDates storage dates = employeeAdditionalDates[_employeeId];
        return (
            dates.scheduledConfirmationDate,
            dates.finalConfirmationDate,
            dates.contractEndDate,
            dates.resignationLetterDate,
            dates.relievingDate,
            dates.encashmentDate,
            dates.heldOnDate
        );
    }
}