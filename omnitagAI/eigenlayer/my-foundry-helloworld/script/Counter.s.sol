// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Counter.sol";

contract DeployCounter is Script {
    function run() external {
        vm.startBroadcast();

        // 部署合约
        Counter counter = new Counter();

        console.log("Counter deployed at:", address(counter));

        vm.stopBroadcast();
    }
}