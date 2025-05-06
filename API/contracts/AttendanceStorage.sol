// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnhancedAttendanceStorage {
    struct AttendanceRecord {
        string name;
        string employeeId;
        string employeeName;
        uint256 attendanceDate;
        string status;
        string company;
        string details;
        string shift;
        string amendedFrom;
        bool exists;
    }
    
    mapping(uint256 => AttendanceRecord) public attendanceRecords;
    mapping(string => uint256[]) public employeeAttendanceIds;
    uint256 public attendanceCount;
    
    error RecordNotFound();
    error IndexOutOfBounds();
    
    event Recorded(uint256 indexed id, string employeeId, uint256 date, string status);
    event Updated(uint256 indexed id, string employeeId, uint256 date, string status);
    
    function storeAttendance(
        uint256 id,
        string memory _name,
        string memory _employeeId,
        string memory _employeeName,
        uint256 _attendanceDate,
        string memory _status,
        string memory _company,
        string memory _details,
        string memory _shift,
        string memory _amendedFrom
    ) external returns (bool) {
        bool isNew = !attendanceRecords[id].exists;
        
        AttendanceRecord storage record = attendanceRecords[id];
        record.name = _name;
        record.employeeId = _employeeId;
        record.employeeName = _employeeName;
        record.attendanceDate = _attendanceDate;
        record.status = _status;
        record.company = _company;
        record.details = _details;
        record.shift = _shift;
        record.amendedFrom = _amendedFrom;
        record.exists = true;
        
        if (isNew) {
            attendanceCount++;
            employeeAttendanceIds[_employeeId].push(id);
            emit Recorded(id, _employeeId, _attendanceDate, _status);
        } else {
            emit Updated(id, _employeeId, _attendanceDate, _status);
        }
        return true;
    }
    
    function getAttendance(uint256 id) external view returns (
        string memory name,
        string memory employeeId,
        string memory employeeName,
        uint256 attendanceDate,
        string memory status,
        string memory company,
        string memory details,
        string memory shift,
        string memory amendedFrom
    ) {
        if (!attendanceRecords[id].exists) revert RecordNotFound();
        AttendanceRecord storage record = attendanceRecords[id];
        return (
            record.name,
            record.employeeId,
            record.employeeName,
            record.attendanceDate,
            record.status,
            record.company,
            record.details,
            record.shift,
            record.amendedFrom
        );
    }
    
    function getEmployeeAttendanceCount(string calldata employeeId) external view returns (uint256) {
        return employeeAttendanceIds[employeeId].length;
    }
    
    function getEmployeeAttendanceId(string calldata employeeId, uint256 index) external view returns (uint256) {
        if (index >= employeeAttendanceIds[employeeId].length) revert IndexOutOfBounds();
        return employeeAttendanceIds[employeeId][index];
    }
    
    function getAttendanceStatusOnDate(string calldata employeeId, uint256 date) external view returns (string memory) {
        uint256[] storage ids = employeeAttendanceIds[employeeId];
        for (uint256 i = 0; i < ids.length; i++) {
            AttendanceRecord storage record = attendanceRecords[ids[i]];
            if (record.attendanceDate == date) {
                return record.status;
            }
        }
        return "Not Recorded";
    }
    
    function getAttendanceStats(string calldata employeeId) external view returns (
        uint256 total,
        uint256 present,
        uint256 absent,
        uint256 late
    ) {
        uint256[] storage ids = employeeAttendanceIds[employeeId];
        total = ids.length;
        for (uint256 i = 0; i < ids.length; i++) {
            AttendanceRecord storage record = attendanceRecords[ids[i]];
            bytes32 statusHash = keccak256(abi.encodePacked(record.status));
            if (statusHash == keccak256(abi.encodePacked("Present"))) {
                present++;
                bytes32 detailsHash = keccak256(abi.encodePacked(record.details));
                if (detailsHash == keccak256(abi.encodePacked("Late entry")) || 
                    detailsHash == keccak256(abi.encodePacked("Late entry or early exit"))) {
                    late++;
                }
            } else if (statusHash == keccak256(abi.encodePacked("Absent"))) {
                absent++;
            }
        }
        return (total, present, absent, late);
    }
}