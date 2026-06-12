// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console.sol";
import "forge-std/Script.sol";
import "../src/CodattaBuildKeyEliteHunter.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract CodattaBuildKeyEliteHunterUUPS is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address owner = vm.envAddress("OWNER");

        address uupsProxy = Upgrades.deployUUPSProxy(
            "CodattaBuildKeyEliteHunter.sol",
            abi.encodeCall(CodattaBuildKeyEliteHunter.initialize, (owner))
        );

        console.log("uupsProxy deploy at %s", uupsProxy);
        // Upgrades.upgradeProxy(0xd6DEaa299379Dc902aaB05858138dC776706F1b3, "CodattaBuildKeyEliteHunter.sol", "");

        vm.stopBroadcast();
    }
}
