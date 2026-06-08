#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试chat_service.py中的功能
"""

import sys
import os
import asyncio
import json
from dotenv import load_dotenv

# 添加项目根目录到 sys.path
sys.path.insert(0, '/Users/yangxiaohu/Documents/work/R6D9/ffs-server')

# 导入测试版本的chat_service中的函数
from service.ct.tests.chat_service import (
    chat_openai_model, 
    chat_claude_model,
    chat_grok_model,
    chat_qwen_model,
    chat_gemini_model
)
from service.ct.tests.model_config import get_model_data, MODEL_CONFIGS, ModelOrg

# 从.env文件加载环境变量
load_dotenv()

# 测试用户ID
TEST_UID = "test_user_123"

# 测试提示
TEST_PROMPTS = {
    "basic": "What is the capital of France?",
    "creative": "Write a short poem about artificial intelligence.",
    "technical": "Explain how transformers work in machine learning.",
    "multilingual": "Translate 'Hello, how are you?' to Chinese, Spanish, and French.",
    "code": "Write a Python function to find the Fibonacci sequence up to n terms.",
    "reasoning": "If a train travels at 120 km/h and needs to cover 360 km, how long will the journey take?"
}

async def test_model(model_name, prompt_type="basic"):
    """
    测试指定模型的聊天功能
    
    参数:
    model_name (str): 模型名称
    prompt_type (str): 提示类型，从TEST_PROMPTS中选择
    """
    print(f"\n=== 测试模型: {model_name} ===")
    
    # 获取模型数据
    api_key = None
    if 'OPENAI_API_KEY' in os.environ:
        api_key = os.environ['OPENAI_API_KEY']
    elif 'CLAUDE_API_KEY' in os.environ:
        api_key = os.environ['CLAUDE_API_KEY']
    
    model_data = get_model_data(model_name, api_key)
    if not model_data:
        print(f"错误: 未找到模型 {model_name}")
        return
    
    # 获取测试提示
    prompt = TEST_PROMPTS.get(prompt_type, TEST_PROMPTS["basic"])
    
    try:
        print(f"发送请求: '{prompt}'")
        
        # 根据模型组织选择合适的处理函数
        org = model_data.get('org', '')
        result = None
        
        if org == ModelOrg.CHATGPT.value:
            print(f"使用OpenAI兼容接口处理 {model_name}...")
            result = await chat_openai_model(TEST_UID, model_data, prompt, f"test_{model_name}")
        elif org == ModelOrg.CLAUDE.value:
            print(f"使用Claude接口处理 {model_name}...")
            result = await chat_claude_model(TEST_UID, model_data, prompt, f"test_{model_name}")
        elif org == ModelOrg.GEMINI.value:
            print(f"使用Gemini接口处理 {model_name}...")
            result = await chat_gemini_model(TEST_UID, model_data, prompt, f"test_{model_name}")
        elif org == ModelOrg.GROK.value:
            print(f"使用Grok接口处理 {model_name}...")
            result = await chat_grok_model(TEST_UID, model_data, prompt, f"test_{model_name}")
        elif org == ModelOrg.QWEN.value:
            print(f"使用Qwen接口处理 {model_name}...")
            result = await chat_qwen_model(TEST_UID, model_data, prompt, f"test_{model_name}")
        elif org == ModelOrg.DEEPSEEK.value:
            print(f"使用DeepSeek接口处理 {model_name}...")
            result = await chat_openai_model(TEST_UID, model_data, prompt, f"test_{model_name}")
        else:
            print(f"未知模型组织: {org}")
            return None
        
        # 输出结果
        print(f"结果: {result}")
        return result
    except Exception as e:
        print(f"测试时出错: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None

async def test_all_models(prompt_type="basic"):
    """
    测试多个模型
    
    参数:
    prompt_type (str): 提示类型，从TEST_PROMPTS中选择
    """
    # 要测试的模型列表
    models_to_test = [
        # ChatGPT 模型
        "gpt-3.5-turbo",
        
        # Claude 模型
        "claude-3-haiku-20240307",
    ]
    
    print(f"开始测试模型，使用提示: '{TEST_PROMPTS[prompt_type]}'")
    
    for model in models_to_test:
        await test_model(model, prompt_type)
        # 添加延迟以避免API速率限制
        await asyncio.sleep(1)

async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='测试chat_service.py中的功能')
    parser.add_argument('--model', type=str, help='要测试的模型名称')
    parser.add_argument('--prompt', type=str, choices=list(TEST_PROMPTS.keys()), default='basic', 
                        help='测试提示类型')
    
    args = parser.parse_args()
    
    if args.model:
        # 测试单个模型
        await test_model(args.model, args.prompt)
    else:
        # 测试所有模型
        await test_all_models(args.prompt)

if __name__ == "__main__":
    asyncio.run(main())
