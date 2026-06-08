
import dspy
import setting
import asyncio
from log import logger


# 设置OpenAI的GPT-3.5-turbo模型作为语言模型
openai_key = setting.open_ai_key
llm = dspy.OpenAI(model='gpt-4o', api_key=openai_key)
dspy.settings.configure(lm=llm)


async def get_response(text):
    # 创建一个未优化的谎言检测器
    lie_detector = dspy.Predict("text -> veracity")
    response = lie_detector(text=text)
    logger.info(response.veracity)  # 输出可能是非布尔值，因为签名未明确指定输出类型

    # 为了确保输出为布尔值（True或False），我们需要定义一个更精确的签名
    class LieSignature(dspy.Signature):
        """Identify if a statement is True or False"""
        text = dspy.InputField()
        veracity = dspy.OutputField(desc="a boolean 1 or 0")

    # 使用精确的签名重新创建谎言检测器
    lie_detector = dspy.Predict(LieSignature)
    response = lie_detector(text=text)
    logger.info(response.veracity)  # 现在应该输出布尔值（True或False）

if __name__ == '__main__':
    task = 'Barack Obama was not President of the USA'
    response = asyncio.run(get_response(task))
    print(response)