// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract CodattaBuildKeyMasterHunter is Initializable, ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    using Strings for uint256;

    mapping(address => uint256) public addressToTokenId;

    string private _defaultURI;
    uint256 private _currentTokenId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __ERC721_init("CodattaBuildKeyMasterHunter", "CBKMH");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function mint(address to) public onlyOwner {
        require(balanceOf(to) == 0, "CodattaBuildKeyMasterHunter: one address can only own one token");
        _currentTokenId++;
        _mint(to, _currentTokenId);
        addressToTokenId[to] = _currentTokenId;
    }

    function mintBatch(address[] calldata params) public {
        for (uint256 i = 0; i < params.length; ) {
            mint(params[i]);
            unchecked {
                ++i;
            }
        }
    }

    function setDefaultURI(string calldata uri) public onlyOwner {
        _defaultURI = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _defaultURI;
    }


    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    function transferFrom(address from, address to, uint256 tokenId) public override  {
        require(false, "CodattaBuildKeyMasterHunter: Soul Bound Token");
        super.transferFrom(from, to, tokenId);
    }
}
