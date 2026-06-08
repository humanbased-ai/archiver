# AI Content Studio 持续学习系统使用指南

## 概览

AI Content Studio 配备了两大核心系统来保持内容新鲜度：

1. **内容新鲜度监控系统** - 自动检测重复率、创意枯竭
2. **持续学习系统** - 简化训练数据更新流程

## 工作原理

### 自动监控

每生成 **20 条 GM posts**，系统会自动检查：
- ✅ 完全重复率（阈值：10%）
- ✅ 相似重复率（阈值：25%）
- ✅ 短语重复率（阈值：40%）
- ✅ 距上次训练天数（阈值：30 天）

**当检测到问题时**，系统会在日志中输出：
```
======================================================================
⚠️ 内容新鲜度警报！
======================================================================
📊 GM 内容新鲜度报告
得分: 0.45 / 1.00

⚠️ 问题：
🚨 完全重复率过高: 15.0% (阈值: 10%)
⚠️ 相似重复率过高: 30.5% (阈值: 25%)

💡 建议：
  - 立即添加新的训练样本，避免生成重复内容
  - 内容开始套路化，建议丰富词汇库和表达方式
======================================================================
```

---

## 命令行工具

我们提供了 `manage_training.py` 来简化训练管理。

### 1. 检查当前新鲜度

```bash
python3 manage_training.py check --type gm
```

输出示例：
```
📊 GM 内容新鲜度报告
得分: 0.82 / 1.00

✅ 内容新鲜度良好
```

### 2. 查看仪表板

```bash
python3 manage_training.py dashboard
```

输出示例：
```
📚 持续学习系统 - 状态仪表板
======================================================================

✅ GM Content
   新鲜度: 0.82 / 1.00
   优先级: LOW

⚠️ MAIN Content
   新鲜度: 0.55 / 1.00
   优先级: HIGH
   问题数: 2
     - ⚠️ 相似重复率过高: 28.0% (阈值: 25%)
     - 📅 距离上次训练已过 35 天

📅 最近训练更新:
   2025-01-15: gm (+5 样本)
   2024-12-29: gm (+19 样本)
```

### 3. 获取训练建议

```bash
python3 manage_training.py suggest --type gm
```

输出示例：
```
📊 GM 训练建议

需要训练: 是
优先级: HIGH
新鲜度得分: 0.45 / 1.00

💡 建议:

1. 需要完全不同风格的样本（新的句式、新的表达方式）
   例如: 如果现有的都是 "gm from X"，尝试添加 "X says gm" 或问题式 "ready for Y?"

2. 需要扩展词汇库（新的地点、活动、对象）
   例如: 添加新的技术术语、新的工作场景、新的情绪表达
```

---

## 添加训练样本

### 方法 1: 使用模板（推荐）

**Step 1: 生成模板**
```bash
python3 manage_training.py template --type gm --count 5 --output new_gm_samples.json
```

这会生成一个 JSON 模板文件：
```json
{
  "content_type": "gm",
  "source": "manual / high_engagement_tweets / user_feedback",
  "notes": "描述这批样本的来源和特点",
  "samples": [
    {
      "text": "【填写推文内容 1】",
      "style": "【填写风格，如: minimal, meta_humor】",
      "tone": "【填写语气，如: casual, encouraging】",
      "engagement": "【填写互动情况，如: high (1.2K likes)】",
      "image": {
        "has_image": false,
        "type": "【如果有图，填写: meme, product_shot】",
        "description": "【图片描述】"
      },
      "key_features": [
        "【这条推文的关键特征 1】"
      ]
    }
  ]
}
```

**Step 2: 填写模板**

示例填写：
```json
{
  "content_type": "gm",
  "source": "high_engagement_tweets",
  "notes": "从 Binance 2025年1月推文中收集",
  "samples": [
    {
      "text": "gm, ready to break things today?",
      "style": "question_playful",
      "tone": "mischievous, energetic",
      "engagement": "high (850 likes)",
      "image": {
        "has_image": false
      },
      "key_features": [
        "问题式互动",
        "轻松调皮的语气",
        "开发者共鸣（breaking things = coding）"
      ]
    },
    {
      "text": "gm ☕\n\ntoday's goal: survive",
      "style": "minimal_realistic",
      "tone": "tired but humorous",
      "engagement": "very high (1.5K likes)",
      "image": {
        "has_image": true,
        "type": "work_scene",
        "description": "杂乱的办公桌，多个咖啡杯，笔记本屏幕显示代码"
      },
      "key_features": [
        "极度真实的目标设定",
        "多行排版",
        "咖啡 emoji 增强氛围",
        "relatable 疲惫感"
      ]
    }
  ]
}
```

**Step 3: 导入样本**
```bash
python3 manage_training.py import new_gm_samples.json
```

输出：
```
✅ Successfully added 2 samples to gm
   已添加: 2 个样本
   总样本数: 21
   新样本 ID: gm_020, gm_021
```

### 方法 2: 快速添加单个样本

```bash
python3 manage_training.py add \
  --type gm \
  --text "gm, ready to break things today?" \
  --style question_playful \
  --engagement "high (850 likes)" \
  --notes "从 Twitter 收集"
```

---

## 查看历史

### 查看所有历史
```bash
python3 manage_training.py history --type all --limit 10
```

### 只查看生成的推文
```bash
python3 manage_training.py history --type posts --limit 20
```

### 只查看报警记录
```bash
python3 manage_training.py history --type alerts --limit 5
```

### 只查看训练更新
```bash
python3 manage_training.py history --type training --limit 10
```

---

## 工作流程建议

### 日常监控（自动）
- ✅ 每生成 20 条推文自动检查
- ✅ 有问题时在日志中报警
- ✅ 无需人工干预

### 定期维护（每 2-3 周）

**Step 1: 检查状态**
```bash
python3 manage_training.py dashboard
```

**Step 2: 如果需要训练，获取建议**
```bash
python3 manage_training.py suggest --type gm
```

**Step 3: 收集新素材**
- 查看 Twitter/X 上最近的高互动 GM posts
- 看看 Binance, Coinbase, 其他 crypto 账号
- 注意新出现的 meme 和梗

**Step 4: 添加样本**
```bash
# 生成模板
python3 manage_training.py template --type gm --output new_samples.json

# 填写模板（手动）

# 导入
python3 manage_training.py import new_samples.json
```

**Step 5: 验证**
```bash
python3 manage_training.py check --type gm
```

---

## 监控指标说明

### 新鲜度得分 (0-1)

| 得分范围 | 状态 | 行动 |
|---------|------|------|
| 0.80 - 1.00 | ✅ 优秀 | 保持观察 |
| 0.60 - 0.79 | ⚠️ 一般 | 2 周内补充素材 |
| 0.40 - 0.59 | 🚨 较差 | 立即添加 5-10 个样本 |
| 0.00 - 0.39 | ⛔ 很差 | 紧急补充 10+ 样本 |

### 重复率阈值

| 指标 | 阈值 | 含义 |
|-----|------|------|
| 完全重复率 | 10% | 完全相同的推文占比 |
| 相似重复率 | 25% | 高度相似的推文占比（编辑距离 > 80%）|
| 短语重复率 | 40% | 重复使用的短语（2-4 词组合）占比 |

### 训练新鲜度

| 距离上次训练 | 状态 | 建议 |
|------------|------|------|
| < 15 天 | ✅ 新鲜 | - |
| 15-30 天 | ⚠️ 一般 | 考虑补充新素材 |
| > 30 天 | 📅 过时 | 建议更新 |

---

## 常见问题

### Q: 什么时候需要添加训练样本？

A: 当你看到以下任何情况：
1. 日志中出现 "⚠️ 内容新鲜度警报！"
2. `dashboard` 显示新鲜度得分 < 0.6
3. 连续多条推文明显重复或套路化
4. 距离上次训练超过 30 天

### Q: 一次应该添加多少个样本？

A: 根据新鲜度得分：
- **0.60-0.79**: 3-5 个样本
- **0.40-0.59**: 5-10 个样本
- **< 0.40**: 10+ 个样本

### Q: 从哪里收集训练素材？

A: 推荐来源：
1. **Twitter/X 高互动推文** - Binance, Coinbase, crypto KOLs
2. **用户反馈** - 看看 Jessie 自己的推文哪些互动好
3. **新 meme 和梗** - 关注 crypto Twitter 的最新梗
4. **时事热点** - 融入当下发生的事情

### Q: 报警阈值可以调整吗？

A: 可以！编辑 `src/intelligence/content_freshness_monitor.py`:

```python
self.THRESHOLDS = {
    'exact_duplicate_rate': 0.10,      # 改这里
    'similar_duplicate_rate': 0.25,    # 改这里
    'phrase_reuse_rate': 0.40,         # 改这里
    'days_since_training': 30,         # 改这里
    'content_staleness_score': 0.6     # 改这里
}
```

### Q: 如何测试新添加的样本是否有效？

A: 添加样本后运行：
```bash
python3 test_gm_generation.py
```
查看生成的推文是否更多样化。

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│            AI Content Studio 生成流程                   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  ClaudeClient          │
         │  generate_original()   │
         └────────────────────────┘
                      │
                      ├─────────────────────┐
                      ▼                     ▼
         ┌────────────────────┐   ┌────────────────────┐
         │ 生成推文            │   │ 记录到监控系统      │
         └────────────────────┘   │ record_post()      │
                                  └────────────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │ 每 20 条检查新鲜度        │
                              │ auto_check_and_alert()  │
                              └──────────────────────────┘
                                            │
                                  ┌─────────┴─────────┐
                                  ▼                   ▼
                          ┌───────────┐       ┌─────────┐
                          │ 新鲜度良好 │       │ 🚨 报警  │
                          └───────────┘       └─────────┘
                                                      │
                                                      ▼
                                        ┌───────────────────────┐
                                        │ 用户收到通知           │
                                        │ "需要补充新素材！"     │
                                        └───────────────────────┘
                                                      │
                                                      ▼
                                        ┌───────────────────────┐
                                        │ 使用 manage_training  │
                                        │ 添加新样本            │
                                        └───────────────────────┘
                                                      │
                                                      ▼
                                        ┌───────────────────────┐
                                        │ 新鲜度恢复            │
                                        │ 继续生成              │
                                        └───────────────────────┘
```

---

## 快速参考

```bash
# 检查状态
python3 manage_training.py dashboard

# 生成模板
python3 manage_training.py template --type gm --output new.json

# 导入样本
python3 manage_training.py import new.json

# 检查新鲜度
python3 manage_training.py check --type gm

# 查看历史
python3 manage_training.py history --type alerts
```

---

**祝训练顺利！** 🧹✨
