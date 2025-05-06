// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeCareerStorage {
    struct Career {
        string reasonForLeaving;
        string feedback;
        string employmentType;
        string grade;
        string jobApplicant;
        string defaultShift;
    }
    
    mapping(uint256 => Career) public employeeCareer;
    event EmployeeCareerUpdated(uint256 indexed employeeId);
    
    function storeCareer(
        uint256 _employeeId,
        string memory _reasonForLeaving,
        string memory _feedback,
        string memory _employmentType,
        string memory _grade,
        string memory _jobApplicant,
        string memory _defaultShift
    ) public returns (bool) {
        Career storage details = employeeCareer[_employeeId];
        
        details.reasonForLeaving = _reasonForLeaving;
        details.feedback = _feedback;
        details.employmentType = _employmentType;
        details.grade = _grade;
        details.jobApplicant = _jobApplicant;
        details.defaultShift = _defaultShift;
        
        emit EmployeeCareerUpdated(_employeeId);
        return true;
    }
    
    function getCareer(uint256 _employeeId) public view returns (
        string memory reasonForLeaving,
        string memory feedback,
        string memory employmentType,
        string memory grade,
        string memory jobApplicant,
        string memory defaultShift
    ) {
        Career storage details = employeeCareer[_employeeId];
        return (
            details.reasonForLeaving,
            details.feedback,
            details.employmentType,
            details.grade,
            details.jobApplicant,
            details.defaultShift
        );
    }
}