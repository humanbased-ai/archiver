import os
from dotenv import load_dotenv

from openai import OpenAI

load_dotenv()

open_ai_key = os.environ.get('OPEN_AI_KEY')
# print(open_ai_key)

client = OpenAI(api_key=open_ai_key)

job = client.fine_tuning.jobs.create(
    # training_file="../data/train_data_0115.jsonl",
    training_file="file-EHz1XZLrnkqvGPuFTdSQPf",
    model="gpt-4o-2024-08-06",
)
