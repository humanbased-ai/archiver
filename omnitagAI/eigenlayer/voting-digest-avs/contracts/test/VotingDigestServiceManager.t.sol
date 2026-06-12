// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.12;

// import "../src/votingDigestServiceManager.sol" as hwsm;
// import {VotingDigestTaskManager} from "../src/VotingDigestTaskManager.sol";
// import {MockAVSDeployer} from "@eigenlayer-middleware/test/utils/MockAVSDeployer.sol";
// import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

// contract votingDigestTaskManagerTest is MockAVSDeployer {
//     incsqsm.votingDigestServiceManager sm;
//     incsqsm.votingDigestServiceManager smImplementation;
//     VotingDigestTaskManager tm;
//     VotingDigestTaskManager tmImplementation;

//     address operator =
//         address(uint160(uint256(keccak256(abi.encodePacked("operator")))));
//     address generator =
//         address(uint160(uint256(keccak256(abi.encodePacked("generator")))));

//     function setUp() public {
//         _setUpBLSMockAVSDeployer();

//         tmImplementation = new VotingDigestTaskManager(
//             incsqsm.IRegistryCoordinator(address(registryCoordinator))
//         );

//         // Third, upgrade the proxy contracts to use the correct implementation contracts and initialize them.
//         tm = VotingDigestTaskManager(
//             address(
//                 new TransparentUpgradeableProxy(
//                     address(tmImplementation),
//                     address(proxyAdmin),
//                     abi.encodeWithSelector(
//                         tm.initialize.selector,
//                         pauserRegistry,
//                         registryCoordinatorOwner
//                     )
//                 )
//             )
//         );
//     }

//     function testCreateNewTask() public {
//         cheats.prank(generator, generator);
//         tm.createNewTask("world");
//         assertEq(tm.latestTaskNum(), 1);
//     }
// }
