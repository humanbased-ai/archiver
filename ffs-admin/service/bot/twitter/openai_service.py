# from dotenv import load_dotenv, find_dotenv
from log import logger
from openai import OpenAI, AsyncOpenAI
import setting
import asyncio

#client = OpenAI(api_key=setting.open_ai_key)
client = AsyncOpenAI(api_key=setting.open_ai_key)


init_message = [{"role": "system",
                 "content": """
                  You are a healthy eating expert. Based on the provided image and text, follow the steps below to deliver the final results in JSON format, without returning any intermediate results:
                  1.If there is no food in the picture, return {'has_food_image': false}.
                  2.If the text content does not aid in the identification of the image, it can be ignored.
                  3.Identify the time of the user’s meals from the text; the output is in hours using the 24-hour clock format, and if not available, it should be left empty.
                  4.Identify the types of food.
                  5.Estimate the quantity of food.
                  6.Estimate the weight of each food item.
                  7.Identify the cooking method of each food item.
                  8.Provide the quantity, weight, cooking method, calories, fat, carbohydrates, and protein for each food item.
                  9.Finally, summarize the total nutritional values.
                  10.Generate tweet content based on above information, requirement: 
                      1) For each food item, use only one line without line breaks for the description.
                      2) If the user’s content includes text, reply in that language. If not, use English by default.
                      3) Avoid markdown. Keep it concise and clear for Twitter character limit. The reply must not exceed 230 characters.
                      4) Tweet example format: These are sesame-coated rolls, likely fried. They appear to be about six pieces, each roughly 40-50g. Estimated per piece: 200 kcal, 10g fat, 20g carbs, 4g protein. Total: 1200 kcal, 60g fat, 120g carbs, 24g protein.
                  10.Finally, based on the tweet information, just return structured data in JSON format, which needs to include the following fields: has_food_image, eating_time, calories, fat, carbs, protein, tweet. Add measurement units to the calories, fat, carbs, protein field
                """}]

end_message = [{"role": "system",
                "content": "Generate the return result as a JSON, ensuring the “tweet” content within the JSON does not exceed 230 characters."}]


# 获取回复内容
async def get_food_replay(comments: []):
    messages = []
    messages.extend(init_message)
    if len(comments) > 0:
        messages.extend(comments)
    messages.extend(end_message)
    replay_content = await getOpenaiResponse(messages)

    return replay_content


# 调用OpenAI获取对话
async def getOpenaiResponse(messages: []):
    content = None
    response = await client.chat.completions.create(
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
             {"type": "text",
              # "text": "Sending ya some chocolate acorns @adesciagent, do try out intermittent fasting as well! Would love to see a healthy squirrel running around, perhaps even a swole one! 👀💪"},
              "text": "i eat it 9:00 pm"},
             {
                 "type": "image_url",
                 "image_url": {"url": "https://pbs.twimg.com/media/Gg_e_xlbwAAst-F?format=jpg&name=medium"},
                 # "image_url": {"url": "https://file.b18a.io/temp202412110823233108_132413_.png"},
             }
         ]},
        # {"role": "assistant",
        #  "content": [
        #      {"type": "text",
        #       "text": """
        #       {
        #           "has_food_image": true,
        #           "calories": "600 kcal",
        #           "fat": "30 g",
        #           "carbs": "75 g",
        #           "protein": "6 g",
        #           "tweet": "These are chocolate acorns. Estimated at 12 pieces, each about 15g. Per piece: 50 kcal, 2.5g fat, 6.25g carbs, 0.5g protein. Total: 600 kcal, 30g fat, 75g carbs, 6g protein."
        #       }
        #       """},
        #  ]},
        # {"role": "user",
        #  "content": [
        #      {"type": "text",
        #       "text": "11 pieces"},
        #  ]},
    ]
    content = asyncio.run(get_food_replay(comments))
    print(content)
