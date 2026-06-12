import os
import sys
import json
from util import Bigquery2MySQL


job_config_file = sys.argv[1]
db_config_file = sys.argv[2]

job_config = json.loads(job_file)
db_config = json.loads(db_config_file)

b2m = Bigquery2MySQL(db_config['user'], db_config['password'], db_config['unix_socket'], db_config['mysqldb'])
b2m.process(job_config)