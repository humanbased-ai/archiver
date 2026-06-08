import asyncio
import os
import sys
import argparse

# 添加项目根目录到 sys.path
sys.path.insert(0, '/Users/yangxiaohu/Documents/work/R6D9/ffs-server')

# 导入测试版本的 chat_openai_model 函数
from tests.chat_service import chat_openai_model, user_queues
# 导入模型配置
from tests.model_config import (
    MODEL_CONFIGS, 
    get_model_data, 
    get_models_by_org, 
    get_models_by_input_type,
    get_models_by_output_type,
    get_llm_models,
    get_multimodal_llm_models,
    TEST_PROMPTS,
    ModelOrg,
    ContentType
)

async def test_models(api_key, models=None, prompt_type="basic", org=None, input_type=None, output_type=None, llm_only=False, multimodal_only=False):
    """测试 AI 模型"""
    # 根据参数选择要测试的模型
    if models:
        # 使用指定的模型列表
        model_names = models
    elif llm_only:
        # 获取大语言模型（支持文本输入和输出的模型）
        if org:
            model_names = get_llm_models(org)
        else:
            model_names = get_llm_models()
    elif multimodal_only:
        # 获取多模态大语言模型
        if org:
            model_names = get_multimodal_llm_models(org)
        else:
            model_names = get_multimodal_llm_models()
    elif org:
        # 根据组织筛选模型
        model_names = get_models_by_org(org)
    elif input_type:
        # 根据输入类型筛选模型
        model_names = get_models_by_input_type(input_type)
    elif output_type:
        # 根据输出类型筛选模型
        model_names = get_models_by_output_type(output_type)
    else:
        # 默认使用 OpenAI 的大语言模型
        model_names = get_llm_models(ModelOrg.OPENAI.value)
    
    # 获取测试提示
    prompt = TEST_PROMPTS.get(prompt_type, TEST_PROMPTS["basic"])
    
    print(f"开始测试 AI 模型...")
    print(f"测试提示: '{prompt}'")
    print(f"要测试的模型: {', '.join(model_names)}")
    
    for model in model_names:
        print(f"\n=== 测试模型: {model} ===")
        try:
            # 获取模型配置
            config = MODEL_CONFIGS.get(model)
            if not config:
                print(f"错误: 未找到模型 {model} 的配置")
                continue
                
            # 检查模型是否支持文本输入和输出
            if ContentType.TEXT.value not in config["input_types"]:
                print(f"跳过模型 {model}: 不支持文本输入")
                continue
                
            if ContentType.TEXT.value not in config["output_types"]:
                print(f"跳过模型 {model}: 不支持文本输出")
                continue
            
            # 创建测试用户 ID
            test_uid = f"test_user_{model}"
            
            # 为测试用户创建队列
            user_queues[test_uid] = asyncio.Queue()
            
            # 获取模型数据
            model_data = get_model_data(model, api_key)
            
            # 只有 OpenAI 模型才使用 chat_openai_model 函数
            if model_data["org"] == ModelOrg.OPENAI.value:
                print(f"发送请求到 {model}...")
                result = await chat_openai_model(test_uid, model_data, prompt, f"test_{model}")
                print(f"响应: {result}")
            else:
                print(f"注意: 当前只支持测试 OpenAI 模型。模型 {model} 属于 {model_data['org']} 组织，需要实现相应的测试函数。")
            
            # 清理
            del user_queues[test_uid]
            
        except Exception as e:
            print(f"测试 {model} 时出错: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='测试 AI 模型')
    parser.add_argument('--api-key', type=str, help='API 密钥')
    parser.add_argument('--models', type=str, nargs='+', help='要测试的模型列表，例如 "gpt-3.5-turbo gpt-4"')
    parser.add_argument('--prompt', type=str, choices=list(TEST_PROMPTS.keys()), default="multilingual", 
                        help='测试提示类型: basic, creative, technical, multilingual, code, reasoning')
    parser.add_argument('--org', type=str, choices=[org.value for org in ModelOrg], default="openai", 
                        help='按组织筛选模型: openai, claude, gemini')
    parser.add_argument('--input-type', type=str, choices=[content_type.value for content_type in ContentType], 
                        help='按输入类型筛选模型: text, image, audio')
    parser.add_argument('--output-type', type=str, choices=[content_type.value for content_type in ContentType], 
                        help='按输出类型筛选模型: text, image, audio')
    parser.add_argument('--llm-only', action='store_true', help='只测试大语言模型（支持文本输入和输出的模型）', default=True)
    parser.add_argument('--multimodal-only', action='store_true', help='只测试多模态大语言模型')
    args = parser.parse_args()
    
    # 使用提供的 API 密钥或尝试从环境变量获取
    api_key = args.api_key or os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        # 尝试从 setting.py 获取 API 密钥
        try:
            from setting import open_ai_key
            api_key = open_ai_key
            print("使用 setting.py 中的 API 密钥")
        except ImportError:
            pass
    
    if not api_key:
        print("错误: 未提供 API 密钥。请使用 --api-key 提供或设置相应的环境变量。")
        sys.exit(1)
    
    print(f"使用 API 密钥: {api_key[:5]}...{api_key[-4:]}")
    asyncio.run(test_models(
        api_key=api_key, 
        models=args.models, 
        prompt_type=args.prompt,
        org=args.org,
        input_type=args.input_type,
        output_type=args.output_type,
        llm_only=args.llm_only,
        multimodal_only=args.multimodal_only
    ))
