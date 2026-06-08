from log import logger
from datetime import datetime, timedelta, timezone
from web3 import Web3
from hexbytes import HexBytes
from eth_account.messages import encode_defunct
from pydantic import BaseModel
from solders.pubkey import Pubkey
from fastapi import FastAPI, HTTPException
from typing import Optional
import base58
import nacl.signing
import requests
from eth_account import Account


async def bnb_sign(message, signature, address):
    try:
        # 将消息编码为签名格式
        encoded_message = encode_defunct(text=message)

        # 使用 eth_account 恢复签名地址
        recovered_address = Account.recover_message(encoded_message, signature=signature)

        # 比较恢复的地址是否匹配
        return recovered_address.lower() == address.lower()
    except Exception as e:
        logger.info(f"验签失败: {e}")
        return False


async def eth_sign(message, signature, address):
    w3 = Web3(Web3.HTTPProvider(""))
    message = encode_defunct(text=message)
    input_address = address
    address = w3.eth.account.recover_message(message, signature=HexBytes(signature))
    if address != input_address:
        #raise HTTPException(status_code=400, detail='')
        return False
    return True


async def sol_sign(message, signature, address ):
    result = None
    flag = False
    try:
        # Convert public key string to Pubkey object

        public_key = Pubkey.from_string(address)

        # Decode the signature from base58
        signature_bytes = base58.b58decode(signature)

        # Convert message to bytes
        message_bytes = message.encode('utf-8')

        # Create verify key from public key
        verify_key = nacl.signing.VerifyKey(bytes(public_key))

        try:
            # Verify the signature
            msg = verify_key.verify(message_bytes, signature_bytes)
            logger.info('verify_signature result = {}', msg)
            result = SignatureVerificationResponse(
                is_valid=True,
                message="Signature verification successful"
            )
            flag = True
        except Exception as e:
            logger.error('verify_signature public_key, signature, message error = {}', public_key, signature, message, e)
            result = SignatureVerificationResponse(
                is_valid=False,
                message="Invalid signature"
            )
            flag = False

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return flag


class SignatureVerificationRequest(BaseModel):
    message: str
    signature: str
    public_key: str


class SignatureVerificationResponse(BaseModel):
    is_valid: bool
    message: Optional[str] = None


def eth_address():
    private_key = ""
    #account = Account.from_key(private_key)
    #print("钱包地址:", account.address)

    rpc_url = "https://evmrpc-testnet.0g.ai"  # 你的 RPC 地址
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    chain_id = web3.eth.chain_id

    print(f"当前 RPC 的 Chain ID: {chain_id}")


def eth_ges():

    # 连接到以太坊主网（你也可以用自己的 RPC）
    RPC_URL = "https://evmrpc-testnet.0g.ai"  # 也可以用 Infura, Alchemy
    web3 = Web3(Web3.HTTPProvider(RPC_URL))

    # 你的钱包地址
    wallet_address = "0xA7bF94EB380E60179000740a79999D08a2B6BcB9"

    # 获取钱包余额（单位是 Wei，需要转换为 ETH）
    balance_wei = web3.eth.get_balance(wallet_address)
    balance_eth = web3.from_wei(balance_wei, "ether")
    print(f"钱包余额: {balance_eth} ETH")

    # 获取当前 Gas 价格（单位是 Wei，需要转换为 Gwei）
    gas_price_wei = web3.eth.gas_price
    gas_price_gwei = web3.from_wei(gas_price_wei, "gwei")
    print(f"当前 Gas 价格: {gas_price_gwei} Gwei")

    # 假设你要执行一笔交易，预估 Gas 量（例如 21,000 Gas）
    gas_limit = 21000
    estimated_gas_fee_wei = gas_price_wei * gas_limit
    estimated_gas_fee_eth = web3.from_wei(estimated_gas_fee_wei, "ether")

    print(f"预计 Gas 费用: {estimated_gas_fee_eth} ETH")

    # 判断余额是否足够支付 Gas 费
    if balance_eth >= estimated_gas_fee_eth:
        print("✅ 余额足够，可以支付交易费用。")
    else:
        print("❌ 余额不足，无法支付交易费用！")


if __name__ == '__main__':

    eth_ges()
    # eth_address()


