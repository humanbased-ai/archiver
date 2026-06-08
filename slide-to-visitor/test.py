import asyncio
import os
import config.mongodb as mongodb

import schedulers.slide_to_jpg as slide_to_jpg
import schedulers.slide_to_qupath as slide_to_qupath


async def trigger():
    # 初始化数据库连接
    client = await init_data_con()
    # 定时任务业务调用
    await slide_to_jpg.schedule(client)
    # await slide_to_qupath.schedule(client, '67218c2229e46a440609c6d4')
async def init_data_con():
    client = await mongodb.getDB()
    return client


if __name__ == '__main__':
     asyncio.run(trigger())
