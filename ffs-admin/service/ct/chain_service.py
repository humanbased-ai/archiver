import os
import json
from web3 import Web3
from dotenv import load_dotenv
from pathlib import Path
import time
from web3.middleware import ExtraDataToPOAMiddleware
from datetime import datetime, timezone
from log import logger
import asyncio


# Read ABI file
current_dir = Path(__file__).parent
abi_path = current_dir / "abi.json"
abi = None
with abi_path.open("r", encoding="utf-8") as file:
    abi = json.load(file)

# Load .env file
load_dotenv()

# Read environment variables
private_key = os.getenv("PRIVATE_KEY", '<ETH_PRIVATE_KEY_REDACTED>')
contract_address = os.getenv("CONTRACT_ADDRESS", '0xAC49F491E68a2D4Fc4367c8E89297ae34f4CFD64')
rpc_url = os.getenv("RPC_URL", 'https://rpc-testnet.gokite.ai')

#print(f'config private_key = {private_key}, contract_address = {contract_address}, rpc_url={rpc_url}')

# Check if the environment variables are set
assert private_key and contract_address and rpc_url, "check your .env file"


async def save_to_chain(chat_record):

    # connect to the blockchain network
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    print("connected:", web3.is_connected())
    print("chain_id:", web3.eth.chain_id)

    # create a contract instance
    contract = web3.eth.contract(address=contract_address, abi=abi)
    web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    # get address nonce
    account = web3.eth.account.from_key(private_key)
    nonce = web3.eth.get_transaction_count(account.address)

    # get gas price
    latest_block = web3.eth.get_block('latest')
    base_fee_per_gas = latest_block['baseFeePerGas']
    fee_history = web3.eth.fee_history(1, 'latest', [10])
    priority_fees = fee_history['reward'][0]
    max_priority_fee_per_gas = int(sum(priority_fees) / len(priority_fees))
    max_fee_per_gas = base_fee_per_gas + max_priority_fee_per_gas * 2


    # Simulated data
    user_id = chat_record['user_id'] #"3525012345-test"
    batch_id = chat_record['uid']

    conversation = "Q: Have either of you ever been to Japan? What's it like? \
    A: Yeah, I went last spring! Tokyo was amazing—so clean, organized, and full of cool tech. \
    B: I’ve been too, but I stayed in Kyoto. It felt like stepping back in time with all the temples and old streets.\
    Q: Sounds like both cities are worth visiting! \
    A: Totally. If you love modern stuff, Tokyo is unbeatable. \
    B: But if you want culture and quiet, Kyoto's the place."

    conversation = chat_record['conversation']

    conversation_hash = Web3.keccak(text=conversation)

    # Currently, we are directly calculating the Keccak hash. In the future, we may need to add salting to the model.
    modelAName = chat_record['model_a']
    modelBName = chat_record['model_b']
    modelAHash = Web3.keccak(text=modelAName)
    modelBHash = Web3.keccak(text=modelBName)
    # 0 for A, 1 for B , 2 for Tie, 3 for BothBad

    voteType = 0
    # evaluate 对比结果: 1 a更好，2 b更好， 3 都很好，4 都不好
    evaluate = chat_record['evaluate']
    if evaluate is None:
        print('evaluate is None')
        return None
    # 数据转换
    if evaluate == 1:
        voteType = 0
    elif evaluate == 2:
        voteType = 1
    elif evaluate == 3:
        voteType = 2
    elif evaluate == 4:
        voteType = 3

    # Use current timestamp seconds
    vote_time = chat_record['vote_time']
    if vote_time is None:
        print('vote_time is None')
        return None
    voteTime = int(vote_time.timestamp())

    dataBytes = b"".join([
        Web3.to_bytes(text=user_id),
        batch_id.to_bytes(32, "big"),
        #batch_id.encode("utf-8").ljust(32, b'\0'),
        conversation_hash,
        modelAHash,
        modelBHash,
        Web3.to_bytes(voteType),
        voteTime.to_bytes(32, "big")
    ])

    fingerprint = Web3.keccak(dataBytes)

    arena_info = (
        user_id,
        (
            batch_id,
            conversation_hash,
            modelAHash,
            modelBHash,
            voteType,
            voteTime,
            fingerprint
        )
    )

    tx = contract.functions.submit(arena_info).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "maxPriorityFeePerGas": max_priority_fee_per_gas,
        "maxFeePerGas": max_fee_per_gas,
        "chainId": web3.eth.chain_id,
        "type": 2,
    })

    # estimate gas
    tx["gas"] = web3.eth.estimate_gas(tx)
    signed_tx = web3.eth.account.sign_transaction(tx, private_key)
    tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

    chain_status = 1
    remarks = None
    if receipt.status == 1:
        print("✅ Transaction executed successfully.")
        chain_status = 2
    else:
        print("❌ Transaction failed.（reverted）")
        chain_status = 3
        remarks = 'Transaction failed.（reverted）'
    print(f"tx hash: {tx_hash.hex()}, block number: {receipt.blockNumber}, gas used: {receipt.gasUsed}")
    result = {
        'id': chat_record['id'],
        'chain_status': 2,
        'fingerprint': fingerprint.hex(),
        'tx_hash': tx_hash.hex(),
        'block_number': receipt.blockNumber,
        'chain_time': datetime.now(timezone.utc),
        'remarks': remarks
    }
    return result


async def getArenaDataByBatchId(user_id, batch_id):
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    print("connected:", web3.is_connected())
    print("chain_id:", web3.eth.chain_id)

    # create a contract instance
    contract = web3.eth.contract(address=contract_address, abi=abi)
    web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    result = contract.functions.getArenaDataByBatchId(user_id, batch_id).call()
    print("Get user arena data by batch id:", result)
    for item in result:
        value = item
        if isinstance(item, bytes):
            value = value.hex()
        print(value)
    return result


async def getArenaData(user_id, batch_id):
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    print("connected:", web3.is_connected())
    print("chain_id:", web3.eth.chain_id)

    # create a contract instance
    contract = web3.eth.contract(address=contract_address, abi=abi)
    web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    offset = 0
    limit = 10
    result = contract.functions.getUserArenaData(user_id, offset, limit).call()
    print("Get user arena data:", result)
    return result


async def test_upload():
    chat_record = {
        'id': 336,
        'user_id': '7442253752800100826',
        'uid': 336,
        'model_a': 'gpt-3.5-turbo',
        'model_b': 'qwen-plus-latest',
        'conversation': 'introduce yourself',
        'evaluate': 1,
        'vote_time': datetime.now(timezone.utc),
    }
    await save_to_chain(chat_record=chat_record)


async def get_data():
    user_id = '6260299133800100106'
    batch_id = 391
    result = await getArenaDataByBatchId(user_id=user_id, batch_id=batch_id)
    print(result)


if __name__ == '__main__':
    #asyncio.run(test_upload())
    asyncio.run(get_data())

