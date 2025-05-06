// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeApprovalStorage {
    struct Approval {
        string expenseApprover;
        string leaveApprover;
        string shiftRequestApprover;
        string payrollCostCenter;
        string healthInsuranceProvider;
        string healthInsuranceNo;
    }
    
    mapping(uint256 => Approval) public employeeApproval;
    event EmployeeApprovalUpdated(uint256 indexed employeeId);
    
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
}