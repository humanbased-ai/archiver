
from service.bot.ai import openai_image_service, chaintool_image, liblib_avatar_image
from log import logger
from dao.art import art_avatar_dao
from service.art import art_reward_service, art_invite_service
import asyncio
from starlette.requests import Request
import json
from datetime import datetime, timezone
from utils import file_oss, date_utils, file_oss_artometa
import setting
import uuid
img_domain = setting.OSS_AVATAR_IMAGE_DATA_DOMAIN


async def gen_image(account_id, content, image_count, model, ip_address, request: Request, tool=None):
    image_result = {}
    if tool == 'cta' or model in ['azuki']:
        image_result = await chaintool_image.get_image(content, image_count, model)
    elif tool == 'liblib' or 'liblib' == model:
        image_result = await liblib_avatar_image.get_self_image(content, image_count)
    else:
        image_result = await openai_image_service.get_image(content, image_count, model)
    #result = await openai_image_service.get_image(content, image_count, model)

    image_urls = image_result.get('image_urls', [])
    #t = threading.Thread(target=save_record, kwargs={"record_data": record_data, 'image_urls': image_urls})
    #t.start()

    images = []
    target_image_urls = []
    # upload to cloud
    if image_urls is not None and len(image_urls) > 0:
        num = 0
        for image_url in image_urls:
            num = num + 1
            uid = uuid.uuid4().hex
            fpath = f'art/image/avatar/{uid}.jpg'
            result = None
            if 'https://artometa' in image_url:
                key = image_url.split('aliyuncs.com/')[-1].split('?')[0]
                oss_image_url = await file_oss_artometa.get_oss_url_by_path(key)
                result = await file_oss.upload_oss_by_url(path=fpath, url=oss_image_url)
            elif 'https://image.ifsci.wtf' in image_url:
                fpath = image_url.split('ifsci.wtf/')[-1].split('?')[0]
                result = {}
            elif 'https://image.thearp.ai' in image_url:
                fpath = image_url.split('image.thearp.ai/')[-1].split('?')[0]
                result = {}
            else:
                result = await file_oss.upload_oss_by_url(path=fpath, url=image_url)
            if result is not None:
                images.append(fpath)
                target_image_url = f'{img_domain}/{fpath}'
                target_image_urls.append(target_image_url)

    record_data = {
        'ip_address': ip_address,
        'create_time': datetime.now(timezone.utc),
        'content': content,
        'model': model,
        'image_count': image_count,
        'account_id': account_id,
        'status': 0,
        'images': json.dumps(images)
    }
    # save data to db
    record_id = await art_avatar_dao.add_ai_record(record_data)

    result = {
        'record_id': record_id,
        'image_urls': target_image_urls
    }
    return result


def save_record(record_data, image_urls):
    logger.info("async save_record record_data = {}, image_urls = {}", record_data, image_urls)
    images = []
    if image_urls is not None and len(image_urls) > 0:
        num = 0
        for image_url in image_urls:
            num = num + 1
            fpath = 'art/image/avatar/'+datetime.now().strftime('%Y%m%d%H%M%S')+f'_{num}.jpg'
            result = asyncio.run(file_oss.upload_oss_by_url(path=fpath, url=image_url))
            if result is not None:
                images.append(fpath)


    record_data['images'] = json.dumps(images)
    asyncio.run(art_avatar_dao.add_ai_record(record_data))


async def gen_image_record_page(account_id, page_no, page_size, status=None):
    if page_size is None:
        page_size = 10
    if page_no is None:
        page_no = 1
    if status is None:
        status = 1
    list_datas = []
    total = await art_avatar_dao.get_record_count(account_id=account_id, status=status)
    if total > 0:
        datas = await art_avatar_dao.find_record_page(account_id=account_id, status=status,
                                                      page_no=page_no, page_size=page_size)
        if len(datas) > 0:
            for data in datas:
                create_time = date_utils.date_to_utc_str(data['create_time'])
                select_image_path = data['select_image_path']
                image_url = None
                if select_image_path is not None:
                    image_url = f'{img_domain}/{select_image_path}'

                data['create_time'] = create_time
                record = {
                    "record_id": data['id'],
                    "account_id": data['account_id'],
                    "image_url": image_url,
                    "chain_hash":  data['chain_hash'],
                    "create_time": create_time,
                    "content": data['content'],
                    "nft_name": data['nft_name'],
                    "nft_description": data['nft_description'],
                }
                list_datas.append(record)

    page_data = {
        'count': total,
        'pageNo': page_no,
        'pageSize': page_size,
        'list': list_datas
    }
    return page_data


async def find_image_record_page(account_id, page_no, page_size, status=None):
    if page_size is None:
        page_size = 10
    if page_no is None:
        page_no = 1

    list_datas = []
    total = await art_avatar_dao.get_record_count(account_id=account_id, status=status)
    if total > 0:
        datas = await art_avatar_dao.find_record_page(account_id=account_id, status=status,
                                                      page_no=page_no, page_size=page_size)
        if len(datas) > 0:
            for data in datas:
                create_time = date_utils.date_to_timestamp(data['create_time'])
                image_str = data['images']
                image_urls = []
                if image_str is not None and image_str != '':
                    images = json.loads(image_str)
                    for image in images:
                        image_url = f'{img_domain}/{image}'
                        image_urls.append(image_url)
                data['image_urls'] = image_urls
                data['create_time'] = create_time
                list_datas.append(data)

    page_data = {
        'count': total,
        'pageNo': page_no,
        'pageSize': page_size,
        'list': list_datas
    }
    return page_data


async def avatar_chain(account_id, image_url, chain_hash, record_id, nft_name, nft_description, chain_fees):
    result = None

    if image_url is None:
        return {
            'status': 0,
            'info': "image_url is None",
        }
    if chain_hash is None:
        return {
            'status': 0,
            'info': "chain_hash is None",
        }
    db_data = await art_avatar_dao.get_data_by_id(record_id)
    if db_data is not None:
        select_image_path = image_url.replace(f'{img_domain}/', '')
        data = {
            'id': db_data['id'],
            'account_id': account_id,
            'select_image_path': select_image_path,
            'chain_hash': chain_hash,
            'chain_time': datetime.now(timezone.utc),
            'nft_name': nft_name,
            'nft_description': nft_description,
            'chain_fees': chain_fees,
            'status': 1
        }
        await art_avatar_dao.update_ai_record(data=data)
        result = {
            'status': 1,
            'info': "success",
        }
        # 奖励
        try:
            await reward_invite(account_id)
        except Exception as e:
            logger.error('reward_invite account_id = {}, error = {}', account_id, e)

    if result is None:
        result = {
            'status': 0,
            'info': "fail",
        }

    return result


async def reward_invite(account_id):
    invite_data = await art_invite_service.get_invite_data(account_id)
    if invite_data is None:
        return None
    status = invite_data['status']
    invite_data_id = invite_data['id']
    invite_account_id = invite_data.get('account_id', None)
    if invite_account_id is None:
        return None
    count = await art_avatar_dao.get_record_count(account_id=account_id, status=1)
    if count == 1:
        # 第一次创建nft 发放奖励
        reward_type = 'avatar_chain'
        uid = f'{reward_type}_{account_id}'
        await art_reward_service.record_reward(uid=uid, account_id=invite_account_id, reward_type=reward_type, score=0.05)

        # 更新邀请记录状态为2， 表示邀请成功且创建nft
        if status == 1:
            await art_invite_service.update_invite_status(invite_data_id, 2)


async def get_avatar_record(record_id):
    result = None
    if record_id is None:
        return result

    data = await art_avatar_dao.get_data_by_id(record_id)
    if data is not None:
        create_time = date_utils.date_to_utc_str(data['create_time'])
        select_image_path = data['select_image_path']
        image_url = None
        if select_image_path is not None:
            image_url = f'{img_domain}/{select_image_path}'
        result = {
            "record_id": data['id'],
            "account_id": data['account_id'],
            "image_url": image_url,
            "chain_hash":  data['chain_hash'],
            "create_time": create_time,
            "content": data['content'],
            "nft_name": data['nft_name'],
            "nft_description": data['nft_description'],
        }
    return result


async def get_total_fees(account_id):
    total_fees = 0
    if account_id is not None:
        total_fees = await art_avatar_dao.get_total_fees(account_id)
    return total_fees
