
from datetime import datetime, timedelta, timezone

from log import logger
from service.bot import bot_service
from service.account import account_redeem_service, checkin_service
from service.ct import chat_model_task, chat_chain_task
import time
from utils import requests_utils
import os

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


# twitter comment bot
async def fresh_message():
    start_time = time.time()
    await bot_service.fresh_comment_by_usernames()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# reply comment bot
async def twitter_reply():
    start_time = time.time()
    await bot_service.push_data_to_twitter_by_users()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# redeem token bot
async def check_token_status():
    start_time = time.time()
    await account_redeem_service.check_token_status()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# twitter checkin bot
async def checkin_reward():
    start_time = time.time()
    await checkin_service.checkin_reward_task()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# twitter checkin bot
async def chat_chain():
    start_time = time.time()
    await chat_chain_task.batch_chain_task()
    '''domain = os.environ.get('ffs-server', 'http://127.0.0.1:8080')
    url = f'{domain}/api/ct/chat/chain'
    await requests_utils.get(url=url, headers=None)
    '''
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)


# twitter checkin bot
async def chat_statics():
    start_time = time.time()
    await chat_model_task.statics_chat_model_task()
    total_use_time = time.time() - start_time
    logger.info(" usetime = {}分钟", int(total_use_time*100/60)/100)

