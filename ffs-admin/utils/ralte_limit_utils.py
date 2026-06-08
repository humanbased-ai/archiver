import time
from fastapi import FastAPI, HTTPException
import asyncio
from log import logger
import setting

app = FastAPI()

# 内存中的请求计数器
request_counts = {}


async def rate_limit(request_key: str, limit: int, period: int):
    current_time = int(time.time())
    if request_key in request_counts:
        # 清除过期的请求记录
        request_counts[request_key] = [
            timestamp for timestamp in request_counts[request_key] if current_time - timestamp < period
        ]

    total_len = len(request_counts.get(request_key, []))
    if setting.RUN_ENV != 'prod':
        # 开发测试环境，不限流
        return
    if total_len > limit:
        logger.info(f'[{request_key}] Rate limit exceeded {total_len}>{limit} ')
        raise HTTPException(status_code=429, detail="Too many requests")

    # 记录请求
    if request_key not in request_counts:
        request_counts[request_key] = []
    request_counts[request_key].append(current_time)
    return


