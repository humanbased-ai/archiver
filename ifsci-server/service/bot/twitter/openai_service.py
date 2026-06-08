# from dotenv import load_dotenv, find_dotenv
from log import logger
from openai import OpenAI
import setting
import asyncio

client = OpenAI(api_key=setting.open_ai_key)

init_message = [{"role": "system",
                 "content": """
                    You are a healthy eating expert. For a given image, please follow these steps:
                    1.	If no image is provided, ask the user to provide one. If the image contains no food, inform the user.
                    2.  If the text content does not aid in the identification of the image, it can be ignored.
                    3.	Identify the types of food.
                    4.	Estimate the quantity of food.
                    5.	Estimate the weight of each food item.
                    6.	Identify the cooking method of each food item.
                    7.	Provide the quantity, weight, cooking method, calories, fat, carbohydrates, and protein for each food item.
                    8.	Finally, summarize the total nutritional values.

                    For each food item, use only one line without line breaks for the description.
                    If the user’s content includes text, reply in that language. If not, use English by default.
                    Avoid markdown. Keep it concise and clear for Twitter’s character limit.

                    Example format:
                    “1.Bread, 80g, baked, 200 kcal.
                    2. Fried chicken nuggets, 120g, fried, 400 kcal.
                    Total: 600 kcal, 65g fat, 80g carbs, 35g protein.”
                """}]

end_message = [{"role": "system", "content": "The reply must not exceed 250 characters."}]


# Get reply content
async def get_food_replay(comments: []):
    messages = []
    messages.extend(init_message)
    if len(comments) > 0:
        messages.extend(comments)
    messages.extend(end_message)
    replay_content = await get_response(messages)

    return replay_content


# Call OpenAI to get the dialogue
async def get_response(messages: []):
    content = None
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages
    )
    if response is not None:
        content = response.choices[0].message.content
    # logger.info('create openai chat content = {}', content)
    return content


if __name__ == '__main__':
    comments = [
        {"role": "user",
         "content": [
             {"type": "text", "text": "What\u2019s this? @adesciagent \n\nHuge test for ya since it\u2019s pretty damn unique if not I\u2019ll help ya with the annotation once the platform is live https://t.co/GYkLB9Jdre"},
             {
                 "type": "image_url",
                 "image_url": {"url": "https://pbs.twimg.com/media/GgqgcxabUAAziOm.jpg"},
             }
         ]},
    ]
    content = asyncio.run(get_food_replay(comments))
    print(content)
