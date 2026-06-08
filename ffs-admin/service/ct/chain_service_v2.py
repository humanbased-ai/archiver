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
abi_path = current_dir / "abi_v2.json"
abi = None
with abi_path.open("r", encoding="utf-8") as file:
    abi = json.load(file)

# Load .env file
load_dotenv()

# Read environment variables
private_key = os.getenv("PRIVATE_KEY", '<ETH_PRIVATE_KEY_REDACTED>')
contract_address = os.getenv("CONTRACT_ADDRESS_v2", '0x28710860F49848d2d282e60a30561b1d10E52390')
rpc_url = os.getenv("RPC_URL_v2", 'https://api.avax-test.network/ext/bc/C/rpc')

#print(f'config private_key = {private_key}, contract_address = {contract_address}, rpc_url={rpc_url}')

# Check if the environment variables are set
assert private_key and contract_address and rpc_url, "check your .env file"


async def save_to_chain_v2(chat_record):

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
        batch_id, fingerprint
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


async def batch_save_to_chain(chat_records):
    if chat_records is None or len(chat_records) == 0:
        return None
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
    arena_infos = []
    for chat_record in chat_records:
        user_id = chat_record['user_id'] #"3525012345-test"
        batch_id = chat_record['uid']

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
        chat_record['fingerprint'] = fingerprint.hex()
        arena_info = (
            batch_id, fingerprint
        )
        arena_infos.append(arena_info)

    tx = contract.functions.batchSubmit(arena_infos).build_transaction({
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
    results = []
    for chat_record in chat_records:
        result = {
            'id': chat_record['id'],
            'chain_status': 2,
            'fingerprint': chat_record['fingerprint'],
            'tx_hash': tx_hash.hex(),
            'block_number': receipt.blockNumber,
            'chain_time': datetime.now(timezone.utc),
            'remarks': remarks
        }
        results.append(result)
    return results


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
    await save_to_chain_v2(chat_record=chat_record)


async def test_batch_upload():
    chat_records = [
        {
            'id': 337,
            'user_id': '7442253752800100826',
            'uid': 337,
            'model_a': 'gpt-3.5-turbo',
            'model_b': 'qwen-plus-latest',
            'conversation': 'introduce yourself1',
            'evaluate': 1,
            'vote_time': datetime.now(timezone.utc),
        },
        {
            'id': 338,
            'user_id': '7442253752800100826',
            'uid': 338,
            'model_a': 'gpt-3.5-turbo',
            'model_b': 'qwen-plus-latest',
            'conversation': 'introduce yourself2',
            'evaluate': 1,
            'vote_time': datetime.now(timezone.utc),
        }
    ]
    await batch_save_to_chain(chat_records=chat_records)

if __name__ == '__main__':
    #asyncio.run(test_batch_upload())
    asyncio.run(test_batch_upload())

