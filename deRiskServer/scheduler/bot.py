
from datetime import datetime

from log import logger
from service.bot import bot_service
import time


async def my_job():
    start_time = time.time()

    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# twitter post bot
async def twitter_post():
    start_time = time.time()
    await bot_service.push_data_to_twitter()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# twitter comment bot
async def fresh_comment():
    start_time = time.time()
    await bot_service.fresh_comment()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# twitter comment bot
async def fresh_notice():
    start_time = time.time()
    await bot_service.fresh_comment_by_users()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# reply comment bot
async def twitter_reply():
    start_time = time.time()
    await bot_service.push_data_to_twitter_by_users()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)