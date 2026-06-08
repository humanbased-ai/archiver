import os
from dotenv import load_dotenv
import asyncio
import requests
import uuid
import setting
from service.bot.twitter.gpt4_vision_api import GPT4VisionAPI
from log import logger


load_dotenv()
api_key = setting.open_ai_key
gpt4vision = GPT4VisionAPI(
    openai_api_key=api_key,
    model_name="gpt-4o",
    max_tokens=1000,
    openai_proxy="https://api.openai.com/v1/chat/completions",
)


async def get_response(task: str, image_url: str):
    # Run the GPT4VisionAPI on the image with the specified task

    img_path = download_image(image_url)
    response_data = None
    if os.path.exists(img_path):
        response_data = gpt4vision.run(task, img_path, return_json=True)
        os.remove(img_path)
    logger.info('gpt4vision response = {}', response_data)
    return response_data


def download_image(image_url: str):
    img_code = str(uuid.uuid4())[:20].replace('-', '')
    file_dir = '/tmp/'
    save_path = f'{file_dir}{img_code}.jpg'
    if not os.path.exists(file_dir):
        os.makedirs(file_dir)
    try:
        response = requests.get(image_url, stream=True)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            logger.info(f"download_image success ：{save_path}")
        else:
            logger.error(f"download_image error ：{response.status_code}")
    except requests.RequestException as e:
        logger.error(f"download_image error ：{e}")
    return save_path


if __name__ == '__main__':
    image_url = 'https://pbs.twimg.com/media/GgqgcxabUAAziOm.jpg'
    task = 'What is this image'
    response = asyncio.run(get_response(task, image_url))
    print(response)

