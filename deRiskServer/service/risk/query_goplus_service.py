import asyncio
import hashlib
import logging
from google.cloud.bigtable.row_set import RowSet

from constants.bigtable_info import GoplusRiskInfoTable
from dao.risk_info_by_bigtable import BigtableClient

from log import logger


def generate_sha256(address):
    # 将地址转换为小写
    address_lower = address.lower()
    # 将字符串 'gopluslabs' 连接到地址后
    combined_string = address_lower + 'gopluslabs'
    # 计算 SHA-256 哈希值
    address_hash = hashlib.sha256(combined_string.encode()).hexdigest()
    return address_hash


async def check_goplus_risk(address):
    ad_hash = generate_sha256(address)
    print(ad_hash)
    ad_category = ""
    try:
        # 连接bigtable
        client = BigtableClient(GoplusRiskInfoTable.project_id, GoplusRiskInfoTable.instance_id)
        table = client.get_table(GoplusRiskInfoTable.table_name)
        row_set = RowSet()
        row_set.add_row_key(ad_hash)
        rows = table.read_rows(row_set=row_set)
        if rows:
            rows.consume_all()
            for row_key, row_data in rows.rows.items():
                # print(f"row_key={row_key}")
                if GoplusRiskInfoTable.risk_family_id in row_data.cells:
                    ad_risk_cell = row_data.cells[GoplusRiskInfoTable.risk_family_id]
                    ad_category = str(ad_risk_cell[GoplusRiskInfoTable.categories_qualifier.encode('utf-8')][0]
                                      .value.decode("utf-8"))
                # 打印行数据
                print(f'Row key: {row_key}, To address: {address},Value: {ad_category}')
    except Exception as e:
        logger.error(e)

    return ad_category


if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    address = '0xf6884686a999f5ae6c1af03db92bab9c6d7dc8de'
    result = loop.run_until_complete(check_goplus_risk(address))
    print(result)
    loop.close()
