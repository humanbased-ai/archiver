// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/CodattaBuildKeyEliteHunter.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";


contract CodattaBuildKeyEliteHunterTest is Test {
    address constant CHEATCODE_ADDRESS = 0x7cE5f050B8EAc560609e767Cc7D04596B96B4b41;
    address constant SOME_ADDRESS = 0xa82B666927dBBfACC0624FB133a9df1654154B99;

    address private proxy;
    CodattaBuildKeyEliteHunter private instance;

    function setUp() public {
        proxy = Upgrades.deployUUPSProxy(
            "CodattaBuildKeyEliteHunter.sol",
            abi.encodeCall(CodattaBuildKeyEliteHunter.initialize, (CHEATCODE_ADDRESS))
        );

        console.log("uups proxy -> %s", proxy);
        
        instance = CodattaBuildKeyEliteHunter(proxy);
        assertEq(instance.owner(), CHEATCODE_ADDRESS);

        address implAddressV1 = Upgrades.getImplementationAddress(proxy);

        console.log("impl proxy -> %s", implAddressV1);
    }

    function testMint() public {
        vm.prank(CHEATCODE_ADDRESS);
        instance.mint(CHEATCODE_ADDRESS);
        assertEq(instance.ownerOf(1), CHEATCODE_ADDRESS);

        vm.prank(CHEATCODE_ADDRESS);
        vm.expectRevert(bytes("CodattaBuildKeyEliteHunter: one address can only own one token"));
        instance.mint(CHEATCODE_ADDRESS);

        vm.prank(CHEATCODE_ADDRESS);
        instance.mint(SOME_ADDRESS);
    }
}
