"""
图像配图建议工具
为设计师提供配图建议
"""

from ..core.logger import setup_logger

logger = setup_logger('image_generation')


class ImageSuggestionGenerator:
    """配图建议生成器"""
    
    # 配图类型定义
    IMAGE_TYPES = {
        "work_scene": {
            "name": "工作场景",
            "description": "电脑、咖啡、办公场景",
            "examples": ["laptop with charts", "desk with coffee and notebook", "coding on laptop outdoors"],
            "suitable_for": ["gm", "builder_daily", "industry_insight"]
        },
        "meme": {
            "name": "Meme/幽默图",
            "description": "自嘲、吐槽、搞笑",
            "examples": ["funny schedule meme", "relatable work meme", "tired developer meme"],
            "suitable_for": ["casual", "duixian", "absurd_narrative"]
        },
        "minimal_text": {
            "name": "极简文字图",
            "description": "黑底白字或简洁设计",
            "examples": ["text on black background", "minimal typography design"],
            "suitable_for": ["gm", "cult_energy", "short_statement"]
        },
        "illustration": {
            "name": "插画/艺术",
            "description": "Milady 风格、可爱插画",
            "examples": ["cute anime style illustration", "milady aesthetic art"],
            "suitable_for": ["milady_observation", "casual_weekend"]
        },
        "none": {
            "name": "无需配图",
            "description": "纯文字足够强",
            "examples": [],
            "suitable_for": ["strong_text", "short_gm", "simple_reply"]
        }
    }
    
    @classmethod
    def suggest_image(cls, content_type: str, theme: str, tweet_text: str) -> dict:
        """建议配图方案
        
        Returns:
            {
                'needs_image': bool,
                'image_type': str,
                'prompt_for_designer': str,
                'prompt_for_ai': str,
                'style': str
            }
        """
        
        # 判断是否需要配图
        needs_image = cls._should_have_image(content_type, theme, tweet_text)
        
        if not needs_image:
            return {
                'needs_image': False,
                'image_type': 'none',
                'prompt_for_designer': '纯文字推文，无需配图',
                'prompt_for_ai': '',
                'style': ''
            }
        
        # 选择配图类型
        image_type = cls._select_image_type(content_type, theme, tweet_text)
        
        # 生成设计师 prompt
        designer_prompt = cls._generate_designer_prompt(image_type, theme, tweet_text)
        
        # 生成 AI 绘图 prompt
        ai_prompt = cls._generate_ai_prompt(image_type, theme, tweet_text)
        
        # 选择风格
        style = cls._select_style(image_type)
        
        return {
            'needs_image': True,
            'image_type': image_type,
            'prompt_for_designer': designer_prompt,
            'prompt_for_ai': ai_prompt,
            'style': style
        }
    
    @classmethod
    def _should_have_image(cls, content_type: str, theme: str, tweet_text: str) -> bool:
        """判断是否需要配图"""
        
        # GM posts: 30% 概率需要配图
        if content_type == 'gm':
            import random
            return random.random() < 0.3
        
        # Main posts: 50% 概率需要配图
        if content_type == 'main':
            # 如果是 meme format 或 duixian，更可能需要配图
            if 'meme' in theme.lower() or 'therapist' in theme.lower():
                return True
            import random
            return random.random() < 0.5
        
        # Casual posts: 40% 概率需要配图
        if content_type == 'casual':
            import random
            return random.random() < 0.4
        
        # Replies: 很少需要配图
        return False
    
    @classmethod
    def _select_image_type(cls, content_type: str, theme: str, tweet_text: str) -> str:
        """选择配图类型"""
        
        theme_lower = theme.lower()
        text_lower = tweet_text.lower()
        
        # Meme format posts -> meme 图
        if 'meme' in theme_lower or 'therapist' in theme_lower or 'absurd' in theme_lower:
            return 'meme'
        
        # Milady culture -> illustration
        if 'milady' in theme_lower:
            return 'illustration'
        
        # Builder daily / work -> work_scene
        if 'builder' in theme_lower or 'debugging' in text_lower or 'coffee' in text_lower:
            return 'work_scene'
        
        # Cult energy / strong statement -> minimal_text
        if len(tweet_text) < 100 or 'DESERVE' in tweet_text:
            return 'minimal_text'
        
        # 默认：工作场景
        return 'work_scene'
    
    @classmethod
    def _generate_designer_prompt(cls, image_type: str, theme: str, tweet_text: str) -> str:
        """生成给设计师的配图建议"""
        
        prompts = {
            'work_scene': f"""
配图建议：工作场景实拍/渲染

元素：
- MacBook 笔记本（屏幕显示代码/数据表格）
- 咖啡杯
- 可选：Codatta logo 小物件
- 背景：办公桌/咖啡厅/户外

风格：真实感、生活化、不做作

参考：Binance 的户外工作照（笔记本+咖啡+自然光）
""",
            'meme': f"""
配图建议：Meme 幽默图

主题：{theme}
文案：{tweet_text[:100]}

格式：
- 黑底白字 / 图片 + 文字叠加
- 简洁、易读、幽默
- 可用模板：对话框、时间表、对比图

参考：Binance 的周末时间表 meme（黑底黄字）
""",
            'minimal_text': f"""
配图建议：极简文字图

文案：{tweet_text}

设计：
- 纯色背景（黑/深蓝/渐变）
- 大字体、居中
- 可选：小 emoji 点缀
- 干净、有力

参考：现代极简海报风格
""",
            'illustration': f"""
配图建议：Milady 风格插画

主题：{theme}

风格：
- 可爱、略带邪教感
- Pastel 配色（粉、蓝、紫）
- 简洁线条
- 可选：蝴蝶、蝴蝶结、星星元素

参考：Milady NFT 美学
"""
        }
        
        return prompts.get(image_type, "无特定建议")
    
    @classmethod
    def _generate_ai_prompt(cls, image_type: str, theme: str, tweet_text: str) -> str:
        """生成 AI 绘图 prompt（保留用于参考，实际暂不生成）"""

        if image_type == 'work_scene':
            return "A clean desk with a modern laptop showing data charts, a coffee cup, warm natural lighting, realistic photo style, minimal and professional"

        elif image_type == 'meme':
            return "A simple meme template with bold text on black background, humorous and relatable, modern social media style"

        elif image_type == 'minimal_text':
            # 提取推文核心文字
            core_text = tweet_text[:50]
            return f"Minimalist typography design with text '{core_text}', clean modern aesthetic, solid color background, bold sans-serif font"

        elif image_type == 'illustration':
            return "Cute anime-style illustration with pastel colors (pink, blue, purple), Milady aesthetic, butterflies and bows, soft and dreamy"

        return ""

    @classmethod
    def _select_style(cls, image_type: str) -> str:
        """选择 AI 绘图风格（保留用于参考）"""

        style_mapping = {
            'work_scene': 'realistic',
            'meme': 'meme',
            'minimal_text': 'minimal',
            'illustration': 'illustration'
        }

        return style_mapping.get(image_type, 'realistic')


# 便捷函数
def generate_tweet_image(content_type: str, theme: str, tweet_text: str) -> dict:
    """为推文生成配图建议（仅建议，不自动生成）

    Returns:
        {
            'needs_image': bool,
            'suggestion': dict  # 设计师建议
        }
    """

    # 生成配图建议
    suggestion = ImageSuggestionGenerator.suggest_image(content_type, theme, tweet_text)

    result = {
        'needs_image': suggestion['needs_image'],
        'suggestion': suggestion
    }

    return result
