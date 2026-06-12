"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const provider = new ethers_1.ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
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
const contract = new ethers_1.ethers.Contract(contractAddress, contractABI, wallet);
const listenToEvents = () => {
    console.log("Listening for NumberChanged events...");
    contract.on("NumberChanged", (newNumber) => {
        console.log(`NumberChanged event detected: New Number = ${newNumber.toString()}`);
    });
};
const setNumber = (newNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const tx = yield contract.setNumber(newNumber);
    yield tx.wait();
    console.log(`setNumber transaction confirmed: New Number = ${newNumber}`);
});
const increment = () => __awaiter(void 0, void 0, void 0, function* () {
    const tx = yield contract.increment();
    yield tx.wait();
    console.log(`increment transaction confirmed`);
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    listenToEvents();
    // 调用 setNumber 和 increment 函数
    yield setNumber(42);
    // 每3秒调用一次 increment 函数
    for (let i = 0; i < 10; i++) { // 例如：循环10次，您可以根据需要调整
        yield increment();
        yield new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒
    }
});
main().catch((error) => {
    console.error("Error in main function:", error);
});
