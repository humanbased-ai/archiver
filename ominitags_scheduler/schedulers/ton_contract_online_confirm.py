import os
from asyncio import sleep
import random
from datetime import datetime
from json import loads

from asyncdb import transaction
from dao import ot_ads_staking_order
from dao.models import OtAdsStakingOrder
from utils.http_util import http_get

# TON_API_URL = os.getenv('ton_api_url','https://testnet.tonapi.io/v2/blockchain/transactions/')
TON_API_URL = 'https://tonapi.io/v2/blockchain/transactions/'


async def online_confirm():
    # TON 合约的在线确认，确认成功后会改变订单的状态
    # 随机打散10-20秒之后，防止并发
    await sleep(random.randint(10, 20))
    # 先从数据库捞取待确认的订单列表
    orders = await ot_ads_staking_order.load_orders_by_status('PENDING_CONFIRM',10)
    if not orders:
        return
    for x in orders:
       await process(x)

@transaction
async def process(staking_order:OtAdsStakingOrder):
    try:
        locked = await ot_ads_staking_order.lock_by_order_id(staking_order.staking_order_id)
    except Exception:
        # 捕获已经可能是有并发在处理同一条任务，跳过即可
        return
    if not locked:
        return
    if locked.status != 'PENDING_CONFIRM':
        return

    # 获取交易hash
    if 'tx_hash' not in locked.ext_info:
        print('order not have hash')
        return
    tx_hash = locked.ext_info['tx_hash']
    ton_transaction = await get_ton_transaction(tx_hash)
    if not ton_transaction:
        print('ton transaction is null')
        return

    if ton_transaction['success']:
        # 更新订单信息并把链上数据写入订单
        await ot_ads_staking_order.update_confirmed_order(locked.staking_order_id,'FINISHED','PAYED',datetime.now(),ton_transaction)
    else:
        await ot_ads_staking_order.update_confirmed_order(locked.staking_order_id,'FAILED','WAIT_TO_CONFIRM',datetime.now(),ton_transaction)



async def get_ton_transaction(tx_hash):
    headers = None
    # {
    #     'Authorization': f'Bearer {TON_API_KEY}'
    # }
    url = f'{TON_API_URL}{tx_hash}'

    ton_result = await http_get(url, headers, None)

    # 1. 获取下一层的交易hash
    next_ton_success_flag = await find_ton_transaction_by_next_transaction_hash(ton_result)
    return validate_ton_result_and_parse(ton_result, next_ton_success_flag)

async def find_ton_transaction_by_next_transaction_hash(ton_result):
    if 'error' in ton_result:
        # 调用发生错误
        print(f"call ton rpc caught an error! result is {ton_result}")
        return None

    headers = None
    # 1. 获取当前交易的out_messages
    out_messages = ton_result["out_msgs"]
    if out_messages is None or len(out_messages) == 0:
        print(f"There are no out_messages in the transaction hash. {ton_result}")
        return None
    # 2. 解析out_messages,获取下一层的交易hash
    next_hash = out_messages[0]["hash"]
    # 3. 通过第二层的交易hash查交易数据,这里可能会失败.失败就等待定时任务重试就好了
    url = f'{TON_API_URL}{next_hash}'
    ton_result = await http_get(url, headers, None)
    return ton_result["success"]

def validate_ton_result_and_parse(ton_result, next_ton_success_flag):
    if 'error' in ton_result:
        # 调用发生错误
        print(f"call ton rpc caught an error! result is {ton_result}")
        return None

    # 1. 获取当前交易hash
    real_hash = ton_result['hash']
    # 2. 获取当前交易发起方地址
    from_address = ton_result['account']['address']
    # # 4. 获取交易接收方地址
    # to_address = ton_result['out_msgs'][0]['decoded_body']['destination']
    # 5. 获取交易金额
    amount = ton_result['out_msgs'][0]['value']

    return {
        'success': next_ton_success_flag,
        'hash': real_hash,
        'from_address': from_address,
        'amount': amount,
    }