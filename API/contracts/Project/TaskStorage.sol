// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TaskStorage {
    // Task data structure
    struct Task {
        string recordId;          // TASK-2025-01514
        uint256 createdTimestamp; // creation timestamp converted to unix
        uint256 modifiedTimestamp; // modified timestamp converted to unix
        string modifiedBy;        // Administrator
        string allData;           // Complete JSON string of all task data
    }
    
    // Mapping from task record ID to task data
    mapping(string => Task) public tasks;
    
    // Array to store all task record IDs for enumeration
    string[] public taskIds;
    
    // Mapping to check if task exists
    mapping(string => bool) public taskExists;
    
    // Events
    event TaskStored(string indexed recordId, uint256 createdTimestamp, uint256 modifiedTimestamp);
    event TaskUpdated(string indexed recordId, uint256 modifiedTimestamp);
    
    // Store or update task data
    function storeTask(
        string memory _recordId,
        uint256 _createdTimestamp,
        uint256 _modifiedTimestamp,
        string memory _modifiedBy,
        string memory _allData
    ) public returns (bool) {
        // Check if this is a new task
        bool isNewTask = !taskExists[_recordId];
        
        // Store task data
        tasks[_recordId] = Task({
            recordId: _recordId,
            createdTimestamp: _createdTimestamp,
            modifiedTimestamp: _modifiedTimestamp,
            modifiedBy: _modifiedBy,
            allData: _allData
        });
        
        // If new task, add to array and mark as existing
        if (isNewTask) {
            taskIds.push(_recordId);
            taskExists[_recordId] = true;
            emit TaskStored(_recordId, _createdTimestamp, _modifiedTimestamp);
        } else {
            emit TaskUpdated(_recordId, _modifiedTimestamp);
        }
        
        return true;
    }
    
    // Get task data
    function getTask(string memory _recordId) public view returns (
        string memory recordId,
        uint256 createdTimestamp,
        uint256 modifiedTimestamp,
        string memory modifiedBy,
        string memory allData
    ) {
        require(taskExists[_recordId], "Task does not exist");
        
        Task memory task = tasks[_recordId];
        return (
            task.recordId,
            task.createdTimestamp,
            task.modifiedTimestamp,
            task.modifiedBy,
            task.allData
        );
    }
    
    // Get total number of tasks
    function getTotalTasks() public view returns (uint256) {
        return taskIds.length;
    }
    
    // Get task record ID by index
    function getTaskIdByIndex(uint256 _index) public view returns (string memory) {
        require(_index < taskIds.length, "Index out of bounds");
        return taskIds[_index];
    }
    
    // Get all task IDs
    function getAllTaskIds() public view returns (string[] memory) {
        return taskIds;
    }
    
    // Check if task exists
    function doesTaskExist(string memory _recordId) public view returns (bool) {
        return taskExists[_recordId];
    }
    
    // Get task metadata only (without full data)
    function getTaskMetadata(string memory _recordId) public view returns (
        string memory recordId,
        uint256 createdTimestamp,
        uint256 modifiedTimestamp,
        string memory modifiedBy
    ) {
        require(taskExists[_recordId], "Task does not exist");
        
        Task memory task = tasks[_recordId];
        return (
            task.recordId,
            task.createdTimestamp,
            task.modifiedTimestamp,
            task.modifiedBy
        );
    }
}