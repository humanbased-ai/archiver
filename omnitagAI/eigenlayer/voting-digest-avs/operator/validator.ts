import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

import contractABIJson from './abis/VotingDigestServiceManager.json';
const contractABI = contractABIJson.abi;

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const contractAddress = process.env.CONTRACT_ADDRESS!;

// const provider = new ethers.providers.JsonRpcProvider(process.env.HOLESKY_RPC_URL);
// const wallet = new ethers.Wallet(process.env.HOLESKY_PRIVATE_KEY!, provider);
// const contractAddress = process.env.HOLESKY_CONTRACT_ADDRESS!;

console.log(process.env.CONTRACT_ADDRESS);

const getBalance = async (address:string) => {
    try {
        // 查询余额
        const balance = await provider.getBalance(address);
        // 将余额转换为以太坊单位
        const balanceInEth = ethers.utils.formatEther(balance);
        console.log(`Balance of ${address}: ${balanceInEth} ETH`);
    } catch (error) {
        console.error(`Error fetching balance: ${error}`);
    }
};

// 查询指定钱包的余额
// getBalance(WALLET_ADDRESS);
async function fee() {
    try {
        const feeData = await provider.getFeeData();
        console.log(`Max Fee Per Gas: ${feeData.maxFeePerGas?.toString()}`);
        console.log(`Max Priority Fee Per Gas: ${feeData.maxPriorityFeePerGas?.toString()}`);
    } catch (error) {
        console.error("Error listening to events:", error);
    }
}

fee();

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

const listenToEvents = async () => {
    console.log("Listening for DataSaved events...");
    // event DataSaved(address indexed proposer,
    //   string submissionId, string votingResult,
    //   string userIds, string options, uint256 timestamp
    // );
    contract.on("DataSaved", (proposer, submissionId, votingResult, userIds, options) => {
        console.log(`DataSaved event detected:`);
        console.log(`- proposer: ${proposer}`);
        console.log(`- submissionId: ${submissionId}`);
        console.log(`- votingResult: ${votingResult}`);
        console.log(`- userIds: ${userIds}`);
        console.log(`- options: ${options}`);
    });
};

async function triggerEvent() {
    const userIds = 'a,b,c';
    const options = 'true,true,false';
    const submissionId = 'sid123';
    const votingResult = 'approve';
    const timestamp = 1719915084;
        // 设置 maxFeePerGas 和 maxPriorityFeePerGas
        const maxFeePerGas = ethers.utils.parseUnits('3.000000016', 'gwei'); // 1500000016 wei
        const maxPriorityFeePerGas = ethers.utils.parseUnits('3.000000000', 'gwei'); // 1500000000 wei

        try {
            const tx = await contract.save(submissionId, votingResult, userIds, options, timestamp

            );
            // , {
            //     maxFeePerGas: maxFeePerGas,
            //     maxPriorityFeePerGas: maxPriorityFeePerGas
            // });
            const receipt = await tx.wait();
            console.log(`Transaction successful with hash: ${receipt.transactionHash}`);
        } catch (error) {
            console.error("Error triggering event:", error);
        }
}

const main = async () => {
    try {
        await listenToEvents();
        await triggerEvent(); // 触发事件以进行测试
    } catch (error) {
        console.error("Error listening to events:", error);
    }
};

main().catch((error) => {
    console.error("Error in main function:", error);
});