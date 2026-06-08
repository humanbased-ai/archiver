import time
from fastapi import FastAPI, HTTPException
import asyncio
from log import logger
import setting

app = FastAPI()

# In-memory request counter
request_counts = {}


async def rate_limit(request_key: str, limit: int, period: int):
    current_time = int(time.time())
    if request_key in request_counts:
        # Clear expired request records
        request_counts[request_key] = [
            timestamp for timestamp in request_counts[request_key] if current_time - timestamp < period
        ]

    total_len = len(request_counts.get(request_key, []))
    if setting.RUN_ENV != 'prod':
        # Development test environment, no rate limiting
        return
    if total_len > limit:
        logger.info(f'[{request_key}] Rate limit exceeded {total_len}>{limit} ')
        raise HTTPException(status_code=429, detail="Too many requests")

    # Record request
    if request_key not in request_counts:
        request_counts[request_key] = []
    request_counts[request_key].append(current_time)
    return
