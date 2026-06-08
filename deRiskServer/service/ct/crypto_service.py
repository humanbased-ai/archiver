import asyncio
import hashlib
import json
import logging

from dao import crypto_dao

from log import logger


async def query_data(chain_str: str, address_str: str, page_num: int = 1, page_size: int = 100):
    chains = []
    address_list = []
    if chain_str:
        chains = chain_str.split(",")
    if address_str:
        address_list = address_str.split(",")
    if page_num is None:
        page_num = 1

    if page_size > 100:
        page_size = 100
    datas = []
    count = None
    #count = await crypto_dao.query_data_count(chains=chains, address_list=address_list, status=1)
    #if count > 0:
    datas = await crypto_dao.query_datas(chains=chains, address_list=address_list, status=1, page_num=page_num, page_size=page_size)

    records = []
    if datas:
        for data in datas:
            category = data.get('category')
            source = data.get('source')
            source_show = None
            if source:
                source_show = source.split(":")[0]
            record = {
                "chain": data.get("chain"),
                "address": data.get("address"),
                "name": data.get("name"),
                "entity": data.get("entity"),
                "category": category,
                "source": source_show

            }
            records.append(record)
    page_data = {

        "page_num": page_num,
        "page_size": page_size,
        "list": records
    }
    count = len(datas)
    logger.info(f"query_data chains = {chains}, address_list = {address_list}, result : count = {count}")
    return page_data

