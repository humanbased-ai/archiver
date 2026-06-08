import datetime

from requests import delete
from tortoise import timezone

from dao.models import OtAdsStakingOrder


async def get_by_order_id(order_id):
    return await OtAdsStakingOrder.filter(staking_order_id=order_id, deleted=False).first()

async def load_orders_by_status(status,limit):
    return await OtAdsStakingOrder.filter(status=status,deleted=False).limit(limit)

async def lock_by_order_id(order_id):
    return await OtAdsStakingOrder.filter(staking_order_id=order_id).select_for_update(nowait=True).first()

async def update_confirmed_order(order_id, status, pay_status, payed_time, pay_info):
    await OtAdsStakingOrder.filter(staking_order_id=order_id, deleted=False).update(status=status,
                                                                                    pay_status=pay_status,
                                                                                    payed_time=payed_time,
                                                                                    pay_info=pay_info)