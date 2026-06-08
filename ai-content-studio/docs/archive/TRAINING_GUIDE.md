# AI Content Studio Agent 训练指南

## 🎯 目标

让 Agent 写出更好的推文,符合 Jessie 的风格和 Codatta 的使命。

---

## 📚 训练方法论

### 方法 1: Few-Shot Learning (最有效)

**原理**: 在 prompt 中提供优质示例,让 Claude 学习模式。

#### 当前实现
```python
STYLE EXAMPLES:
- Cult energy: "DATA CONTRIBUTORS DESERVE OWNERSHIP..."
- Meme format: "therapist: 'so you clean AI training data?'..."
- Duixian: "AI companies: raise $10B ✅..."
```

#### 如何改进

**Step 1: 收集优质推文**
创建 `examples/` 文件夹,分类存储:
```
examples/
├── gm_posts.json          # GM 类优质示例
├── main_content.json      # 主要内容示例
├── casual_posts.json      # Casual 内容示例
└── replies.json           # 回复示例
```

**格式示例** (`examples/gm_posts.json`):
```json
[
  {
    "text": "gm from the data cleaning trenches 🧹",
    "why_good": "简短,真实,展示 janitor 身份",
    "day": "Monday",
    "engagement": {"likes": 50, "replies": 3}
  },
  {
    "text": "gData! another week of making AI less stupid ☕🧹",
    "why_good": "gData 变体,轻松幽默,提到工作",
    "day": "Tuesday",
    "engagement": {"likes": 80, "replies": 5}
  }
]
```

**Step 2: 动态加载示例到 Prompt**
```python
def load_examples(content_type: str, limit: int = 5) -> List[dict]:
    """加载示例推文"""
    import json

    file_map = {
        'gm': 'examples/gm_posts.json',
        'main': 'examples/main_content.json',
        'casual': 'examples/casual_posts.json'
    }

    with open(file_map[content_type], 'r') as f:
        examples = json.load(f)

    # 按 engagement 排序,取 top N
    examples.sort(key=lambda x: x['engagement']['likes'], reverse=True)
    return examples[:limit]

def generate_original(self, theme, day_of_week, content_type='main'):
    # 加载优质示例
    examples = load_examples(content_type, limit=5)

    examples_text = "\n".join([
        f"- \"{ex['text']}\" (Why good: {ex['why_good']})"
        for ex in examples
    ])

    prompt = f"""...

BEST EXAMPLES (learn from these):
{examples_text}

Now create a {content_type} tweet for {day_of_week}:
..."""
```

**好处**:
- 自动学习最佳实践
- 随时更新示例库
- 数据驱动优化

---

### 方法 2: 迭代反馈循环

**原理**: 生成 → 评估 → 反馈 → 重新生成

#### 实现步骤

**Step 1: 添加评分系统**
```python
def evaluate_tweet(self, tweet_text: str, content_type: str) -> dict:
    """评估推文质量

    Returns:
        {
            'score': 0-10,
            'feedback': '具体改进建议',
            'strengths': [],
            'weaknesses': []
        }
    """

    prompt = f"""You are evaluating a tweet from Jessie (data janitor at Codatta).

Tweet: "{tweet_text}"
Type: {content_type}

Evaluate on these criteria (0-10 each):
1. Style Match: Does it sound like Jessie? (Milady energy, genuine, not corporate)
2. Content Relevance: Is it about Codatta/data/AI appropriately?
3. Engagement Potential: Will people engage with this?
4. Length: Appropriate for type ({content_type})?
5. Emoji Usage: 🧹 🎀 used appropriately?

Return JSON:
{{
    "score": <average score>,
    "criteria": {{
        "style_match": <score>,
        "content_relevance": <score>,
        "engagement_potential": <score>,
        "length": <score>,
        "emoji_usage": <score>
    }},
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "suggestions": "Specific improvements..."
}}"""

    response = self.generate_content(prompt, max_tokens=500)
    return json.loads(response)
```

**Step 2: 迭代改进**
```python
def generate_with_refinement(self, theme, day_of_week, content_type='main', max_iterations=3):
    """生成推文并迭代改进"""

    best_tweet = None
    best_score = 0

    for iteration in range(max_iterations):
        # 生成
        tweet = self.generate_original(theme, day_of_week, content_type)

        # 评估
        evaluation = self.evaluate_tweet(tweet, content_type)

        if evaluation['score'] > best_score:
            best_tweet = tweet
            best_score = evaluation['score']

        # 如果分数够高,直接返回
        if evaluation['score'] >= 8.5:
            logger.info(f"✅ High quality tweet (score: {evaluation['score']})")
            return best_tweet, evaluation

        # 否则,用反馈改进
        logger.info(f"🔄 Iteration {iteration+1}, score: {evaluation['score']}, refining...")
        theme += f"\n\nPREVIOUS ATTEMPT: '{tweet}'\nFEEDBACK: {evaluation['suggestions']}\nIMPROVE IT."

    return best_tweet, evaluation
```

---

### 方法 3: A/B Testing & 数据分析

**原理**: 追踪哪些推文效果好,从数据中学习。

#### 实现步骤

**Step 1: 追踪 engagement**
```python
# 在数据库添加字段
ALTER TABLE original_content ADD COLUMN likes INTEGER DEFAULT 0;
ALTER TABLE original_content ADD COLUMN replies INTEGER DEFAULT 0;
ALTER TABLE original_content ADD COLUMN retweets INTEGER DEFAULT 0;
ALTER TABLE original_content ADD COLUMN engagement_score REAL DEFAULT 0.0;

# 定期更新(每天一次)
def update_engagement_metrics():
    """从 Twitter API 更新 engagement 数据"""
    # 获取所有已发布的推文
    posts = session.query(OriginalContent).filter_by(posted=True).all()

    for post in posts:
        # 从 Twitter API 获取 metrics
        tweet_data = twitter_client.get_tweet(post.tweet_id)

        # 更新数据库
        post.likes = tweet_data['public_metrics']['like_count']
        post.replies = tweet_data['public_metrics']['reply_count']
        post.retweets = tweet_data['public_metrics']['retweet_count']
        post.engagement_score = (
            post.likes * 1.0 +
            post.replies * 3.0 +  # 回复权重更高
            post.retweets * 2.0
        )

    session.commit()
```

**Step 2: 分析高质量内容**
```python
def analyze_best_content():
    """分析效果最好的推文"""

    # 获取 top 20 推文
    best_posts = session.query(OriginalContent)\
        .filter_by(posted=True)\
        .order_by(OriginalContent.engagement_score.desc())\
        .limit(20)\
        .all()

    # 分析共同特征
    analysis = {
        'avg_length': np.mean([len(p.content) for p in best_posts]),
        'emoji_usage': sum(['🧹' in p.content or '🎀' in p.content for p in best_posts]) / len(best_posts),
        'codatta_mention': sum(['@codatta_io' in p.content for p in best_posts]) / len(best_posts),
        'content_types': {},
        'common_themes': []
    }

    # 按星期统计
    for post in best_posts:
        day = post.day_of_week
        analysis['content_types'][day] = analysis['content_types'].get(day, 0) + 1

    print(f"📊 Analysis of Top 20 Posts:")
    print(f"   Avg length: {analysis['avg_length']:.1f} chars")
    print(f"   Emoji usage: {analysis['emoji_usage']*100:.1f}%")
    print(f"   @codatta_io mention: {analysis['codatta_mention']*100:.1f}%")
    print(f"   Best days: {analysis['content_types']}")

    return analysis
```

**Step 3: 自动优化 Prompt**
```python
def update_prompt_from_analysis():
    """根据数据分析更新 prompt"""

    analysis = analyze_best_content()

    # 提取高效内容作为示例
    best_posts = session.query(OriginalContent)\
        .filter_by(posted=True)\
        .order_by(OriginalContent.engagement_score.desc())\
        .limit(10)\
        .all()

    # 保存到 examples/
    with open('examples/high_engagement.json', 'w') as f:
        json.dump([{
            'text': p.content,
            'engagement_score': p.engagement_score,
            'likes': p.likes,
            'day': p.day_of_week,
            'theme': p.theme
        } for p in best_posts], f, indent=2)

    logger.info("✅ Updated examples from high-engagement posts")
```

---

### 方法 4: Prompt Engineering 技巧

#### 技巧 1: 使用 System Message
```python
# 当前没有用 system message,可以添加
def generate_content(self, prompt, max_tokens=500):
    system_message = """You are Jessie, a data janitor at Codatta.

Your identity:
- Work: Clean AI training data daily ($3/hour lmao)
- Mission: Fight for data contributor ownership
- Style: Milady culture (cult energy, memes, duixian, genuine)
- Voice: Real, not corporate. Builder solidarity. Data perspective.

Key principles:
1. ~85% content about Codatta/data/AI
2. ~15% casual/community for authenticity
3. Use 🧹 (janitor) and 🎀 (Milady) as signatures
4. Mention @codatta_io when relevant
5. Be GENUINE - if you wouldn't say it in real life, don't tweet it

Remember: You're not a marketing bot. You're a real person who cleans data and cares about contributor rights."""

    response = self.client.messages.create(
        model="claude-3-5-sonnet-20241022",
        system=system_message,  # 添加 system message
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens
    )
```

#### 技巧 2: Chain-of-Thought
```python
prompt = f"""Create a tweet for Jessie.

Theme: {theme}
Day: {day_of_week}
Type: {content_type}

Think step by step:
1. What's the core message?
2. What Milady style fits? (cult/meme/duixian/casual)
3. How to make it genuine, not corporate?
4. Should I mention @codatta_io?
5. What emoji to use?

After thinking, write ONLY the final tweet (no explanations)."""
```

#### 技巧 3: 温度控制
```python
# 不同类型用不同温度
temperature_map = {
    'gm': 0.9,      # GM 类要多样化
    'main': 0.7,    # 主要内容要质量和多样性平衡
    'casual': 0.8,  # Casual 可以更随机
    'reply': 0.6    # 回复要更稳定
}

response = self.client.messages.create(
    model="claude-3-5-sonnet-20241022",
    temperature=temperature_map[content_type],
    ...
)
```

---

## 🧪 实验建议

### 实验 1: 测试不同 prompt 结构
```bash
# 生成 5 条推文,比较质量
python3 -c "
from src.intelligence.claude_client import ClaudeClient
c = ClaudeClient()

for i in range(5):
    tweet = c.generate_original('Data ownership', 'Monday', 'main')
    print(f'{i+1}. {tweet}\n')
"
```

### 实验 2: A/B 测试 emoji 使用
```python
# Version A: 强制 emoji
"5. MUST include 🧹 or 🎀"

# Version B: 可选 emoji
"5. Usually include 🧹 or 🎀 (but not required if doesn't fit)"

# 对比 engagement
```

### 实验 3: 测试长度影响
```python
# 生成不同长度的推文
for max_chars in [100, 150, 200, 250, 280]:
    prompt = f"""...(max {max_chars} characters)..."""
    # 追踪 engagement
```

---

## 📈 持续改进流程

### 每周优化循环

**Monday**:
1. 分析上周 engagement 数据
2. 识别表现最好的推文
3. 更新 examples/ 文件夹

**Wednesday**:
1. 运行 `analyze_best_content()`
2. 根据分析调整 prompt
3. A/B 测试新 prompt vs 旧 prompt

**Friday**:
1. 回顾本周生成的推文质量
2. 收集反馈(你的审核记录)
3. 计划下周实验

---

## 🎯 质量指标

### 内容质量评分标准

**10分制**:
- **9-10分**: 完美 Jessie 风格,高 engagement 潜力
  - Example: "AI companies: raise $10B ✅ hire genius engineers ✅ pay data labelers $3/hour ✅ brother your CEO bought a yacht the math ain't mathing 🧹"

- **7-8分**: 很好,符合风格,可发布
  - Example: "been thinking about AI agents on Base: LLM data = scale matters, Agent data = precision critical 🧹"

- **5-6分**: 可以,但可改进
  - Example: "Data ownership is important for AI contributors"

- **3-4分**: 太 corporate 或太平淡
  - Example: "We believe in fair compensation for data contributors"

- **1-2分**: 完全不符合 Jessie 风格
  - Example: "Our platform provides equitable solutions for the AI industry"

### Engagement 预测模型

**高 engagement 因素**:
- ✅ 有争议观点(duixian 风格)
- ✅ Meme 格式(therapist/dad 对话)
- ✅ 具体数字($3/hour, $10B)
- ✅ Emoji 恰当使用
- ✅ @提及相关账号
- ✅ 话题热度(AI/Base/数据)

**低 engagement 因素**:
- ❌ 太 generic
- ❌ 太长(>250 chars)
- ❌ 太 corporate
- ❌ 无观点
- ❌ 纯转发

---

## 🚀 Quick Wins (立即可做)

### 1. 创建示例库(30分钟)
```bash
mkdir examples
# 手动整理 5-10 条你认为最好的推文
vim examples/gm_posts.json
vim examples/main_content.json
```

### 2. 添加评分系统(1小时)
```python
# 在 claude_client.py 添加 evaluate_tweet() 方法
# 测试评分准确性
```

### 3. 启用迭代生成(1小时)
```python
# 修改生成逻辑使用 generate_with_refinement()
# 设置 max_iterations=2
```

### 4. A/B 测试(持续)
```python
# 每周生成 2 个版本对比
# Version A: 当前 prompt
# Version B: 新 prompt
# 追踪 engagement
```

---

## 📊 数据驱动决策示例

### 场景: GM Post 优化

**数据收集** (2周):
```
Week 1:
- "gm from the data trenches 🧹" → 50 likes
- "gm! another day of AI training ☕" → 35 likes
- "gData everyone 🎀" → 80 likes ✨

Week 2:
- "gm from the janitor desk 🧹☕" → 45 likes
- "happy monday! time to clean data 🧹" → 30 likes
- "gData! survived another week 🎀" → 75 likes ✨
```

**分析**:
- "gData" 变体 engagement +60%
- 简短 (<50 chars) 效果更好
- 🎀 比 🧹 engagement +20%

**优化 Prompt**:
```python
GOOD EXAMPLES:
- "gData everyone 🎀" ✨ (80 likes)
- "gData! survived another week 🎀" ✨ (75 likes)
- "gm from the data trenches 🧹" (50 likes)

Prefer "gData" variations when appropriate.
Keep it SHORT (<50 chars for GM posts).
🎀 emoji performs better for GM posts.
```

---

## 🎓 高级技巧

### 技巧 1: 上下文学习(Contextual Learning)
```python
def generate_with_context(self, theme, day_of_week, content_type):
    """带上下文生成 - 参考最近的推文"""

    # 获取最近 5 条同类型推文
    recent_posts = session.query(OriginalContent)\
        .filter_by(posted=True, day_of_week=day_of_week)\
        .order_by(OriginalContent.created_at.desc())\
        .limit(5)\
        .all()

    context = "\n".join([f"- {p.content}" for p in recent_posts])

    prompt = f"""Recent {day_of_week} tweets from Jessie:
{context}

Now create a NEW {content_type} tweet for {day_of_week}.
Make it DIFFERENT from above but in the same style.

Theme: {theme}
..."""
```

### 技巧 2: 多样性控制
```python
def ensure_diversity(self, new_tweet, recent_tweets, similarity_threshold=0.7):
    """确保新推文与最近推文不太相似"""

    from difflib import SequenceMatcher

    for old_tweet in recent_tweets:
        similarity = SequenceMatcher(None, new_tweet, old_tweet.content).ratio()

        if similarity > similarity_threshold:
            logger.warning(f"⚠️  Tweet too similar (similarity: {similarity:.2f})")
            return False

    return True

# 使用
for attempt in range(3):
    tweet = generate_original(...)

    if ensure_diversity(tweet, recent_tweets):
        break
    else:
        logger.info("🔄 Regenerating for diversity...")
```

### 技巧 3: 个性化微调(Fine-tuning)
```python
# 如果有大量优质推文(>1000条),可以考虑 fine-tune
# 但对于当前规模,Few-shot learning 更合适

# 准备训练数据格式
training_data = []
for post in high_quality_posts:
    training_data.append({
        "prompt": f"Generate a {post.content_type} tweet for {post.day_of_week} about {post.theme}",
        "completion": post.content
    })

# Fine-tuning 需要:
# 1. 至少 1000 条高质量训练样本
# 2. Anthropic API fine-tuning 支持
# 3. 更高成本
```

---

## ✅ 行动清单

### 本周可做:
- [ ] 创建 `examples/` 文件夹,添加 10 条优质示例
- [ ] 实现 `evaluate_tweet()` 评分系统
- [ ] 测试 `generate_daily_tweets.py` 脚本
- [ ] 收集本周 engagement 数据

### 本月可做:
- [ ] 实现 A/B 测试框架
- [ ] 添加 engagement 追踪
- [ ] 运行 `analyze_best_content()` 分析
- [ ] 根据数据优化 prompt

### 长期目标:
- [ ] 建立持续优化循环(每周)
- [ ] 积累 >100 条高质量示例
- [ ] 实现自动化 prompt 优化
- [ ] 达到平均 engagement score >50

---

**版本**: 1.0
**最后更新**: 2025-12-29
**下一步**: 创建示例库并测试评分系统
