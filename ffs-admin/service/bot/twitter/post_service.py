import requests
import os
import json
import asyncio
import re
import setting
from log import logger
import uuid
from dao import twitter_dao
from datetime import datetime, timedelta, timezone
from utils import file_oss, date_utils
from service.account import account_service, checkin_service, account_reward_service
from service.bot.twitter import user_service, point_openai_service
from utils.exceptions import BusinessException

img_domain = setting.OSS_IMAGE_DATA_DOMAIN


# 获取需要检查的推特用户
async def get_need_push_comment_users():

    users = await twitter_dao.get_users(1)

    return users


async def get_user_by_author_id(author_id):
    user = await twitter_dao.get_user_by_author_id(author_id)
    return user


async def get_user_by_user_name(user_name):
    user = await twitter_dao.get_user_by_user_name(user_name)
    return user


# 获取需要自动回复评论的帖子
async def get_posts():

    posts = await twitter_dao.get_posts(1)

    return posts


async def get_post_by_uid(uid):

    post_data = await twitter_dao.get_post_by_uid(uid)

    return post_data


async def get_post_detail_by_uid(uid):

    post_data = await twitter_dao.get_post_detail_by_uid(uid)

    return post_data


async def get_comment_map_by_comment_uids(comment_uids):
    comment_uid_map = await twitter_dao.get_comment_map_by_comment_uids(comment_uids)
    return comment_uid_map


async def get_post_comments_by_uid(uid):

    post_comments = await twitter_dao.get_post_comments_by_uid(uid)

    return post_comments


async def get_need_reply_comments_by_uid(uid):
    post_comments = await twitter_dao.get_need_reply_comments_by_uid(uid)
    return post_comments


async def get_need_reply_comments_by_author_id(author_id):
    post_comments = await twitter_dao.get_need_reply_comments_by_author_id(author_id)
    return post_comments


async def get_post_comment_by_comment_uid(comment_uid):

    post_comment = await twitter_dao.get_comment_by_comment_uid(comment_uid)

    return post_comment


# 记录帖子新增的评论内容
async def post_comment_update(comment_data):

    await twitter_dao.post_comment_update(comment_data)


async def record_comment(comment_data):

    await twitter_dao.post_comment_save(comment_data)


# 批量保存回复
async def record_comments(comment_datas):
    # upload file check
    add_comment_datas = []
    if comment_datas is not None and len(comment_datas) > 0:
        comment_uids = []
        for comment_data in comment_datas:
            comment_uid = comment_data['comment_uid']
            if comment_uid is not None and comment_uid not in comment_uids:
                comment_uids.append(comment_uid)
        comment_uidMap = await twitter_dao.get_comment_map_by_comment_uids(comment_uids)
        for comment_data in comment_datas:
            comment_uid = comment_data['comment_uid']
            if comment_uid in comment_uidMap and comment_uidMap[comment_uid] is not None:
                continue
            if 'images' in comment_data:
                images = comment_data['images']
                if images is not None and len(images) > 0 and images != '[]':
                    images_datas = json.loads(images)
                    for image_data in images_datas:
                        if 'url' in image_data:
                            image_url = image_data['url']
                            fpath = None
                            if 'path' in image_data:
                                fpath = image_data['path']
                            #fpath = None
                            if fpath is None or fpath == '':
                                immage_file = image_url.split('/')[-1]
                                fpath = f'tw/img/{immage_file}'
                                result = await file_oss.upload_oss_by_url(image_url, fpath)
                                if result is not None:
                                    image_data['path'] = fpath
                    images = json.dumps(images_datas)
                    comment_data['images'] = images
            add_comment_datas.append(comment_data)

    await twitter_dao.batch_post_comment(add_comment_datas)
    return add_comment_datas


async def chartgpt_record_save(data):

    await twitter_dao.chartgpt_record_save(data)


# 根据最后一个评论查询评论历史
async def get_comment_historys(select_comment_uid):
    historys = []
    last_post_comment = await twitter_dao.get_comment_by_comment_uid(select_comment_uid)
    if last_post_comment is None:
        return historys


    parent_user_id = last_post_comment['parent_user_id']
    parent_comment_uid = last_post_comment['parent_comment_uid']
    author_id = last_post_comment['author_id']
    uid = last_post_comment['uid']
    post_data = await twitter_dao.get_post_by_uid(uid=uid)
    if post_data is None:
        post_data = await twitter_dao.get_comment_by_comment_uid(uid)
    '''post_data_message = {'reply_type': 2, 'uid': uid, 'comment_uid': None
        , 'author_id': post_data['author_id'], 'user_name': post_data['user_name']
        , 'url': post_data['url'], 'status': 1, 'content': post_data['content']
        , 'create_time': post_data['create_time']
        , 'parent_user_id': None, 'images': None, 'videos': None
        , 'parent_comment_uid': None,
                    }'''
    #historys.append(post_data_message)

    post_comments = await twitter_dao.get_comments_by_author_id_and_parent_user_id(uid, author_id, parent_user_id)
    if len(post_comments) == 0:
        historys.append(last_post_comment)
        return historys

    # 解析出评论历史列表
    commend_id_map = {}
    for post_comment in post_comments:
        comment_uid = post_comment['comment_uid']
        commend_id_map[comment_uid] = post_comment

    parents = []
    parents = get_parent_by_comment_id(select_comment_uid, parents, commend_id_map)
    if len(parents) > 0:
        historys = historys + list(reversed(parents))
    else:
        historys = historys + [last_post_comment]
    return historys


# 递归查询上级
def get_parent_by_comment_id(comment_uid, parents, commend_id_map):
    if comment_uid not in commend_id_map:
        return parents
    comment = commend_id_map[comment_uid]
    if comment is not None:
        parents.append(comment)
        parent_comment_uid = comment['parent_comment_uid']
        parents = get_parent_by_comment_id(parent_comment_uid, parents, commend_id_map)
    return parents


async def get_chatgpt_base_info(data_type):
    # type = 'twitter_food'
    init_messages = []
    records = await twitter_dao.get_chatgpt_base_infos_by_type(type=data_type)
    if len(records) == 0:
        return init_messages
    for record in records:

        content_str = record['content']
        if content_str is None or content_str == '' or len(content_str) == 0:
            continue
        content = content_str
        if content.startswith('{') or content.startswith('['):
            content = json.loads(content_str)
        message = {
            'role': record['role'],
            'content': content,
        }
        init_messages.append(message)
    return init_messages


async def save_chatgpt_base_info(data):
    # type = 'twitter_food'
    init_messages = []

    await twitter_dao.save_chatgpt_base_info(data)
    return init_messages


async def add_chatgpt_base_info(data):
    # type = 'twitter_food'
    init_messages = []

    await twitter_dao.add_chatgpt_base_info(data)
    return init_messages


async def get_score_by_user_comment_id(comment_uid):
    score = None
    post_comment = await get_post_comment_by_comment_uid(comment_uid)
    if post_comment is None:
        return None
    author_id = post_comment['author_id']
    create_time = post_comment['create_time']
    try:
        # 查询当天用户的前5条食物推文
        start_of_day = datetime(create_time.year, create_time.month, create_time.day)
        end_of_day = start_of_day + timedelta(days=1) - timedelta(seconds=1)
        post_comments = await twitter_dao.find_current_date_post_comments_by_user_id(author_id=author_id, status=2, page_no=1, page_size=5
                                                                     ,start_time=start_of_day, end_time=end_of_day)
        if len(post_comments) < 5:
            score = 5
        else:
            for post_comment in post_comments:
                p_comment_uid = post_comment['comment_uid']
                if comment_uid == p_comment_uid:
                    score = 5
                    break
    except Exception as e:
        logger.error('get comment_uid = {}, score error {}', comment_uid, e)
    return score


async def get_post_detail(comment_uid, user_id=None):
    post_data = None
    comment_data = None
    if comment_uid is not None:
        comment_data = await twitter_dao.get_comment_by_comment_uid(comment_uid)
    if comment_data is not None:
        post_data = parse_comment_detail(comment_data)
        annotation_data = None
        if user_id is not None:
            annotation_data = await get_annotation_data(user_id, comment_uid)
        post_data['annotation_data'] = annotation_data
    return post_data


async def get_user_post_page(user_id, annotation_user_id=None, page_no=1, page_size=10):
    post_datas = []
    author_id = None
    status = 2
    total = 0
    rel_user = await user_service.get_user_info(rel_type='twitter', user_id=user_id)
    if rel_user is not None:
        author_id = rel_user['rel_id']
    if author_id is not None:
        total = await twitter_dao.get_post_comment_count_by_user_id(author_id=author_id, status=status)
    if total > 0:
        datas = await twitter_dao.find_post_comment_page_by_user_id(
            author_id=author_id, status=status, page_no=page_no, page_size=page_size)
        if len(datas) > 0:
            annotation_user_id_map = {}
            checkin_user_id_map = {}
            if annotation_user_id is not None and annotation_user_id != '':
                comment_uids = []
                for data in datas:
                    comment_uid = data['comment_uid']
                    if comment_uid is not None and comment_uid not in comment_uids:
                        comment_uids.append(comment_uid)
                annotation_user_id_map = await twitter_dao.get_annotation_map_by_user_comment_uids(
                    account_user_id=annotation_user_id, comment_uids=comment_uids, status=1)
                checkin_user_id_map = await checkin_service.get_checkin_map_by_user_comment_uids(comment_uids=comment_uids)
            for data in datas:
                post_data = parse_comment_detail(data)
                if post_data is not None:
                    comment_uid = post_data['comment_uid']
                    annotation_data = None
                    if comment_uid is not None and annotation_user_id_map is not None and comment_uid in annotation_user_id_map:
                        annotation_record = annotation_user_id_map[comment_uid]
                        annotation_data = parse_annotation_data(annotation_record)
                    post_data['annotation_data'] = annotation_data

                    checkin = None
                    if comment_uid is not None and checkin_user_id_map is not None and comment_uid in checkin_user_id_map:
                        checkin = checkin_user_id_map[comment_uid]
                    post_data['checkin'] = checkin

                post_datas.append(post_data)
    count = total
    page_data = {
        'count': count,
        'page_no': page_no,
        'page_size': page_size,
        'list': post_datas
    }

    return page_data


async def get_uid_post_data_detail_map(comment_uids):
    comment_uid_post_map = {}
    if comment_uids is None or len(comment_uids) == 0:
        return comment_uid_post_map

    comment_uid_map = await twitter_dao.get_comment_map_by_comment_uids(comment_uids)
    for comment_uid in comment_uids:
        comment_data = comment_uid_map.get(comment_uid, None)
        if comment_data is None:
            continue
        post_data = parse_comment_detail(data=comment_data)
        comment_uid_post_map[comment_uid] = post_data
    return comment_uid_post_map


def parse_comment_detail(data):
    if data is None:
        return None
    comment_uid = data['comment_uid']
    images = data['images']
    image_url = get_image_url_from_comment_images(images)

    analyze_result = str(data['analyze_result'])
    if analyze_result == "None":
        analyze_result = None
    text = None
    food_items = []
    food_post_score = data['food_post_score']
    if analyze_result is not None and analyze_result.startswith('{') and analyze_result.endswith('}'):
        try:
            analyze_result_data = json.loads(analyze_result)
            if 'tweet' in analyze_result_data:
                text = analyze_result_data['tweet']

            for key_mame in analyze_result_data:
                value = analyze_result_data[key_mame]
                if value is None or value == '' or key_mame == 'eating_time':
                    continue
                try:
                    value = str(value)
                    if value[0].isdigit() and len(value) < 150:
                        key_mame_count = remove_non_digits(value)
                        key_mame_count = key_mame_count.strip()
                        unit = value.replace(key_mame_count, '')
                        if unit is None or unit == '':
                            continue
                        item_data = {'name': key_mame, 'value': key_mame_count, 'unit': unit}
                        food_items.append(item_data)
                except Exception as e:
                    logger.error('parse number value = {}, error {}', value, e)

        except Exception as e:
            logger.error('parse json error {}, {}', analyze_result, e)

    create_time = data['create_time']
    if create_time is not None:
        create_time = date_utils.date_to_timestamp(data['create_time'])

    post_data = {
        'comment_uid': comment_uid,
        'image': image_url,
        'text': text,
        'food_items': food_items,
        'create_time': create_time,
        'food_post_score': food_post_score
    }
    return post_data


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


def remove_non_digits(text):
    # 保留数字
    result = re.sub(r"[^0-9.]", "", text)
    return result


async def submit_annotation(user_id, comment_uid, content, images, category, region, brand, params):
    comment_data = await twitter_dao.get_comment_by_comment_uid(comment_uid)
    if comment_data is None:
        raise BusinessException(400, 'post no exist')

    image_datas = []
    try:
        if len(images) > 0:
            for image in images:
                image_data = {'name': image['name'], 'url': image['url']}
                image_datas.append(image_data)
            images = image_datas
            params['images'] = images
    except Exception as e:
        logger.error('parse images error {}, {}', images, e)
    result = await check_annotation_num(user_id=user_id, comment_uid=comment_uid)
    if result['can_annotation'] == 0:
    #if result is not None:
        raise BusinessException(400, 'Annotation limit reached. Please select other data.')
    account_id = None
    account = await account_service.get_user_info(user_id)
    if account is not None:
        account_id = account['id']
    annotation_record = {
        'account_id': account_id,
        'comment_uid': comment_uid,
        'account_user_id': user_id,
        'category': category,
        'region': region,
        'brand': brand,
        'content': content,
        'images': json.dumps(images),
        'detail': json.dumps(params),
        'status': 0,
        'create_time': datetime.now(timezone.utc)
    }

    db_annotation_record = await twitter_dao.get_annotation_data(user_id, comment_uid)
    if db_annotation_record is not None:
        #raise Exception('annotation record exists')
        annotation_record['id'] = db_annotation_record['id']
        logger.info('user annotation record exists')
        id = db_annotation_record['id']
        await twitter_dao.update_annotation_record(annotation_record)
    else:
        id = await twitter_dao.add_rannotation_record(annotation_record)

    # 调用API 生产结果
    post_content = comment_data['content']
    analyze_result = comment_data['analyze_result']
    repy_text = ''
    if analyze_result is not None and analyze_result.startswith('{') and analyze_result.endswith('}'):
        analyze_result_data = json.loads(analyze_result)
        if 'tweet' in analyze_result_data:
            repy_text = analyze_result_data['tweet']
    post_images = json.loads(comment_data['images'])
    annotation_images = images

    label_texts = []
    if category is not None and category != '':
        label_texts.append(f'Food category: {category}.')
    if region is not None and region != '':
        label_texts.append(f'Region: {region}.')

    if brand is not None and brand != '':
        label_texts.append(f'Brand: {brand}.')
    if content is not None and content != '':
        label_texts.append(f'Description: {content}.')

    annotation_result = await get_score_result(post_images, repy_text, '\n'.join(label_texts), annotation_images, annotation_record)
    status = 1
    if annotation_result['level'] == 1:
        status = 0
    annotation_record = {'id': id,
                         'reason': annotation_result['reason'],
                         'score': annotation_result['score'],
                         'status': status,
                         'level': annotation_result['level'],
                         'result': json.dumps(annotation_result)

        }
    await twitter_dao.update_annotation_record(annotation_record)

    annotation_record_id = id
    await account_reward_service.record_annotation_score(annotation_record_id)

    return annotation_result


async def get_score_result(post_images, raw_response, label_text, annotation_images, annotation_record):

    #raw_imgs: [], raw_response: str, label_text: str, label_imgs: []
    raw_imgs = []
    label_imgs = []
    for post_image in post_images:
        raw_imgs.append(post_image['url'])
    for annotation_image in annotation_images:
        label_imgs.append(annotation_image['url'])

    messages = []
    reply_text, messages = await point_openai_service.evaluate_annotation(
        raw_imgs, raw_response, label_text, label_imgs
    )
    json_data = None
    if reply_text is not None and len(reply_text) > 0:
        json_data = json.loads(reply_text[reply_text.find('{'):reply_text.rfind('}') + 1])

    if json_data is None:
        return None

    result = json_data
    score = None
    level = result['level']
    if level == 1:
        score = 0
    elif level == 2:
        score = 10
    elif level == 3:
        score = 50
    elif level == 4:
        score = 100
    elif level == 5:
        score = 200

    result['score'] = score
    chartgpt_record = None
    if reply_text is not None:
        remarks = None
        chartgpt_record = {'uid': None, 'comment_uid': annotation_record['comment_uid'], 'url': None
            , 'videos': None, 'images': None, 'status': 1, 'request_content': json.dumps(messages)
            , 'response_content': reply_text, 'response_status': 0
            , 'remarks': remarks, 'create_time': datetime.now(timezone.utc), 'type': 'annotation'
                           }
    if chartgpt_record is not None:
        await chartgpt_record_save(chartgpt_record)
    return result


async def get_annotation_record_count_by_user_id(user_id, comment_uid):
    annotation_record = await twitter_dao.get_annotation_data(user_id, comment_uid)
    return annotation_record


async def get_annotation_enable(user_id, comment_uid):
    annotation_data = None
    result = await check_annotation_num(user_id, comment_uid)
    return result


async def check_annotation_num(user_id, comment_uid):
    can_annotation = 1
    num = 0
    if comment_uid is not None:
        annotation_records = await twitter_dao.get_annotations_by_comment_uid(comment_uid=comment_uid, status=1)
        for annotation_record in annotation_records:
            level = annotation_record['level']
            account_user_id = annotation_record['account_user_id']
            if user_id == account_user_id:
                can_annotation = 0
            if level == 1:
                continue
            num += 1
        if num >= 3:
            can_annotation = 0
    else:
        can_annotation = 0

    return {'can_annotation': can_annotation, 'num': num}


async def get_annotation_data(user_id, comment_uid):
    annotation_data = None
    annotation_record = await twitter_dao.get_annotation_data(user_id=user_id, comment_uid=comment_uid, status=1)
    annotation_data = parse_annotation_data(annotation_record)
    return annotation_data


def parse_annotation_data(annotation_record):
    annotation_data = None
    if annotation_record is not None:
        image_str = annotation_record['images']
        images = []
        if image_str is not None:
            try:
                images = json.loads(image_str)
            except Exception as e:
                logger.error('parse json error {}', image_str, e)
        create_time = annotation_record['create_time']
        create_time = date_utils.date_to_timestamp(create_time)
        annotation_data = {
            'id': annotation_record['id'],
            'category': annotation_record['category'],
            'region': annotation_record['region'],
            'brand': annotation_record['brand'],
            'score': annotation_record['score'],
            'content': annotation_record['content'],
            'images': images,
            'reason': annotation_record['reason'],
            'level': annotation_record['level'],
            'create_time': create_time
        }
    return annotation_data


async def get_annotation_result_page(user_id, page_no, page_size):
    annotation_datas = []
    status = 1
    total = 0
    if user_id is not None:
        total = await twitter_dao.get_annotation_record_count_by_user_id(user_id=user_id, status=status)
    if total > 0:
        datas = await twitter_dao.find_annotation_record_page_by_user_id(
            user_id=user_id, status=status, page_no=page_no, page_size=page_size)
        if len(datas) > 0:
            comment_uids = []
            for data in datas:
                comment_uids.append(data['comment_uid'])
            comment_uid_map = await twitter_dao.get_comment_map_by_comment_uids(comment_uids)
            for annotation_record in datas:
                comment_uid = annotation_record['comment_uid']
                comment_data = None
                if comment_uid in comment_uid_map:
                    comment_data = comment_uid_map[comment_uid]
                annotation_result = parse_annotation_detail(comment_data, annotation_record)
                if annotation_result is not None:
                    annotation_datas.append(annotation_result)
    count = total
    page_data = {
        'count': count,
        'page_no': page_no,
        'page_size': page_size,
        'list': annotation_datas
    }

    return page_data


async def get_annotation_result(user_id, comment_uid):
    annotation_result = None
    if user_id is not None and comment_uid is not None:
        annotation_record = await get_annotation_record_count_by_user_id(user_id, comment_uid)
        comment_data = await twitter_dao.get_comment_by_comment_uid(comment_uid)
        annotation_result = parse_annotation_detail(comment_data, annotation_record)
    return annotation_result


def parse_annotation_detail(comment_data, annotation_record):
    post_data = parse_comment_detail(comment_data)
    if post_data is not None and annotation_record is not None:
        annotation_data = parse_annotation_data(annotation_record)
        post_data['annotation_data'] = annotation_data
    return post_data


if __name__ == '__main__':
    comments = asyncio.run(get_comment_historys(comment_uid=1865375686355279985))
    if len(comments) > 0:
        for comment in comments:
            print(comment)
