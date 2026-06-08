import asyncio
from langchain_openai import ChatOpenAI

# 初始化 OpenAI 模型
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# 系统提示消息，指导代理如何将任务描述转换为逐步执行的操作
init_message = [{"role": "system",
                 "content": """
You are an automated browser-operating agent. Convert my task descriptions into step-by-step execution sequences for easier processing by other agents.
Example:
Input: “Find a one-way flight from Beijing to Tokyo on 15 Feb 2025 on Google Flights. Return me the cheapest option.”
Output:
1.	Open Google Flights.
2.	Select “One-way” trip.
3.	Enter “Beijing” as the departure and “Tokyo” as the destination.
4.	Set the departure date to “Feb 15, 2025”.
5.	Click the search button.
6.	Sort results by price (low to high).
7.	Retrieve the cheapest flight’s details (airline, times, stopovers).
8.	Output the flight details.
                 """}]


# 生成任务执行计划的异步函数
async def get_task_plan(raw_task: str) -> str:
    """
    根据任务描述生成逐步执行的计划。

    :param raw_task: 用户输入的任务描述。
    :return: 生成的任务执行步骤。
    """
    messages = init_message + [{"role": "user", "content": raw_task}]
    response = await get_openai_response(messages)
    return response


# 调用 OpenAI 模型并获取响应的异步函数
async def get_openai_response(messages) -> str:
    """
    发送消息历史记录到 OpenAI 模型，并获取响应。

    :param messages: 包含系统指令和用户输入的消息列表。
    :return: AI 生成的响应文本。
    """
    response = await llm.ainvoke(messages)  # 使用异步方式调用 OpenAI
    return response.content if response else ""


# 运行主逻辑
if __name__ == '__main__':
    raw_task = "In docs.google.com write my Papa a quick thank you for everything letter."
    content = asyncio.run(get_task_plan(raw_task))
    print(content)
