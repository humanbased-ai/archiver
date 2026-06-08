from log import logger
from dao.ct import ct_ai_chat_record_dao
import asyncio
import json
from service.ct import chain_service


async def start_chat_chain_task(uid):
    logger.info('chat upload chain uid = {}', uid)
    record = await ct_ai_chat_record_dao.get_ai_chat_record_by_uid(uid)
    if record is None:
        logger.error('no ai chat record for uid = {}', uid)
        return None

    id = record.get('id')
    user_id = record.get('user_id')
    model_a = record.get('model_a')
    model_b = record.get('model_b')
    evaluate = record.get('evaluate')
    if evaluate is None:
        logger.warning('no ai chat evaluate for uid = {}', uid)
        return None

    vote_time = record.get('vote_time')
    if vote_time is None:
        vote_time = record.get('finish_time')
    model_a_historys = []
    model_b_historys = []

    empty_result_flag = False
    historys = await ct_ai_chat_record_dao.get_ai_chat_history_list(uid)
    if historys is not None and len(historys) > 0:
        for history in historys:
            row_chat_index = int(history['chat_index'])
            chat_model = history['model']
            chat_content = history['content']
            chat_result = history['result']
            if not chat_result:
                empty_result_flag = True
                logger.error('no ai chat result for uid = {}, history = {}', uid, history)
                break
            history_data = {
                'index': row_chat_index,
                'question': chat_content,
                'reply': chat_result
            }
            if chat_model == model_a:
                model_a_historys.append(history_data)
            elif chat_model == model_b:
                model_b_historys.append(history_data)
    else:
        logger.info(f' no ai chat history for uid = {uid}')
        chat_record = {'id': id, 'chain_status': 0}
        await ct_ai_chat_record_dao.update_ai_chat_record(chat_record)
        return None

    if empty_result_flag:
        remarks = 'result has empty'
        chat_record = {'id': id, 'chain_status': 4, 'remarks': remarks}
        logger.info('cancel chain result = {}', chat_record)
        await ct_ai_chat_record_dao.update_ai_chat_record(chat_record)
        return

    historys = {
        model_a: model_a_historys,
        model_b: model_b_historys,
    }
    conversation = json.dumps(historys)
    chat_detail = {
        'id': id,
        'user_id': user_id,
        'uid': id,
        'model_a': model_a,
        'model_b': model_b,
        'conversation': conversation,
        'evaluate': evaluate,
        'vote_time': vote_time
    }
    result = None
    try:
        result = await chain_service.save_to_chain(chat_detail)
        logger.info('upload chain result = {}', result)
        await ct_ai_chat_record_dao.update_ai_chat_record(result)
    except Exception as e:
        result = {'id': id, 'chain_status': 3, 'remarks': f'{e}'}
        logger.error('upload chain uid = {}. error = {}', uid, e)
        await ct_ai_chat_record_dao.update_ai_chat_record(result)

    return result


async def batch_chain_task():

    records = await ct_ai_chat_record_dao.find_ai_chat_records(chain_status=1, status=2, page_no=1, page_size=500)
    if records is None or len(records) == 0:
        return None
    num = 0
    for record in records:

        num = num + 1
        logger.info('chat upload chat index = {}, uid={}, id = {}', num, record.get('uid'), record.get('id'))
        try:
            await start_chat_chain_task(record.get('uid'))
        except Exception as e:
            logger.exception('run chain record = {},  error = {}', record, e)
    return len(records)


if __name__ == '__main__':
    #asyncio.run(start_chat_chain_task(uid="e1ebeb0c6a18432682f97af8b9b93b99"))
    asyncio.run(batch_chain_task())




