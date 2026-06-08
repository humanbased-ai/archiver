from setting import Map, dbUrl, redisUrl
import setting
import abc
import asyncio
import threading
import time
import traceback
import warnings
from contextlib import asynccontextmanager
from contextvars import ContextVar
from functools import wraps
from urllib.parse import urlparse, parse_qsl

import aiomysql
import redis


warnings.filterwarnings("ignore")


def __parse_result_to_dict(parsed):
    path_parts = parsed.path[1:].split('?')
    query = parsed.query
    connect_kwargs = {'db': path_parts[0]}
    if parsed.username:
        connect_kwargs['user'] = parsed.username
    if parsed.password:
        connect_kwargs['password'] = parsed.password
    if parsed.hostname:
        connect_kwargs['host'] = parsed.hostname
    if parsed.port:
        connect_kwargs['port'] = parsed.port

    qs_args = parse_qsl(query, keep_blank_values=True)
    for key, value in qs_args:
        if value.lower() == 'false':
            value = False
        elif value.lower() == 'true':
            value = True
        elif value.isdigit():
            value = int(value)
        elif '.' in value and all(p.isdigit() for p in value.split('.', 1)):
            try:
                value = float(value)
            except ValueError:
                pass
        elif value.lower() in ('null', 'none'):
            value = None
        connect_kwargs[key] = value

    return connect_kwargs


_transaction_connection_var: ContextVar = ContextVar(
    'transaction_connection_var', default=None)
_transaction_connection_has_tran: ContextVar = ContextVar(
    '_transaction_connection_has_tran', default=0)


async def __dbp():
    # 数据库连接
    global pool
    if "pool" not in vars() or not pool:
        connect_kwargs = __parse_result_to_dict(urlparse(dbUrl))
        pool = await aiomysql.create_pool(loop=asyncio.get_event_loop(), autocommit=True, **connect_kwargs)
    return pool

async def __redis():
    global redis_pool
    exist_flag = "redis_pool" in globals()
    if exist_flag:
        return redis_pool
    else:
        redis_port = 6379
        if ':' in setting.redisUrl:
            redisUrls = setting.redisUrl.split(':')
            redis_host = redisUrls[0]
            redis_port = redisUrls[1]
        else:
            redis_host = setting.redisUrl
        redis_pool = redis.ConnectionPool(host=redis_host, port=redis_port, db=0)

    return redis_pool

async def redis_client():

    redis_client = None
    if setting.redisType is None or '1' == setting.redisType:
        redis_pool_p1 = await __redis()
        redis_client = redis.Redis(connection_pool=redis_pool_p1)
    else:
        redisUrls = setting.redisClusterUrl.split(':')
        redis_host = redisUrls[0]
        redis_port = redisUrls[1]
        nodes = [{"host":redis_host, "port":redis_port}]
        global redis_cluster_pool
        if "redis_cluster_pool" in globals():
            redis_client = redis_cluster_pool
        '''else:
            redis_cluster_pool = RedisCluster(startup_nodes=nodes, skip_full_coverage_check=True, decode_responses=True)
            redis_client = redis_cluster_pool'''
    return redis_client


@asynccontextmanager
async def dbc():
    f = await get_connection()
    yield f
    await close_connection(f)


async def get_connection():
    transaction_conn = _transaction_connection_var.get()
    if transaction_conn:
        return transaction_conn
    else:
        return await (await __dbp()).acquire()


async def close_connection(conn):
    if _transaction_connection_var.get():
        return
    else:
        conn.close()


async def execute_sql(sql, *args, **kwargs):
    """执行sql
        execute_sql("update wallet set money=money+? where uid=?",10,1)
    """
    async with dbc() as db:
        c = await db.cursor()
        if kwargs and args:
            raise Exception("不支持同时传入列表和命名")
        if kwargs:
            await c.execute(sql, kwargs)
        else:
            if len(args) == 1:
                if isinstance(args[0], tuple) or isinstance(args[0], dict):
                    args = args[0]
            await c.execute(sql, args)
        await c.close()
        sql = sql.lower()
        if sql.startswith("insert") or sql.startswith("REPLACE INTO".lower()):
            return c.lastrowid


async def execute_sql_list(sql_list):
    """批量执行sql语句"""
    async with dbc() as db:
        c = await db.cursor()
        for sql in sql_list:
            await c.execute(sql)
        await c.close()


def __get_obj_update_sql(obj, table, key):
    # 获取对象插入sql以及对应参数
    key_sql = f"where {key}='{obj[key]}'"
    del obj[key]
    keys = list(map(lambda x: f"`{x}`=%s", obj.keys()))
    sql = f"""update  `{table}` set {",".join(keys)} """ + key_sql
    params = tuple(obj.values())
    return sql, params


def __get_obj_list_sql(obj_list, table, replace=True):
    if obj_list:
        obj = obj_list[0]
        values = ['%s' for x in obj.values()]
        if replace:
            sql = f"""REPLACE INTO {table} ({",".join(obj.keys())}) VALUES ({",".join(values)})"""
        else:
            sql = f"""INSERT INTO {table} ({",".join(obj.keys())}) VALUES ({",".join(values)})"""
        params = []
        for obj in obj_list:
            params.append(tuple(obj.values()))
        return sql, params
    else:
        return "", []


def __get_obj_sql(obj, table, replace=True):
    values = ['%s' for x in obj.values()]
    if replace:
        sql = f"""REPLACE INTO {table} ({",".join(obj.keys())}) VALUES ({",".join(values)})"""
    else:
        sql = f"""INSERT INTO {table} ({",".join(obj.keys())}) VALUES ({",".join(values)})"""
    return sql, tuple(obj.values())


async def get_db_now():
    db_time = await sql_to_dict("select now() as time")
    return db_time[0].time


async def get_timestamp():
    db_time = await sql_to_dict("SELECT UNIX_TIMESTAMP() as time")
    return db_time[0].time


async def sql_to_dict(sql, *args, **kwargs):
    """ 查询sql，输出dict 列表
            db_list=sql_to_dict("select * from users")

        pass `sql_params` to sql to modify sql query.
        depends on style of argument placeholder in query,
        sql_params can be either in `dict` or `list|tuple`

        Examples:
        --------
        status = "active"

        # customized style (we recommend this)
        db_list = sql_to_dict(
            "select * from users where status=%(status)s", status=status)

        db_list = sql_to_dict(
            "select * from users where status=%s", status)

    :return List[Map]
    """
    async with dbc() as db:
        c = await db.cursor()
        if kwargs and args:
            raise Exception("不支持同时传入列表和命名")
        if kwargs:
            await c.execute(sql, kwargs)
        else:
            if len(args) == 1:
                if isinstance(args[0], tuple) or isinstance(args[0], dict):
                    args = args[0]

            await c.execute(sql, args)

        ncols = len(c.description)
        colnames = [c.description[i][0] for i in range(ncols)]
        db_list = await c.fetchall()
        ret_list = []
        for row in db_list:
            d = Map()
            for i in range(ncols):
                d[colnames[i]] = row[i]
            ret_list.append(d)
        await c.close()
        return ret_list


async def insert(obj, table):
    """插入对象,返回id(如果有的话)
        last_uid=insert(Map(name=name,sex=sex),"users")
        last_uid=insert({"name":"珂珂"} "users")
    :return Map
    """
    async with dbc() as db:
        (sql, params) = __get_obj_sql(obj, table)
        c = await db.cursor()
        await c.execute(sql, params)
        lid = c.lastrowid
        await c.close()
        return lid


async def insert_replace(obj, table, replace):
    """插入对象,返回id(如果有的话)
        last_uid=insert(Map(name=name,sex=sex),"users")
        last_uid=insert({"name":"珂珂"} "users")
    :return Map
    """
    async with dbc() as db:
        (sql, params) = __get_obj_sql(obj, table, replace)
        c = await db.cursor()
        await c.execute(sql, params)
        lid = c.lastrowid
        await c.close()
        return lid


async def update(obj, table, key="id"):
    """更新数据
        update({"id":1,"name":"珂珂2"},"users")
    """
    async with dbc() as db:
        (sql, params) = __get_obj_update_sql(obj, table, key)
        c = await db.cursor()
        await c.execute(sql, params)
        await c.close()


async def inserts(obj_list, table):
    """批量插入
        insert_list=[{"name":"珂珂1","sex":1},{"name":"珂珂2","sex":0}]
        inserts(insert_list,"users")
    """
    if obj_list:
        async with dbc() as db:
            (sql, params) = __get_obj_list_sql(obj_list, table)
            c = await db.cursor()
            await c.executemany(sql, params)
            await c.close()


async def get(table, id, idstr="id"):
    """数据库单条查询，根据id获取数据
        db_user=get("users",1)
        if db_user is not None:
                print(db_user.name)
    :return Map
    """
    db_data = await sql_to_dict(f"select * from {table} where {idstr}=%s", id)
    if db_data:
        return db_data[0]
    return None


async def get_single(table, where, *args, **kwargs):
    """数据库单条查询，根据where条件获取
    get_single(user, f'a = "{a}" and b="{b}" , 'id asc,name desc')
    默认limit 1
    """
    query_str = f"select * from {table} where {where}"
    db_data = await sql_to_dict(query_str, *args, **kwargs)
    if db_data:
        return db_data[0]
    return None


async def get_list(table, where=None, *args, **kwargs):
    """根据条件返回表中数据，where不传则返回整表锁油数据
    一定要处理where条件中的注入问题
        db_list=get_list("users","sex=1")
        db_list=get_list("users","sex=%s",1)
    :return List[Map]
    """
    if not where:
        return await sql_to_dict(f"select * from {table}")
    return await sql_to_dict(f"select * from {table} where {where}", *args, **kwargs)


async def get_list_and_args(table, args_as, where=None, *args, **kwargs):
    """根据条件返回表中数据，where不传则返回整表锁油数据
    一定要处理where条件中的注入问题
        db_list=get_list("users","sex=1")
        db_list=get_list("users","sex=%s",1)
    :return List[Map]
    """
    if not where:
        return await sql_to_dict(f"select {args_as} from {table}")
    return await sql_to_dict(f"select {args_as} from {table} where {where}", *args, **kwargs)


async def delete(table, where=None, *args, **kwargs):
    if not where:
        sql = f"delete from {table}"
    else:
        sql = f"delete from {table} where {where}"
    await execute_sql(sql, *args, **kwargs)


async def get_map(table, where=None, key="id", *args, **kwargs):
    data_list = await get_list(table, where, *args, **kwargs)
    ret_map = Map()
    for d in data_list:
        ret_map[d[key]] = d
    return ret_map


# 事务
def transaction(target_function):
    # 事务注解
    @wraps(target_function)
    async def wrapper(*args, **kwargs):
        train_value = _transaction_connection_has_tran.get()
        if train_value == 0:
            conn = await get_connection()
            conn.autocommit = False
            await conn.begin()
            _transaction_connection_var.set(conn)
        _transaction_connection_has_tran.set(train_value + 1)
        try:
            ret = await target_function(*args, **kwargs)
            if train_value == 0:
                await conn.commit()
            return ret
        except Exception as e:
            traceback.print_exc()
            train_value = _transaction_connection_has_tran.get()
            if train_value <= 1:  # TODO 测试用例
                await conn.rollback()
            raise e
        finally:
            train_value = _transaction_connection_has_tran.get()
            if train_value == 0:
                _transaction_connection_var.set(None)
                await conn.close()
                _transaction_connection_has_tran.set(0)
            else:
                _transaction_connection_has_tran.set(train_value - 1)

    return wrapper





async def get_table_desc(table):
    """获取数据库字段"""
    db_fields = await sql_to_dict(f"show full fields  from `{table}`")
    return_list = []
    for v in db_fields:
        return_list.append(
            Map({"name": v.Field, "type": v.Type, "commnet": v.Comment}))
    return return_list


class BaseDbModel(Map):
    """基础模型"""

    @classmethod
    @abc.abstractmethod
    def table_name(cls):
        pass

    def __init__(self, *args, **kwargs):
        super(BaseDbModel, self).__init__(*args, **kwargs)

    async def save(self):
        return await insert(self, self.table_name())

    async def save_replace(self, replace):
        return await insert_replace(self, self.table_name(), replace)

    async def update_fields(self, *fields):
        """条件更新，如果没有条件，则有什么字段就更新什么字段"""
        update_obj = Map() if fields else self
        for k in fields:
            update_obj[k] = self[k]
        update_obj[self._get_primary_key()] = self[self._get_primary_key()]
        return await update(update_obj, self.table_name(), self._get_primary_key())

    @classmethod
    async def get_by_id(cls, id_value):
        return cls._change(await get(cls.table_name(), id_value, cls._get_primary_key()))

    @classmethod
    async def where(cls, where_sql: str, *args, **kwargs):
        return cls._change_list(await get_list(cls.table_name(), where_sql, *args, **kwargs))

    @classmethod
    async def single(cls, where_sql: str, *args, **kwargs):
        db_list = await get_list(cls.table_name(), where_sql, *args, **kwargs)
        if db_list:
            return cls._change(db_list[0])
        return None

    @classmethod
    async def all(cls):
        return cls._change_list(await get_list(cls.table_name()))

    @classmethod
    def _change(cls, obj: Map):
        return cls(*[], **obj) if obj else obj

    @classmethod
    def _change_list(cls, datas: list):
        return [cls._change(x) for x in datas]

    @classmethod
    def _get_primary_key(cls):
        for k, v in cls.__dict__.items():
            if isinstance(v, Field) and v.primary_key:
                return k
        return "id"


class Field():
    default: str
    name: str
    length: int
    primary_key: bool
    remark: str
    null: bool
    unique: bool

    def __init__(
            self,
            name=None,
            max_length=None,
            primary_key=False,
            default=None,
            remark=None,
            null=True,
            unique=False):
        """数据库字段"""
        self.name = name
        self.max_length = max_length
        self.primary_key = primary_key
        self.remark = remark
        self.default = default
        self.null = False if primary_key else null
        self.unique = unique


class IntegerField(Field):
    auto_inc: bool

    def __init__(
            self,
            name=None,
            max_length=None,
            primary_key=False,
            default=None,
            remark=None,
            null=True,
            unique=False,
            auto_inc=False):
        super().__init__(name, max_length, primary_key, default, remark, null, unique)
        self.auto_inc = auto_inc


class BigIntegerField(IntegerField):
    pass


class DateTimeField(Field):
    auto_now: bool

    def __init__(
            self,
            name=None,
            max_length=None,
            primary_key=False,
            default=None,
            remark=None,
            null=True,
            unique=False,
            auto_now=False):
        super().__init__(name, max_length, primary_key, default, remark, null, unique)
        self.auto_now = auto_now


class CharField(Field):
    pass


class DecimalField(Field):
    decimal_places: int
    max_digits: int

    def __init__(
            self,
            name=None,
            max_length=None,
            primary_key=False,
            default=None,
            remark=None,
            null=True,
            unique=False,
            decimal_places=6,
            max_digits=10):
        super().__init__(name, max_length, primary_key, default, remark, null, unique)
        self.decimal_places = decimal_places
        self.max_digits = max_digits


class JSONField(Field):
    pass


class FloatField(Field):
    pass


class DoubleField(Field):
    pass


@transaction
async def trins_no_test():
    await insert({"name": "这是测试的key", "value": "234234"}, "oil_setting")
    g = await get_single("oil_setting", "name=%s", "这是测试的key")
    print(g)
    await update({"name": "这是测试的key", "value": "345234234"}, "oil_setting", "name")
    g = await get_single("oil_setting", "name=%s", "这是测试的key")
    print(g)
    raise Exception("")


@transaction
async def trins_yes_test():
    await insert({"name": "这是测试的key2", "value": "234234"}, "oil_setting")
    g = await get_single("oil_setting", "name=%s", "这是测试的key2")
    print(g)
    await trins_yes_test_two()


@transaction
async def trins_yes_test_two():
    await insert({"name": "这是测试的key3", "value": "234234"}, "oil_setting")
    g = await get_single("oil_setting", "name=%s", "这是测试的key3")
    print(g)


async def db_test():
    """调试使用的方法"""
    g = await get_single("oil_setting", "name=%s", "这是测试的key")
    print(g)
    try:
        await trins_no_test()
    except BaseException:
        pass
    g = await get_single("oil_setting", "name=%s", "这是测试的key")
    print(g)
    print("二段测试分割")
    g = await get_single("oil_setting", "name=%s", "这是测试的key2")
    print(g)
    try:
        await trins_yes_test()
    except BaseException:
        traceback.print_exc()
    g = await get_single("oil_setting", "name=%s", "这是测试的key2")
    print(g)
    await execute_sql("delete from  oil_setting where name=%s", "这是测试的key2")
    # u = await  sql_to_dict("select * from oil_setting where id=%s and name=%s", 1, "name")
    # print(u)
    # assert len(u) == 1
    # assert u[0].value == "海马行"
    # u = await  sql_to_dict("select * from oil_setting where  name=%(name)s", name="name")
    # assert len(u) == 1
    # assert u[0].value == "海马行"
    # assert len(u) == 1
    # assert u[0].value == "海马行"
    # print(u)
    # return u
    exit(0)


if __name__ == "__main__":
    """调试入口"""
    asyncio.run(db_test())
    print("run on")
    while (True):
        time.sleep(1)
