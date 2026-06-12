import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { delegationABI } from "./abis/delegationABI";
// import { contractABI } from './abis/contractABI';

import contractABIJson from './abis/VotingDigestServiceManager.json'
import registryABIJson from './abis/ECDSAStakeRegistry.json';
import { avsDirectoryABI } from './abis/avsDirectoryABI';
dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.HOLESKY_RPC_URL);
const wallet = new ethers.Wallet(process.env.HOLESKY_PRIVATE_KEY!, provider);
const delegationManagerAddress = process.env.HOLESKY_DELEGATION_MANAGER_ADDRESS!;
const contractAddress = process.env.HOLESKY_CONTRACT_ADDRESS!;
const stakeRegistryAddress = process.env.HOLESKY_STAKE_REGISTRY_ADDRESS!;
const avsDirectoryAddress = process.env.HOLESKY_AVS_DIRECTORY_ADDRESS!;


// const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
// const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
// const delegationManagerAddress = process.env.DELEGATION_MANAGER_ADDRESS!;
// const contractAddress = process.env.CONTRACT_ADDRESS!;
// const stakeRegistryAddress = process.env.STAKE_REGISTRY_ADDRESS!;
// const avsDirectoryAddress = process.env.AVS_DIRECTORY_ADDRESS!;


const contractABI = contractABIJson.abi;
const registryABI = registryABIJson.abi;
const delegationManager = new ethers.Contract(delegationManagerAddress, delegationABI, wallet);
const contract = new ethers.Contract(contractAddress, contractABI, wallet);
const registryContract = new ethers.Contract(stakeRegistryAddress, registryABI, wallet);
const avsDirectory = new ethers.Contract(avsDirectoryAddress, avsDirectoryABI, wallet);

const signAndRespondToTask = async (taskIndex: number, taskCreatedBlock: number, taskName: string) => {
    console.log("signAndRespondToTask called with:", taskIndex, taskCreatedBlock, taskName);
    const message = `Hello, ${taskName}`;
    const messageHash = ethers.utils.solidityKeccak256(["string"], [message]);
    const messageBytes = ethers.utils.arrayify(messageHash);
    const signature = await wallet.signMessage(messageBytes);

    const tx = await contract.respondToTask(
        { name: taskName, taskCreatedBlock: taskCreatedBlock },
        taskIndex,
        signature
    );
    await tx.wait();
    console.log("Responded to task.");
};

const registerOperator = async () => {
    console.log("Registering operator...");
    const maxFeePerGas = ethers.utils.parseUnits('100.000000016', 'gwei'); // 1500000016 wei
    const maxPriorityFeePerGas = ethers.utils.parseUnits('100.000000000', 'gwei'); // 1500000000 wei

    // const tx1 = await delegationManager.registerAsOperator({
    //     earningsReceiver: wallet.address,
    //     delegationApprover: "0x0000000000000000000000000000000000000000",
    //     stakerOptOutWindowBlocks: 0
    // }, "", {
    //     maxFeePerGas: maxFeePerGas,
    //     maxPriorityFeePerGas: maxPriorityFeePerGas
    // });
    // await tx1.wait();

    console.log("Operator registered on EL successfully");

    const salt = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const expiry = Math.floor(Date.now() / 1000) + 36000;

    let operatorSignature = {
        expiry: expiry,
        salt: salt,
        signature: ""
    };

    console.log("Operator calculateOperatorAVSRegistrationDigestHash start");

    const digestHash = await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
        wallet.address,
        contract.address,
        salt,
        expiry
    );

    console.log("Operator calculateOperatorAVSRegistrationDigestHash end");

    const signingKey = new ethers.utils.SigningKey(process.env.PRIVATE_KEY!);
    const signature = signingKey.signDigest(digestHash);
    operatorSignature.signature = ethers.utils.joinSignature(signature);

    // ECDSA.recover(digestHash, signature) == signer,
    //             "EIP1271SignatureUtils.checkSignature_EIP1271: signature not from signer"

    console.log("Operator registerOperatorWithSignature start");

    console.log(registryContract.address)

    const tx2 = await registryContract.registerOperatorWithSignature(
        operatorSignature, wallet.address, {
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas
        }
    );
    await tx2.wait();
    console.log("Operator registered on AVS successfully");
};

const monitorNewTasks = async () => {
    const userIds = 'a,b,c';
    const options = 'true,true,false';
    const submissionId = 'sid123';
    const votingResult = 'approve';
    const timestamp = 1719915084;

    const maxFeePerGas = ethers.utils.parseUnits('3.000000016', 'gwei'); // 1500000016 wei
    const maxPriorityFeePerGas = ethers.utils.parseUnits('3.000000000', 'gwei'); // 1500000000 wei

    try {
        const tx = await contract.save(submissionId, votingResult, userIds, options, timestamp, {
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas
        });
        const receipt = await tx.wait();
        console.log(`Transaction successful with hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error("Error triggering event:", error);
    }


    console.log("Listening for DataSaved events...");

    contract.on("DataSaved", (proposer, submissionId, votingResult, userIds, options) => {
        console.log(`DataSaved event detected:`);
        console.log(`- proposer: ${proposer}`);
        console.log(`- submissionId: ${submissionId}`);
        console.log(`- votingResult: ${votingResult}`);
        console.log(`- userIds: ${userIds}`);
        console.log(`- options: ${options}`);
    });
};

const main = async () => {
    console.log("Starting main function...");
    await registerOperator();
    await monitorNewTasks().catch((error) => {
        console.error("Error monitoring tasks:", error);
    });
};

main().catch((error) => {
    console.error("Error in main function:", error);
});