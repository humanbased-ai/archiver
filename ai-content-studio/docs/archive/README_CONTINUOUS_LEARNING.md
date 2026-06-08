# AI Content Studio 持续学习系统

## 🎯 解决的问题

**核心痛点：AI 生成内容会逐渐套路化、重复**

即使有训练数据，持续生成内容时会遇到：
- ❌ 短语重复使用（"from the trenches" 出现 N 次）
- ❌ 模式固化（总是 "gm + [地点]"）
- ❌ 创意枯竭（生成 100 条后开始明显重复）

## ✅ 我们的解决方案

### 1. 自动监控系统
- 每生成 20 条内容自动检查新鲜度
- 实时计算 4 个指标：完全重复、相似重复、短语重复、训练新鲜度
- 检测到问题时自动报警

### 2. 持续学习流程
- 简化训练数据更新（模板 → 填写 → 导入）
- 提供针对性建议（根据当前问题推荐需要什么样的样本）
- 记录所有训练历史

## 🚀 快速开始

### 查看当前状态
```bash
python3 manage_training.py dashboard
```

### 当系统报警时（新鲜度 < 0.6）

**Step 1: 生成模板**
```bash
python3 manage_training.py template --type gm --count 5 --output new_samples.json
```

**Step 2: 填写模板**（从 Twitter/X 收集高互动推文）
```json
{
  "content_type": "gm",
  "source": "high_engagement_tweets",
  "notes": "Binance 2025年1月推文",
  "samples": [
    {
      "text": "gm, ready to break things today?",
      "style": "question_playful",
      "tone": "mischievous",
      "engagement": "high (850 likes)",
      ...
    }
  ]
}
```

**Step 3: 导入**
```bash
python3 manage_training.py import new_samples.json
```

**Step 4: 验证**
```bash
python3 manage_training.py check --type gm
```

## 📊 监控指标

| 指标 | 阈值 | 说明 |
|-----|------|------|
| **新鲜度得分** | > 0.6 | 综合评分，低于 0.6 需要训练 |
| 完全重复率 | < 10% | 完全相同的推文占比 |
| 相似重复率 | < 25% | 高度相似的推文占比 |
| 短语重复率 | < 40% | 重复使用的短语占比 |
| 训练新鲜度 | < 30天 | 距上次训练的天数 |

## 🛠️ 命令参考

```bash
# 状态检查
manage_training.py dashboard              # 仪表板
manage_training.py check --type gm        # 检查新鲜度
manage_training.py suggest --type gm      # 获取建议

# 添加样本
manage_training.py template --type gm --output new.json   # 生成模板
manage_training.py import new.json                        # 导入模板
manage_training.py add --type gm --text "..." --style ... # 快速添加

# 历史记录
manage_training.py history --type all --limit 10          # 所有历史
manage_training.py history --type alerts --limit 5        # 报警记录
```

## 📁 文件结构

```
ai-content-studio/
├── src/intelligence/
│   ├── content_freshness_monitor.py    # 新鲜度监控
│   ├── continuous_learning_system.py   # 持续学习系统
│   └── claude_client.py                # 集成监控（自动检查）
├── skills/
│   ├── training_data_gm.json           # GM 训练数据
│   ├── creative_gm_engine.py           # 创意生成引擎
│   └── gm_ascii_art.py                 # ASCII 艺术
├── data/
│   └── generated_history.json          # 生成历史（自动创建）
├── manage_training.py                  # 命令行工具
└── docs/
    └── TRAINING_GUIDE.md               # 详细使用指南
```

## 🔔 报警示例

当生成 20 条后，如果检测到问题：

```
======================================================================
⚠️ 内容新鲜度警报！
======================================================================
📊 GM 内容新鲜度报告
得分: 0.45 / 1.00

⚠️ 问题：
🚨 完全重复率过高: 15.0% (阈值: 10%)
⚠️ 短语重复率过高: 42.0% (阈值: 40%)

💡 建议：
  - 立即添加新的训练样本，避免生成重复内容
  - 高频短语: from the trenches, neural nets, data mines

📈 统计：
  - 完全重复率: 15.0%
  - 相似重复率: 18.0%
  - 短语重复率: 42.0%
  - 距上次训练: 35 天
======================================================================
```

## 💡 最佳实践

### 训练频率
- ✅ **主动**: 每 2-3 周添加 3-5 个新样本
- ✅ **被动**: 收到报警时立即补充 5-10 个样本

### 素材来源
1. **Twitter/X 高互动推文** - Binance, Coinbase, crypto KOLs
2. **Jessie 自己的高互动推文** - 看哪些效果好
3. **新 meme 和梗** - 关注 crypto Twitter 动态
4. **时事热点** - 融入当下话题

### 样本质量 > 数量
- 选择真正有创意、高互动的推文
- 注重风格多样性（不要都是同一种类型）
- 记录详细的 `key_features`（帮助理解为什么好）

## 🎓 详细文档

完整使用指南：[docs/TRAINING_GUIDE.md](docs/TRAINING_GUIDE.md)

---

**设计理念：**
> "AI 不会永远创新，但我们可以通过持续学习让它保持新鲜。"

**核心目标：**
- 🔍 自动检测问题（不需要人工发现）
- 📋 简化更新流程（模板化、一键导入）
- 📊 量化指标（知道什么时候需要训练）
- 🔄 闭环反馈（生成 → 监控 → 报警 → 训练 → 生成）
