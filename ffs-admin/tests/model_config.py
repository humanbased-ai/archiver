"""
AI 模型配置文件
包含各种 AI 模型（CHATGPT、Claude 等）的配置信息，包括模型名称、输入类型和输出类型
"""

import os
import sys
from enum import Enum

# 添加项目根目录到 sys.path
sys.path.insert(0, '/Users/yangxiaohu/Documents/work/R6D9/ffs-server')

try:
    from setting import open_ai_key
except ImportError:
    open_ai_key = None

# 内容类型枚举
class ContentType(Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"

# 模型组织枚举
class ModelOrg(Enum):
    CHATGPT = "chatgpt"
    CLAUDE = "claude"
    GEMINI = "gemini"
    GROK = "grok"
    DEEPSEEK = "deepseek"
    QWEN = "qwen"

# 模型配置
MODEL_CONFIGS = {
    # CHATGPT 模型：gpt-4.5-turbo、gpt-4.1-turbo、gpt-4.1-preview、gpt-4-vision-preview废弃了
    # 可测的通用大模型包括：gpt-3.5-turbo, gpt-4, gpt-4-0125-preview, gpt-4-1106-preview, gpt-4-turbo, gpt-4.5-preview, gpt-4o, gpt-4o-mini
    "gpt-3.5-turbo": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-3.5 Turbo 模型，适合一般文本生成任务"
    },
    "gpt-4": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4 模型，具有更强的推理能力"
    },
    "gpt-4-turbo": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4 Turbo 模型，性能更好的 GPT-4 变体"
    },
    "gpt-4o": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4o 模型，支持多模态输入"
    },
    "gpt-4o-mini": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4o Mini 模型，轻量版多模态模型"
    },
    "gpt-4.5-preview": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4.5 预览版模型，支持文本和图像输入"
    },
    "gpt-4-1106-preview": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4 1106 预览版模型，2023年11月发布的GPT-4更新版本"
    },
    "gpt-4-0125-preview": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4 0125 预览版模型，2024年1月发布的GPT-4更新版本"
    },
    "dall-e-3": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.IMAGE.value],
        "description": "CHATGPT 的 DALL-E 3 模型，用于文本到图像生成"
    },
    "whisper-1": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.AUDIO.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 Whisper 模型，用于语音识别和转录"
    },
    "tts-1": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.AUDIO.value],
        "description": "CHATGPT 的 TTS (Text-to-Speech) 模型，用于文本到语音转换"
    },
    
    # CHATGPT 新增模型
    "gpt-4.1": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4.1 标准模型，适合高质量文本生成任务"
    },
    "gpt-4.1-mini": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4.1 Mini 轻量模型，适合对速度和成本敏感的场景"
    },
    "gpt-4.1-nano": {
        "org": ModelOrg.CHATGPT.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "CHATGPT 的 GPT-4.1 Nano 超轻量模型，极致低延迟和低成本"
    },
    
    # Claude 模型: claude-3-sonnet-20240229（废弃）
    # SDK 可以直接使用CHATGPT SDK
    # 可测的通用大模型：claude-3-5-haiku-20241022, claude-3-5-sonnet-20240620, claude-3-5-sonnet-20241022, claude-3-7-sonnet-20250219, claude-3-haiku-20240307, claude-3-opus-20240229 (共6个)
    "claude-3-7-sonnet-20250219": {
        "org": ModelOrg.CLAUDE.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Anthropic 的 Claude 3.7 Sonnet 模型，最新最智能的模型，支持文本和图像输入，具有可切换的扩展思考能力"
    },
    "claude-3-7-sonnet-20250219-extended-thinking": {
        "org": ModelOrg.CLAUDE.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Anthropic 的 Claude 3.7 Sonnet 模型（启用扩展思考），最新最智能的模型，支持更深入的思考过程"
    },
    "claude-3-5-haiku-20241022": {
        "org": ModelOrg.CLAUDE.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Anthropic 的 Claude 3.5 Haiku 模型，最快速的模型，支持文本和图像输入"
    },
    "claude-3-5-sonnet-20241022": {
        "org": ModelOrg.CLAUDE.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Anthropic 的 Claude 3.5 Sonnet v2 模型，高智能高性能模型，支持文本和图像输入"
    },
    "claude-3-5-sonnet-20240620": {
        "org": ModelOrg.CLAUDE.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Anthropic 的 Claude 3.5 Sonnet 模型，支持文本和图像输入"
    },
    "claude-3-opus-20240229": {
        "org": ModelOrg.CLAUDE.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Anthropic 的 Claude 3 Opus 模型，强大的复杂任务处理模型，支持文本和图像输入"
    },
    "claude-3-haiku-20240307": {
        "org": ModelOrg.CLAUDE.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Anthropic 的 Claude 3 Haiku 模型，快速且紧凑的模型，支持文本和图像输入"
    },
    
    # Gemini 模型
    # openai兼容的： gemini-1.5-flash, gemini-1.5-flash-8b, gemini-2.0-flash-lite, gemini-2.5-flash-preview-04-17
    "gemini-2.5-flash-preview-04-17": {
        "org": ModelOrg.GEMINI.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Gemini 2.5 Flash Preview，优化用于自适应思维和成本效率"
    },
    # "gemini-2.5-pro-preview-03-25": {
    #     "org": ModelOrg.GEMINI.value,
    #     "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "Gemini 2.5 Pro Preview，增强思维推理、多模态理解和高级编码能力"
    # },
    # "gemini-2.0-flash": {
    #     "org": ModelOrg.GEMINI.value,
    #     "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "Gemini 2.0 Flash，新一代特性，速度、思维、实时流和多模态生成"
    # },
    "gemini-2.0-flash-lite": {
        "org": ModelOrg.GEMINI.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Gemini 2.0 Flash Lite，优化成本效率和低延迟"
    },
    "gemini-1.5-flash": {
        "org": ModelOrg.GEMINI.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Gemini 1.5 Flash，在各种任务中提供快速和多功能的性能"
    },
    "gemini-1.5-flash-8b": {
        "org": ModelOrg.GEMINI.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
        "output_types": [ContentType.TEXT.value],
        "description": "Gemini 1.5 Flash 8B，适用于高容量和较低智能任务"
    },
    # "gemini-1.5-pro": {
    #     "org": ModelOrg.GEMINI.value,
    #     "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value, ContentType.AUDIO.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "Gemini 1.5 Pro，需要更高智能的复杂推理任务"
    # },
    # "gemini-embedding-exp": {
    #     "org": ModelOrg.GEMINI.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "Gemini Embedding，用于测量文本字符串的相关性"
    # },
    # "gemini-2.0-flash-live-001": {
    #     "org": ModelOrg.GEMINI.value,
    #     "input_types": [ContentType.TEXT.value, ContentType.AUDIO.value],
    #     "output_types": [ContentType.TEXT.value, ContentType.AUDIO.value],
    #     "description": "Gemini 2.0 Flash Live，低延迟双向语音和视频交互"
    # },
    
    # Grok 模型 (X.AI)
    # 通用大模型：grok-2-1212, grok-2-vision-1212, grok-3-beta, grok-3-fast-beta, grok-3-mini-beta, grok-3-mini-fast-beta（共6个）
    "grok-3-beta": {
        "org": ModelOrg.GROK.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "X.AI 的 Grok-3 Beta 模型，支持文本输入和输出"
    },
    "grok-3-fast-beta": {
        "org": ModelOrg.GROK.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "X.AI 的 Grok-3 Fast Beta 模型，快速版本，支持文本输入和输出"
    },
    "grok-3-mini-beta": {
        "org": ModelOrg.GROK.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "X.AI 的 Grok-3 Mini Beta 模型，轻量版本，支持文本输入和输出"
    },
    "grok-3-mini-fast-beta": {
        "org": ModelOrg.GROK.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "X.AI 的 Grok-3 Mini Fast Beta 模型，轻量快速版本，支持文本输入和输出"
    },
    "grok-2-1212": {
        "org": ModelOrg.GROK.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "X.AI 的 Grok-2 模型 (1212版本)，支持文本输入和输出"
    },
    "grok-2-vision-1212": {
        "org": ModelOrg.GROK.value,
        "input_types": [ContentType.TEXT.value, ContentType.IMAGE.value],
        "output_types": [ContentType.TEXT.value],
        "description": "X.AI 的 Grok-2 Vision 模型 (1212版本)，支持文本和图像输入"
    },
    
    # DeepSeek 模型
    "deepseek-chat": {
        "org": ModelOrg.DEEPSEEK.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "DeepSeek 的通用对话模型，支持文本输入和输出",
        "model_id": "deepseek-chat"
    },
    "deepseek-coder": {
        "org": ModelOrg.DEEPSEEK.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "DeepSeek 的代码专用模型，优化用于代码生成和理解",
        "model_id": "deepseek-coder"
    },
    
    # 阿里云千问商业模型
    # 支持的商用通用大模型：qwen-max, qwen-max-latest, qwen-omni-turbo, qwen-plus, qwen-plus-latest, qwen-turbo-latest
    # 支持的开源通用大模型：qwen1.5-14b-chat, qwen1.5-72b-chat, qwen2-72b-instruct, qwen2-7b-instruct, qwen2.5-14b-instruct, qwen2.5-32b-instruct, qwen2.5-7b-instruct-1m
    # "qwen-long-0125": {
    #     "org": ModelOrg.QWEN.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "通义千问系列上下文窗口最长，能力均衡且成本较低的模型，适合长文本分析、信息抽取、总结摘要和分类打标等任务",
    #     "model_id": "qwen-long-0125"
    # },
    "qwen-max": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问旗舰模型，提供最佳推理性能，最大支持32K上下文",
        "model_id": "qwen-max"
    },
    "qwen-max-latest": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问旗舰模型最新版本",
        "model_id": "qwen-max-latest"
    },
    "qwen-plus": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问平衡模型，平衡性能、速度和成本，最大支持131K上下文",
        "model_id": "qwen-plus"
    },
    "qwen-plus-latest": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问平衡模型最新版本",
        "model_id": "qwen-plus-latest"
    },
    "qwen-turbo-latest": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问高速模型，提供快速响应和低成本，最大支持1M上下文",
        "model_id": "qwen-turbo-latest"
    },
    "qwen-omni-turbo": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "通义千问全新多模态理解生成大模型，支持文本、图像、语音与视频输入，并输出文本与音频，提供了4种自然对话音色",
        "model_id": "qwen-omni-turbo"
    },
    "qwen-turbo-latest": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "通义千问系列速度最快、成本极低的模型，适合简单任务。",
        "model_id": "qwen-turbo-latest"
    },
    
    # 阿里云千问开源模型 - Qwen2.5系列
    # "qwen2.5-72b-instruct": {
    #     "org": ModelOrg.QWEN.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "阿里云千问2.5开源模型，72B参数规模，最大支持1M上下文",
    #     "model_id": "qwen2.5-72b-instruct"
    # },
    "qwen2.5-32b-instruct": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问2.5开源模型，32B参数规模",
        "model_id": "qwen2.5-32b-instruct"
    },
    "qwen2.5-14b-instruct": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问2.5开源模型，14B参数规模",
        "model_id": "qwen2.5-14b-instruct"
    },
    # "qwen2.5-7b-instruct": {
    #     "org": ModelOrg.QWEN.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "阿里云千问2.5开源模型，7B参数规模，最大支持131K上下文",
    #     "model_id": "qwen2.5-7b-instruct"
    # },
    "qwen2.5-7b-instruct-1m": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问2.5开源模型，7B参数规模，支持1M超长上下文",
        "model_id": "qwen2.5-7b-instruct-1m"
    },
    
    # 阿里云千问开源模型 - Qwen2系列
    "qwen2-72b-instruct": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问2开源模型，72B参数规模，最大支持131K上下文",
        "model_id": "qwen2-72b-instruct"
    },
    "qwen2-7b-instruct": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问2开源模型，7B参数规模，最大支持65K上下文",
        "model_id": "qwen2-7b-instruct"
    },
    # "qwen2-1.5b-instruct": {
    #     "org": ModelOrg.QWEN.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "阿里云千问2开源模型，1.5B参数规模",
    #     "model_id": "qwen2-1.5b-instruct"
    # },
    
    # 阿里云千问开源模型 - Qwen1.5系列
    # "qwen1.5-110b-chat": {
    #     "org": ModelOrg.QWEN.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "阿里云千问1.5开源模型，110B参数规模，最大支持8K上下文",
    #     "model_id": "qwen1.5-110b-chat"
    # },
    "qwen1.5-72b-chat": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问1.5开源模型，72B参数规模，最大支持8K上下文",
        "model_id": "qwen1.5-72b-chat"
    },
    # "qwen1.5-32b-chat": {
    #     "org": ModelOrg.QWEN.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "阿里云千问1.5开源模型，32B参数规模，最大支持8K上下文",
    #     "model_id": "qwen1.5-32b-chat"
    # },
    "qwen1.5-14b-chat": {
        "org": ModelOrg.QWEN.value,
        "input_types": [ContentType.TEXT.value],
        "output_types": [ContentType.TEXT.value],
        "description": "阿里云千问1.5开源模型，14B参数规模，最大支持8K上下文",
        "model_id": "qwen1.5-14b-chat"
    },
    # "qwen1.5-7b-chat": {
    #     "org": ModelOrg.QWEN.value,
    #     "input_types": [ContentType.TEXT.value],
    #     "output_types": [ContentType.TEXT.value],
    #     "description": "阿里云千问1.5开源模型，7B参数规模，最大支持8K上下文",
    #     "model_id": "qwen1.5-7b-chat"
    # },
}

# 按组织获取模型列表
def get_models_by_org(org):
    """
    获取指定组织的所有模型
    
    参数:
    org (str): 组织名称，如 'CHATGPT', 'claude', 'gemini'
    
    返回:
    list: 模型名称列表
    """
    return [model for model, config in MODEL_CONFIGS.items() if config["org"] == org]

# 按输入类型获取模型列表
def get_models_by_input_type(input_type):
    """
    获取支持指定输入类型的所有模型
    
    参数:
    input_type (str): 输入类型，如 'text', 'image', 'audio'
    
    返回:
    list: 模型名称列表
    """
    return [model for model, config in MODEL_CONFIGS.items() if input_type in config["input_types"]]

# 按输出类型获取模型列表
def get_models_by_output_type(output_type):
    """
    获取支持指定输出类型的所有模型
    
    参数:
    output_type (str): 输出类型，如 'text', 'image', 'audio'
    
    返回:
    list: 模型名称列表
    """
    return [model for model, config in MODEL_CONFIGS.items() if output_type in config["output_types"]]

# 获取大语言模型列表
def get_llm_models(org=None):
    """
    获取大语言模型列表（支持文本输入和文本输出的通用性大模型）
    
    参数:
    org (str, optional): 组织名称，如 'CHATGPT', 'claude', 'gemini'。如果不提供，则返回所有组织的大语言模型。
    
    返回:
    list: 大语言模型名称列表
    """
    text_input_models = set(get_models_by_input_type(ContentType.TEXT.value))
    text_output_models = set(get_models_by_output_type(ContentType.TEXT.value))
    llm_models = list(text_input_models.intersection(text_output_models))
    
    # 如果指定了组织，则筛选该组织的模型
    if org:
        org_models = set(get_models_by_org(org))
        llm_models = list(set(llm_models).intersection(org_models))
    
    # 按组织和模型名称排序
    return sorted(llm_models, key=lambda x: (MODEL_CONFIGS[x]["org"], x))

# 获取多模态大语言模型列表
def get_multimodal_llm_models(org=None):
    """
    获取多模态大语言模型列表（支持文本和其他类型输入，但输出为文本的模型）
    
    参数:
    org (str, optional): 组织名称，如 'CHATGPT', 'claude', 'gemini'。如果不提供，则返回所有组织的多模态大语言模型。
    
    返回:
    list: 多模态大语言模型名称列表
    """
    # 获取支持文本输出的模型
    text_output_models = set(get_models_by_output_type(ContentType.TEXT.value))
    
    # 获取支持图像输入的模型
    image_input_models = set(get_models_by_input_type(ContentType.IMAGE.value))
    
    # 获取支持音频输入的模型
    audio_input_models = set(get_models_by_input_type(ContentType.AUDIO.value))
    
    # 多模态模型：支持文本输出，并且支持图像或音频输入
    multimodal_models = list(text_output_models.intersection(image_input_models.union(audio_input_models)))
    
    # 如果指定了组织，则筛选该组织的模型
    if org:
        org_models = set(get_models_by_org(org))
        multimodal_models = list(set(multimodal_models).intersection(org_models))
    
    # 按组织和模型名称排序
    return sorted(multimodal_models, key=lambda x: (MODEL_CONFIGS[x]["org"], x))

# 获取模型配置数据
def get_model_data(model_name, api_key=None, base_url=None):
    """
    获取指定模型的配置数据
    
    参数:
    model_name (str): 模型名称
    api_key (str, optional): API密钥，如果不提供则使用默认值
    base_url (str, optional): API基础URL，如果不提供则使用默认值
    
    返回:
    dict: 模型配置数据
    """
    if model_name not in MODEL_CONFIGS:
        raise ValueError(f"未知模型: {model_name}")
    
    config = MODEL_CONFIGS[model_name]
    org = config["org"]
    
    # 根据组织设置默认 API 密钥和 URL
    if not api_key:
        if org == ModelOrg.CHATGPT.value:
            api_key = os.getenv('CHATGPT_API_KEY') or open_ai_key
        elif org == ModelOrg.CLAUDE.value:
            api_key = os.getenv('ANTHROPIC_API_KEY')
        elif org == ModelOrg.GEMINI.value:
            api_key = os.getenv('GOOGLE_API_KEY')
        elif org == ModelOrg.GROK.value:
            api_key = os.getenv('XAI_API_KEY')
        elif org == ModelOrg.DEEPSEEK.value:
            api_key = os.getenv('DEEPSEEK_API_KEY')
        elif org == ModelOrg.QWEN.value:
            api_key = os.getenv('QWEN_API_KEY')
        elif org == ModelOrg.GEMINI.value:
            api_key = os.getenv('GOOGLE_API_KEY')
    
    if not base_url:
        if org == ModelOrg.CHATGPT.value:
            base_url = "https://api.openai.com/v1"
            host = "https://api.openai.com"
            uri = "v1"
        elif org == ModelOrg.CLAUDE.value:
            base_url = "https://api.anthropic.com/v1/messages"
            host = "https://api.anthropic.com"
            uri = "v1"
        elif org == ModelOrg.GEMINI.value:
            base_url = "https://generativelanguage.googleapis.com"
            host = "https://generativelanguage.googleapis.com"
            uri = ""
        elif org == ModelOrg.GROK.value:
            base_url = "https://api.x.ai/v1"
            host = "https://api.x.ai"
            uri = "v1"
        elif org == ModelOrg.DEEPSEEK.value:
            base_url = "https://api.deepseek.com"
            host = "https://api.deepseek.com"
            uri = ""
        elif org == ModelOrg.QWEN.value:
            # base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"
            base_url = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
            host = "https://dashscope-intl.aliyuncs.com"
            uri = "compatible-mode/v1"
        elif org == ModelOrg.GEMINI.value:
            base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
            host = "https://generativelanguage.googleapis.com"
            uri = "v1beta/openai/"
    
    return {
        "name": model_name,
        "api_key": api_key,
        "host": host,
        "uri": uri,
        # "base_url": base_url,
        "org": org,
        "input_types": config["input_types"],
        "output_types": config["output_types"],
        "model_id": config.get("model_id", model_name)  # 添加model_id字段
    }

# 测试提示
TEST_PROMPTS = {
    "basic": "What is the capital of France?",
    "creative": "Write a short poem about artificial intelligence.",
    "technical": "Explain how transformers work in machine learning.",
    "multilingual": "Translate 'Hello, how are you?' to Chinese, Spanish, and French.",
    "code": "Write a Python function to find the Fibonacci sequence up to n terms.",
    "reasoning": "If a train travels at 120 km/h and needs to cover a distance of 360 km, how long will the journey take?"
}