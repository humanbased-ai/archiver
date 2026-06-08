
from dao import system_config_dao
from log import logger
from models.param_info import ConfigParam
from utils import redisUtils
import json
import setting


async def get_configs():
    configs = await system_config_dao.get_configs()
    return configs


async def get_config_map():
    config_map = {}
    configs = await system_config_dao.get_configs()
    if len(configs) > 0:
        for config in configs:
            config_map[config['name']] = config
    return config_map


async def get_config(name):
    config = await system_config_dao.get_config(name)
    return config


async def get_config_value_by_key(name):
    value = None
    config = await system_config_dao.get_config(name)
    if config is not None:
        value = config['value']
    return value


async def get_config_data_type_value_by_key(name):
    value = None
    config = await system_config_dao.get_config(name, status=1)
    if config is not None:
        value = config['value']
        data_type = config['data_type']
        if data_type is not None:
            try:
                if data_type == 'int':
                    value = int(value)
                if data_type == 'float':
                    value = float(value)
                if data_type == 'bool':
                    value = bool(value)
                if data_type == 'json':
                    value = json.loads(value)
                else:
                    value = str(value)
            except Exception as e:
                logger.error('parse data_type = {}, value = {}, error = {}', data_type, value, e)

    return value


async def get_config_data_type_value_from_redis_by_key(config_key: str, expire: int = 60):
    value = None
    if setting.RUN_ENV == 'dev':
        value = await get_config_data_type_value_by_key(config_key)
    else:
        redis_key = f'app_config:{config_key}'
        try:
            value = await redisUtils.getData(redis_key)
        except Exception as e:
            logger.error(f"get {redis_key} from redis error = {e}")
        if value is None or value == '':
            value = await get_config_data_type_value_by_key(config_key)
            if value is not None:
                try:
                    await redisUtils.setData(redis_key, value, expire)
                except Exception as e:
                    logger.error(f"save {redis_key} to redis error = {e}")
    return value


async def get_by_id(id):
    data = None
    if id is not None:
        data = await system_config_dao.get_config_by_id(id)
    return data


async def save_config(config):
    await system_config_dao.save_config(config)
    redis_key = None
    try:
        config_key = config['name']
        redis_key = f'app_config:{config_key}'
        await redisUtils.delData(redis_key)
    except Exception as e:
        logger.error(f"delData {redis_key} to redis error = {e}")
    return "success"


async def find_config_page(param: ConfigParam):
    name = param.name
    type = param.type
    data_type = param.data_type
    status = param.status
    page_no = param.page_no
    page_size = param.page_size

    row_datas = []
    total = await system_config_dao.get_config_count(name=name, type=type, data_type=data_type, status=status)
    if total > 0:
        datas = await system_config_dao.find_config_page(name=name, type=type, data_type=data_type
                                                         , status=status
                                                         , page_no=page_no, page_size=page_size)
        if len(datas) > 0:
            for data in datas:

                row_datas.append(data)
    page_data = {
        'count': total,
        'pageNo': page_no,
        'pageSize': page_size,
        'list': row_datas
    }

    return page_data


async def get_base_data():

    types = []
    data_types = []
    datas = await system_config_dao.get_configs(status=None)
    if len(datas) > 0:
        for data in datas:
            sys_type = data['type']
            if sys_type is not None and sys_type != '' and sys_type not in types:
                types.append(sys_type)
                data_types.append({'id': sys_type, 'name': sys_type})
    result = {
        'types': data_types
    }
    return result

