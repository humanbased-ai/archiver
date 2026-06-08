import requests
import os
import json
import asyncio
import re
import setting
from log import logger
import uuid
from dao import admin_post_dao
from datetime import datetime, timedelta, timezone
from utils import file_oss, date_utils
from service.account import account_service
from service.bot.twitter import user_service, point_openai_service
from models.param_info import chatgpt_base, PostParam, AnnotationParam

img_domain = setting.OSS_IMAGE_DATA_DOMAIN


async def find_post_page(param: PostParam):
    user_name = param.user_name
    user_id = param.user_id
    status = param.status
    page_no = param.page_no
    page_size = param.page_size
    comment_uid = param.comment_uid
    post_datas = []
    total = await admin_post_dao.get_post_comment_count(user_name=user_name, author_id=user_id
                                                        ,comment_uid=comment_uid, status=status)
    if total > 0:
        datas = await admin_post_dao.find_post_comment_page(user_name=user_name, author_id=user_id
                                            , comment_uid=comment_uid, status=status, page_no=page_no, page_size=page_size)
        if len(datas) > 0:
            for data in datas:
                comment_uid = data['comment_uid']
                create_time = date_utils.date_to_timestamp(data['create_time'])
                images = data['images']
                image_url = get_image_url_from_comment_images(images)
                content = data['content']
                has_food_image = None
                analyze_result = str(data['analyze_result'])
                if analyze_result == "None":
                    analyze_result = None
                analyze_result_data = ''
                if analyze_result is not None and analyze_result != '':
                    try:
                        analyze_result_data = json.loads(analyze_result)
                        if analyze_result_data is not None and 'has_food_image' in analyze_result_data:
                            has_food_image = analyze_result_data['has_food_image']
                    except Exception as e:
                        logger.error('parse json = {} error = {}', analyze_result, e)
                post_data = {
                    'id': data['id'],
                    'comment_uid': comment_uid,
                    'url': data['url'],
                    'images': images,
                    'image': image_url,
                    'content': content,
                    'analyze_result': analyze_result,
                    'analyze_result_data': analyze_result_data,
                    'has_food_image': has_food_image,
                    'author_id': data['author_id'],
                    'user_name': data['user_name'],
                    'status': data['status'],
                    'create_time': create_time
                }
                post_datas.append(post_data)
    page_data = {
        'count': total,
        'pageNo': page_no,
        'pageSize': page_size,
        'list': post_datas
    }

    return page_data


def get_image_url_from_comment_images(images):
    image_url = None
    if images is not None and images != '':
        try:
            image_datas = json.loads(images)
            if image_datas is not None and len(image_datas) > 0:
                image_data = image_datas[0]
                if 'path' in image_data:
                    image_path = image_data['path']
                    image_url = f'{img_domain}/{image_path}'
                elif 'url' in image_data:
                    image_url = image_data['url']
        except Exception as e:
            logger.error('parse  images json error {}, {}', images, e)
    return image_url
