// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeFinancialStorage {
    struct Financial {
        string salaryCurrency;
        string salaryMode;
        string bankName;
        string bankAccountNo;
        string iban;
    }
    
    mapping(uint256 => Financial) public employeeFinancial;
    event EmployeeFinancialUpdated(uint256 indexed employeeId);
    
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
}