import os
import sys
import json
from util import Bigquery2MySQL

with open('config/db_test.json') as db_config_file:
    db_config = json.load(db_config_file)
    b2m = Bigquery2MySQL(db_config['host'], db_config['user'], db_config['password'], db_config['mysqldb'])
    b2m.query("select * from ot_user_reputation where user_id='abc'")