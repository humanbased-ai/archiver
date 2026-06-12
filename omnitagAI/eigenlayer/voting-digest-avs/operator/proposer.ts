import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();


const provider = new ethers.providers.JsonRpcProvider(process.env.HOLESKY_RPC_URL);
const wallet = new ethers.Wallet(process.env.HOLESKY_PRIVATE_KEY!, provider);
const contractAddress = process.env.HOLESKY_CONTRACT_ADDRESS!;


// const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
// const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
// const contractAddress = process.env.CONTRACT_ADDRESS!;

console.log("contractAddress", contractAddress)


import contractABIJson from './abis/VotingDigestServiceManager.json';
const contractABI = contractABIJson.abi;

// 创建合约实例
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// 示例JSON数据
const jsonData = {
    submission_id: 'sid1afasfaqqq2312324qrqasfafasgasfasdfafaadfasfadfr',
    votes: [
        { 'user-id': 'aa', 'option': 'approve' },
        { 'user-id': 'bb', 'option': 'approve' },
        { 'user-id': 'cc', 'option': 'reject' }
    ],
    timestamp: 1719915084
};


const userIds = jsonData.votes.map(vote => vote['user-id']).join(',');
const options = jsonData.votes.map(vote => vote.option === 'approve' ? 'true' : 'false').join(',');
const submissionId = jsonData.submission_id;
const votingResult = options.split(',').filter(opt => opt === 'true').length > options.split(',').filter(opt => opt === 'false').length ? 'approve' : 'reject';
const timestamp = jsonData.timestamp;

async function saveit(taskName: string) {
    try {
        console.log('submissionId:', submissionId);
        console.log('votingResult:', votingResult);
        console.log('userIds:', userIds);
        console.log('options:', options);
        console.log('timestamp:', timestamp);

        // Estimate gas
        const gasEstimate = await contract.estimateGas.save(submissionId, votingResult, userIds, options, timestamp);
        console.log('Estimated Gas:', gasEstimate.toString());

        // Set a higher gas limit manually
        const tx = await contract.save(submissionId, votingResult, userIds, options, timestamp);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        console.log(`Transaction successful with hash: ${receipt.transactionHash}`);
    } catch (error: any) {
        console.error('Error sending transaction:', error);
        if (error.error) {
            console.error('Error details:', error.error.message);
        }

        // Perform a call to get detailed error information
        try {
            await contract.callStatic.save(submissionId, votingResult, userIds, options, timestamp);
        } catch (callError: any) {
            console.error('Detailed call error:', callError);
        }
    }
}

saveit("acd");