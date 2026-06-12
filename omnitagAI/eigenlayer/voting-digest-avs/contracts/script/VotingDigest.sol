pragma solidity ^0.8.0;

contract VotingDigest {
    struct Digest {
        bytes32 digestDataHash;
        bytes votingResult;
        bytes compressData;
        address proposer;
        bool challenged;
        address challenger;
    }

    mapping(bytes32 => Digest) public digests;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    event DigestSubmitted(bytes32 indexed digestDataHash, address indexed proposer);
    event DigestChallenged(bytes32 indexed digestDataHash, address indexed challenger);
    event ChallengeResolved(bytes32 indexed digestDataHash, bool isValid);

    function submitDigest(bytes32 digestDataHash, bytes memory votingResult, bytes memory compressData) public {
        require(digests[digestDataHash].digestDataHash == 0, "Digest already submitted");

        digests[digestDataHash] = Digest({
            digestDataHash: digestDataHash,
            votingResult: votingResult,
            compressData: compressData,
            proposer: msg.sender,
            challenged: false,
            challenger: address(0)
        });

        emit DigestSubmitted(digestDataHash, msg.sender);
    }

    function challengeDigest(bytes32 digestDataHash, bytes memory votingResult) public {
        Digest storage digest = digests[digestDataHash];
        require(digest.digestDataHash != 0, "Digest not found");
        require(!digest.challenged, "Digest already challenged");
        require(keccak256(digest.votingResult) != keccak256(votingResult), "Voting result matches");

        digest.challenged = true;
        digest.challenger = msg.sender;

        emit DigestChallenged(digestDataHash, msg.sender);
    }

    function resolveChallenge(bytes32 digestDataHash, bool isValid) public {
        require(msg.sender == owner, "Only owner can resolve challenges");
        Digest storage digest = digests[digestDataHash];
        require(digest.challenged, "No challenge to resolve");

        if (isValid) {
            // Reward challenger and punish proposer
            // 执行奖励和惩罚逻辑
        } else {
            // Punish challenger and reward proposer
            // 执行奖励和惩罚逻辑
        }

        emit ChallengeResolved(digestDataHash, isValid);
    }
}