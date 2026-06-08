"""
简化版的聊天服务模块，用于测试run_chat_by_model_org方法。
这个模块是service/ct/chat_service.py的测试版本，专注于测试不同模型组织的API调用。
"""

import asyncio
import json
import os
from openai import AsyncOpenAI
import httpx
from dotenv import load_dotenv

# 尝试导入Google Gemini模块，如果不可用则跳过
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("警告: Google Gemini模块不可用，Gemini模型测试将被禁用")

# 从.env文件加载环境变量
load_dotenv()

# 用户队列字典，用于模拟异步消息传递
user_queues = {}

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
    model_data (dict): 模型数据，包括'name'、'api_key'和'base_url'。
    content (str): 聊天内容。
    model_position (str): 模型位置。
    history_list (list, optional): 历史聊天消息列表。默认为None。
    default_headers (dict, optional): 默认请求头。默认为None。
    
    返回:
    str: 聊天结果。
    """
    api_key = model_data.get('api_key')
    model_name = model_data.get('name', '')
    
    base_url = model_data.get('base_url') or "https://api.openai.com/v1"
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    
    # 构建消息列表
    messages = []
    
    # 添加系统消息（如果有）
    system_message = "You are a helpful assistant."
    if system_message:
        messages.append({"role": "system", "content": system_message})
    
    # 添加历史消息
    if history_list:
        for history in history_list:
            chat_content = history.get('content', '')
            chat_result = history.get('result', '')
            if chat_content:
                messages.append({"role": "user", "content": chat_content})
            if chat_result:
                messages.append({"role": "assistant", "content": chat_result})
    
    # 添加当前用户消息
    messages.append({"role": "user", "content": content})
    
    try:
        # 创建聊天完成请求
        stream_data = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            stream=True
        )
        
        results = []
        async for chunk in stream_data:
            if chunk.choices:
                delta = chunk.choices[0].delta
                if delta.content:
                    results.append(delta.content)
                    row_data = {"task_status": "run", 'model': model_position, 'content': delta.content}
                    result = json.dumps(row_data)
                    await fake_background_task(task_id=uid, row_data=result, model_name=model_name)
        
        return ''.join(results)
    except Exception as e:
        print(f"OpenAI API调用出错: {str(e)}")
        return f"错误: {str(e)}"

# 处理使用Claude模型的聊天
async def chat_claude_model(uid, model_data, content, model_position, history_list=None):
    """
    使用Claude模型处理聊天。
    
    参数:
    uid (str): 用户ID。
    model_data (dict): 模型数据，包括'name'、'api_key'和'base_url'。
    content (str): 聊天内容。
    model_position (str): 模型位置。
    history_list (list, optional): 历史聊天消息列表。默认为None。
    
    返回:
    str: 聊天结果。
    """
    api_key = model_data.get('api_key')
    model_name = model_data.get('name', '')
    base_url = model_data.get('base_url')
    
    # 构建消息列表
    messages = []
    
    # 添加历史消息
    if history_list:
        for history in history_list:
            chat_content = history.get('content', '')
            chat_result = history.get('result', '')
            if chat_content:
                messages.append({"role": "user", "content": chat_content})
            if chat_result:
                messages.append({"role": "assistant", "content": chat_result})
    
    # 添加当前用户消息
    messages.append({"role": "user", "content": content})
    
    # 创建请求头和请求体
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
    claude_url = f"{base_url}/messages"
    
    results = []
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", claude_url, headers=headers, json=payload) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data = line.removeprefix("data:").strip()
                        if data == "[DONE]":
                            break
                        try:
                            content = json.loads(data)
                            delta = content.get("delta", {}).get("text", "")
                            if delta:
                                results.append(delta)
                                row_data = {"task_status": "run", 'model': model_position, 'content': delta}
                                result = json.dumps(row_data)
                                # await fake_background_task(task_id=uid, row_data=result, model_name=model_name)
                        except Exception:
                            continue
                    await asyncio.sleep(0)  # 让出事件循环
        return ''.join(results)
    except Exception as e:
        print(f"Claude API调用出错: {str(e)}")
        return f"错误: {str(e)}"

# 当Gemini模块不可用时的占位实现
async def chat_gemini_model(uid, model_data, content, model_position, history_list=None):
    """
    Gemini模块不可用时的占位实现。
    """
    return "错误: Google Gemini模块不可用"

# 主要函数：根据模型组织运行聊天
async def run_chat_by_model_org(record, model_data, model_position, history_list=None):
    """
    根据模型组织运行聊天。
    
    参数:
    record (dict): 聊天记录，包含'uid'和'content'。
    model_data (dict): 模型数据，包括'name'、'org'、'api_key'、'host'和'uri'。
    model_position (str): 模型位置。
    history_list (list, optional): 历史聊天消息列表。默认为None。
    
    返回:
    dict: 包含模型名称、位置和结果的字典。
    """
    result = None
    uid = record['uid']
    content = record['content']
    model_name = model_data.get('name', '')
    
    # 拼接base_url，通过host和uri
    host = model_data.get('host', '')
    uri = model_data.get('uri', '')
    base_url = f"{host}/{uri}" if uri else host
    model_data['base_url'] = base_url
    
    # 根据不同的org调用相应的处理函数
    org = model_data.get('org', '')
    
    # 统一使用OpenAI兼容接口的模型
    openai_compatible_orgs = ['chatgpt', 'openai', 'grok', 'qwen', 'deepseek']
    
    try:
        if org == 'deepseek':
            # DeepSeek模型需要特殊的Authorization头
            result = await chat_openai_model(
                uid, 
                model_data, 
                content, 
                model_position, 
                history_list, 
                default_headers={"Authorization": f"Bearer {model_data.get('api_key', '')}"}
            )
        elif org in openai_compatible_orgs:
            # 这些模型都使用OpenAI兼容接口
            result = await chat_openai_model(
                uid=uid, 
                model_data=model_data, 
                content=content, 
                model_position=model_position, 
                history_list=history_list,
                default_headers={"Authorization": f"Bearer Token {model_data.get('api_key', '')}", "Content-Type": "application/json"}
            )
        elif org == 'claude':
            # Claude模型使用专用接口
            result = await chat_claude_model(
                uid, 
                model_data, 
                content, 
                model_position, 
                history_list
            )
        elif org == 'gemini':
            # Gemini模型使用专用接口
            result = await chat_openai_model(
                uid=uid, 
                model_data=model_data, 
                content=content, 
                model_position=model_position, 
                history_list=history_list
            )
        else:
            # 默认使用OpenAI接口
            result = await chat_openai_model(
                uid=uid, 
                model_data=model_data, 
                content=content, 
                model_position=model_position, 
                history_list=history_list
            )
        
        return {'model': model_name, 'position': model_position, 'result': result}
    except Exception as e:
        error_message = f"处理聊天时出错: {str(e)}"
        print(error_message)
        return {'model': model_name, 'position': model_position, 'result': error_message}

# 测试函数
async def test_run_chat_by_model_org(model_data, content, history_list=None):
    """
    测试run_chat_by_model_org函数。
    
    参数:
    model_data (dict): 模型数据。
    content (str): 聊天内容。
    history_list (list, optional): 历史聊天消息列表。默认为None。
    
    返回:
    dict: 聊天结果。
    """
    record = {
        'uid': 'test_user',
        'content': content
    }
    
    result = await run_chat_by_model_org(record, model_data, 'test', history_list)
    return result

# 主函数，用于直接测试
async def main():
    """
    主函数，用于直接测试。
    """
    import sys
    import os
    import pymysql
    from pymysql.cursors import DictCursor
    
    # 添加项目根目录到sys.path
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    # 测试提示
    prompt = "你是什么模型？"
    
    # 测试模型名称
    # model_name = "gpt-3.5-turbo"
    # model_name = "deepseek-chat"
    model_name = "grok-3-fast-beta"
    # model_name = "qwen-plus-latest"
    # model_name = "claude-3-7-sonnet-20250219"
    
    # 直接连接数据库获取模型数据
    try:
        # # 从setting.py导入数据库URL
        # from setting import dbUrl
        
        # # 解析数据库URL
        # # 格式: mysql://username:password@host:port/dbname
        # parts = dbUrl.replace('mysql://', '').split('@')
        # auth = parts[0].split(':')
        # conn_info = parts[1].split('/')
        
        # username = auth[0]
        # password = auth[1]
        # host_port = conn_info[0].split(':')
        # host = host_port[0]
        # port = int(host_port[1]) if len(host_port) > 1 else 3306
        # db_name = conn_info[1].split('?')[0]
        
        # # 建立连接
        # connection = pymysql.connect(
        #     host=host,
        #     user=username,
        #     password=password,
        #     database=db_name,
        #     port=port,
        #     charset='utf8mb4',
        #     cursorclass=DictCursor
        # )
        # print(f"成功连接到数据库: {host}:{port}/{db_name}")
        
        # # 查询模型数据
        # with connection.cursor() as cursor:
        #     sql = f"SELECT * FROM ct_ai_model WHERE name = %s AND deleted = 0"
        #     cursor.execute(sql, (model_name,))
        #     model_data = cursor.fetchone()
        
        # connection.close()
        
        # if not model_data:
        #     print(f"错误: 无法从数据库获取模型 {model_name} 的数据")
        #     return
        
        # print(f"测试模型: {model_name}")
        # print(f"模型数据: {model_data}")
        # print(f"提示: {prompt}")
        
        # 创建记录对象
        record = {
            'uid': 'test_user',
            'content': prompt
        }
        
        # model_data = {'name': 'grok-3-fast-beta', 'api_key': '<XAI_KEY_REDACTED>', 'host': 'https://api.x.ai', 'uri': 'v1', 'org': 'grok', 'model_id': 'grok-3-fast-beta'}
        model_data = {'name': 'gemini-2.0-flash', 'api_key': '<GEMINI_KEY_REDACTED>', 'host': 'https://generativelanguage.googleapis.com', 'uri': 'v1beta/openai/', 'org': 'gemini', 'model_id': 'gemini-2.0-flash'}

        # 直接调用run_chat_by_model_org函数
        result = await run_chat_by_model_org(record, model_data, 'test')
        print(f"结果: {result}")
        
    except Exception as e:
        print(f"数据库操作失败: {e}")
        print("使用model_config.py中的配置作为备选...")
        
        # 如果数据库连接失败，使用model_config.py中的配置作为备选
        from service.ct.tests.model_config import get_model_data
        
        # 获取API密钥
        api_key = os.getenv('XAI_API_KEY')
        
        # 从model_config获取模型数据
        model_data = get_model_data(model_name, api_key)
        
        print(f"测试模型: {model_name}")
        print(f"模型数据(来自model_config): {model_data}")
        print(f"提示: {prompt}")
        
        # 创建记录对象
        record = {
            'uid': 'test_user',
            'content': prompt
        }
        
        # 直接调用run_chat_by_model_org函数
        result = await run_chat_by_model_org(record, model_data, 'test')
        print(f"结果: {result}")

if __name__ == "__main__":
    asyncio.run(main())
