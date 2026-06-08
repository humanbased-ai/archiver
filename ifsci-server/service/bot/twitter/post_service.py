import requests
import os
import json
import asyncio
from log import logger
import datetime
from dao import twitter_dao


# Get the Twitter user you want to check
async def get_need_push_comment_users():

    users = await twitter_dao.get_users(1)

    return users


async def get_user_by_author_id(author_id):
    user = await twitter_dao.get_user_by_author_id(author_id)
    return user


async def get_user_by_user_name(user_name):
    user = await twitter_dao.get_user_by_user_name(user_name)
    return user


# Get the posts that need to automatically reply to comments
async def get_posts():

    posts = await twitter_dao.get_posts(1)

    return posts


async def get_post_by_uid(uid):

    post_data = await twitter_dao.get_post_by_uid(uid)

    return post_data


async def get_post_detail_by_uid(uid):

    post_data = await twitter_dao.get_post_detail_by_uid(uid)

    return post_data


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


# Record new comments on the post
async def record_comment(comment_data):

    await twitter_dao.post_comment_save(comment_data)


# Bulk save replies
async def record_comments(comment_datas):
    await twitter_dao.batch_post_comment(comment_datas)


async def chartgpt_record_save(data):

    await twitter_dao.chartgpt_record_save(data)


# Query comment history based on the last comment
async def get_comment_historys(select_comment_uid):
    historys = []
    last_post_comment = await twitter_dao.get_comment_by_comment_uid(select_comment_uid)
    if last_post_comment is None:
        return historys
    parent_user_id = last_post_comment['parent_user_id']
    parent_comment_uid = last_post_comment['parent_comment_uid']
    author_id = last_post_comment['author_id']
    uid = last_post_comment['uid']

    post_comments = await twitter_dao.get_comments_by_author_id_and_parent_user_id(uid, author_id, parent_user_id)
    if len(post_comments) == 0:
        historys.append(last_post_comment)
        return historys

    # Parse the comment history list
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


# Recursive query parent
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


async def get_user_post_page(user_id, page_no, page_size):
    # TODO
    post_datas = []

    post_data = {
        'image': 'https://pbs.twimg.com/media/GgqgcxabUAAziOm.jpg',
        'text': 'xxx',
        'food_items': [
            {'name': 'calories', 'value': '650', 'unit': 'g'},
            {'name': 'fat', 'value': '35', 'unit': 'g'},
            {'name': 'carbs', 'value': '50', 'unit': 'g'},
            {'name': 'protein', 'value': '30', 'unit': 'g'},
        ]
        , 'create_time': int(datetime.now().timestamp())

    }

    post_datas.append(post_data)
    count = 10
    page_data = {
        'count': count,
        'page_no': page_no,
        'page_size': page_size,
        'list': post_datas
    }

    return page_data


if __name__ == '__main__':
    comments = asyncio.run(get_comment_historys(select_comment_uid=1865375686355279985))
    if len(comments) > 0:
        for comment in comments:
            print(comment)



