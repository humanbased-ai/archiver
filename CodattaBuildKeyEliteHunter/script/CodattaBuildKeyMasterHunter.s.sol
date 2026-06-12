// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console.sol";
import "forge-std/Script.sol";
import "../src/CodattaBuildKeyMasterHunter.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract CodattaBuildKeyMasterHunterUUPS is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address owner = vm.envAddress("OWNER");

        address uupsProxy = Upgrades.deployUUPSProxy(
            "CodattaBuildKeyMasterHunter.sol",
            abi.encodeCall(CodattaBuildKeyMasterHunter.initialize, (owner))
        );

        console.log("uupsProxy deploy at %s", uupsProxy);
        // Upgrades.upgradeProxy(0xd6DEaa299379Dc902aaB05858138dC776706F1b3, "CodattaBuildKeyMasterHunter.sol", "");

        vm.stopBroadcast();
    }
}
