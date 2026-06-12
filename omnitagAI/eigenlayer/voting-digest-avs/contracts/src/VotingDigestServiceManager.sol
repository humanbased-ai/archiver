// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@eigenlayer/contracts/libraries/BytesLib.sol";
import "@eigenlayer/contracts/core/DelegationManager.sol";
import "@eigenlayer-middleware/src/unaudited/ECDSAServiceManagerBase.sol";
import "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import "@eigenlayer/contracts/permissions/Pausable.sol";
import {IRegistryCoordinator} from "@eigenlayer-middleware/src/interfaces/IRegistryCoordinator.sol";
import "./IVotingDigestServiceManager.sol";

/**
 * @title Primary entrypoint for procuring services from VotingDigest.
 * @author Eigen Labs, Inc.
 */
contract VotingDigestServiceManager is
    ECDSAServiceManagerBase,
    IVotingDigestServiceManager,
    Pausable
{
    using BytesLib for bytes;
    using ECDSAUpgradeable for bytes32;

    /* STORAGE */
    // The latest task index
    uint32 public latestTaskNum;

    // mapping of task indices to all tasks hashes
    // when a task is created, task hash is stored here,
    // and responses need to pass the actual task,
    // which is hashed onchain and checked against this mapping
    mapping(uint32 => bytes32) public allTaskHashes;

    // mapping of task indices to hash of abi.encode(taskResponse, taskResponseMetadata)
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;

    /* MODIFIERS */
    modifier onlyOperator() {
        require(
            ECDSAStakeRegistry(stakeRegistry).operatorRegistered(msg.sender)
            ==
            true,
            "Operator must be the caller"
        );
        _;
    }

    constructor (
        address _avsDirectory,
        address _stakeRegistry,
        address _delegationManager
    )
        ECDSAServiceManagerBase(
            _avsDirectory,
            _stakeRegistry,
            address(0),
            _delegationManager
        )
    {}


    /* FUNCTIONS */
    // NOTE: this function creates new task, assigns it a taskId
    function createNewTask(
        string memory name
    ) external {
        // create a new task struct
        Task memory newTask;
        newTask.name = name;
        newTask.taskCreatedBlock = uint32(block.number);

        // store hash of task onchain, emit event, and increase taskNum
        allTaskHashes[latestTaskNum] = keccak256(abi.encode(newTask));
        emit NewTaskCreated(latestTaskNum, newTask);
        latestTaskNum = latestTaskNum + 1;
    }

    // NOTE: this function responds to existing tasks.
    function respondToTask(
        Task calldata task,
        uint32 referenceTaskIndex,
        bytes calldata signature
    ) external onlyOperator {
        require(
            operatorHasMinimumWeight(msg.sender),
            "Operator does not have match the weight requirements"
        );
        // check that the task is valid, hasn't been responsed yet, and is being responded in time
        require(
            keccak256(abi.encode(task)) ==
                allTaskHashes[referenceTaskIndex],
            "supplied task does not match the one recorded in the contract"
        );
        // some logical checks
        require(
            allTaskResponses[msg.sender][referenceTaskIndex].length == 0,
            "Operator has already responded to the task"
        );

        // The message that was signed
        bytes32 messageHash = keccak256(abi.encodePacked("Hello, ", task.name));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Recover the signer address from the signature
        address signer = ethSignedMessageHash.recover(signature);


        require(signer == msg.sender, "Message signer is not operator");

        // updating the storage with task responses
        allTaskResponses[msg.sender][referenceTaskIndex] = signature;

        // emitting event
        emit TaskResponded(referenceTaskIndex, task, "popup", msg.sender);
    }

    // HELPER
    function operatorHasMinimumWeight(address operator) public view returns (bool) {
        return ECDSAStakeRegistry(stakeRegistry).getOperatorWeight(operator) >= ECDSAStakeRegistry(stakeRegistry).minimumWeight();
    }

    // code for voting diagesting --------

    // Helper function to split string
    function split(string memory str, string memory delim) internal pure returns (string[] memory) {
        bytes memory strBytes = bytes(str);
        bytes memory delimBytes = bytes(delim);

        uint count = 1;
        for (uint i = 0; i < strBytes.length; i++) {
            if (strBytes[i] == delimBytes[0]) {
                count++;
            }
        }

        string[] memory parts = new string[](count);
        uint j;
        uint start = 0;
        for (uint i = 0; i < strBytes.length; i++) {
            if (strBytes[i] == delimBytes[0]) {
                parts[j] = string(slice(strBytes, start, i - start));
                start = i + 1;
                j++;
            }
        }
        parts[j] = string(slice(strBytes, start, strBytes.length - start));
        return parts;
    }

    function slice(bytes memory strBytes, uint start, uint length) internal pure returns (bytes memory) {
        bytes memory result = new bytes(length);
        for (uint i = 0; i < length; i++) {
            result[i] = strBytes[i + start];
        }
        return result;
    }

    // 事件定义
    event DataSaved(address indexed proposer, string submissionId, string votingResult,  string userIds, string options);

    struct Vote {
        string userId;
        bool option; // true for approve, false for reject
    }

    struct VotingData {
        address proposer;
        string submissionId;
        string votingResult;
        Vote[] votes;
        uint256 timestamp;
    }

    mapping(string => VotingData) public votingDatas;

    function save(string memory submissionId,
        string memory votingResult,
        string memory packedUserIds,
        string memory packedOptions,
        uint256 timestamp
    ) public {

        string[] memory userIds = split(packedUserIds, ",");
        string[] memory optionsStr = split(packedOptions, ",");
        bool[] memory options = new bool[](optionsStr.length);

        require(userIds.length == options.length, "User IDs and options length mismatch");

        for (uint i = 0; i < optionsStr.length; i++) {
            options[i] = (keccak256(bytes(optionsStr[i])) == keccak256(bytes("true")));
        }

        Vote[] memory votes = new Vote[](userIds.length);
        for (uint i = 0; i < userIds.length; i++) {
            votes[i] = Vote({
                userId: userIds[i],
                option: options[i]
            });
        }

        VotingData storage newData = votingDatas[submissionId];
        newData.proposer = msg.sender;
        newData.submissionId = submissionId;
        newData.votingResult = votingResult;
        newData.timestamp = timestamp;

        delete newData.votes;
        for (uint i = 0; i < votes.length; i++) {
            newData.votes.push(votes[i]);
        }

        emit DataSaved(msg.sender, submissionId, votingResult, packedUserIds, packedOptions);
    }


    event ChallengeInitiated(address indexed challenger, string submissionId, uint256 timestamp);
    event ChallengeResolved(address indexed resolver, string submissionId, bool valid, uint256 timestamp);
    event ChallengeSuccess(address indexed challenger, string submissionId, bool valid, uint256 timestamp);
    event ChallengeFailed(address indexed challenger, string submissionId, bool valid, uint256 timestamp);

    struct Challenge {
        address challenger;
        string submissionId;
        uint256 timestamp;
        bool resolved;
        bool valid;
    }

    mapping(string => Challenge) public challenges;


    // 发起挑战的函数
    function challenge(string memory submissionId) public {
        require(challenges[submissionId].timestamp == 0, "Challenge already exists");

        // 创建挑战
        challenges[submissionId] = Challenge({
            challenger: msg.sender,
            submissionId: submissionId,
            timestamp: block.timestamp,
            resolved: false,
            valid: false
        });

        resolveChallenge(submissionId);

        // 触发事件
        emit ChallengeInitiated(msg.sender, submissionId, block.timestamp);
    }

    // 解析挑战
    function resolveChallenge(string memory submissionId) public {
        require(votingDatas[submissionId].timestamp != 0, "Challenge submission not exist");
        require(challenges[submissionId].timestamp != 0, "Challenge does not exist");
        require(!challenges[submissionId].resolved, "Challenge already resolved");

        VotingData memory votes = votingDatas[submissionId];

        bool isValidChallenge = validateVotingData(votes);

        challenges[submissionId].resolved = true;
        challenges[submissionId].valid = isValidChallenge;

        emit ChallengeResolved(msg.sender, submissionId, isValidChallenge, block.timestamp);

        if (isValidChallenge) {
            //reward the challenger, slash others.
            emit ChallengeSuccess(challenges[submissionId].challenger, submissionId, isValidChallenge, block.timestamp);

        } else {
            //slash the challenger, reward others.
            emit ChallengeFailed(challenges[submissionId].challenger, submissionId, isValidChallenge, block.timestamp);
        }

    }

    function validateVotingData(VotingData memory votes) internal pure returns (bool) {
        string memory calculatedVotingResult = calculateResult(votes);

        return keccak256(abi.encodePacked(calculatedVotingResult)) == keccak256(abi.encodePacked(votes.votingResult));
    }

    function calculateResult(VotingData memory votes) internal pure returns (string memory) {
        uint approveCnt = 0;
        uint rejectCnt = 0;
        for (uint i = 0; i < votes.votes.length; i++) {
            if (votes.votes[i].option) {
                approveCnt += 1;
            } else {
                rejectCnt += 1;
            }
        }
        if (approveCnt > rejectCnt) return "approve";
        return "reject";
    }

    // dont care about expired votes
    // require(
    //         uint32(block.number) <=
    //             taskResponseMetadata.taskResponsedBlock +
    //                 TASK_CHALLENGE_WINDOW_BLOCK,
    //         "The challenge period for this task has already expired."
    //     );
}