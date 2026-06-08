let web3;
let contract;
let userAddress;

//部署的合约地址
const contractAddress = "0xec83c49a2d4462645866ae5aedb1cc42d8ee7755"; 
//合约abi
const contractABI = [
	{
		"inputs": [
			{
				"internalType": "address payable[]",
				"name": "_addresses",
				"type": "address[]"
			},
			{
				"internalType": "uint256[]",
				"name": "_amounts",
				"type": "uint256[]"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "claimReward",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			}
		],
		"name": "creatorGetCoin",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_addr",
				"type": "address"
			}
		],
		"name": "getRewardAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "rewardAddresses",
		"outputs": [
			{
				"internalType": "address payable",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "rewards",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
];

document.getElementById('connectButton').addEventListener('click', async () => {
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            userAddress = accounts[0];
            document.getElementById('walletAddress').innerText = `Connected: ${userAddress}`;
            contract = new web3.eth.Contract(contractABI, contractAddress);
        } catch (error) {
            console.error("连接钱包失败!", error);
        }
    } else {
        alert("先安装MetaMask!");
    }
});

document.getElementById('queryBonusButton').addEventListener('click', async () => {
    if (userAddress && contract) {
        try {
            const bonusAmount = await contract.methods.getRewardAmount(userAddress).call();
            document.getElementById('bonusAmount').innerText = `Bonus Amount: ${web3.utils.fromWei(bonusAmount, 'ether')} ETH`;
        } catch (error) {
            console.error("查询错误", error);
        }
    } else {
        alert("请先连接钱包!");
    }
});

document.getElementById('claimBonusButton').addEventListener('click', async () => {
    if (userAddress && contract) {
        try {
            await contract.methods.claimReward().send({ from: userAddress });
            document.getElementById('claimStatus').innerText = "领取成功!";
        } catch (error) {
            console.error("领取失败", error);
            document.getElementById('claimStatus').innerText = "领取失败";
        }
    } else {
        alert("请先连接钱包!");
    }
});