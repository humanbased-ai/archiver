import asyncio
import os
import config.mongodb as mongodb

import schedulers.slide_to_jpg as slide_to_jpg


async def trigger():
    # 初始化数据库连接
    client = await init_data_con()
    # 定时任务业务调用
    await slide_to_jpg.schedule(client)

async def init_data_con():
    client = await mongodb.getDB()
    return client


if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    loop.run_until_complete(trigger())
