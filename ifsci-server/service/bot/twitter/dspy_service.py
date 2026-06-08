
import dspy
import setting
import asyncio
from log import logger


openai_key = setting.open_ai_key
llm = dspy.OpenAI(model='gpt-4o', api_key=openai_key)
dspy.settings.configure(lm=llm)


async def get_response(text):

    lie_detector = dspy.Predict("text -> veracity")
    response = lie_detector(text=text)
    logger.info(response.veracity)

    class LieSignature(dspy.Signature):
        """Identify if a statement is True or False"""
        text = dspy.InputField()
        veracity = dspy.OutputField(desc="a boolean 1 or 0")


    lie_detector = dspy.Predict(LieSignature)
    response = lie_detector(text=text)
    logger.info(response.veracity)  #

if __name__ == '__main__':
    task = 'Barack Obama was not President of the USA'
    response = asyncio.run(get_response(task))
    print(response)