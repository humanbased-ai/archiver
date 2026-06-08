// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RewardContract {
    address payable[] public rewardAddresses; //奖励地址
    mapping(address => uint256) public rewards; //奖励金额
    address creator;//创建者
    


    // 构造函数：传入地址列表和对应的奖励金额，部署需要传入参数和金额   ["0x5Ed8e44F58bF5CcceFA2a02CF8A96f89418c9604","0x724D0D5183ddAF1c7b53e27B53C9e76183D8dFF1","0xBf395b8a839d3d4998Ccd7F194FED403B987804F"],[100000000000,200000000000,300000000000]
    constructor(address payable[] memory _addresses, uint256[] memory _amounts) {
        require(_addresses.length == _amounts.length, "Address list and amounts length mismatch");
        // require(_addresses.length <100 , "Address list  length less 100");
        for (uint256 i = 0; i < _addresses.length; i++) {
            rewardAddresses.push(_addresses[i]);
            rewards[_addresses[i]] = _amounts[i];
        }
        creator=msg.sender;
    }
    //接收币必须要实现此接口，哪怕啥都不干。合约部署后，必须给合约地址转入待分配的币
    receive() external payable {
    }

    // 领取奖金的函数
    function claimReward() external {
        require(rewards[msg.sender] > 0, "You are not eligible for reward");
        uint256 amount = rewards[msg.sender];
        rewards[msg.sender] = 0; // 避免重复领取
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // 查询奖金金额的函数，查询当前钱包有多少待领取的币，纯view无需消耗gas
    function getRewardAmount(address _addr) external view returns (uint256) {
        return rewards[_addr];
    }
    //创建者可以提取资金，合理回收最后无人领取的资金。
    function creatorGetCoin(uint256 _amount) external {
        if (msg.sender == creator) {
            (bool success, ) = msg.sender.call{value: _amount}("");
            require(success, "Transfer failed");
        }
    }

}
