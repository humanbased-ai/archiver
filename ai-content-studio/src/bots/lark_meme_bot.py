#!/usr/bin/env python3
"""
Lark/飞书 Meme Bot
让同事在飞书里直接生成 Milady 梗图
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, Optional
import requests

from src.meme.meme_generator_v2 import MemeGeneratorV2
from src.meme.prompt_parser import PromptParser
from src.meme.mcdonald_background import create_mcdonald_background
from src.meme.memegen_api import MemegenAPI
from src.meme.illusion_diffusion import IllusionDiffusion
from src.meme.replicate_illusion import ReplicateIllusion
from src.meme.flux_fill_pro import FluxFillPro

# 导入 Replicate 配置
try:
    from replicate_config import (
        EFFECT_STRENGTH,
        GUIDANCE_SCALE,
        NUM_INFERENCE_STEPS,
        POSITIVE_PROMPT_TEMPLATE,
        NEGATIVE_PROMPT,
        PRESETS
    )
except ImportError:
    # 如果配置文件不存在，使用默认值
    EFFECT_STRENGTH = 1.1
    GUIDANCE_SCALE = 7.0
    NUM_INFERENCE_STEPS = 40
    POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"
    NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"
    PRESETS = {}


class LarkMemeBot:
    """飞书 Meme 机器人 - V2 版本"""

    def __init__(
        self,
        app_id: str,
        app_secret: str,
        verification_token: Optional[str] = None
    ):
        """
        初始化飞书机器人

        Args:
            app_id: 飞书应用 ID
            app_secret: 飞书应用密钥
            verification_token: 事件验证 token（可选）
        """
        self.app_id = app_id
        self.app_secret = app_secret
        self.verification_token = verification_token
        self.access_token = None

        # 初始化 Meme Generator V2
        self.meme_generator = MemeGeneratorV2()

        # 初始化自然语言解析器
        self.prompt_parser = PromptParser()

        # 初始化 Memegen.link API
        self.memegen_api = MemegenAPI()

        # AI 特效生成器（延迟加载 - Replicate 付费稳定版）
        self.replicate_illusion = None

        # FLUX Fill Pro 配饰替换（延迟加载）
        self.flux_fill_pro = None

        print("✅ Lark Meme Bot V2 已初始化")
        print("🎨 支持功能:")
        print("   - 10,000 个 NFT 原图")
        print("   - 324 个图层装饰")
        print("   - 4 种字体风格 (Impact, Angelic, Chinese, Glow)")
        print("   - 中文自动支持")
        print("   - 自然语言解析")
        print("   - 207 个经典梗图模板 (Memegen.link)")
        print("   - AI 特效生成 (Replicate ControlNet - 稳定版)")
        print("   - AI 配饰替换 (FLUX Fill Pro - 智能替换)")
        print("   - SAM 自动检测 (Segment Anything Model - 精确定位)")

    def get_tenant_access_token(self) -> str:
        """
        获取 tenant_access_token

        Returns:
            access_token
        """
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"

        payload = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }

        response = requests.post(url, json=payload)
        data = response.json()

        if data.get("code") == 0:
            self.access_token = data["tenant_access_token"]
            return self.access_token
        else:
            raise Exception(f"获取 access_token 失败: {data}")

    def upload_image(self, image_path: str) -> str:
        """
        上传图片到飞书

        Args:
            image_path: 本地图片路径

        Returns:
            image_key
        """
        if not self.access_token:
            self.get_tenant_access_token()

        url = "https://open.feishu.cn/open-apis/im/v1/images"

        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        files = {
            "image": open(image_path, "rb")
        }

        data = {
            "image_type": "message"
        }

        response = requests.post(url, headers=headers, files=files, data=data)
        result = response.json()

        if result.get("code") == 0:
            return result["data"]["image_key"]
        else:
            raise Exception(f"上传图片失败: {result}")

    def send_image_message(
        self,
        receive_id: str,
        image_key: str,
        receive_id_type: str = "chat_id"
    ):
        """
        发送图片消息

        Args:
            receive_id: 接收者 ID（群聊 ID 或用户 ID）
            image_key: 图片 key
            receive_id_type: ID 类型（chat_id, user_id, open_id 等）
        """
        if not self.access_token:
            self.get_tenant_access_token()

        url = "https://open.feishu.cn/open-apis/im/v1/messages"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        params = {
            "receive_id_type": receive_id_type
        }

        payload = {
            "receive_id": receive_id,
            "msg_type": "image",
            "content": json.dumps({
                "image_key": image_key
            })
        }

        response = requests.post(url, headers=headers, params=params, json=payload)
        result = response.json()

        if result.get("code") != 0:
            raise Exception(f"发送消息失败: {result}")

    def send_card_message(
        self,
        receive_id: str,
        title: str,
        content: str,
        receive_id_type: str = "chat_id"
    ):
        """
        发送卡片消息

        Args:
            receive_id: 接收者 ID
            title: 卡片标题
            content: 卡片内容
            receive_id_type: ID 类型
        """
        if not self.access_token:
            self.get_tenant_access_token()

        url = "https://open.feishu.cn/open-apis/im/v1/messages"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        params = {
            "receive_id_type": receive_id_type
        }

        card = {
            "config": {
                "wide_screen_mode": True
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": title
                },
                "template": "blue"
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": content
                    }
                }
            ]
        }

        payload = {
            "receive_id": receive_id,
            "msg_type": "interactive",
            "content": json.dumps(card)
        }

        response = requests.post(url, headers=headers, params=params, json=payload)
        result = response.json()

        if result.get("code") != 0:
            raise Exception(f"发送卡片失败: {result}")

    def parse_command_args(self, args: list) -> dict:
        """
        解析命令参数

        支持格式:
        - /meme gm
        - /meme crypto 1234
        - /meme gm 1234 Hat:Beret.png
        - /meme gm "Hello World" "Bottom Text" font:glow caps:off

        Args:
            args: 参数列表

        Returns:
            解析后的参数字典
        """
        params = {
            "template": None,
            "nft_id": None,
            "layers": {},
            "top_text": "",
            "bottom_text": "",
            "font_style": "impact",
            "all_caps": True
        }

        for arg in args:
            # 图层格式: Hat:Beret.png 或 Overlay:Gunpoint.png
            if ":" in arg and arg.split(":")[0] in ["Hat", "Glasses", "Earrings", "Necklaces", "Face Decoration", "Overlay"]:
                layer_type, layer_name = arg.split(":", 1)
                # 支持同一类别多个图层
                if layer_type not in params["layers"]:
                    params["layers"][layer_type] = []
                params["layers"][layer_type].append(layer_name)

            # 文字格式: top:xxx 或 bottom:xxx
            elif arg.startswith("top:"):
                params["top_text"] = arg.split(":", 1)[1]
            elif arg.startswith("bottom:"):
                params["bottom_text"] = arg.split(":", 1)[1]

            # 字体格式: font:glow
            elif arg.startswith("font:"):
                params["font_style"] = arg.split(":", 1)[1]

            # All Caps 格式: caps:off
            elif arg.startswith("caps:"):
                params["all_caps"] = arg.split(":", 1)[1].lower() != "off"

            # NFT ID: 纯数字
            elif arg.isdigit():
                params["nft_id"] = int(arg)

            # 模板名称: gm, crypto, milady, motivational
            elif arg in ["gm", "crypto", "milady", "motivational", "random"]:
                params["template"] = arg

            # 文字（引号包裹或者普通文本）
            else:
                if not params["top_text"]:
                    params["top_text"] = arg.strip('"')
                elif not params["bottom_text"]:
                    params["bottom_text"] = arg.strip('"')

        return params

    def handle_natural_language(
        self,
        prompt: str,
        chat_id: str
    ) -> str:
        """
        处理自然语言 prompt

        Args:
            prompt: 用户的自然语言描述
            chat_id: 群聊 ID

        Returns:
            生成的图片路径

        示例:
            "帮我生成一张 GM 的梗图"
            "来个 crypto 主题的，NFT 用 #1234"
            "生成一个 GM 的，加个贝雷帽和墨镜，风格用发光的"
            "liminal space illusion"  # 视觉风格描述
        """
        # 解析自然语言
        params = self.prompt_parser.parse(prompt)

        output_path = f"output/lark/meme_{chat_id}.png"

        # 检查是否需要自定义背景（如 McDonald 背景）- 优先级最高
        if params.get("custom_background") == "mcdonald":
            print(f"🍔 检测到 McDonald 背景请求")
            return self._generate_with_mcdonald_background(
                nft_id=params["nft_id"],
                layers=params["layers"],
                top_text=params["top_text"],
                bottom_text=params["bottom_text"],
                font_style=params["font_style"],
                all_caps=params["all_caps"],
                output_path=output_path
            )

        # 检查是否包含视觉风格描述（如 liminal space illusion）
        if params["visual_styles"] or params["use_prompt_enhancer"]:
            print(f"🎨 检测到视觉风格: {params['visual_styles']}")
            print(f"✨ 将使用 Prompt Enhancer 增强描述")

            # 使用 Prompt Enhancer 生成增强描述
            enhanced_prompt = self.meme_generator.generate_from_natural_language(
                prompt=prompt,
                bypass_enhancer=False,
                nft_id=params["nft_id"],
                output_path=output_path
            )

            # 当前版本：Prompt Enhancer 只返回增强后的文本
            # 未来版本：这里会调用 Effect/Mirage 功能生成图像
            print(f"💡 增强后的描述已生成")
            print(f"⚠️ 注意: Effect/Mirage 图像生成功能尚未实现")
            print(f"   当前返回的是增强后的文本描述")

            # 暂时回退到标准生成流程
            if params["template"]:
                return self.meme_generator.generate_from_template(
                    template_name=params["template"],
                    nft_id=params["nft_id"],
                    layers=params["layers"] if params["layers"] else None,
                    output_path=output_path
                )
            else:
                return self.meme_generator.generate(
                    nft_id=params["nft_id"],
                    layers=params["layers"] if params["layers"] else None,
                    top_text=params["top_text"] or "MILADY",
                    bottom_text=params["bottom_text"] or "MEME",
                    font_style=params["font_style"],
                    all_caps=params["all_caps"],
                    output_path=output_path
                )

        # 标准流程：根据解析结果生成
        # 优先级：1. 自定义文字 > 2. 有图层 > 3. 模板 > 4. 默认

        # 1. 如果有自定义文字，优先使用（即使有模板或图层）
        if params["top_text"] or params["bottom_text"]:
            return self.meme_generator.generate(
                nft_id=params["nft_id"],
                layers=params["layers"] if params["layers"] else None,
                top_text=params["top_text"],
                bottom_text=params["bottom_text"],
                font_style=params["font_style"],
                all_caps=params["all_caps"],
                output_path=output_path
            )

        # 2. 如果指定了图层，用户想要自定义 NFT + 图层，不要用模板
        # （即使命令中包含 "milady" 关键词）
        elif params["layers"]:
            return self.meme_generator.generate(
                nft_id=params["nft_id"],
                layers=params["layers"],
                top_text=None,  # 不使用文字
                bottom_text=None,
                font_style=params["font_style"],
                all_caps=params["all_caps"],
                output_path=output_path
            )

        # 3. 如果有模板，使用模板
        elif params["template"]:
            return self.meme_generator.generate_from_template(
                template_name=params["template"],
                nft_id=params["nft_id"],
                layers=None,  # 模板模式不使用额外图层
                output_path=output_path
            )

        # 4. 默认：随机 NFT + 默认文字
        else:
            return self.meme_generator.generate(
                nft_id=params["nft_id"],
                layers=None,
                top_text="MILADY",
                bottom_text="MEME",
                output_path=output_path
            )

    def handle_slash_command(
        self,
        command: str,
        args: list,
        chat_id: str
    ) -> str:
        """
        处理斜杠命令（V2 版本）

        Args:
            command: 命令名称（如 "meme", "memegen"）
            args: 命令参数列表
            chat_id: 群聊 ID

        Returns:
            生成的图片路径

        示例:
            /milady 1234                          # 生成 NFT #1234
            /milady 1234 Overlay:lasereyespurple # NFT + overlay 图层
            /milady 1234 Hat:Beret.png           # NFT + 帽子图层
            /milady 1234 top:GM bottom:LFG       # NFT + 文字

            /memegen drake 上方文字 下方文字       # 使用 Memegen 模板
            /memegen 分心男友 老功能 新功能        # 使用中文模板名

            /milady_illusion 1234                 # AI 风格转换
            /milady_replace 1234 帽子 全息帽子    # AI 配饰替换
        """
        if command == "memegen" or command == "meme":
            # 处理 Memegen.link 通用梗图模板
            return self.handle_memegen_command(args, chat_id)

        elif command == "milady_illusion" or command == "illusion":
            # 处理 AI 风格转换（Illusion Diffusion）
            return self.handle_milady_illusion_command(args, chat_id)

        elif command == "milady_replace" or command == "replace":
            # 处理 AI 配饰替换（FLUX Fill Pro）
            return self.handle_milady_replace_command(args, chat_id)

        elif command == "milady_replace_sam" or command == "replace_sam":
            # 处理 AI 配饰替换（FLUX Fill Pro + SAM 自动检测）
            return self.handle_milady_replace_sam_command(args, chat_id)

        elif command == "milady":
            # 解析参数
            params = self.parse_command_args(args)

            output_path = f"output/lark/meme_{chat_id}.png"

            # 使用模板或自定义文字
            if params["template"] and params["template"] != "random":
                return self.meme_generator.generate_from_template(
                    template_name=params["template"],
                    nft_id=params["nft_id"],
                    layers=params["layers"] if params["layers"] else None,
                    output_path=output_path
                )
            else:
                # 自定义或随机
                return self.meme_generator.generate(
                    nft_id=params["nft_id"],
                    layers=params["layers"] if params["layers"] else None,
                    top_text=params["top_text"],
                    bottom_text=params["bottom_text"],
                    font_style=params["font_style"],
                    all_caps=params["all_caps"],
                    output_path=output_path
                )

        else:
            raise ValueError(f"未知命令: {command}")

    def handle_memegen_command(
        self,
        args: list,
        chat_id: str
    ) -> str:
        """
        处理 Memegen.link 命令

        Args:
            args: 命令参数 [模板名, 剩余文字...]
            chat_id: 群聊 ID

        Returns:
            生成的图片路径

        示例:
            /memegen drake 上方文字 下方文字
            /memegen 分心男友 Replicate Memegen
            /memegen fine "Replicate还没到账" "This is fine"
            /memegen this is fine    # "this is fine" 作为完整文字
        """
        if len(args) < 1:
            # 没有参数，显示帮助
            help_msg = "💡 用法: /memegen 模板名 [文字]\n\n快速开始:\n• /memegen help - 查看帮助\n• /memegen list - 查看所有模板\n• /memegen fine this is fine - 生成梗图"
            self.send_card_message(chat_id, "Memegen 使用帮助", help_msg)
            return ""

        # 检查特殊命令
        first_arg = args[0].strip('"').lower()

        # 帮助命令
        if first_arg in ["help", "帮助", "?", "h"]:
            help_text = """📖 **Memegen 使用指南**

**基本格式：**
`/memegen [模板名] [文字内容]`

**热门示例：**

🔥 This is fine (着火狗)
`/memegen fine this is fine`
`/memegen 这很好 又要加班了`

👍 Drake 选择
`/memegen drake 旧方案 新方案`

👀 分心男友
`/memegen 分心男友 工作 摸鱼`

🌍 到处都是
`/memegen 到处都是 bugs`

**更多命令：**
`/memegen list` - 查看所有模板
`/memegen preview drake` - 预览模板效果
`/memegen+ drake 文字 --font=comic` - 使用高级功能

**提示：** 想要自定义字体、颜色？使用 `/memegen+` 命令！"""
            self.send_card_message(chat_id, "Memegen 使用指南", help_text)
            return ""

        # 列表命令
        if first_arg in ["list", "列表", "模板", "templates"]:
            try:
                # 从 API 获取所有模板
                templates = self.memegen_api.get_templates()

                # 构建列表文本 - 显示所有207个模板
                list_text = f"📋 **Memegen 所有可用模板** (共 {len(templates)} 个)\n\n"

                # 按字母顺序排序
                sorted_templates = sorted(templates, key=lambda x: x['id'])

                # 根据模板名称智能生成使用场景
                def get_scene_hint(name, template_id):
                    name_lower = name.lower()
                    # 对比/选择类
                    if any(word in name_lower for word in ['choice', 'drake', 'button', 'boyfriend', 'distracted', 'balloon']):
                        return "适合：对比两个选项"
                    # 反应/情绪类
                    elif any(word in name_lower for word in ['fine', 'afraid', 'scared', 'surprised', 'think', 'waiting']):
                        return "适合：表达情绪反应"
                    # 陈述/真相类
                    elif any(word in name_lower for word in ['aliens', 'always', 'said', 'facts', 'change my mind']):
                        return "适合：陈述观点"
                    # 庆祝/成功类
                    elif any(word in name_lower for word in ['success', 'winner', 'yeah', 'celebration']):
                        return "适合：庆祝成功"
                    # 讽刺/搞笑类
                    elif any(word in name_lower for word in ['picard', 'fry', 'suspicious', 'everywhere']):
                        return "适合：讽刺吐槽"
                    # 动物类
                    elif any(word in name_lower for word in ['cat', 'dog', 'seal', 'penguin', 'boat']):
                        return "适合：可爱/搞笑场景"
                    # 默认
                    else:
                        return "通用梗图模板"

                # 每个模板显示：序号 | ID | 名称 | 场景 | 预览链接
                for idx, t in enumerate(sorted_templates, 1):
                    template_id = t['id']
                    template_name = t['name']

                    # 生成使用场景提示
                    scene_hint = get_scene_hint(template_name, template_id)

                    # 构建 memecomplete.com 的编辑页面链接
                    if 'example' in t and 'text' in t['example']:
                        example_texts = t['example']['text']
                        top = example_texts[0] if len(example_texts) > 0 and example_texts[0] else '_'
                        bottom = example_texts[1] if len(example_texts) > 1 and example_texts[1] else '_'
                    else:
                        top = '_'
                        bottom = '_'

                    # URL编码 - 使用 memegen_api 的编码函数
                    if top == '_':
                        top_encoded = '_'
                    else:
                        top_encoded = self.memegen_api._encode_text(top)

                    if bottom == '_':
                        bottom_encoded = '_'
                    else:
                        bottom_encoded = self.memegen_api._encode_text(bottom)

                    preview_url = f"https://memecomplete.com/edit/images/{template_id}/{top_encoded}/{bottom_encoded}.webp"

                    # 显示格式：序号. ID - 名称 | 场景 | 预览链接
                    list_text += f"{idx}. `{template_id}` - {template_name}\n"
                    list_text += f"   {scene_hint}\n"
                    list_text += f"   {preview_url}\n\n"

                list_text += "\n**💡 使用方法：**\n"
                list_text += "```\n"
                list_text += "/memegen 模板ID 你的文字\n"
                list_text += "/memegen drake 旧方案 新方案\n"
                list_text += "/memegen fine 又出bug了\n"
                list_text += "```\n\n"
                list_text += "**提示：** 点击预览链接可以在线编辑模板"

                self.send_card_message(chat_id, "Memegen 模板列表", list_text)
            except Exception as e:
                error_msg = f"❌ 获取模板列表失败: {str(e)}\n\n可以访问 https://memecomplete.com 查看所有模板"
                self.send_card_message(chat_id, "Memegen 模板列表", error_msg)

            return ""

        # 预览命令
        if first_arg in ["preview", "预览", "示例", "example"]:
            if len(args) < 2:
                preview_help = "💡 用法: `/memegen preview 模板名`\n\n示例:\n`/memegen preview drake`\n`/memegen preview fine`"
                self.send_card_message(chat_id, "预览模板", preview_help)
                return ""

            template = args[1].strip('"')

            # 热门模板的默认示例文字
            preview_examples = {
                "drake": ("使用旧技术", "使用新技术"),
                "db": ("原来的功能", "新功能"),
                "fine": ("代码出bug了", "This is fine"),
                "buzz": ("Bug", "Bug everywhere"),
                "afraid": ("不懂的问题", "不敢问"),
                "spiderman": ("你抄我", "我抄你"),
                "oprah": ("Bug给你", "Bug也给你"),
                "astronaut": ("都是Bug?", "Always has been"),
                "both": ("修Bug", "写新功能"),
                "balloon": ("该做的事", "想做的事"),
            }

            # 获取示例文字
            if template in preview_examples:
                top, bottom = preview_examples[template]
            else:
                top, bottom = "示例文字", "Example text"

            # 生成预览图
            output_path = f"output/lark/preview_{template}.png"
            try:
                result = self.memegen_api.generate_meme(
                    template=template,
                    top_text=top,
                    bottom_text=bottom,
                    output_path=output_path
                )
                return result  # 返回图片路径，会自动发送到飞书
            except Exception as e:
                error_msg = f"❌ 生成预览失败: {str(e)}\n\n请检查模板名是否正确，或使用 `/memegen list` 查看可用模板"
                self.send_card_message(chat_id, "预览失败", error_msg)
                return ""

        # 高级功能命令 - /memegen+ 或 /memegen advanced
        if first_arg in ["advanced", "高级", "+", "plus"]:
            return self.handle_memegen_advanced(args[1:], chat_id)

        # 普通生成命令
        template = args[0].strip('"')
        remaining_text = ' '.join(args[1:])

        top_text = remaining_text
        bottom_text = ""

        if not top_text:
            top_text = ""

        output_path = f"output/lark/memegen_{chat_id}.png"

        print(f"🎨 生成 Memegen 梗图:")
        print(f"   模板: {template}")
        print(f"   文字: {top_text}")

        try:
            return self.memegen_api.generate_meme(
                template=template,
                top_text=top_text,
                bottom_text=bottom_text,
                output_path=output_path
            )
        except Exception as e:
            error_type = str(e)

            # 提供更友好的错误提示
            if "404" in error_type or "Not Found" in error_type:
                # 检查是否是中文别名问题
                suggested_templates = []
                if template in ["很好", "好", "fine"]:
                    suggested_templates.append("`这很好` 或 `fine`")
                elif template in ["男友", "出轨", "分心"]:
                    suggested_templates.append("`分心男友` 或 `db`")
                elif template in ["到处", "都是"]:
                    suggested_templates.append("`到处都是` 或 `buzz`")

                if suggested_templates:
                    error_msg = f"❌ 找不到模板 `{template}`\n\n💡 你可能想用: {', '.join(suggested_templates)}\n\n查看所有模板: `/memegen list`"
                else:
                    error_msg = f"❌ 找不到模板 `{template}`\n\n请使用 `/memegen list` 查看所有可用模板"
            elif "redirect" in error_type.lower():
                error_msg = f"❌ 模板 `{template}` 配置错误\n\n请尝试:\n1. 使用 `/memegen list` 查看正确的模板名\n2. 检查是否使用了完整的中文别名"
            else:
                error_msg = f"❌ 生成失败: {error_type}\n\n常见问题:\n• 模板名错误 → `/memegen list` 查看\n• 特殊字符问题 → 避免使用 # % / 等符号"

            self.send_card_message(chat_id, "生成失败", error_msg)
            return ""

    def handle_milady_illusion_command(self, args: list, chat_id: str) -> str:
        """
        处理 /milady 命令 - 使用 IllusionDiffusion 生成特效 Milady

        只支持高级模式，需要明确指定所有参数

        格式:
            /milady NFT编号
            effect_strength: 数值
            positive_prompt: 完整描述
            negative_prompt: 负面词

        示例:
            /milady 5555
            effect_strength: 0.9
            positive_prompt: same character holding pizza, superrealistic style, highly detailed
            negative_prompt: low quality, blurry, different person
        """
        if len(args) < 1 or (len(args) == 1 and args[0] == 'help'):
            help_msg = """✨ **Milady AI 特效生成器**

使用 AI 为 Milady NFT 添加特效！

**必需格式（高级模式）**
```
/milady NFT编号
effect_strength: 数值
positive_prompt: 完整描述
negative_prompt: 负面词（可选）
```

**参数说明:**
- `effect_strength`: 特效强度（必需）
  - 0.6-0.8 = 微调（最保留原图）
  - 0.9-1.1 = 适中（推荐）
  - 1.2-1.5 = 强烈（明显转换）

- `positive_prompt`: 完整的正向描述（必需）
  - 推荐格式: `same character, {你的描述}, high quality, detailed`
  - 关键词: same character（保持人物）, maintaining identity（保持身份）
  - 用英文描述最准确

- `negative_prompt`: 负向描述（可选）
  - 推荐: `low quality, blurry, different person, different face`
  - 明确禁止改变人物

**完整示例:**
```
/milady 5050
effect_strength: 0.9
positive_prompt: same character holding pizza, superrealistic style, highly detailed, photorealistic, maintaining identity and features
negative_prompt: low quality, blurry, bad anatomy, different person, different character, different face, wrong identity
```

**快速案例:**

1️⃣ 保留原图（推荐新手）
```
/milady 3456
effect_strength: 0.8
positive_prompt: same character, subtle enhancement, high quality, detailed
negative_prompt: low quality, blurry, different person
```

2️⃣ 赛博朋克风格
```
/milady 5555
effect_strength: 1.0
positive_prompt: same character, cyberpunk style, neon lights, futuristic, vibrant colors, maintaining identity
negative_prompt: low quality, blurry, different person, natural
```

3️⃣ 写实照片风格
```
/milady 9999
effect_strength: 0.9
positive_prompt: same character, photorealistic, professional photography, studio lighting, highly detailed, maintaining original features
negative_prompt: low quality, blurry, different person, anime, cartoon
```

**重要提示:**
- 必须提供 `positive_prompt`，否则无法生成
- 建议在 prompt 中包含 "same character" 以保持人物
- effect_strength 越低越保留原图，推荐 0.8-1.0
- 首次使用需初始化（约10秒）"""
            self.send_card_message(chat_id, "Milady AI 特效帮助", help_msg)
            return ""

        # 解析参数
        try:
            nft_id = int(args[0])
            remaining_text = ' '.join(args[1:])

            # 检查是否提供了必需的参数
            if 'positive_prompt:' not in remaining_text:
                error_msg = """❌ 必须提供 positive_prompt 参数

**正确格式:**
```
/milady 5050
effect_strength: 0.9
positive_prompt: same character holding pizza, superrealistic style, highly detailed
negative_prompt: low quality, blurry, different person
```

**提示:** 发送 `/milady help` 查看完整帮助"""
                self.send_card_message(chat_id, "参数错误", error_msg)
                return ""

            # 默认参数值
            effect_strength = EFFECT_STRENGTH
            positive_prompt = None
            negative_prompt = NEGATIVE_PROMPT
            guidance_scale = GUIDANCE_SCALE
            num_inference_steps = NUM_INFERENCE_STEPS

            print("🎨 使用高级模式，解析自定义参数...")

            # 解析 effect_strength（可选，使用配置文件默认值）
            if 'effect_strength:' in remaining_text:
                try:
                    es_match = re.search(r'effect_strength:\s*([\d.]+)', remaining_text, re.IGNORECASE)
                    if es_match:
                        effect_strength = float(es_match.group(1))
                        print(f"   Effect Strength: {effect_strength}")
                except Exception as e:
                    print(f"   解析 effect_strength 失败: {e}")

            # 解析 positive_prompt（必需）
            pp_match = re.search(r'positive_prompt:\s*([^\n]+?)(?=\s*negative_prompt:|guidance_scale:|num_inference_steps:|$)', remaining_text, re.IGNORECASE | re.DOTALL)
            if pp_match:
                positive_prompt = pp_match.group(1).strip()
                print(f"   Positive Prompt: {positive_prompt[:80]}...")
            else:
                error_msg = """❌ 无法解析 positive_prompt

请确保格式正确:
```
positive_prompt: same character holding pizza, detailed
```"""
                self.send_card_message(chat_id, "参数错误", error_msg)
                return ""

            # 解析 negative_prompt（可选）
            if 'negative_prompt:' in remaining_text:
                np_match = re.search(r'negative_prompt:\s*([^\n]+?)(?=\s*guidance_scale:|num_inference_steps:|$)', remaining_text, re.IGNORECASE | re.DOTALL)
                if np_match:
                    negative_prompt = np_match.group(1).strip()
                    if not negative_prompt:  # 如果为空，使用默认值
                        negative_prompt = NEGATIVE_PROMPT
                    print(f"   Negative Prompt: {negative_prompt[:80]}...")

            # 解析 guidance_scale（可选）
            if 'guidance_scale:' in remaining_text:
                try:
                    gs_match = re.search(r'guidance_scale:\s*([\d.]+)', remaining_text, re.IGNORECASE)
                    if gs_match:
                        guidance_scale = float(gs_match.group(1))
                        print(f"   Guidance Scale: {guidance_scale}")
                except Exception as e:
                    print(f"   解析 guidance_scale 失败: {e}")

            # 解析 num_inference_steps（可选）
            if 'num_inference_steps:' in remaining_text:
                try:
                    ni_match = re.search(r'num_inference_steps:\s*(\d+)', remaining_text, re.IGNORECASE)
                    if ni_match:
                        num_inference_steps = int(ni_match.group(1))
                        print(f"   Inference Steps: {num_inference_steps}")
                except Exception as e:
                    print(f"   解析 num_inference_steps 失败: {e}")

            # 直接使用用户提供的 positive_prompt，不添加任何模板
            description = positive_prompt
            positive_prompt_template = "{description}"

        except ValueError:
            error_msg = """❌ NFT编号必须是数字

**示例:**
```
/milady 5050
positive_prompt: same character, detailed
```"""
            self.send_card_message(chat_id, "参数错误", error_msg)
            return ""

        # 初始化 Replicate ControlNet (延迟加载)
        if self.replicate_illusion is None:
            print("🎨 首次使用 Replicate ControlNet，正在初始化...")
            try:
                replicate_token = os.getenv("REPLICATE_API_TOKEN")
                if not replicate_token:
                    raise ValueError("REPLICATE_API_TOKEN 未配置，请在 config/.env 中设置")
                self.replicate_illusion = ReplicateIllusion(api_token=replicate_token)
                print("✅ Replicate ControlNet 客户端已初始化")
            except Exception as e:
                error_msg = f"❌ Replicate 初始化失败: {str(e)}\n\n请检查 API Token"
                self.send_card_message(chat_id, "初始化失败", error_msg)
                return ""

        # 先生成基础的 Milady NFT 图片
        print(f"🎨 生成 Milady #{nft_id} 基础图...")
        base_nft_path = f"output/lark/milady_{nft_id}_base.png"

        try:
            self.meme_generator.generate(
                nft_id=nft_id,
                layers=None,
                top_text=None,
                bottom_text=None,
                output_path=base_nft_path
            )
        except Exception as e:
            error_msg = f"❌ 生成 NFT #{nft_id} 失败: {str(e)}"
            self.send_card_message(chat_id, "生成失败", error_msg)
            return ""

        # 使用 Replicate ControlNet 添加特效
        print(f"✨ 使用 Replicate ControlNet 添加特效...")
        print(f"   描述: {description}")

        output_path = f"output/lark/milady_{nft_id}_illusion.png"

        try:
            # 使用解析出的参数（高级模式）或配置文件参数（简单模式）
            result = self.replicate_illusion.generate_milady_with_effect(
                milady_nft_path=base_nft_path,
                description=description,
                output_path=output_path,
                effect_strength=effect_strength,
                positive_prompt_template=positive_prompt_template,
                negative_prompt=negative_prompt,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps
            )
            return result
        except Exception as e:
            error_str = str(e)

            # 友好的错误信息
            if "Insufficient credit" in error_str:
                error_msg = (
                    f"❌ Replicate 余额不足\n\n"
                    f"请访问 https://replicate.com/account/billing 充值\n"
                    f"当前余额应该有 $5.00，请检查"
                )
            else:
                error_msg = f"❌ 生成失败: {error_str}\n\n请稍后重试"

            self.send_card_message(chat_id, "生成失败", error_msg)
            return ""

    def handle_milady_replace_command(self, args: list, chat_id: str) -> str:
        """
        处理 FLUX Fill Pro 配饰替换命令

        支持两种格式:
        1. 简单格式: /milady_replace NFT编号 配饰类型 新描述
           示例: /milady_replace 5050 glasses cyberpunk sunglasses with neon glow

        2. 多行格式:
           /milady_replace NFT编号
           accessory: 配饰类型
           description: 新配饰描述
           guidance: 30.0 (可选)
           steps: 28 (可选)

        支持的配饰类型:
        - hat: 帽子
        - glasses: 眼镜
        - earrings: 耳环（左耳）
        - earrings_right: 耳环（右耳）
        - necklace: 项链
        - clothes: 衣服
        """
        if len(args) < 1:
            help_msg = """🎨 **AI 配饰替换功能**

使用 FLUX Fill Pro 智能替换 Milady NFT 配饰

**简单格式:**
`/milady_replace NFT编号 配饰类型 新描述`

**示例:**
```
/milady_replace 5050 glasses cyberpunk sunglasses with purple neon glow
/milady_replace 1234 hat futuristic holographic cap
/milady_replace 8888 clothes black leather jacket with neon patches
```

**支持的配饰类型:**
• hat (帽子)
• glasses (眼镜)
• earrings (耳环/左耳环)
• earrings_right (右耳环)
• necklace (项链)
• clothes (衣服/上衣/外套)

**✅ 支持中文:**
可以直接使用中文配饰类型，如：
```
/milady_replace 5050 帽子 未来主义全息帽子
/milady_replace 1234 眼镜 赛博朋克墨镜
```

**高级格式（多行）:**
```
/milady_replace 5050
accessory: glasses
description: cyberpunk sunglasses with purple glow, futuristic, highly detailed
guidance: 30.0
steps: 28
```

**提示:**
• 描述越详细，效果越好
• guidance 控制生成强度（推荐 20-40）
• steps 控制质量（推荐 20-40）
"""
            self.send_card_message(chat_id, "配饰替换帮助", help_msg)
            return ""

        # 中文到英文的配饰类型映射
        ACCESSORY_CN_TO_EN = {
            "帽子": "hat",
            "眼镜": "glasses",
            "耳环": "earrings",
            "左耳环": "earrings",
            "右耳环": "earrings_right",
            "项链": "necklace",
            "衣服": "clothes",
            "上衣": "clothes",
            "外套": "clothes"
        }

        # 延迟加载 FLUX Fill Pro
        if self.flux_fill_pro is None:
            try:
                from src.meme.flux_fill_pro import FluxFillPro
                self.flux_fill_pro = FluxFillPro()
            except Exception as e:
                error_msg = f"❌ FLUX Fill Pro 初始化失败: {str(e)}\n\n请检查 REPLICATE_API_TOKEN 是否配置正确"
                self.send_card_message(chat_id, "初始化失败", error_msg)
                return ""

        # 解析 NFT 编号
        try:
            nft_id = int(args[0])
        except ValueError:
            error_msg = f"❌ NFT 编号必须是数字，收到: {args[0]}"
            self.send_card_message(chat_id, "参数错误", error_msg)
            return ""

        # 检测格式：简单格式 vs 多行格式
        if len(args) >= 3 and ":" not in args[1]:
            # 简单格式: /milady_replace 5050 glasses cyberpunk sunglasses
            accessory_type = args[1]
            new_description = " ".join(args[2:])
            guidance = 30.0
            steps = 28
        else:
            # 多行格式：解析参数
            accessory_type = None
            new_description = None
            guidance = 30.0
            steps = 28

            for arg in args[1:]:
                if ":" in arg:
                    key, value = arg.split(":", 1)
                    key = key.strip().lower()
                    value = value.strip()

                    if key == "accessory":
                        accessory_type = value
                    elif key == "description":
                        new_description = value
                    elif key == "guidance":
                        try:
                            guidance = float(value)
                        except ValueError:
                            pass
                    elif key == "steps":
                        try:
                            steps = int(value)
                        except ValueError:
                            pass

            # 检查必需参数
            if not accessory_type:
                error_msg = "❌ 缺少必需参数: accessory (配饰类型)\n\n使用 `/milady_replace` 查看帮助"
                self.send_card_message(chat_id, "参数错误", error_msg)
                return ""

            if not new_description:
                error_msg = "❌ 缺少必需参数: description (新配饰描述)\n\n使用 `/milady_replace` 查看帮助"
                self.send_card_message(chat_id, "参数错误", error_msg)
                return ""

        # 智能配饰类型推断（支持任意中英文配饰名称）
        from src.meme.sam_detector import SAMDetector
        original_accessory = accessory_type
        accessory_type, display_name = SAMDetector.infer_accessory_type(accessory_type)

        if original_accessory.lower() != accessory_type:
            print(f"🎯 智能推断: '{original_accessory}' → {accessory_type} ({display_name})")

        # 发送处理中消息
        processing_msg = f"""🎨 **正在替换配饰...**

**NFT 编号:** {nft_id}
**配饰类型:** {accessory_type}
**新描述:** {new_description}
**Guidance:** {guidance}
**Steps:** {steps}

⏳ 预计需要 30-60 秒...
"""
        self.send_card_message(chat_id, "AI 配饰替换", processing_msg)

        try:
            # 1. 生成基础 Milady NFT 图片（无图层、无文字）
            base_image_path = f"/tmp/milady_{nft_id}_base.png"
            self.meme_generator.generate(
                nft_id=nft_id,
                layers=None,
                top_text="",
                bottom_text="",
                output_path=base_image_path,
                output_size=(500, 500)  # 使用标准 NFT 尺寸
            )

            if not os.path.exists(base_image_path):
                raise FileNotFoundError(f"基础 Milady NFT 图片生成失败: {base_image_path}")

            # 2. 使用 FLUX Fill Pro 替换配饰
            output_path = f"/tmp/milady_{nft_id}_replaced_{accessory_type}.png"

            result_path = self.flux_fill_pro.replace_accessory(
                image_path=base_image_path,
                accessory_type=accessory_type,
                new_description=new_description,
                output_path=output_path,
                guidance=guidance,
                num_inference_steps=steps
            )

            # 3. 发送成功消息
            success_msg = f"""✅ **配饰替换成功！**

**NFT 编号:** {nft_id}
**配饰类型:** {accessory_type}
**新描述:** {new_description}

💡 **提示:**
• 如需调整效果，可修改 guidance 参数
• 描述越详细，生成效果越精准
"""
            self.send_card_message(chat_id, "替换成功", success_msg)

            return result_path

        except Exception as e:
            import traceback
            error_str = str(e)
            error_trace = traceback.format_exc()

            print(f"❌ 配饰替换失败: {error_str}")
            print(error_trace)

            # 根据错误类型提供更详细的提示
            if "REPLICATE_API_TOKEN" in error_str:
                error_msg = f"❌ Replicate API Token 未配置\n\n请设置环境变量 REPLICATE_API_TOKEN"
            elif "Unknown accessory type" in error_str or "未知的配饰类型" in error_str:
                error_msg = f"❌ 不支持的配饰类型: {accessory_type}\n\n支持的类型: hat (帽子), glasses (眼镜), earrings (耳环), earrings_right (右耳环), necklace (项链), clothes (衣服)"
            elif "FileNotFoundError" in error_str:
                error_msg = f"❌ Milady #{nft_id} 基础图片生成失败\n\n请检查 NFT 编号是否正确（范围 0-9999）"
            else:
                error_msg = f"❌ 替换失败: {error_str}\n\n请稍后重试或联系管理员"

            self.send_card_message(chat_id, "替换失败", error_msg)
            return ""

    def handle_milady_replace_sam_command(self, args: list, chat_id: str) -> str:
        """
        处理 FLUX Fill Pro + SAM 配饰替换命令（使用 SAM 自动检测）

        支持两种格式:
        1. 简单格式: /milady_replace_sam NFT编号 配饰类型 新描述
           示例: /milady_replace_sam 5050 glasses cyberpunk sunglasses with neon glow

        2. 多行格式:
           /milady_replace_sam NFT编号
           accessory: 配饰类型
           description: 新配饰描述
           guidance: 30.0 (可选)
           steps: 28 (可选)

        SAM 功能:
        - 自动检测配饰区域（无需手动定义坐标）
        - 智能匹配算法（IoU + 位置启发式）
        - 缓存优化（节省 API 成本）
        """
        if len(args) < 1:
            help_msg = """🔍 **AI 配饰替换 + SAM 自动检测**

使用 FLUX Fill Pro + SAM 自动检测配饰区域并替换

**SAM 优势:**
✅ 自动检测配饰位置（无需手动坐标）
✅ 智能匹配算法（位置 + IoU）
✅ 缓存优化（节省成本）
✅ 检测更精确

**简单格式:**
`/milady_replace_sam NFT编号 配饰类型 新描述`

**示例:**
```
/milady_replace_sam 5050 glasses cyberpunk sunglasses with purple neon glow
/milady_replace_sam 1234 hat futuristic holographic cap
/milady_replace_sam 3274 earrings glowing diamond earrings
```

**支持的配饰类型:**
• hat (帽子)
• glasses (眼镜、墨镜、护目镜)
• earrings (耳环、耳钉、耳坠)
• necklace (项链、吊坠、choker)
• scarf (围巾、丝巾、披肩)
• **智能识别** - 支持更多中英文配饰名称自动识别！

**✅ 支持中文 + 智能识别:**
```
/milady_replace_sam 5050 帽子 未来主义全息帽子
/milady_replace_sam 1234 墨镜 赛博朋克紫色墨镜
/milady_replace_sam 3333 围巾 红色丝质围巾
/milady_replace_sam 5678 吊坠 钻石吊坠项链
```

💡 **智能扩展:** 系统会自动识别常见配饰类型（如：围巾、丝巾、墨镜、耳钉等），无需记忆固定名称！

**高级格式（多行）:**
```
/milady_replace_sam 5050
accessory: glasses
description: cyberpunk sunglasses with purple glow, futuristic, highly detailed
guidance: 30.0
steps: 28
```

**成本:**
• SAM 检测: <$0.01/次（极低成本，几乎可忽略）
• FLUX Fill Pro: $0.050/次
• 总计: ≈$0.05/张

**vs 普通模式:**
`/milady_replace` - 使用预定义区域
`/milady_replace_sam` - 智能选择 SAM 或预定义（自动优化精度和成本）
"""
            self.send_card_message(chat_id, "SAM 配饰替换帮助", help_msg)
            return ""

        # 延迟加载 FLUX Fill Pro（启用 SAM）
        if self.flux_fill_pro is None or not self.flux_fill_pro.use_sam:
            try:
                from src.meme.flux_fill_pro import FluxFillPro
                self.flux_fill_pro = FluxFillPro(use_sam=True)  # 启用 SAM
                print("✅ FLUX Fill Pro + SAM 已初始化")
            except Exception as e:
                error_msg = f"❌ FLUX Fill Pro + SAM 初始化失败: {str(e)}\n\n请检查 REPLICATE_API_TOKEN 是否配置正确"
                self.send_card_message(chat_id, "初始化失败", error_msg)
                return ""

        # 解析 NFT 编号
        try:
            nft_id = int(args[0])
        except ValueError:
            error_msg = f"❌ NFT 编号必须是数字，收到: {args[0]}"
            self.send_card_message(chat_id, "参数错误", error_msg)
            return ""

        # 检测格式：简单格式 vs 多行格式
        if len(args) >= 3 and ":" not in args[1]:
            # 简单格式: /milady_replace_sam 5050 glasses cyberpunk sunglasses
            accessory_type = args[1]
            new_description = " ".join(args[2:])
            guidance = 30.0
            steps = 28
        else:
            # 多行格式：解析参数
            accessory_type = None
            new_description = None
            guidance = 30.0
            steps = 28

            for arg in args[1:]:
                if ":" in arg:
                    key, value = arg.split(":", 1)
                    key = key.strip().lower()
                    value = value.strip()

                    if key == "accessory":
                        accessory_type = value
                    elif key == "description":
                        new_description = value
                    elif key == "guidance":
                        try:
                            guidance = float(value)
                        except ValueError:
                            pass
                    elif key == "steps":
                        try:
                            steps = int(value)
                        except ValueError:
                            pass

            # 检查必需参数
            if not accessory_type:
                error_msg = "❌ 缺少必需参数: accessory (配饰类型)\n\n使用 `/milady_replace_sam` 查看帮助"
                self.send_card_message(chat_id, "参数错误", error_msg)
                return ""

            if not new_description:
                error_msg = "❌ 缺少必需参数: description (新配饰描述)\n\n使用 `/milady_replace_sam` 查看帮助"
                self.send_card_message(chat_id, "参数错误", error_msg)
                return ""

        # 智能配饰类型推断（支持任意中英文配饰名称）
        from src.meme.sam_detector import SAMDetector
        original_accessory = accessory_type
        accessory_type, display_name = SAMDetector.infer_accessory_type(accessory_type)

        if original_accessory.lower() != accessory_type:
            print(f"🎯 智能推断: '{original_accessory}' → {accessory_type} ({display_name})")

        # 🎯 智能模式选择：根据配饰类型和描述自动决定用 SAM 还是预定义
        use_sam_for_this, decision_reason = SAMDetector.should_use_sam(accessory_type, new_description)

        # 发送处理中消息
        mode_text = "SAM 自动检测" if use_sam_for_this else "预定义区域"
        cost_text = "≈$0.05 (SAM <$0.01)" if use_sam_for_this else "$0.05"

        processing_msg = f"""🔍 **正在替换配饰...**

**NFT 编号:** {nft_id}
**配饰类型:** {accessory_type}
**新描述:** {new_description}
**Guidance:** {guidance}
**Steps:** {steps}

🎯 **智能模式选择:** {mode_text}
💡 **原因:** {decision_reason}
💰 **成本:** {cost_text}

⏳ 步骤:
1. 生成基础 NFT 图片
2. {'使用 SAM 自动检测配饰区域' if use_sam_for_this else '使用预定义配饰区域'}
3. FLUX Fill Pro 智能替换

预计需要 {'40-80' if use_sam_for_this else '30-50'} 秒...
"""
        self.send_card_message(chat_id, "智能配饰替换", processing_msg)

        try:
            # 1. 生成基础 Milady NFT 图片（无图层、无文字）
            base_image_path = f"/tmp/milady_{nft_id}_base.png"
            self.meme_generator.generate(
                nft_id=nft_id,
                layers=None,
                top_text="",
                bottom_text="",
                output_path=base_image_path,
                output_size=(500, 500)  # 使用标准 NFT 尺寸
            )

            if not os.path.exists(base_image_path):
                raise FileNotFoundError(f"基础 Milady NFT 图片生成失败: {base_image_path}")

            # 2. 使用 FLUX Fill Pro (智能选择 SAM 或预定义)
            output_path = f"/tmp/milady_{nft_id}_smart_replaced_{accessory_type}.png"

            # 使用智能选择的模式
            result_path = self.flux_fill_pro.replace_accessory(
                image_path=base_image_path,
                accessory_type=accessory_type,
                new_description=new_description,
                output_path=output_path,
                guidance=guidance,
                num_inference_steps=steps,
                force_sam=use_sam_for_this  # 🎯 智能选择
            )

            # 3. 发送成功消息（包含模式信息）
            detection_info = f"""🔍 **SAM 自动检测:**
• 自动检测配饰区域
• 智能匹配算法
• 比预定义区域更精确""" if use_sam_for_this else f"""📍 **预定义区域:**
• 使用固定配饰位置
• 稳定可靠
• 成本更低（节省 $0.011）"""

            success_msg = f"""✅ **配饰替换成功！**

**NFT 编号:** {nft_id}
**配饰类型:** {accessory_type}
**新描述:** {new_description}

{detection_info}

💡 **提示:**
• 模式: {mode_text}
• 成本: {cost_text}
• FLUX Fill Pro: $0.050
• 缓存可节省 50-70% 成本
"""
            self.send_card_message(chat_id, "替换成功", success_msg)

            return result_path

        except Exception as e:
            import traceback
            error_str = str(e)
            error_trace = traceback.format_exc()

            print(f"❌ SAM 配饰替换失败: {error_str}")
            print(error_trace)

            # 根据错误类型提供更详细的提示
            if "REPLICATE_API_TOKEN" in error_str:
                error_msg = f"❌ Replicate API Token 未配置\n\n请设置环境变量 REPLICATE_API_TOKEN"
            elif "Unknown accessory type" in error_str or "未知的配饰类型" in error_str:
                error_msg = f"❌ 不支持的配饰类型: {accessory_type}\n\n支持的类型: hat (帽子), glasses (眼镜), earrings (耳环), necklace (项链)"
            elif "FileNotFoundError" in error_str:
                error_msg = f"❌ Milady #{nft_id} 基础图片生成失败\n\n请检查 NFT 编号是否正确（范围 0-9999）"
            elif "SAM" in error_str:
                error_msg = f"❌ SAM 检测失败: {error_str}\n\n可能原因:\n• Replicate API 限流\n• NFT 图片质量问题\n• 配饰不存在或不明显\n\n建议使用 `/milady_replace` (不使用 SAM)"
            else:
                error_msg = f"❌ 替换失败: {error_str}\n\n请稍后重试或联系管理员"

            self.send_card_message(chat_id, "替换失败", error_msg)
            return ""

    def handle_memegen_advanced(self, args: list, chat_id: str) -> str:
        """
        处理高级 memegen 命令

        格式: /memegen+ 模板名 上方文字 下方文字 [选项]

        选项（可选）:
            --font=字体名        字体: comic, impact, thick
            --color=颜色1,颜色2  颜色: red,blue 或 FF00FF,00FF00
            --size=宽x高         尺寸: 800x600, 1000x750
            --style=样式名       备用样式

        示例:
            /memegen+ drake 旧方案 新方案 --font=comic
            /memegen+ fine 出bug了 --color=red,blue
            /memegen+ both 选项A 选项B --size=1000x750
            /memegen+ drake 上方 下方 --font=comic --color=purple,gold --size=800x600
        """
        if len(args) < 1:
            help_msg = """🎨 **Memegen 高级功能**

**基本格式:**
`/memegen+ 模板名 文字 [选项]`

**可用选项:**
• `--font=字体` - 字体选择
  可选: comic, impact, thick

• `--color=颜色1,颜色2` - 文字颜色
  可选: red, blue, purple, gold
  或 Hex: FF00FF, 00FF00

• `--size=宽x高` - 图片尺寸
  示例: 800x600, 1000x750

• `--style=样式` - 备用样式
  某些模板支持

**示例命令:**
```
/memegen+ drake 旧方案 新方案 --font=comic
/memegen+ fine 又出bug了 --color=red
/memegen+ both A B --size=1000x750
/memegen+ drake 上 下 --font=comic --color=purple,gold
```

**提示:** 多个选项可以同时使用！"""
            self.send_card_message(chat_id, "Memegen 高级功能", help_msg)
            return ""

        # 解析参数
        template = None
        text_parts = []
        options = {
            'font': None,
            'color': None,
            'width': None,
            'height': None,
            'style': None
        }

        for arg in args:
            if arg.startswith('--'):
                # 解析选项
                if '=' in arg:
                    key, value = arg[2:].split('=', 1)
                    key = key.lower()

                    if key == 'font':
                        options['font'] = value
                    elif key == 'color':
                        options['color'] = value
                    elif key == 'size':
                        # 解析 800x600 格式
                        if 'x' in value.lower():
                            parts = value.lower().split('x')
                            if len(parts) == 2:
                                try:
                                    options['width'] = int(parts[0])
                                    options['height'] = int(parts[1])
                                except ValueError:
                                    pass
                    elif key == 'style':
                        options['style'] = value
            else:
                # 普通文字参数
                if template is None:
                    template = arg.strip('"')
                else:
                    text_parts.append(arg.strip('"'))

        if not template:
            error_msg = "❌ 缺少模板名\n\n用法: `/memegen+ 模板名 文字 [选项]`"
            self.send_card_message(chat_id, "参数错误", error_msg)
            return ""

        # 组合文字
        full_text = ' '.join(text_parts)
        top_text = full_text
        bottom_text = ""

        # 生成图片
        output_path = f"output/lark/advanced_{template}_{hash(full_text) % 10000}.png"

        try:
            result = self.memegen_api.generate_meme(
                template=template,
                top_text=top_text,
                bottom_text=bottom_text,
                output_path=output_path,
                font=options['font'],
                color=options['color'],
                width=options['width'],
                height=options['height'],
                style=options['style']
            )
            return result
        except Exception as e:
            error_msg = f"❌ 生成失败: {str(e)}\n\n请检查:\n• 模板名是否正确\n• 选项格式是否正确\n• 使用 `/memegen+ help` 查看帮助"
            self.send_card_message(chat_id, "生成失败", error_msg)
            return ""

    def process_message(self, event_data: Dict) -> Optional[str]:
        """
        处理接收到的消息事件

        Args:
            event_data: 飞书事件数据

        Returns:
            生成的图片路径（如果有）
        """
        event = event_data.get("event", {})
        message = event.get("message", {})

        # 获取消息内容
        content = json.loads(message.get("content", "{}"))
        text = content.get("text", "").strip()

        # 清理 @ 提及（飞书消息格式："/meme gm @机器人" 或 "@机器人 /meme gm"）
        import re
        text = re.sub(r'@[^\s]+', '', text).strip()

        # 获取聊天 ID
        chat_id = message.get("chat_id")

        print(f"📩 收到消息: '{text}' (chat_id: {chat_id})")

        # 检查是否是斜杠命令或自然语言
        try:
            if text.startswith("/"):
                # 斜杠命令模式
                # 支持多行参数格式（用换行符分割）
                lines = text.split('\n')
                first_line = lines[0].strip()
                parts = first_line.split()
                command = parts[0][1:]  # 去掉 /

                # 第一行的其他部分作为参数
                args = parts[1:]

                # 如果有多行，把后续行也加入参数列表
                if len(lines) > 1:
                    for line in lines[1:]:
                        line = line.strip()
                        if line:  # 忽略空行
                            args.append(line)

                print(f"🎯 处理命令: {command}, 参数: {args}")
                image_path = self.handle_slash_command(command, args, chat_id)
            else:
                # 自然语言模式
                print(f"💬 处理自然语言: {text}")
                image_path = self.handle_natural_language(text, chat_id)

            print(f"✅ 图片生成成功: {image_path}")

            # 尝试上传并发送图片
            try:
                print(f"📤 尝试上传图片...")
                image_key = self.upload_image(image_path)
                print(f"✅ 图片上传成功: {image_key}")

                print(f"📨 发送消息...")
                self.send_image_message(chat_id, image_key)
                print(f"✅ 消息发送成功")

            except Exception as upload_error:
                # 如果上传失败（权限问题），使用临时方案
                print(f"⚠️ 图片上传失败: {upload_error}")
                print(f"📝 权限审核中，图片已生成但无法发送到飞书")

                # 获取图片文件名
                from pathlib import Path
                filename = Path(image_path).name

                # 尝试发送卡片消息告知用户（如果有权限的话）
                try:
                    self.send_card_message(
                        chat_id,
                        "✅ Meme 生成成功！",
                        f"图片已生成：`{filename}`\n\n"
                        f"⚠️ 由于飞书 `im:resource` 权限审核中，暂时无法直接发送图片\n"
                        f"请联系管理员审核权限\n\n"
                        f"本地路径：`{image_path}`"
                    )
                    print(f"✅ 通知消息发送成功")
                except Exception as msg_error:
                    print(f"⚠️ 发送通知失败（可能缺少 im:message 权限）: {msg_error}")
                    print(f"💡 图片已生成: {image_path}")
                    print(f"💡 请在飞书开放平台添加以下权限：")
                    print(f"   - im:message (发送消息)")
                    print(f"   - im:resource (上传图片)")

            return image_path

        except Exception as e:
            print(f"❌ 处理失败: {e}")
            import traceback
            traceback.print_exc()

            # 发送错误消息
            try:
                self.send_card_message(
                    chat_id,
                    "❌ 生成失败",
                    f"错误: {str(e)}\n\n请检查命令格式"
                )
            except:
                pass
            raise

    def _generate_with_mcdonald_background(
        self,
        nft_id: Optional[int] = None,
        layers: Optional[Dict] = None,
        top_text: str = "",
        bottom_text: str = "",
        font_style: str = "impact",
        all_caps: bool = True,
        output_path: str = "output/lark/mcdonald_milady.png"
    ) -> str:
        """
        生成带有 McDonald 背景的 Milady NFT 图片
        
        Args:
            nft_id: NFT ID，None 为随机
            layers: 图层配置
            top_text: 顶部文字
            bottom_text: 底部文字
            font_style: 字体风格
            all_caps: 是否全大写
            output_path: 输出路径
            
        Returns:
            生成的图片路径
        """
        from PIL import Image
        from pathlib import Path
        import random
        
        # 1. 创建 McDonald 背景
        print("🍔 创建 McDonald 背景...")
        background = create_mcdonald_background(size=(1000, 1250))
        
        # 2. 选择 NFT
        if nft_id is None:
            nft_dir = Path("assets/milady_nfts/images")
            nft_files = list(nft_dir.glob("milady_*.png"))
            if nft_files:
                nft_file = random.choice(nft_files)
                nft_id = int(nft_file.stem.split('_')[1])
            else:
                nft_id = random.randint(0, 9999)
        
        print(f"🎨 使用 NFT #{nft_id}")
        
        # 3. 加载 NFT
        nft_path = Path(f"assets/milady_nfts/images/milady_{nft_id}.png")
        if not nft_path.exists():
            raise FileNotFoundError(f"NFT #{nft_id} 不存在: {nft_path}")
        
        nft_img = Image.open(nft_path).convert('RGBA')
        
        # 4. 合成 NFT 到背景上
        print("🖼️  合成 NFT 和背景...")
        composite = Image.alpha_composite(background, nft_img)
        
        # 5. 叠加图层（如果有）
        if layers:
            from src.meme.milady_composer import MiladyComposer
            composer = MiladyComposer()
            
            for category, image_names in layers.items():
                if isinstance(image_names, str):
                    image_names = [image_names]
                elif not isinstance(image_names, list):
                    continue
                
                for image_name in image_names:
                    layer_img = composer.load_layer(category, image_name)
                    if layer_img:
                        composite = Image.alpha_composite(composite, layer_img)
                        print(f"✅ 叠加 {category}: {image_name}")
        
        # 6. 添加文字（如果有）
        if top_text or bottom_text:
            from src.meme.caption_meme import CaptionMeme
            caption = CaptionMeme()
            composite = caption.add_caption(
                composite, top_text, bottom_text,
                all_caps=all_caps,
                font_style=font_style
            )
        
        # 7. 保存
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        composite.save(output_path)
        
        print(f"✅ 图片已保存: {output_path}")
        return output_path

    def get_help_message(self) -> str:
        """获取帮助信息"""
        return """
🎨 **Milady Meme Bot V2 使用指南**

**基础命令：**

1️⃣ `/meme gm` - 使用 GM 模板生成梗图
   示例: `/meme gm`

2️⃣ `/meme [模板] [NFT_ID]` - 指定 NFT 生成梗图
   示例: `/meme crypto 1234`

3️⃣ `/meme [模板] [NFT_ID] [图层]` - 添加装饰图层
   示例: `/meme gm 1234 Hat:Beret.png`

4️⃣ `/meme "自定义文字" "底部文字"` - 自定义文字
   示例: `/meme "GM BUILDERS" "LFG"`

5️⃣ `/meme [模板] font:字体风格` - 选择字体
   示例: `/meme gm font:glow`

**完整示例：**
- `/meme gm` → GM 模板 + 随机 NFT
- `/meme crypto 5678` → Crypto 模板 + NFT #5678
- `/meme gm Hat:Beret.png Glasses:Sunglasses.png` → 添加帽子和眼镜
- `/meme "早安" "建设者们"` → 中文梗图（自动使用中文字体）
- `/meme gm 1234 Hat:Beret.png font:glow` → 组合使用

**可用模板：**
- `gm` - GM 相关 (BUILDERS / LFG)
- `crypto` - 加密货币 (WEN MOON / SOON™)
- `milady` - Milady 文化 (MILADY SZNN / ALWAYS)
- `motivational` - 励志 (KEEP BUILDING / NGMI OTHERWISE)

**字体风格：**
- `impact` - 经典粗体（默认）
- `glow` - 赛博朋克发光效果
- `angelic` - 优雅天使字体
- `chinese` - 中文字体（检测到中文自动启用）

**常用图层：**
- 帽子: `Hat:Beret.png`, `Hat:Blue Cap.png`
- 眼镜: `Glasses:Sunglasses.png`, `Glasses:Heart Glasses.png`
- 特效: `Overlay:Heart Meme.png`, `Overlay:Stars.png`

**高级选项：**
- `caps:off` - 关闭大写转换（保持小写）
- NFT ID: 0-9999（接近 10,000 个可选）

---
✅ V2 系统能力:
- 9,802+ NFT 原图
- 324 个图层装饰
- 4 种字体风格
- 中文完整支持

由 AI Content Studio 提供支持 🤖
详细文档: LARK_BOT_USAGE.md
"""


# Flask/FastAPI 应用示例
def create_lark_webhook_handler(bot: LarkMemeBot):
    """
    创建飞书 Webhook 处理器（用于 Flask/FastAPI）

    Args:
        bot: LarkMemeBot 实例

    Returns:
        处理函数
    """
    def handle_webhook(request_data: Dict) -> Dict:
        """
        处理飞书 Webhook 请求

        Args:
            request_data: 请求数据

        Returns:
            响应数据
        """
        # 事件验证
        if request_data.get("type") == "url_verification":
            return {
                "challenge": request_data.get("challenge")
            }

        # 消息事件
        if request_data.get("header", {}).get("event_type") == "im.message.receive_v1":
            try:
                bot.process_message(request_data)
                return {"code": 0}
            except Exception as e:
                print(f"处理消息失败: {e}")
                return {"code": 1, "msg": str(e)}

        return {"code": 0}

    return handle_webhook


if __name__ == "__main__":
    # 测试示例
    from src.core.config import Config

    # 初始化机器人
    bot = LarkMemeBot(
        app_id=Config.LARK_APP_ID,
        app_secret=Config.LARK_APP_SECRET
    )

    # 测试生成梗图
    print("\n🧪 测试生成梗图...")
    image_path = bot.handle_slash_command("meme", ["gm"], "test_chat")
    print(f"✅ 生成成功: {image_path}")

    # 打印帮助信息
    print(bot.get_help_message())
