// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserStorage {
    // User data structure
    struct User {
        string recordId;          // adhiarja.puspita@pfm.com
        uint256 createdTimestamp; // 2025-06-26T15:31:09.543Z converted to timestamp
        uint256 modifiedTimestamp; // 2025-07-14T20:43:00.064Z converted to timestamp
        string modifiedBy;        // Administrator
        string allData;           // Complete JSON string of all user data
    }
    
    // Mapping from user record ID to user data
    mapping(string => User) public users;
    
    // Array to store all user record IDs for enumeration
    string[] public userIds;
    
    // Mapping to check if user exists
    mapping(string => bool) public userExists;
    
    // Events
    event UserStored(string indexed recordId, uint256 createdTimestamp, uint256 modifiedTimestamp);
    event UserUpdated(string indexed recordId, uint256 modifiedTimestamp);
    
    // Store or update user data
    function storeUser(
        string memory _recordId,
        uint256 _createdTimestamp,
        uint256 _modifiedTimestamp,
        string memory _modifiedBy,
        string memory _allData
    ) public returns (bool) {
        // Check if this is a new user
        bool isNewUser = !userExists[_recordId];
        
        // Store user data
        users[_recordId] = User({
            recordId: _recordId,
            createdTimestamp: _createdTimestamp,
            modifiedTimestamp: _modifiedTimestamp,
            modifiedBy: _modifiedBy,
            allData: _allData
        });
        
        // If new user, add to array and mark as existing
        if (isNewUser) {
            userIds.push(_recordId);
            userExists[_recordId] = true;
            emit UserStored(_recordId, _createdTimestamp, _modifiedTimestamp);
        } else {
            emit UserUpdated(_recordId, _modifiedTimestamp);
        }
        
        return true;
    }
    
    // Get user data
    function getUser(string memory _recordId) public view returns (
        string memory recordId,
        uint256 createdTimestamp,
        uint256 modifiedTimestamp,
        string memory modifiedBy,
        string memory allData
    ) {
        require(userExists[_recordId], "User does not exist");
        
        User memory usr = users[_recordId];
        return (
            usr.recordId,
            usr.createdTimestamp,
            usr.modifiedTimestamp,
            usr.modifiedBy,
            usr.allData
        );
    }
    
    // Get total number of users
    function getTotalUsers() public view returns (uint256) {
        return userIds.length;
    }
    
    // Get user record ID by index
    function getUserIdByIndex(uint256 _index) public view returns (string memory) {
        require(_index < userIds.length, "Index out of bounds");
        return userIds[_index];
    }
    
    // Get all user IDs
    function getAllUserIds() public view returns (string[] memory) {
        return userIds;
    }
    
    // Check if user exists
    function doesUserExist(string memory _recordId) public view returns (bool) {
        return userExists[_recordId];
    }
    
    // Get user metadata only (without full data)
    function getUserMetadata(string memory _recordId) public view returns (
        string memory recordId,
        uint256 createdTimestamp,
        uint256 modifiedTimestamp,
        string memory modifiedBy
    ) {
        require(userExists[_recordId], "User does not exist");
        
        User memory usr = users[_recordId];
        return (
            usr.recordId,
            usr.createdTimestamp,
            usr.modifiedTimestamp,
            usr.modifiedBy
        );
    }
}