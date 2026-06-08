from pymongo import MongoClient
import os

async def getDB():
    # 测试环境
    # uri = 'mongodb://<INTERNAL_IP_REDACTED>:27017/'
    uri = 'mongodb://<USER>:<REDACTED>@<MONGO_HOST_REDACTED>/admin?replicaSet=<REDACTED>'

    # MongoDB 连接字符串
    # uri = os.getenv('db.url',
    #                    'mongodb://<USER>:<REDACTED>@<MONGO_HOST_REDACTED>/admin?replicaSet=<REDACTED>'),

    # 创建 MongoClient 实例
    client = MongoClient(uri)

    # 获取数据库实例
    db = client['annotation']
    return db