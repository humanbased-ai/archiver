// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CheckInContract {
    // Mapping to store check-ins
    mapping(address => mapping(uint256 => bool)) private checkIns;

    // Function to check if a specific check-in exists
    function hasCheckedIn(address user, uint256 numCheckins) external view returns (bool) {
        return checkIns[user][numCheckins];
    }

    // Fallback function to prevent accidental ETH transfers
    fallback() external payable {
        revert("Fallback function called");
    }

    // Function to record a check-in
    function checkIn(uint256 numCheckins) external {
        checkIns[msg.sender][numCheckins] = true;
    }
}
