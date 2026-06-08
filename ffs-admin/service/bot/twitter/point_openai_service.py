import asyncio

from openai import OpenAI, AsyncOpenAI

import setting
from log import logger

#client = OpenAI(api_key=setting.open_ai_key)
client = AsyncOpenAI(api_key=setting.open_ai_key)

init_message = [{"role": "system",
                 "content": """
                    1.	I am collecting annotations related to food, where users provide feedback and suggestions on the original food images and the model’s initial responses. You are a judge of the quality of these annotations.
                    2.	The input information includes the following:
                    •	raw_imgs represents the original food images, which may include multiple images.
                    •	raw_response represents the model’s initial interpretation, primarily involving the name of the food, cooking methods, calorie, nutritional components, etc. These are not necessarily correct; they could be incorrect.
                    •	label_text represents the annotated text, which is divided by “\n” and “:”, including food category, brand, region, and description. The description is the user’s correction or feedback on the raw response.
                    •	label_imgs represents the annotated images.
                    3.	I suggest you process as follows:
                    •	Assess whether the food category, brand, region, and description in label_text match the original images, with particular attention to whether the description is semantically meaningful. If any element is very confidently incorrect, set is_valid_label to false; otherwise, set it to true.
                    •	Determine if the annotation includes images; if there are no images, or the images are identical to the original, or the annotated images are irrelevant to the original food images, consider it as having no valid annotated image, noted as a boolean variable has_valid_label_image.
                    •	Assess the degree of difference between the annotation content and the original interpretation, noted as the variable difference_level.
                        a) If the annotation is correct but only adds information about the food category, brand, and region, the value is 1.
                        b) If it modifies the nutritional values or calorie, the value is 2.
                        c) If it changes the food name, cooking method, or quantity, the value is 3.
                    •	Combine the results of the previous assessments to generate a final quality score, divided into 5 levels:
                        a) level 1: is_valid_label == false
                        b) level 2: is_valid_label == true and difference_level == 1
                        c) level 3: is_valid_label == true and difference_level == 2
                        d) level 4: is_valid_label == true and has_valid_label_image == false and difference_level == 3
                        e) level 5: is_valid_label == true and has_valid_label_image == true and difference_level == 3
                    4.	The expected output is also a JSON, for example: {“level”: 2, “reason”: “xxx”}, where reason is your explanation for determining the level, expressed in normal language without including variables with underscores, try to keep it concise.
                """}]


async def evaluate_annotation(raw_imgs: [], raw_response: str, label_text: str, label_imgs: []):
    messages = []
    messages.extend(init_message)

    if label_imgs:
        label_imgs_text = f"Last {len(label_imgs)} images"
    else:
        label_imgs_text = "No images"
    user_content_text = f"""
        1.  raw_imgs: First {len(raw_imgs)} images
        2.  raw_response: {raw_response}
        3.  label_text: {label_text}
        4.  label_imgs: {label_imgs_text}
    """
    user_content = [{"type": "text", "text": user_content_text}]

    image_urls = []
    image_urls.extend(raw_imgs)
    image_urls.extend(label_imgs)
    user_content.extend({"type": "image_url", "image_url": {"url": url}} for url in image_urls)

    user_message = [{
        "role": "user",
        "content": user_content
    }]

    messages.extend(user_message)
    replay_content = await get_openai_response(messages)

    return replay_content, messages


async def get_openai_response(messages: []):
    reply_content = None
    logger.info('get_openai_response param = {}', messages)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages
    )
    if response is not None:
        reply_content = response.choices[0].message.content
    return reply_content


if __name__ == '__main__':
    raw_imgs = ["https://pbs.twimg.com/media/GgGEH_KbkAALrpA.jpg"]
    # raw_imgs = ["https://file.b18a.io/temp202501090939046923_284946_.png"]
    # raw_response = "1. Fried dumpling, 100g, pan-fried, 250 kcal. Total: 250 kcal, 15g fat, 20g carbs, 10g protein."
    raw_response = "This is an omelette on toast with sauce and green onions, likely pan-cooked. Estimated: 380 kcal, 25g fat, 20g carbs, 15g protein."
    # label_text = "Food category: Homemade Food or Snacks\n Region: China. \n Description: xdcdvdss." # Level1
    # label_text = "Food category: Homemade Food or Snacks. \n Region: China." # Level2
    label_text = "Food category: Chain Restaurant Meal. \n Brand: Markof. \n Region: Australia. \n Description: 这是一个Markof连锁餐厅的鸡蛋肉排" # Level4
    # label_text = "Food category: chain. \n Region: CL." # Level2
    # label_text = "Food category: Homemade Food or Snacks. \n Region: China. \n Description: Not 250kcal, only 200 kcal" # Level3
    # label_text = "Food category: Homemade Food or Snacks. \n Region: China. \n Description: Not 250kcal, only 1 kcal" # Level1
    # label_text = "Food category: Homemade Food or Snacks. \n Region: China. \n Description: This is Chinese chive pocket." # Level3
    # label_text = "Food category: Homemade Food or Snacks. \n Region: China. \n Description: This is an apple." # Level3
    # label_text = "Food category: Homemade Food or Snacks\n Region: China. \n Description: This is Chinese chive pocket." # Level4
    # label_text = "Food category: Homemade Food or Snacks\n Region: China. \n Description: This is Chinese chive pocket."
    # label_text = "Food category: Homemade Food or Snacks\n Region: China. \n Description: This is Chinese chive pocket."
    # label_text = "This is Chinese chive pocket."
    label_imgs = []
    # label_imgs = ["https://file.b18a.io/temp202501090939046923_284946_.png"]
    # label_imgs = ["https://img2.baidu.com/it/u=518954347,120726672&fm=253&fmt=auto&app=138&f=JPEG?w=750&h=500"] # Level5
    content = asyncio.run(evaluate_annotation(raw_imgs, raw_response, label_text, label_imgs))
    print(content)
