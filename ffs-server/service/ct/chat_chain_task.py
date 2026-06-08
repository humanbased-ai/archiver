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

    historys = await ct_ai_chat_record_dao.get_ai_chat_history_list(uid)
    if historys is not None and len(historys) > 0:
        for history in historys:
            row_chat_index = int(history['chat_index'])
            chat_model = history['model']
            chat_content = history['content']
            chat_result = history['result']

            history_data = {
                'index': row_chat_index,
                'question': chat_content,
                'reply': chat_result
            }
            if chat_model == model_a:
                model_a_historys.append(history_data)
            elif chat_model == model_b:
                model_b_historys.append(history_data)

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

    result = await chain_service.save_to_chain(chat_detail)

    logger.info('upload chain result = {}', result)
    await ct_ai_chat_record_dao.update_ai_chat_record(result)

    return result


async def batch_chain_task():

    records = await ct_ai_chat_record_dao.find_ai_chat_records(chain_status=1)
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
    #asyncio.run(start_chat_chain_task(uid="06556532040d4a1c891e77dc52786a7a"))
    asyncio.run(batch_chain_task())




