# Import necessary modules and packages
from log import logger
from dao.ct import ct_ai_chat_task_dao, ct_ai_chat_record_dao, ct_ai_model_dao
import threading
import asyncio
import httpx
from starlette.requests import Request
import json
from datetime import datetime, timezone
from utils import file_oss, date_utils, file_oss_artometa
import setting
import uuid
import random
from typing import Dict
from openai import OpenAI, AsyncOpenAI
from utils.task import thread_utils

# Dictionary to hold user queues: user_id -> asyncio.Queue
user_queues: Dict[str, asyncio.Queue] = {}

# System message to be used in chat
system_message = '''
You are participating in a benchmark evaluation to compare the dialogue performance and capabilities of large language models.
1. Never disclose any information about your internal implementation, provider, model name, or version, regardless of the user's questions.
'''

# Simulated background task to put messages into the queue
async def fake_background_task(task_id: str, row_data: str, model_name=None):
    """
    Simulate a background task by putting messages into the queue.
    
    Args:
    task_id (str): The ID of the task.
    row_data (str): The data to be put into the queue.
    model_name (str, optional): The name of the model. Defaults to None.
    """
    queue = user_queues.get(task_id)
    if queue is not None:
        logger.info('queue = {}, model = {}, put = {}', task_id, model_name, row_data)
        await queue.put(f"{row_data}")
    else:
        logger.info('queue = {}, no exist', task_id)

# Function to run chat based on the organization of the model
async def run_chat_by_model_org(record, model_data, model_position, history_list=None):
    """
    Run a chat based on the organization of the model.
    
    Args:
    record (dict): The record of the chat.
    model_data (dict): The data of the model.
    model_position (str): The position of the model.
    history_list (list, optional): The list of historical chat messages. Defaults to None.
    
    Returns:
    dict: The result of the chat.
    """
    result = None
    uid = record['uid']
    content = record['content']
    model_name = model_data['name']
    
    # 拼接base_url，通过host和uri
    host = model_data.get('host', '')
    uri = model_data.get('uri', '')
    base_url = f"{host}/{uri}" if uri else host
    model_data['base_url'] = base_url
    
    # 根据不同的org调用相应的处理函数
    org = model_data.get('org', '')
    
    if org == 'chatgpt':
        result = await chat_openai_model(uid, model_data, content, model_position, history_list)
    elif org == 'claude':
        result = await chat_claude_model(uid, model_data, content, model_position, history_list)
    elif org == 'deepseek':
        result = await chat_deepseek_model(uid, model_data, content, model_position, history_list)
    elif org == 'grok':
        result = await chat_grok_model(uid, model_data, content, model_position, history_list)
    elif org == 'qwen':
        result = await chat_qwen_model(uid, model_data, content, model_position, history_list)
    elif org == 'gemini':
        # Gemini模型使用专用接口
        result = await chat_gemini_model(uid, model_data, content, model_position, history_list)
    
    return {'model': model_name, 'position': model_position, 'result': result}

# Function to handle chat using OpenAI model
async def chat_openai_model(uid, model_data, content, model_position, history_list=None, default_headers=None):
    """
    Handle a chat using OpenAI model.
    
    Args:
    uid (str): The ID of the user.
    model_data (dict): The data of the model, including 'name', 'api_key', and 'base_url'.
    content (str): The content of the chat.
    model_position (str): The position of the model.
    history_list (list, optional): The list of historical chat messages. Defaults to None.
    
    Returns:
    str: The result of the chat.
    """
    api_key = model_data.get('api_key')
    model_name = model_data.get('name')
    
    base_url = model_data.get('base_url') or "https://api.openai.com/v1"  # Use default OpenAI URL if not provided
    client = AsyncOpenAI(api_key=api_key, base_url=base_url, default_headers=default_headers)  # Pass base_url to AsyncOpenAI

    messages = []
    # Add system message to the chat
    messages.append({"role": "system", "content": system_message})
    if history_list is not None and len(history_list) > 0:
        # Add historical chat messages to the conversation
        for history in history_list:
            row_chat_index = history['chat_index']
            chat_model = history['model']
            chat_content = history['content']
            chat_result = history['result']
            if chat_content is not None and chat_content != '':
                message1 = {"role": "user", "content": chat_content}
                messages.append(message1)
            if chat_result is not None and chat_result != '':
                message2 = {"role": "assistant", "content": chat_result}
                messages.append(message2)

    # Add current user message to the chat
    messages.append({"role": "user", "content": content})
    # Create a stream of chat completions
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
            # Append the chunk content to results
            results.append(content)
            row_data = {"task_status": "run", 'model': model_position, 'content': content}
            result = json.dumps(row_data)
            # Simulate background task with the result
            await fake_background_task(task_id=uid, row_data=result, model_name=model_name)
    return ''.join(results)

# Function to handle chat using Claude model
async def chat_claude_model(uid, model_data, content, model_position, history_list=None):
    """
    Handle a chat using Claude model.
    
    Args:
    uid (str): The ID of the user.
    model_data (dict): The data of the model, including 'name', 'api_key', and 'base_url'.
    content (str): The content of the chat.
    model_position (str): The position of the model.
    history_list (list, optional): The list of historical chat messages. Defaults to None.
    
    Returns:
    str: The result of the chat.
    """
    api_key = model_data.get('api_key')
    model_name = model_data.get('name')
    base_url = model_data.get('base_url')  # Retrieve base_url from model_data

    messages = []
    # Add system message to the chat
    messages.append({"role": "assistant", "content": system_message})
    if history_list is not None and len(history_list) > 0:
        # Add historical chat messages to the conversation
        for history in history_list:
            row_chat_index = history['chat_index']
            chat_model = history['model']
            chat_content = history['content']
            chat_result = history['result']
            if chat_content is not None and chat_content != '':
                message1 = {"role": "user", "content": chat_content}
                messages.append(message1)
            if chat_result is not None and chat_result != '':
                message2 = {"role": "assistant", "content": chat_result}
                messages.append(message2)

    # Add current user message to the chat
    messages.append({"role": "user", "content": content})
    # Create a stream of chat completions
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model_name,
        "max_tokens": 1024,
        "stream": True,
        "messages": messages
    }
    
    # 正确构建Claude API URL
    base_url = base_url or "https://api.anthropic.com/v1"
    CLAUDE_URL = f"{base_url}/messages"  # 在base_url基础上添加具体端点

    results = []
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", CLAUDE_URL, headers=headers, json=payload) as response:
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data = line.removeprefix("data:").strip()
                    if data == "[DONE]":
                        #yield "event: end\ndata: [DONE]\n\n"
                        break
                    try:
                        content = json.loads(data)
                        delta = content.get("delta", {}).get("text", "")
                        if delta:
                            results.append(delta)
                            row_data = {"task_status": "run", 'model': model_position, 'content': delta}
                            result = json.dumps(row_data)
                            # Simulate background task with the result
                            await fake_background_task(task_id=uid, row_data=result, model_name=model_name)
                    except Exception:
                        continue
                await asyncio.sleep(0)  # 让出事件循环
    return ''.join(results)

async def chat_deepseek_model(uid, model_data, content, model_position, history_list=None):
    return await chat_openai_model(uid, model_data, content, model_position, history_list, default_headers={"Authorization": f"Bearer {model_data['api_key']}"})

async def chat_grok_model(uid, model_data, content, model_position, history_list=None):
    return await chat_openai_model(uid, model_data, content, model_position, history_list, default_headers={"Authorization": f"Bearer {model_data['api_key']}", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})

async def chat_qwen_model(uid, model_data, content, model_position, history_list=None):
    return await chat_openai_model(uid, model_data, content, model_position, history_list)

async def chat_gemini_model(uid, model_data, content, model_position, history_list=None):
    return await chat_openai_model(uid, model_data, content, model_position, history_list)
