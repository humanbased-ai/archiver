import setting
from datetime import datetime
from utils.tools import DBM
from log import logger

db = DBM(setting.dbUrl)


async def query_data_count(chains: list, address_list: list, status=1):
    num = 0
    sql = f'select count(*) as num from ct_crypto_data where 1=1'
    if chains:
        chain_st = [str(item) for item in chains]
        chain_str = "'"+"','".join(chain_st)+"'"
        sql += f' and chain in ({chain_str})'
    if address_list:
        address_st = [str(item) for item in address_list]
        address_str = "'"+"','".join(address_st)+"'"
        sql += f' and address in ({address_str})'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def query_datas(chains: list, address_list: list, status: int = 1, page_num: int = 1, page_size: int = 10):
    if page_size is None or page_size <= 0:
        page_size = 10
    if page_size > 100:
        page_size = 100
    if page_num is None:
        page_num = 1

    start = (page_num - 1) * page_size

    sql = f'select `chain`, `address`, `name`, `entity`, `category`, `source` from ct_crypto_data where 1=1 '
    if chains:
        chain_st = [str(item) for item in chains]
        chain_str = "'"+"','".join(chain_st)+"'"
        sql += f' and chain in ({chain_str})'
    if address_list:
        address_st = [str(item) for item in address_list]
        address_str = "'"+"','".join(address_st)+"'"
        sql += f' and address in ({address_str})'

    sql += f" limit {start}, {page_size}"
    db_datas = db.sql_to_dict(sql)
    return db_datas

