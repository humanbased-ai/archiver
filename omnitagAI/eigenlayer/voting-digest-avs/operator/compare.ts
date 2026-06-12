import { ethers } from "ethers";
import * as fs from "fs";

// 你的 RPC URL 和合约地址
const RPC_URL = 'https://1rpc.io/holesky';
const CONTRACT_ADDRESS='0x363b4b31c6A86b1cAC430ad1d7A0b2Bd6530b542';

// 读取本地 ABI 文件
const localABI = JSON.parse(fs.readFileSync('./operator/abis/VotingDigestServiceManager.json', 'utf8'));

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, [], provider);

async function compareABI() {
    try {
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x') {
            console.log('合约地址无效或合约不存在');
            return;
        }

        const networkABI = await provider.getStorageAt(CONTRACT_ADDRESS, 0);
        console.log(networkABI);
        if (JSON.stringify(localABI) === networkABI) {
            console.log('ABI 一致');
        } else {
            console.log('ABI 不一致');
        }
    } catch (error) {
        console.error('Error comparing ABI:', error);
    }
}

compareABI();