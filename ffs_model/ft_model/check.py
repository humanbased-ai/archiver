import os
from dotenv import load_dotenv

from openai import OpenAI

load_dotenv()

open_ai_key = os.environ.get('OPEN_AI_KEY')
client = OpenAI(api_key=open_ai_key)

# List 10 fine-tuning jobs
# print(client.fine_tuning.jobs.list(limit=1))

# Retrieve the state of a fine-tune
print(client.fine_tuning.jobs.retrieve("ftjob-aXlTCF150WGtyycmA2s45bTJ"))

# # Retrieve the state of a fine-tune
# client.fine_tuning.jobs.retrieve("ftjob-abc123")