import os
from dotenv import load_dotenv

from openai import OpenAI

load_dotenv()

open_ai_key = os.environ.get('OPEN_AI_KEY')
# print(open_ai_key)

client = OpenAI(api_key=open_ai_key)

completion = client.chat.completions.create(
    model="ft:gpt-4o-2024-08-06:codatta-inc::ApumQ5HS",
    messages=[
        {"role": "system",
         "content": "You are a healthy eating expert. Based on the provided image and text, follow the steps below to deliver the final results in JSON format, without returning any intermediate results:\n                  1.If there is no food in the picture, return {'has_food_image': false}.\n                  2.If the text content does not aid in the identification of the image, it can be ignored.\n                  3.Identify the types of food.\n                  4.Estimate the quantity of food.\n                  5.Estimate the weight of each food item.\n                  6.Identify the cooking method of each food item.\n                  7.Provide the quantity, weight, cooking method, calories, fat, carbohydrates, and protein for each food item.\n                  8.Finally, summarize the total nutritional values.\n                  9.Generate tweet content based on above information, requirement: \n                      1) For each food item, use only one line without line breaks for the description.\n                      2) If the user’s content includes text, reply in that language. If not, use English by default.\n                      3) Avoid markdown. Keep it concise and clear for Twitter character limit. The reply must not exceed 230 characters.\n                      4) Tweet example format: These are sesame-coated rolls, likely fried. They appear to be about six pieces, each roughly 40-50g. Estimated per piece: 200 kcal, 10g fat, 20g carbs, 4g protein. Total: 1200 kcal, 60g fat, 120g carbs, 24g protein.\n                  10.Finally, based on the tweet information, just return structured data in JSON format, which needs to include the following fields: has_food_image, calories, fat, carbs, protein, tweet. Add measurement units to the calories, fat, carbs, protein field"},
        {"role": "user",
         "content": [{"type": "image_url", "image_url": {"url": "https://pbs.twimg.com/media/GhUc-yMWEAAoq74.jpg"}},
                     {"type": "text", "text": " what am i eating? https://t.co/TYjNXgzDxw"},
                     {"type": "text", "text": "Generate the return result as a JSON"}]},
    ]
)

print(completion.choices[0].message.content)
