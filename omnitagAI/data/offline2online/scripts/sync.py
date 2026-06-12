import os
import sys
import json
from util import Bigquery2MySQL


job_config_file = sys.argv[1]
db_config_file = sys.argv[2]


with open(db_config_file, 'r') as db_config_file, open(job_config_file, 'r') as job_file:
    db_config = json.load(db_config_file)
    job_config = json.load(job_file)
    b2m = Bigquery2MySQL(db_config['host'], db_config['user'], db_config['password'], db_config['mysqldb'])
    b2m.process(job_config)