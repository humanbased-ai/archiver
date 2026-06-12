import { ethers } from "ethers";
import * as dotenv from "dotenv";


dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const contractABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newNumber",
                "type": "uint256"
            }
        ],
        "name": "NumberChanged",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "newNumber",
                "type": "uint256"
            }
        ],
        "name": "setNumber",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "increment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "number",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const contractAddress = "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F"; // 替换为您的合约地址

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

const listenToEvents = () => {
    console.log("Listening for NumberChanged events...");

    contract.on("NumberChanged", (newNumber: ethers.BigNumber) => {
        console.log(`NumberChanged event detected: New Number = ${newNumber.toString()}`);
    });
};

const setNumber = async (newNumber: number) => {
    const tx = await contract.setNumber(newNumber);
    await tx.wait();
    console.log(`setNumber transaction confirmed: New Number = ${newNumber}`);
};

const increment = async () => {
    const tx = await contract.increment();
    await tx.wait();
    console.log(`increment transaction confirmed`);
};

const main = async () => {
    listenToEvents();

    // 调用 setNumber 和 increment 函数
    await setNumber(42);
    // 每3秒调用一次 increment 函数
    for (let i = 0; i < 10; i++) {  // 例如：循环10次，您可以根据需要调整
        await increment();
        await new Promise(resolve => setTimeout(resolve, 3000));  // 等待3秒
    }
};

main().catch((error) => {
    console.error("Error in main function:", error);
});
