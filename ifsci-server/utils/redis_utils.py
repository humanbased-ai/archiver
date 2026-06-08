import asyncdb
import setting
from log import logger


async def getRedisKey(key):
    redis_key = setting.redisPrefix+":"+key
    return redis_key


async def setData(key: str, value: str, expire: int = 60):
    try:
        redis_key = await getRedisKey(key)
        redis_client = await asyncdb.redis_client()
        redis_client.set(redis_key, value)
        # The default expiration time is 1 minute.
        if expire is not None:
            redis_client.expire(redis_key, expire)
    except Exception as e:
        logger.error("save {} to redis error = {}", key, e)


async def getData(key: str):
    data = None
    try:
        redis_key = await getRedisKey(key)
        redis_client = await asyncdb.redis_client()
        value = redis_client.get(redis_key)
        if isinstance(value, bytes):
            data = value.decode("utf-8")
        else:
            data = value

    except Exception as e:
        logger.error("get {} to redis error = {}", key, e)
    return data


async def delData(key: str):
    try:
        redis_key = await getRedisKey(key)
        redis_client = await asyncdb.redis_client()
        redis_client.delete(redis_key)
    except Exception as e:
        logger.error("del {} to redis error = {}", key, e)


async def lpsuhData(key: str, value: str):
    try:
        redis_key = await getRedisKey(key)
        redis_client = await asyncdb.redis_client()
        redis_client.lpush(redis_key, value)

    except Exception as e:
        logger.error("lpush {} to redis error = {}", key, e)


async def brpopData(key: str):
    data = None
    try:
        redis_key = await getRedisKey(key)
        redis_client = await asyncdb.redis_client()
        value = redis_client.brpop(redis_key)
        if isinstance(value, bytes):
            data = value.decode("utf-8")
        else:
            data = value
    except Exception as e:
        logger.error("lpush {} to redis error = {}", key, e)
    return data
