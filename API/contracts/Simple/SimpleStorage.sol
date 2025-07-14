// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 public storedData;
    
    event Stored(address indexed sender, uint256 value);

    constructor(uint256 initVal) {
        storedData = initVal;
        emit Stored(msg.sender, initVal);
    }

    function set(uint256 x) public {
        storedData = x;
        emit Stored(msg.sender, x);
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}