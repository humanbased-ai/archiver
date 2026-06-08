import json
import sys
import os
# 添加项目根目录到Python路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from src.llm_interface import OpenAILLM # 使用正确的导入路径

# 为了这个示例，如果你使用 .env 文件管理 API 密钥，加载 .env 文件
from dotenv import load_dotenv

load_dotenv()
print("INFO: Attempted to load .env file.")

def main():
    print("🚀 Testing Direct Call to OpenAILLM 🚀")

    # --- 1. 初始化 OpenAILLM 客户端 ---
    # 客户端会尝试从环境变量 "OPENAI_API_KEY" 获取密钥
    # 你也可以直接传递密钥: OpenAILLM(api_key="sk-YourKeyHere", model="gpt-4o")
    try:
        # 使用一个较为经济高效的模型进行简单测试，例如 gpt-3.5-turbo
        # 或者使用 gpt-4o 以获得更强的能力
        llm_client = OpenAILLM(model="gpt-4o")
    except ValueError as e:
        print(f"🚨 初始化 LLM 客户端失败: {e}")
        print("   请确保 OPENAI_API_KEY 环境变量已设置，或者在代码中直接提供 api_key。")
        return
    except Exception as e:
        print(f"🚨 初始化 LLM 客户端时发生未知错误: {e}")
        return

    # --- 2. 定义 System Prompt 和 User Prompt ---
    # 示例 1: 简单的问答
    print("\n--- 示例 1: 简单问答 ---")
    system_prompt_qa = "You are a helpful assistant."
    user_prompt_qa = "What is the capital of France?"

    response1 = llm_client.generate_response(
        system_prompt=system_prompt_qa,
        user_prompt=user_prompt_qa,
        temperature=0.7, # 对于问答，可以稍微高一点的温度
        max_tokens=100
    )

    if response1.error:
        print(f"❌ 请求失败: {response1.error}")
    elif response1.content:
        print(f"🤖 AI 回答: {response1.content}")
    else:
        print("⚠️ 请求成功但没有收到内容。")

    # 示例 2: 请求 JSON 输出 (确保模型支持 JSON 模式，例如 gpt-3.5-turbo-1106+ 或 gpt-4o)
    print("\n--- 示例 2: 请求 JSON 输出 ---")
    if "gpt-3.5-turbo-0125" in llm_client.model_name or "gpt-4" in llm_client.model_name or "gpt-4o" in llm_client.model_name:
        system_prompt_json = "You are an assistant that provides structured data. Please respond in JSON format."
        user_prompt_json = "Provide a JSON object with two keys: 'name' (string) and 'age' (integer) for a fictional character named 'Alex'."

        response2 = llm_client.generate_response(
            system_prompt=system_prompt_json,
            user_prompt=user_prompt_json,
            temperature=0.1,
            max_tokens=150,
            json_mode=True # 启用 JSON 模式
        )

        if response2.error:
            print(f"❌ 请求失败: {response2.error}")
        elif response2.content:
            print(f"🤖 AI JSON 输出 (原始字符串): {response2.content}")
            try:
                parsed_json = json.loads(response2.content)
                print(f"📑 AI JSON 输出 (解析后): {parsed_json}")
                if isinstance(parsed_json, dict) and parsed_json.get("name") == "Alex":
                    print("✅ JSON 内容符合预期！")
                else:
                    print("⚠️ JSON 内容可能不完全符合预期。")
            except json.JSONDecodeError as e:
                print(f"❌ 无法将 AI 输出解析为 JSON: {e}")
        else:
            print("⚠️ 请求成功但没有收到内容。")
    else:
        print(f"ℹ️ 跳过 JSON 输出示例，因为模型 '{llm_client.model_name}' 可能不支持强制 JSON 模式。")
        print(f"   (支持的模型例如：gpt-3.5-turbo-1106+, gpt-4-turbo, gpt-4o)")


    # 示例 3: 一个更复杂的指令，不强制 JSON
    print("\n--- 示例 3: 总结文本 ---")
    system_prompt_summary = "You are an expert summarizer. Summarize the following text in one sentence."
    user_prompt_summary = "The quick brown fox jumps over the lazy dog. This sentence is famous because it contains all letters of the English alphabet. It is often used for testing typewriters or keyboards."

    response3 = llm_client.generate_response(
        system_prompt=system_prompt_summary,
        user_prompt=user_prompt_summary,
        temperature=0.3,
        max_tokens=100 # 限制总结长度
    )

    if response3.error:
        print(f"❌ 请求失败: {response3.error}")
    elif response3.content:
        print(f"🤖 AI 总结: {response3.content}")
    else:
        print("⚠️ 请求成功但没有收到内容。")


if __name__ == "__main__":
    main()