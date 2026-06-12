#!/bin/bash

cd /home/ryjiangx_hotmail_com/omnitagAI/data/offline2online/scripts
python sync.py jobs/test/ot_user_reputation.json  config/db_test.json  
python sync.py jobs/test/ot_s2_validate_result.json  config/db_test.json 
python sync.py jobs/test/ot_s3_validate_result.json  config/db_test.json 
python sync.py jobs/test/ot_validation_reflow_result.json  config/db_test.json 


