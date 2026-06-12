from google.cloud import bigquery
from io import StringIO
import google.cloud.storage
import pymysql
import json
import csv

class Bigquery2MySQL:

    def __init__(self, host, user, password, db='omnitags_db'):
        self.user = user
        self.password = password
        self.db = db
        self.connection = pymysql.connect(host=host, user=user, password=password, db=db)
        self.bigquery_client = bigquery.Client()

    def insert(self,
               bigquery_table_name,
               mysql_table_name,
               bigquery_columns: list,
               columns: list,
               columns_info: dict,
               condition = None):
        query = f"SELECT {','.join(bigquery_columns)} FROM {bigquery_table_name}"
        if condition is not None and condition != "":
            query += f""" WHERE {condition} """
        query_job = self.bigquery_client.query(query)
        results = query_job.result()
        cnt = 0
        with self.connection.cursor() as cursor:
            for row in results:
                cnt = cnt + 1
                sql = f"INSERT INTO {mysql_table_name} ({', '.join(columns)}) VALUES " \
                    f"({', '.join(['%s' for _ in range(len(columns))])})"
                value_list = list()
                for i in range(len(columns)):
                    if columns_info[columns[i]] == "json":
                        json_str = row[i]
                        if json_str:
                            try:
                                json_obj = json.loads(row[i])
                            except json.JSONDecodeError:
                                json_obj = None
                            value_list.append(json.dumps(json_obj))
                        else:
                            value_list.append(None)
                    else:
                        value_list.append(row[i])
                cursor.execute(sql, value_list)
                print(sql)
                print(value_list)
        self.connection.commit()
        print(f"{cnt} data insert into {mysql_table_name} from {bigquery_table_name} successfully.")

    def update(self,
               bigquery_table_name,
               mysql_table_name,
               bigquery_columns: list,
               columns: list,
               columns_info: dict,
               bigquery_table_key_index: int,
               mysql_table_key_index: int,
               condition = ""):

        query = f"""SELECT {','.join(bigquery_columns)}, {bigquery_columns[bigquery_table_key_index]} FROM {bigquery_table_name}"""
        if condition is not None and condition != "":
            query += f""" WHERE {condition} """
        query_job = self.bigquery_client.query(query)
        results = query_job.result()
        cnt = 0
        with self.connection.cursor() as cursor:
            for row in results:
                cnt = cnt + 1
                sql = f"""
                        UPDATE {mysql_table_name}
                        SET {', '.join(['%s'%col + '=%s'for col in columns])}
                        WHERE {bigquery_columns[mysql_table_key_index]} = %s;
                    """
                value_list = list()
                for i in range(len(columns)):
                    if columns_info[columns[i]] == "json":
                        json_str = row[i]
                        if json_str:
                            try:
                                json_obj = json.loads(row[i])
                            except json.JSONDecodeError:
                                json_obj = None
                            value_list.append(json.dumps(json_obj))
                        else:
                            value_list.append(None)
                    else:
                        value_list.append(row[i])
                value_list.append(row[bigquery_table_key_index])
                cursor.execute(sql, value_list)
        self.connection.commit()
        print(f"{cnt} data updated {mysql_table_name} from {bigquery_table_name} successfully.")

    def parse_job_config(self, job):
        job_type = job['job_type']
        bigquery_table_name = job['bigquery_table']
        mysql_table_name = job['mysql_table']
        bigquery_columns = job['bigquery_columns']
        columns = job['columns']
        columns_info = job['columns_info']
        bigquery_table_key = None
        mysql_table_key = None
        if job_type == "update":
            bigquery_table_key = job['bigquery_table_key']
            mysql_table_key = job['mysql_table_key']
        condition = None
        if 'condition' in job:
            condition = job['condition']
        return job_type, bigquery_table_name, mysql_table_name, bigquery_columns, columns, columns_info, bigquery_table_key, mysql_table_key, condition

    def process(self, jobs):
        for job in jobs['job_list']:
            job_type, bigquery_table_name, mysql_table_name, bigquery_columns, columns, columns_info, bigquery_table_key, mysql_table_key, condition = self.parse_job_config(job)
            if job_type == 'update':
                self.update(bigquery_table_name, mysql_table_name, bigquery_columns, columns, columns_info, bigquery_table_key, mysql_table_key, condition)
            elif job_type == 'insert':
                self.insert(bigquery_table_name, mysql_table_name, bigquery_columns, columns, columns_info, condition)
            else:
                pass

    def query(self, sql):
        with self.connection.cursor() as cursor:
            query = sql
            cursor.execute(query)
            results = cursor.fetchall()
            for row in results:
                print(row)
