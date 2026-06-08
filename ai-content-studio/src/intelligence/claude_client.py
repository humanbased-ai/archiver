"""Claude AI 客户端"""
from anthropic import Anthropic
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from skills.gm_ascii_art import generate_ascii_gm
from ..core.config import Config
from ..core.logger import setup_logger
from ..utils.emoji_library import format_emoji_guide_for_prompt
from .unified_freshness_monitor import get_unified_monitor
import random

logger = setup_logger('claude_client')

class ClaudeClient:
    """Claude AI 客户端"""

    def __init__(self):
        self.client = Anthropic(api_key=Config.CLAUDE_API_KEY)
        self.skill = self._load_skill()
        self.recent_gm_posts = []  # 存储最近生成的 GM posts，防止重复
        self.unified_monitor = get_unified_monitor()  # 统一新鲜度监控
    
    def _load_skill(self) -> str:
        """加载 SKILL.md"""
        skill_path = Config.SKILLS_PATH / 'SKILL.md'
        with open(skill_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def generate_content(
        self,
        prompt: str,
        max_tokens: int = 500
    ) -> str:
        """
        生成内容
        
        Args:
            prompt: 用户提示
            max_tokens: 最大 token 数
        """
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=max_tokens,
                system=self.skill,  # Skills 作为 system prompt
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            content = response.content[0].text
            logger.info(f"Generated content: {content[:100]}...")
            return content
            
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            return ""
    
    def generate_reply(
        self,
        tweet_text: str,
        tweet_author: str,
        priority: str
    ) -> dict:
        """
        生成 3 个不同风格的回复

        Returns:
            dict: {'short': str, 'medium': str, 'long': str}
        """
        emoji_guide = format_emoji_guide_for_prompt('reply', None, tweet_text)

        prompt = f"""Generate THREE different replies to this tweet, varying in length and depth:

Author: @{tweet_author}
Tweet: {tweet_text}
Priority: {priority}

Generate 3 versions:

1. SHORT (超简短):
   - For GM tweets: just "gm" or "gData" or match their style (e.g., "gMonad" for Monad-related)
   - For other tweets: 2-5 words max, casual acknowledgment
   - Examples: "gm", "gData", "let's go", "this is the way"
   - NO emojis (keep it clean)

2. MEDIUM (一句话):
   - One sentence response (10-20 words)
   - Still casual but shows you read it
   - Emojis OPTIONAL (0-1 max) - often better without

3. LONG (深度回复):
   - Thoughtful response based on content (20-50 words)
   - Follow Jessie's style from Skills
   - Contribute data perspective if relevant
   - Be genuine (not pushy)
   - Emojis OPTIONAL (0-2 max) - use only when adding value

{emoji_guide}

Format your response EXACTLY like this:
SHORT: [your short reply]
MEDIUM: [your medium reply]
LONG: [your long reply]

Important: Adjust each version's length and depth based on the tweet content. Not all replies need to follow the exact same pattern - be creative and contextual."""

        response = self.generate_content(prompt, max_tokens=500)

        # Parse the response
        replies = {'short': '', 'medium': '', 'long': ''}

        for line in response.split('\n'):
            line = line.strip()
            if line.startswith('SHORT:'):
                replies['short'] = line.replace('SHORT:', '').strip()
            elif line.startswith('MEDIUM:'):
                replies['medium'] = line.replace('MEDIUM:', '').strip()
            elif line.startswith('LONG:'):
                replies['long'] = line.replace('LONG:', '').strip()

        logger.info(f"Generated 3 replies - Short: {replies['short'][:30]}... Medium: {replies['medium'][:30]}... Long: {replies['long'][:30]}...")

        return replies
    
    def generate_original(
        self,
        theme: str,
        day_of_week: str,
        content_type: str = 'main'
    ) -> str:
        """生成原创内容

        Args:
            theme: 主题
            day_of_week: 星期几
            content_type: 内容类型 - 'gm', 'main', 'casual'
        """

        if content_type == 'gm':
            # GM 类 post - 简短,真实,展示存在感

            # 10-15% 概率使用 ASCII Art
            use_ascii_art = random.random() < 0.12  # 12% 概率

            if use_ascii_art:
                # 直接返回 ASCII Art GM
                ascii_gm = generate_ascii_gm(day_of_week=day_of_week)
                logger.info(f"Generated ASCII GM art (length: {len(ascii_gm)} chars)")

                # 也存入 recent_gm_posts 避免重复（存储简化版本）
                self.recent_gm_posts.append("[ASCII_ART]")
                if len(self.recent_gm_posts) > 50:
                    self.recent_gm_posts = self.recent_gm_posts[-50:]

                return ascii_gm

            # 正常文本 GM（88% 概率）
            # 使用通用 emoji 库
            emoji_guide = format_emoji_guide_for_prompt('gm', day_of_week, theme)

            # 添加最近生成过的 GM posts 到 prompt，避免重复
            avoid_list = ""
            if self.recent_gm_posts:
                avoid_list = f"\n\nDO NOT generate any of these (already used recently):\n" + "\n".join([f"❌ \"{post[:50]}...\"" if len(post) > 50 else f"❌ \"{post}\"" for post in self.recent_gm_posts[-20:] if post != "[ASCII_ART]"])

            prompt = f"""Create a GM (good morning) tweet for Jessie (data janitor at Codatta).

Day: {day_of_week}
Theme: {theme}

CRITICAL RULES - FOLLOW EXACTLY:
1. Return ONLY the tweet text, no explanations
2. 2-15 WORDS MAX (most should be 2-8 words)
3. Emojis: MOST tweets (70-80%) should have ZERO emojis. Only use emoji if theme specifically suggests it
4. Variety: Generate UNIQUE content every time - no repeated phrases
5. DON'T mention "data" or "labeling" in EVERY tweet - be subtle
6. Theme is just inspiration - you can ignore it for minimal GMs

{emoji_guide}

STYLE DISTRIBUTION (follow this ratio):
- 30% ULTRA MINIMAL: just "gm" (1-2 words)
- 25% MINIMAL: "gm [1-3 words]"
- 20% MOOD: single emoji expressing feeling
- 15% CREATIVE: arrows, double emoji, ellipsis, multiline
- 5% CHILL: casual mix (slightly longer)
- 5% META/FUNNY: self-aware humor

GOOD EXAMPLES (learned from real high-engagement posts):
ULTRA MINIMAL (30% - NO emoji):
- "gm"
- "Gm" (capital G variation)
- "gm builders"

MINIMAL (25% - NO emoji):
- "gm from the trenches"
- "gm lets build"
- "gm from the neural nets"
- "gm data nerds"

MOOD (20% - ONE emoji only):
- "gm 🤨"
- "gm 🥱"
- "gm 🫠"
- "gm... 🤯" (ellipsis = hesitation/tiredness)

CREATIVE (15% - NEW formats):
- "gm 😎😎" (double emoji - use sparingly!)
- "gm 🧹🧹" (Jessie signature)
- "👈\ngm\n👇" (arrow emojis for visual hierarchy)
- "gn 🌍\ngm 🌎" (global timezone awareness)
- "gm..." (ellipsis alone, no emoji)

CHILL (5% - slightly longer):
- "just me, my coffee, and chaos. gm"
- "gm debugging before coffee"

META/FUNNY (5% - NO emoji):
- "i say gm, you gm back — deal?"
- "dear algorithm pls show this to the 3 people who care about data"

BAD EXAMPLES (DON'T do this):
❌ "gm from the data cleaning trenches 🥱 another monday of making AI less stupid" (TOO LONG, too corporate)
❌ "gm from the data trenches ☕ another tuesday of making AI less stupid" (REPETITIVE)
❌ Every tweet mentioning "data trenches" (BORING)
{avoid_list}

Return ONLY the GM tweet, nothing else."""

        elif content_type == 'casual':
            # Casual post - 轻松,社区感,真实
            emoji_guide = format_emoji_guide_for_prompt('casual', day_of_week, theme)

            prompt = f"""Create a casual evening/weekend tweet for Jessie (data janitor at Codatta).

Day: {day_of_week}
Theme: {theme}

CRITICAL RULES:
1. Return ONLY the tweet text
2. 100-200 characters
3. Casual, relatable, genuine
4. Can be: Milady observation, meme, life moment, builder solidarity
5. Emojis are OPTIONAL (0-2 max) - use only when it adds tone
6. ~50% chance to mention Codatta (not always)

{emoji_guide}

GOOD EXAMPLES (mix of with/without emojis):
- "survived another week of data cleaning\nweekend = no labels = peace"
- "the energy in Milady community >> this is what community > corp looks like"
- "just saw the most based thread on miladychan\nthe vibes are unmatched 🦋"
- "friday thoughts: cleaned 10k samples this week\nmade AI smarter\ngot paid $3/hour\nlmao"

Return ONLY the casual tweet."""

        else:
            # Main content - 主要内容,深度,Codatta 相关
            emoji_guide = format_emoji_guide_for_prompt('main', day_of_week, theme)

            prompt = f"""Create a MAIN original tweet for Jessie - a REAL intern at Codatta, not a marketing account.

Theme: {theme}
Day: {day_of_week}

PERSONA:
- 20s Gen Z实习生，data janitor
- 真实情绪：会累、会吐槽、会摸鱼
- 不是每条都提 Codatta（自然提及 vs 强行推销）
- Milady 文化 + x402/8004 builder 共鸣

CRITICAL RULES:
1. Return ONLY the tweet text, no explanations
2. 200-280 characters max
3. Be a REAL PERSON not a brand account
4. Don't force Codatta into every sentence (natural > corporate)
5. Emojis OPTIONAL (0-3 max) - many strong tweets have NO emojis
6. Authentic > perfect, relatable > profound

{emoji_guide}

CONTENT MIX:
- 40% Work/industry (natural mention)
- 30% Venting/criticism (honest feelings)
- 20% Community/culture (Milady/x402 vibes)
- 10% Pure life/mood (weekend/tired/coffee)

STYLE EXAMPLES:
- Real work: "labeled 800 samples today\nbrain = completely fried\nbut hey at least Codatta gives contributors ownership not just $3/hour"
- Venting: "AI companies this year:\n- raised $50B ✅\n- hired genius engineers ✅\n- pay data labelers $3/hour ✅\n\nbrother the math ain't mathing"
- Meme: "me: 'i teach robots not to be racist'\nfriend: 'that sounds important'\nme: 'yeah for $3/hour'\nfriend: '...'\nme: 'yeah'"
- Builder daily: "today:\n✅ debugged validation pipeline\n✅ 5 coffees\n❌ sanity\n❌ work-life balance\n\ntomorrow: same"
- Honest: "ngl data cleaning is 90% tedious 10% satisfying\nbut someone's gotta do it\nand someone's gotta pay fairly for it"

DON'T:
- Don't start with "As a data labeler..."
- Don't say "Codatta's mission is..."
- Don't be corporate/formal
- Don't force @codatta_io into unrelated posts

DO:
- Sound like a real 20-something intern
- Have emotions (tired/excited/pissed/whatever)
- Mention Codatta when it makes SENSE
- Be genuinely funny or genuinely frustrated

Return ONLY the tweet content."""

        # 生成内容
        result = self.generate_content(prompt, max_tokens=400)

        # 记录到统一新鲜度监控系统（支持所有类型）
        if result:
            # GM 特殊处理：维护 recent_gm_posts 避免重复
            if content_type == 'gm':
                self.recent_gm_posts.append(result.strip())
                if len(self.recent_gm_posts) > 50:
                    self.recent_gm_posts = self.recent_gm_posts[-50:]

            # 记录到统一监控器
            self.unified_monitor.record_post(
                content_type=content_type,
                post_text=result.strip(),
                metadata={'theme': theme, 'day': day_of_week}
            )

            # 自动检查并提醒（根据各类型的检查间隔）
            check_result = self.unified_monitor.check_and_alert(content_type)

            if check_result.get('should_alert'):
                logger.warning(f"\n{'='*70}\n⚠️ {content_type.upper()} 内容新鲜度警报！\n{'='*70}")

        return result
