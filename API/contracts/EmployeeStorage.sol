// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeContract {
    /*** DATA STRUCTURES ***/
    
    // Employee metadata
    struct EmployeeMetadata {
        uint256 id;
        string name;
        bool exists;
    }
    
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
    
    // Dates structure
    struct BasicDates {
        uint256 dateOfBirth;
        uint256 dateOfJoining;
        uint256 dateOfRetirement;
        uint256 creationDate;
        uint256 modificationDate;
    }
    
    struct AdditionalDates {
        uint256 scheduledConfirmationDate;
        uint256 finalConfirmationDate;
        uint256 contractEndDate;
        uint256 resignationLetterDate;
        uint256 relievingDate;
        uint256 encashmentDate;
        uint256 heldOnDate;
    }
    
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
    
    // Basic employment structure
    struct BasicEmployment {
        string employeeNumber;
        string reportsTo;
        string branch;
        uint256 noticeNumberOfDays;
        string newWorkplace;
        bool leaveEncashed;
    }
    
    // Career structure
    struct Career {
        string reasonForLeaving;
        string feedback;
        string employmentType;
        string grade;
        string jobApplicant;
        string defaultShift;
    }
    
    // Approval structure
    struct Approval {
        string expenseApprover;
        string leaveApprover;
        string shiftRequestApprover;
        string payrollCostCenter;
        string healthInsuranceProvider;
        string healthInsuranceNo;
    }
    
    // Financial structure
    struct Financial {
        string salaryCurrency;
        string salaryMode;
        string bankName;
        string bankAccountNo;
        string iban;
    }
    
    // Personal structure
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
    
    /*** STATE VARIABLES ***/
    
    // Employee registry data
    mapping(uint256 => EmployeeMetadata) public employees;
    uint256[] public employeeIds;
    uint256 public employeeCount;
    
    // Module data
    mapping(uint256 => BasicInfo) public employeeBasicInfo;
    mapping(uint256 => BasicDates) public employeeBasicDates;
    mapping(uint256 => AdditionalDates) public employeeAdditionalDates;
    mapping(uint256 => ContactInfo) public employeeContactInfo;
    mapping(uint256 => BasicEmployment) public employeeBasicEmployment;
    mapping(uint256 => Career) public employeeCareer;
    mapping(uint256 => Approval) public employeeApproval;
    mapping(uint256 => Financial) public employeeFinancial;
    mapping(uint256 => Personal) public employeePersonal;
    
    /*** EVENTS ***/
    
    // Registry events
    event EmployeeAdded(uint256 indexed id, string name);
    
    // Module events
    event EmployeeBasicInfoUpdated(uint256 indexed employeeId);
    event EmployeeBasicDatesUpdated(uint256 indexed employeeId);
    event EmployeeAdditionalDatesUpdated(uint256 indexed employeeId);
    event EmployeeContactInfoUpdated(uint256 indexed employeeId);
    event EmployeeBasicEmploymentUpdated(uint256 indexed employeeId);
    event EmployeeCareerUpdated(uint256 indexed employeeId);
    event EmployeeApprovalUpdated(uint256 indexed employeeId);
    event EmployeeFinancialUpdated(uint256 indexed employeeId);
    event EmployeePersonalUpdated(uint256 indexed employeeId);
    
    /*** REGISTRY FUNCTIONS ***/
    
    // Register a new employee
    function registerEmployee(uint256 _id, string memory _name) public returns (bool) {
        if (!employees[_id].exists) {
            employees[_id] = EmployeeMetadata({
                id: _id,
                name: _name,
                exists: true
            });
            employeeIds.push(_id);
            employeeCount++;
            emit EmployeeAdded(_id, _name);
        }
        return true;
    }
    
    // Get the number of registered employees
    function getEmployeeCount() public view returns (uint256) {
        return employeeIds.length;
    }
    
    /*** BASIC INFO FUNCTIONS ***/
    
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
        // Register employee if they don't exist
        if (!employees[_employeeId].exists) {
            registerEmployee(_employeeId, _fullName);
        }
        
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
    
    /*** DATES FUNCTIONS ***/
    
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
    
    /*** CONTACT INFO FUNCTIONS ***/
    
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
    
    /*** BASIC EMPLOYMENT FUNCTIONS ***/
    
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
    
    /*** CAREER FUNCTIONS ***/
    
    // Store career info
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
    
    // Get career info
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
    
    /*** APPROVAL FUNCTIONS ***/
    
    // Store approval info
    function storeApproval(
        uint256 _employeeId,
        string memory _expenseApprover,
        string memory _leaveApprover,
        string memory _shiftRequestApprover,
        string memory _payrollCostCenter,
        string memory _healthInsuranceProvider,
        string memory _healthInsuranceNo
    ) public returns (bool) {
        Approval storage details = employeeApproval[_employeeId];
        
        details.expenseApprover = _expenseApprover;
        details.leaveApprover = _leaveApprover;
        details.shiftRequestApprover = _shiftRequestApprover;
        details.payrollCostCenter = _payrollCostCenter;
        details.healthInsuranceProvider = _healthInsuranceProvider;
        details.healthInsuranceNo = _healthInsuranceNo;
        
        emit EmployeeApprovalUpdated(_employeeId);
        return true;
    }
    
    // Get approval info
    function getApproval(uint256 _employeeId) public view returns (
        string memory expenseApprover,
        string memory leaveApprover,
        string memory shiftRequestApprover,
        string memory payrollCostCenter,
        string memory healthInsuranceProvider,
        string memory healthInsuranceNo
    ) {
        Approval storage details = employeeApproval[_employeeId];
        return (
            details.expenseApprover,
            details.leaveApprover,
            details.shiftRequestApprover,
            details.payrollCostCenter,
            details.healthInsuranceProvider,
            details.healthInsuranceNo
        );
    }
    
    /*** FINANCIAL FUNCTIONS ***/
    
    // Store financial info
    function storeFinancial(
        uint256 _employeeId,
        string memory _salaryCurrency,
        string memory _salaryMode,
        string memory _bankName,
        string memory _bankAccountNo,
        string memory _iban
    ) public returns (bool) {
        Financial storage details = employeeFinancial[_employeeId];
        
        details.salaryCurrency = _salaryCurrency;
        details.salaryMode = _salaryMode;
        details.bankName = _bankName;
        details.bankAccountNo = _bankAccountNo;
        details.iban = _iban;
        
        emit EmployeeFinancialUpdated(_employeeId);
        return true;
    }
    
    // Get financial info
    function getFinancial(uint256 _employeeId) public view returns (
        string memory salaryCurrency,
        string memory salaryMode,
        string memory bankName,
        string memory bankAccountNo,
        string memory iban
    ) {
        Financial storage details = employeeFinancial[_employeeId];
        return (
            details.salaryCurrency,
            details.salaryMode,
            details.bankName,
            details.bankAccountNo,
            details.iban
        );
    }
    
    /*** PERSONAL FUNCTIONS ***/
    
    // Store personal info
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
    
    // Get personal info
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
    
    /*** COMPLETE DATA RETRIEVAL FUNCTIONS ***/
    
    // Get summary information for an employee
    function getEmployeeSummary(uint256 _employeeId) public view returns (
        bool exists,
        string memory name,
        string memory fullName,
        string memory gender,
        string memory company,
        string memory department,
        string memory designation,
        string memory status,
        uint256 dateOfJoining
    ) {
        EmployeeMetadata storage meta = employees[_employeeId];
        BasicInfo storage info = employeeBasicInfo[_employeeId];
        BasicDates storage dates = employeeBasicDates[_employeeId];
        
        return (
            meta.exists,
            meta.name,
            info.fullName,
            info.gender,
            info.company,
            info.department,
            info.designation,
            info.status,
            dates.dateOfJoining
        );
    }
}