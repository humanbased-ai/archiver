# Database utilities
import datetime
import hashlib
import json
import threading
import warnings
from contextlib import contextmanager
from decimal import Decimal
from functools import wraps
from json import JSONEncoder
from urllib.parse import urlparse, parse_qsl, parse_qs
from log import logger
import time
import pymysql
from dbutils.pooled_db import PooledDB

warnings.filterwarnings("ignore")


class DBM():

    def __init__(self, dbUrl):
        if not dbUrl:
            raise ValueError("Database URL is required")
        
        # Parse the database URL
        result = urlparse(dbUrl)
        
        # Extract database name from path
        db_name = result.path.lstrip('/')
        if '?' in db_name:
            db_name = db_name.split('?')[0]
            
        # Build connection parameters
        connect_kwargs = {
            'db': db_name,
            'host': result.hostname or 'localhost',
            'port': result.port or 3306,
        }
        
        # Add username and password if provided
        if result.username:
            connect_kwargs['user'] = result.username
        if result.password:
            connect_kwargs['passwd'] = result.password
        
        # Parse query parameters
        if result.query:
            query_params = parse_qs(result.query)
            for key, values in query_params.items():
                if key == 'charset':
                    connect_kwargs['charset'] = values[0]
                elif key == 'maxsize':
                    connect_kwargs['maxconnections'] = int(values[0])
        
        self.pool = PooledDB(pymysql, 1, **connect_kwargs)
        self.transaction_map = {}

    def __parseresult_to_dict(self, parsed):
        # Parse database connection string
        path_parts = parsed.path[1:].split('?')
        query = parsed.query
        connect_kwargs = {'db': path_parts[0]}
        if parsed.username:
            connect_kwargs['user'] = parsed.username
        if parsed.password:
            connect_kwargs['passwd'] = parsed.password
        if parsed.hostname:
            connect_kwargs['host'] = parsed.hostname
        if parsed.port:
            connect_kwargs['port'] = parsed.port

        # Get additional connection args from the query string
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
        if 'maxsize' in connect_kwargs:
            connect_kwargs['maxconnections'] = connect_kwargs.pop('maxsize')
        return connect_kwargs

    def __get_connection(self):
        # Get database connection from pool
        tid = threading.get_ident()
        if tid in self.transaction_map:
            return self.transaction_map.get(tid)
        else:
            return self.pool.connection()

    def __close_connection(self, conn):
        # Return connection to pool
        tid = threading.get_ident()
        if tid in self.transaction_map:
            return
        else:
            conn.close()

    @contextmanager
    def dbp(self):
        # Database method context manager
        f = self.__get_connection()
        yield f
        self.__close_connection(f)

    # Database connection manager
    #

    def execute_sql(self, sql, params=None):
        # Execute SQL query
        with self.dbp() as db:
            c = db.cursor()
            c.execute(sql, params)
            db.commit()
            c.close()

    def execute_sql_list(self, sqls):
        # Execute multiple SQL statements
        with self.dbp() as db:
            c = db.cursor()
            for sql in sqls:
                c.execute(sql)
            db.commit()
            c.close()

    def __get_obj_list_sql(self, obj_list, table, replace=True):
        # Generate SQL and parameters for object insertion
        if obj_list:
            obj = obj_list[0]
            keys = list(map(lambda x: f"`{x}`", obj.keys()))
            values = list(map(lambda x: "%s", obj.keys()))
            if replace:
                sql = f"""replace INTO `{table}` ({",".join(keys)}) VALUES ({",".join(values)})"""
            else:
                sql = f"""insert IGNORE INTO `{table}` ({",".join(keys)}) VALUES ({",".join(values)})"""
            params = []
            for obj in obj_list:
                params.append(tuple(obj.values()))
            return sql, params
        else:
            return "", []

    def __get_obj_update_sql(self, obj, table, key):
        # Generate SQL and parameters for object update
        key_sql = f"where {key}='{obj[key]}'"
        del obj[key]
        keys = list(map(lambda x: f"`{x}`=%s", obj.keys()))
        sql = f"""update  `{table}` set {",".join(keys)} """ + key_sql
        params = tuple(obj.values())
        return sql, params

    def sql_to_dict(self, sql, params=None):
        start_time = time.time()
        try:
            # Execute SQL query and return results as dictionary list
            with self.dbp() as db:
                c = db.cursor()
                c.execute(sql, params)
                ncols = len(c.description)
                colnames = [c.description[i][0] for i in range(ncols)]
                db_list = c.fetchall()
                ret_list = []
                for row in db_list:
                    d = Map()
                    for i in range(ncols):
                        if isinstance(row[i], bytes) and len(row[i]) == 1:
                            d[colnames[i]] = True if row[i] == b'\x01' else False
                        else:
                            d[colnames[i]] = row[i]
                    ret_list.append(d)
                c.close()
                return ret_list
        finally:
            total_use_time = time.time() - start_time
            logger.info('sql_to_dict  usetime= {}ms, params = {}, sql = {}', int(total_use_time*100)/100, params, sql)

    def start_transaction(self):
        # Begin database transaction
        conn = self.__get_connection()
        conn.autocommit = False
        tid = threading.get_ident()
        self.transaction_map[tid] = conn
        return tid

    def end_transaction(self, rockback=False):
        # End database transaction
        tid = threading.get_ident()
        conn = self.transaction_map.pop(tid)
        try:
            if rockback:
                conn.rollback()
            else:
                conn.commit()
        finally:
            conn.close()

    @contextmanager
    def transaction_code(self):
        # Database transaction context manager
        f = self.start_transaction()
        try:
            yield f
            self.end_transaction()
        except Exception:
            self.end_transaction(True)

    # Transaction
    def transaction(self, target_function):
        # Database transaction decorator
        @wraps(target_function)
        def wrapper(*args, **kwargs):
            self.start_transaction()
            ret = target_function(*args, **kwargs)
            self.end_transaction()
            return ret

        return wrapper

    def insert(self, obj, table, replace=False):
        # Insert object
        (sql, params) = self.__get_obj_list_sql([obj], table, replace)
        with self.dbp() as db:
            c = db.cursor()
            c.execute(sql, params[0])
            db.commit()
            lid = c.lastrowid
            c.close()
            return lid

    def update(self, obj, table, key="id"):
        # Update object
        (sql, params) = self.__get_obj_update_sql(obj, table, key)
        with self.dbp() as db:
            c = db.cursor()
            c.execute(sql, params)
            db.commit()
            c.close()

    def inserts(self, obj_list, table, replace=False):
        # Batch insert objects
        if obj_list:
            (sql, params) = self.__get_obj_list_sql(obj_list, table, replace)
            with self.dbp() as db:
                c = db.cursor()
                c.executemany(sql, params)
                db.commit()
                c.close()

    def get_table_desc(self, table):
        datas = self.sql_to_dict(f"show full fields  from `{table}`")
        ret_data = []
        for v in datas:
            ret_data.append(Map({"name": v.Field, "type": v.Type, "commnet": v.Comment}))
        return ret_data


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
        elif isinstance(obj, datetime.date):
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
