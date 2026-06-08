from __future__ import unicode_literals

import hashlib
import json
import os
import uuid
from datetime import date, datetime
from decimal import Decimal
from json import JSONEncoder
from dotenv import load_dotenv
import sys

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path, verbose=False)

# Database Configuration
dbUrl = os.getenv("DB_URL")

# External Service URLs
larkUrl = os.getenv("LARK_SERVER_URL")
api_timeout = os.getenv("API_TIMEOUT", 2000)
open_ai_key = os.environ.get('OPEN_AI_KEY')
admin_host = os.environ.get('ADMIN_HOST')
config_twitter_user_id = os.environ.get('CONFIG_TWITTER_USER_ID')

# Application Configuration
init_scheduer = os.environ.get('INIT_SCHEDULER', '0')
RUN_ENV = os.environ.get('ENV', 'dev')

# Redis Configuration
redisType = os.getenv("REDIS_TYPE", "1")  # 1 single node, 2 cluster
redisClusterUrl = os.getenv("REDIS_CLUSTER_URL")
redisUrl = os.getenv("REDIS_URL")
redisPrefix = os.getenv("REDIS_PREFIX", "ifsci")
redisExpire = os.getenv("REDIS_EXPIRE", 30*60)


class Map(dict):
    """
    Example:
    m = Map({'first_name': 'Eduardo'}, last_name='Pool', age=24, sports=['Soccer'])
    """

    def __init__(self, *args, **kwargs):
        super(Map, self).__init__(*args, **kwargs)
        for arg in args:
            if isinstance(arg, dict):
                for k, v in arg.items():
                    self[k] = v

        if kwargs:
            for k, v in kwargs.items():
                self[k] = v

    def __getattr__(self, attr):
        return self.get(attr)

    def __setattr__(self, key, value):
        self.__setitem__(key, value)

    def __getstate__(self):
        return self.__dict__

    def __setstate__(self, d):
        self.__dict__.update(d)

    def __setitem__(self, key, value):
        super(Map, self).__setitem__(key, value)
        self.__dict__.update({key: value})

    def __delattr__(self, item):
        self.__delitem__(item)

    def __delitem__(self, key):
        super(Map, self).__delitem__(key)
        del self.__dict__[key]

    def copy(self):
        n = Map(self.__dict__.copy())
        return n


def group_list(l, size):
    lc = l.copy()
    ret = []
    if len(l) > size:
        while len(lc) >= size:
            ret.append(lc[:size])
            lc = lc[size:]
        if len(lc) > 0:
            ret.append(lc)
        return ret
    else:
        return [l]


class MyEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, date):
            return obj.strftime('%Y-%m-%d')
        elif isinstance(obj, Decimal):
            return format(obj, 'f')
        else:
            return super(MyEncoder, self).default(obj)


# class MyDecoder(JSONDecoder):
def set_object_hook(obj):
    if isinstance(obj, dict):
        return Map(obj)
    return obj


def loads(str):
    return json.loads(str, object_hook=set_object_hook, strict=False)


def dumps(obj):
    return json.dumps(obj, cls=MyEncoder, ensure_ascii=False)


def md5(content):
    return hashlib.md5(content.encode(encoding='UTF-8')).hexdigest()


def uuid_str(): return str(uuid.uuid4()).replace("-", "")
