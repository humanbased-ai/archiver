"""
简化版的聊天服务模块，用于测试OpenAI模型。
这个模块包含了一个简化版的chat_openai_model函数，用于测试不同的OpenAI模型。
"""

import asyncio
import json
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

# 尝试导入Google Gemini模块，如果不可用则跳过
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("警告: Google Gemini模块不可用，Gemini模型测试将被禁用")

# 用户队列字典
user_queues = {}

# 系统消息
system_message = "你是一个有用的助手。"

# 模拟后台任务
async def fake_background_task(task_id, row_data, model_name=None):
    """
    模拟后台任务，将消息放入队列。
    
    参数:
    task_id (str): 任务ID。
    row_data (str): 要放入队列的数据。
    model_name (str, optional): 模型名称。默认为None。
    """
    queue = user_queues.get(task_id)
    if queue is not None:
        print(f'queue = {task_id}, model = {model_name}, put = {row_data}')
        await queue.put(f"{row_data}")
    else:
        print(f'queue = {task_id}, no exist')

# 处理使用OpenAI模型的聊天
async def chat_openai_model(uid, model_data, content, model_position, history_list=None, default_headers=None):
    """
    使用OpenAI模型处理聊天。
    
    参数:
    uid (str): 用户ID。
    model_data (dict): 模型数据，包括'name'、'api_key'和'uri'。
    content (str): 聊天内容。
    model_position (str): 模型位置。
    history_list (list, optional): 历史聊天消息列表。默认为None。
    
    返回:
    str: 聊天结果。
    """
    api_key = model_data.get('api_key')
    model_name = model_data.get('name')
    base_url = model_data.get('base_url') or "https://api.openai.com/v1"
    
    # 使用 base_url 而不是 uri
    client = AsyncOpenAI(api_key=api_key, base_url=base_url, default_headers=default_headers)

    messages = []
    # 添加系统消息到聊天
    messages.append({"role": "system", "content": system_message})
    if history_list is not None and len(history_list) > 0:
        # 添加历史聊天消息到对话
        for history in history_list:
            chat_content = history.get('content')
            chat_result = history.get('result')
            if chat_content is not None and chat_content != '':
                message1 = {"role": "user", "content": chat_content}
                messages.append(message1)
            if chat_result is not None and chat_result != '':
                message2 = {"role": "assistant", "content": chat_result}
                messages.append(message2)

    # 添加当前用户消息到聊天
    messages.append({"role": "user", "content": content})
    # 创建聊天完成流
    stream_data = await client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0.7,
        stream=True
    )
    results = []
    async for chunk in stream_data:
        if chunk.choices and chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            # 将块内容附加到结果
            results.append(content)
            row_data = {"task_status": "run", 'model': model_position, 'content': content}
            result = json.dumps(row_data)
            # 使用结果模拟后台任务
            # await fake_background_task(task_id=uid, row_data=result, model_name=model_name)
    return ''.join(results)

# 处理使用Claude模型的聊天
async def chat_claude_model(uid, model_data, content, model_position, history_list=None):
    """
    使用Claude模型处理聊天。
    
    参数:
    uid (str): 用户ID。
    model_data (dict): 模型数据，包括'name'、'api_key'和'api_base_url'。
    content (str): 聊天内容。
    model_position (str): 模型位置。
    history_list (list, optional): 历史聊天消息列表。默认为None。
    
    返回:
    str: 聊天结果。
    """
    api_key = model_data.get('api_key')
    model_name = model_data.get('name')
    base_url = model_data.get('uri') or "https://api.anthropic.com/v1/"
    
    # 创建Anthropic客户端
    client = AsyncAnthropic(api_key=api_key, base_url=base_url)
    
    # 构建消息
    messages = []
    
    # 添加历史聊天消息到对话
    if history_list is not None and len(history_list) > 0:
        for history in history_list:
            chat_content = history.get('content')
            chat_result = history.get('result')
            if chat_content is not None and chat_content != '':
                messages.append({"role": "user", "content": chat_content})
            if chat_result is not None and chat_result != '':
                messages.append({"role": "assistant", "content": chat_result})
    
    # 添加当前用户消息
    messages.append({"role": "user", "content": content})
    
    # 创建聊天完成流
    stream_data = await client.messages.create(
        model=model_name,
        messages=messages,
        system=system_message,
        max_tokens=1024,
        stream=True
    )
    
    results = []
    async for chunk in stream_data:
        # 检查不同的响应格式
        if hasattr(chunk, 'delta') and hasattr(chunk.delta, 'text'):
            # 旧格式
            content = chunk.delta.text
            results.append(content)
            row_data = {"task_status": "run", 'model': model_position, 'content': content}
            result = json.dumps(row_data)
        elif hasattr(chunk, 'delta') and hasattr(chunk.delta, 'content'):
            # 可能的新格式1
            content = chunk.delta.content
            results.append(content)
            row_data = {"task_status": "run", 'model': model_position, 'content': content}
            result = json.dumps(row_data)
        elif hasattr(chunk, 'content'):
            # 可能的新格式2
            content = chunk.content
            results.append(content)
            row_data = {"task_status": "run", 'model': model_position, 'content': content}
            result = json.dumps(row_data)
        elif hasattr(chunk, 'completion'):
            # 可能的新格式3
            content = chunk.completion
            results.append(content)
            row_data = {"task_status": "run", 'model': model_position, 'content': content}
            result = json.dumps(row_data)
        # 添加调试信息
        else:
            print(f"DEBUG: 未知的响应块格式: {chunk}")
            # 尝试打印出chunk的所有属性
            if hasattr(chunk, '__dict__'):
                print(f"DEBUG: chunk属性: {chunk.__dict__}")
            if hasattr(chunk, 'delta') and hasattr(chunk.delta, '__dict__'):
                print(f"DEBUG: chunk.delta属性: {chunk.delta.__dict__}")
    
    return ''.join(results)

# 处理使用Grok模型的聊天
async def chat_grok_model(uid, model_data, content, model_position, history_list=None):
    # 直接调用OpenAI的处理函数，因为Grok使用兼容的API
    return await chat_openai_model(uid, model_data, content, model_position, history_list)

# 处理使用DeepSeek模型的聊天
async def chat_deepseek_model(uid, model_data, content, model_position, history_list=None):
    return await chat_openai_model(uid, model_data, content, model_position, history_list, default_headers={"Authorization": f"Bearer {model_data['api_key']}"})

# 处理使用Qwen模型的聊天
async def chat_qwen_model(uid, model_data, content, model_position, history_list=None):
    """
    使用阿里云千问模型处理聊天，采用流式输出。
    
    参数:
    uid (str): 用户ID。
    model_data (dict): 模型数据，包括'name'、'api_key'和'uri'。
    content (str): 聊天内容。
    model_position (str): 模型位置。
    history_list (list, optional): 历史聊天消息列表。默认为None。
    
    返回:
    str: 聊天结果。
    """
    api_key = model_data.get('api_key')
    model_name = model_data.get('model_id', model_data.get('name'))  # 优先使用model_id
    base_url = model_data.get('uri') or "https://dashscope.aliyuncs.com/compatible-mode/v1"
    
    print(f"千问API调用信息: 模型={model_name}, API基础URL={base_url}")
    
    # 创建OpenAI客户端，使用千问的API
    client = AsyncOpenAI(
        api_key=api_key, 
        base_url=base_url
    )

    messages = []
    # 添加系统消息到聊天
    messages.append({"role": "system", "content": system_message})
    if history_list is not None and len(history_list) > 0:
        # 添加历史聊天消息到对话
        for history in history_list:
            chat_content = history.get('content')
            chat_result = history.get('result')
            if chat_content is not None and chat_content != '':
                message1 = {"role": "user", "content": chat_content}
                messages.append(message1)
            if chat_result is not None and chat_result != '':
                message2 = {"role": "assistant", "content": chat_result}
                messages.append(message2)

    # 添加当前用户消息到聊天
    messages.append({"role": "user", "content": content})
    
    try:
        # 创建聊天完成流
        stream_data = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.7,
            stream=True
        )
        results = []
        async for chunk in stream_data:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # 将块内容附加到结果
                results.append(content)
                row_data = {"task_status": "run", 'model': model_position, 'content': content}
                result = json.dumps(row_data)
                # 使用结果模拟后台任务
                # await fake_background_task(task_id=uid, row_data=result, model_name=model_name)
        return ''.join(results)
    except Exception as e:
        print(f"千问API调用错误: {str(e)}")
        # 尝试打印更多错误信息
        if hasattr(e, 'response'):
            print(f"响应状态码: {e.response.status_code}")
            try:
                print(f"响应内容: {e.response.text}")
            except:
                print("无法获取响应内容")
        raise

async def chat_gemini_model(uid, model_data, content, model_position, history_list=None):
    return await chat_openai_model(uid, model_data, content, model_position, history_list)
 