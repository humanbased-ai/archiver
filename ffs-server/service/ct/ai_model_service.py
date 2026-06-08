from log import logger
from dao.ct import ct_ai_chat_task_dao, ct_ai_chat_record_dao, ct_ai_model_dao
import threading
import asyncio
import httpx
from starlette.requests import Request
import json
from datetime import datetime, timezone
from utils import file_oss, date_utils, file_oss_artometa
import setting
import uuid
import random
from typing import Dict
from openai import OpenAI, AsyncOpenAI
from service.ct import chat_service
from utils.task import thread_utils


async def get_al_models():
    """
    Retrieve all AI models with active status.

    Returns:
        list: A list of dictionaries containing model names and their organizations.
    """
    models = []
    datas = await ct_ai_model_dao.find_ai_models(status=1)
    if len(datas) > 0:
        for data in datas:
            model_data = {'name': data['name'], 'org': data['org'],
                          'show_name': data['show_name'], 'description': data['description']
                          }
            models.append(model_data)
    return models


async def get_al_model_leaderboard(order_condition=None):

    models = []
    datas = await ct_ai_model_dao.find_ai_models(status=1, order_type=order_condition)
    total = 0
    total_votes = 0
    statistical_time_str = None
    if len(datas) > 0:
        for data in datas:
            arena_score = data['arena_score']
            votes = data['votes']
            statistical_time = data['statistical_time']
            if arena_score is None or votes is None or votes <= 10:
                continue

            if statistical_time is not None:
                try:
                    statistical_time_str = statistical_time.strftime("%Y-%m-%d")
                except Exception as e:
                    logger.error('parse date error {}, {}', statistical_time, e)
            total += 1
            total_votes += votes
            model_data = {'name': data['name'], 'show_name': data['show_name'],
                          'image_url': data['image_url'], 'link': data['link'],
                          'arena_score': data['arena_score'], 'ci': data['ci'],
                          'votes': data['votes'], 'correct_rate': data['correct_rate'],
                          'org': data['org'], 'org_name': data['org_name'], 'license': data['license']

                          }
            models.append(model_data)
    total_chain_votes = await ct_ai_chat_record_dao.total_chain_votes_count()

    result = {
        "total": total,
        "total_votes": total_votes,
        "total_chain_votes": total_chain_votes,
        "update_time": statistical_time_str,
        'models': models,
    }
    return result


async def run_chat(task_id, user_id, content, models=None):
    """
    Run a chat session using the specified task ID and user information.

    Args:
        task_id (str): The unique identifier for the chat task.
        user_id (str): The unique identifier for the user initiating the chat.
        content (str): The message content to be sent in the chat.
        models (list, optional): A list of AI models to choose from. Defaults to None.

    Returns:
        dict: A dictionary with the task ID and a message indicating the result.
    """
    result = None
    uid = task_id
    record = None
    if content is None or len(content) == 0 or content == '':
        return {'task_id': None, 'message': 'content is empty'}
        # 选择模型
    models = await ct_ai_model_dao.find_ai_models(status=1)
    if len(models) == 0:
        return {'task_id': None, 'message': 'no model'}
    if task_id is None or task_id == '':
        record = await create_chat_record(user_id, content, models)
        uid = record['uid']
    else:
        record = await ct_ai_chat_record_dao.get_ai_chat_record_by_uid(uid)
        if record is None:
            return {'task_id': uid, 'message': 'no chat'}
        data = {'id': record['id'], 'status': 1, 'content': content}
        await ct_ai_chat_record_dao.update_ai_chat_record(data)

    if record is None:
        return {'task_id': uid, 'message': 'run fail'}
    # 启动对话任务
    logger.info('run chat uid = {}, record = {}', uid, record)
    #t = threading.Thread(target=run_chat_record, kwargs={"uid": uid})
    #t.start()
    return {'task_id': uid, 'message': 'start chat'}


async def create_chat_record(user_id, content, models=None):
    """
    Create a new chat record for the user with the given content and models.

    Args:
        user_id (str): The unique identifier for the user.
        content (str): The message content for the chat.
        models (list, optional): A list of AI models to choose from. Defaults to None.

    Returns:
        dict: A dictionary containing the chat record details.
    """
    # 随机选择
    weights = []
    for model in models:
        weight = model['weight']
        if weight is None:
            weight = 0.1
        weights.append(weight)

    uid = str(uuid.uuid4().hex)
    model_a = None
    model_b = None
    while True:
        chosen = random.choices(models, weights=weights, k=2)
        model_a = chosen[0]['name']
        model_b = chosen[1]['name']
        if model_a != model_b:
            break

    logger.info('create chat record switch uid = {}, model_a = {}, model_b = {}', uid, model_a, model_b)

    record = {'user_id': user_id, 'content': content, 'status': 0,
               'create_time': datetime.now(timezone.utc),
               'uid': uid, 'model_a': model_a, 'model_b': model_b
               }

    record_id = await ct_ai_chat_record_dao.add_ai_chat_record(record)

    # 启动对话任务
    record['id'] = record_id
    logger.info('create chat uid = {}, record = {}', uid, record)
    return record


def run_chat_record(uid):
    """
    Run a chat record by the given unique identifier.

    Args:
        uid (str): The unique identifier for the chat record.
    """
    asyncio.run(run_chat_by_model(uid))


async def run_chat_by_model(uid):
    """
    Run a chat session by the given unique identifier.

    Args:
        uid (str): The unique identifier for the chat session.

    Returns:
        None
    """
    logger.info('start chat record_id = {}', uid)
    record = await ct_ai_chat_record_dao.get_ai_chat_record_by_uid(uid)
    if record is None:
        logger.error('no ai chat record for uid = {}', uid)
        return None

    record_id = record['id']
    content = record['content']

    # 运行对话
    data = {'id': record_id, 'status': 1, 'start_time': datetime.now(timezone.utc)}
    await ct_ai_chat_record_dao.update_ai_chat_record(data)
    finish_status = None
    try:
        # Retrieve model identifiers from the record
        model_a = record.get('model_a')
        model_b = record.get('model_b')

        # Fetch model data for model_a and model_b using their unique identifiers
        model_a_data = await ct_ai_model_dao.get_ai_model_by_uid(model_a)
        model_b_data = await ct_ai_model_dao.get_ai_model_by_uid(model_b)

        # Check if model data exists for both models
        if model_a_data is None:
            logger.error('no ai model for model_a = {}', model_a)
            return None
        if model_b_data is None:
            logger.error('no ai model for model_a = {}', model_b)
            return None

        # Initialize chat index
        chat_index = 1  

        # Retrieve historical chat records
        model_a_historys = []
        model_b_historys = []
        historys = await ct_ai_chat_record_dao.get_ai_chat_history_list(uid)
        if historys is not None and len(historys) > 0:
            for history in historys:
                row_chat_index = int(history['chat_index'])
                chat_model = history['model']
                chat_content = history['content']
                chat_result = history['result']
                # Categorize historical records based on the model
                if chat_model == model_a:
                    model_a_historys.append(history)
                elif chat_model == model_b:
                    model_b_historys.append(history)
                # Update chat index
                if chat_index is not None and row_chat_index >= chat_index:
                    chat_index = row_chat_index + 1

        # Prepare tasks for running chat sessions with both models
        tasks = [
            chat_service.run_chat_by_model_org(record=record, model_data=model_a_data, model_position='model_a', history_list=model_a_historys),
            chat_service.run_chat_by_model_org(record=record, model_data=model_b_data, model_position='model_b', history_list=model_b_historys)
        ]

        # Execute chat tasks concurrently
        results = await asyncio.gather(*tasks)
        if results is not None:
            for result_data in results:
                # Record the chat results into history
                history = {'record_id': record['id'], 'uid': uid, 'chat_index': chat_index, 'content': content,
                           'model': result_data['model'],
                           'result': result_data['result'], 'create_time': datetime.now(timezone.utc)
                           }
                await ct_ai_chat_record_dao.add_ai_chat_history(history)

        # Mark task as finished
        row_data = json.dumps({"task_status": "finish"})

        # Simulate background task indicating completion
        await chat_service.fake_background_task(task_id=uid, row_data=row_data, model_name='')
        finish_status = 2
    except Exception as e:
        logger.exception('run task record_id = {}, error = {}', record_id, e)
        finish_status = 3

    #运行结束
    logger.info('finish chat record_id = {}', record_id)
    data = {'id': record_id, 'status': finish_status, 'finish_time': datetime.now(timezone.utc)}
    await ct_ai_chat_record_dao.update_ai_chat_record(data)


async def evaluate_model(user_id, uid, evaluate_result):
    """
    Evaluate the model for the given user and chat record.

    Args:
        user_id (str): The unique identifier for the user.
        uid (str): The unique identifier for the chat record.
        evaluate_result (str): The evaluation result for the model.

    Returns:
        dict: A dictionary with the evaluation result and model information.
    """
    # 评价模型
    record = await ct_ai_chat_record_dao.get_ai_chat_record_by_uid(uid)
    if record is None:
        return {'status': 0, 'message': 'record not found'}
    if record['status'] == 0:
        return {'status': 0, 'message': 'record no finish'}

    data = {'id': record['id'], 'evaluate': evaluate_result, 'user_id': user_id,
            'vote_time': datetime.now(timezone.utc), 'chain_status': 1
            }
    await ct_ai_chat_record_dao.update_ai_chat_record(data)
    return {
        "status": 1, "message": "success",
        "model_a": record['model_a'],
        "model_b": record['model_b'],
    }


async def get_chat_detail(uid):
    """
    Retrieve the chat details for the given unique identifier.

    Args:
        uid (str): The unique identifier for the chat record.

    Returns:
        dict: A dictionary containing the chat details.
    """
    # 查询历史对话
    record = await ct_ai_chat_record_dao.get_ai_chat_record_by_uid(uid)
    if record is None:
        logger.error('no ai chat record for uid = {}', uid)
        return None

    model_a = record.get('model_a')
    model_b = record.get('model_b')
    evaluate = record.get('evaluate')
    create_time = record.get('create_time')
    model_a_historys = []
    model_b_historys = []

    historys = await ct_ai_chat_record_dao.get_ai_chat_history_list(uid)
    if historys is not None and len(historys) > 0:
        for history in historys:
            row_chat_index = int(history['chat_index'])
            chat_model = history['model']
            chat_content = history['content']
            chat_result = history['result']
            history['create_time'] = date_utils.date_to_utc_str(history['create_time'])
            if chat_model == model_a:
                model_a_historys.append(history)
            elif chat_model == model_b:
                model_b_historys.append(history)
    chat_detail = {
        'task_id': uid,
        'model_a': model_a,
        'model_b': model_b,
        'model_a_historys': model_a_historys,
        'model_b_historys': model_b_historys,
        'evaluate': evaluate,
        'create_time': date_utils.date_to_utc_str(create_time)
    }
    return chat_detail


async def find_chain_records(page_no, page_size, query_user_id, order_condition):
    if page_no is None:
        page_no = 1
    if page_size is None:
        page_size = 10
    if order_condition is None:
        order_condition = ' chain_time desc '
    list_datas = []
    total = await ct_ai_chat_record_dao.get_record_count(query_user_id=query_user_id, status=2, chain_status=2)
    if total > 0:
        datas = await ct_ai_chat_record_dao.find_record_page(query_user_id=query_user_id, status=2, chain_status=2,
                                                      page_no=page_no, page_size=page_size,order_condition=order_condition)
        if len(datas) > 0:
            for data in datas:
                chain_time = data['chain_time']
                block_number = data['block_number']
                tx_hash = data['tx_hash']
                if chain_time is None or block_number is None or tx_hash is None:
                    continue
                chain_time_str = date_utils.date_to_utc_str(chain_time)

                chan_link = f'https://testnet.kitescan.ai/tx/0x{tx_hash}'
                record = {
                    'id': data['id'],
                    'user_id': data['user_id'],
                    'tx_hash': tx_hash,
                    'block_number': block_number,
                    'chain_time': chain_time_str,
                    'chan_link': chan_link
                }
                list_datas.append(record)

    page_data = {
        'count': total,
        'pageNo': page_no,
        'pageSize': page_size,
        'list': list_datas
    }
    return page_data