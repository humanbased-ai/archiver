# 🎨 Milady Illusion - 完整使用文档

## 📚 文档目录

本项目包含以下完整的使用指南：

### 1. **飞书快速使用指南**
- 文件: `LARK_QUICK_START.md`
- 内容: 如何在飞书中查看和使用 Milady Illusion 功能
- 适合: 所有用户

### 2. **Milady 命令指南**
- 文件: `MILADY_COMMAND_GUIDE.md`
- 内容: 详细的命令使用说明、参数配置、实际案例
- 适合: 需要了解详细命令的用户

### 3. **Prompt 模板指南**
- 文件: `PROMPT_TEMPLATE_GUIDE.md`
- 内容: Replicate ControlNet 参数配置、调整策略、关键词库
- 适合: 高级用户、需要精细控制效果的用户

### 4. **Replicate 购买指南**
- 文件: `REPLICATE_BILLING_GUIDE.md`
- 内容: 如何购买额度、定价说明、费用预估
- 适合: 需要充值的用户

---

## 🚀 快速开始

### 在飞书中查看指南

最简单的方式是直接在飞书中查看使用指南：

```
@我是机器人 /milady help
```

机器人会自动回复完整的使用说明！

---

## 💡 核心功能

### 1. 简单模式（推荐新手）

一行命令即可生成：

```
@我是机器人 /milady 5555 holding pizza, cyberpunk style
```

### 2. 高级模式（精细控制）

完全自定义参数：

```
@我是机器人 /milady 3456
effect_strength: 1.2
positive_prompt: winter wonderland, snowy street, cozy houses, christmas lights, realistic, highly detailed
negative_prompt: low quality, blurry, bad anatomy
```

---

## ⚙️ 核心参数

### Effect Strength (特效强度)
- **0.8** = 温和（最保留原图）
- **1.1** = 适中（推荐默认）⭐
- **1.5** = 强烈（明显风格转换）
- 范围: 0.0 - 2.5

### Positive Prompt (正向提示词)
描述你想要的效果，可以很详细！

常用关键词分类：
- **质量词**: masterpiece, best quality, highly detailed, sharp focus
- **风格词**: cyberpunk, fantasy, watercolor, digital art
- **光线词**: neon lights, glowing, dramatic lighting, soft lighting
- **色彩词**: vibrant colors, pastel colors, monochrome

### Negative Prompt (负向提示词)
描述你想避免的问题

推荐组合：
- **基础版**: low quality, blurry
- **标准版**: low quality, blurry, bad anatomy, deformed, ugly, distorted
- **完整版**: low quality, worst quality, blurry, bad anatomy, watermark, text

---

## 📊 使用场景

### 场景 1: 日常使用（平衡效果）
```
effect_strength: 1.1
positive_prompt: anime girl, {description}, high quality, detailed
negative_prompt: low quality, blurry, bad anatomy, deformed, ugly, distorted
```

### 场景 2: 保留原图（温和效果）
```
effect_strength: 0.8
positive_prompt: anime girl, {description}
negative_prompt: low quality, blurry
```

### 场景 3: 艺术创作（强烈风格）
```
effect_strength: 1.5
positive_prompt: anime girl, {description}, masterpiece, best quality, vibrant colors
negative_prompt: low quality, blurry, bad anatomy, watermark
```

### 场景 4: 赛博朋克专用
```
effect_strength: 1.4
positive_prompt: anime girl, {description}, cyberpunk style, neon lights, futuristic, vibrant colors
negative_prompt: low quality, blurry, bad anatomy, natural, vintage
```

---

## 💰 费用说明

### 定价
- **每张图成本**: 约 $0.007 (不到 7 分钱人民币)
- **生成时间**: 约 7-10 秒

### 使用量估算

| 每日使用量 | 月费用 |
|-----------|--------|
| 10 张/天 | ~$2.10 |
| 50 张/天 | ~$10.50 |
| 100 张/天 | ~$21.00 |

### 推荐充值
- **新手测试**: $10（约可生成 1400 张图）
- **日常使用**: $20/月（自动付款模式）
- **高频使用**: $50/月

详细购买指南请查看 `REPLICATE_BILLING_GUIDE.md`

---

## 🔧 系统配置

### 当前默认参数

```python
EFFECT_STRENGTH = 1.1
GUIDANCE_SCALE = 7.0
NUM_INFERENCE_STEPS = 40
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"
```

### 修改默认参数

1. 编辑 `replicate_config.py`
2. 修改以下参数：
   ```python
   EFFECT_STRENGTH = 1.2  # 你的值
   POSITIVE_PROMPT_TEMPLATE = "你的模板, {description}, 你的关键词"
   NEGATIVE_PROMPT = "你的负面词"
   ```
3. 重启 webhook 服务器：
   ```bash
   pkill -f webhook_server.py
   nohup python3 webhook_server.py > webhook.log 2>&1 &
   ```

详细配置指南请查看 `PROMPT_TEMPLATE_GUIDE.md`

---

## 🧪 测试流程

### 方法 1: 飞书实时测试

1. 在飞书发送命令
2. 等待 7-10 秒
3. 查看生成结果
4. 根据效果调整参数

### 方法 2: 使用测试脚本

```bash
python3 test_custom_params.py
```

可以同时测试多个参数组合，快速对比效果。

---

## 📖 完整文档索引

### 新手入门
1. 阅读 `LARK_QUICK_START.md` - 了解基础使用
2. 在飞书发送 `@我是机器人 /milady help` - 查看指南
3. 尝试简单模式 - 一行命令生成

### 进阶使用
1. 阅读 `MILADY_COMMAND_GUIDE.md` - 了解所有参数
2. 阅读 `PROMPT_TEMPLATE_GUIDE.md` - 学习 Prompt 编写
3. 使用高级模式 - 精细控制效果

### 生产部署
1. 阅读 `REPLICATE_BILLING_GUIDE.md` - 购买额度
2. 修改 `replicate_config.py` - 固化最佳参数
3. 监控使用量 - 控制成本

---

## 🎯 最佳实践

### 1. 从默认参数开始
- 使用简单模式测试基础效果
- 了解默认参数的表现

### 2. 逐步调整参数
- 先调整 effect_strength 找到合适强度
- 再优化 positive_prompt 添加风格词
- 最后完善 negative_prompt 提升质量

### 3. 记录最佳配置
- 将满意的参数组合记录下来
- 固化到 `replicate_config.py` 作为默认值

### 4. 控制成本
- 设置月度消费限额
- 降低推理步数可以节省费用
- 批量生成相似图片可以利用缓存

---

## ❓ 常见问题

### Q: 如何在飞书查看指南？
A: 发送 `@我是机器人 /milady help`

### Q: 生成失败怎么办？
A:
1. 检查 Replicate 余额是否充足
2. 查看 `webhook.log` 日志
3. 确认网络连接正常

### Q: 如何修改默认参数？
A:
1. 编辑 `replicate_config.py`
2. 修改对应的参数值
3. 重启 webhook 服务器

### Q: Prompt 可以写多长？
A: 没有限制，越详细效果越好！

### Q: 如何恢复默认设置？
A: 将 `replicate_config.py` 中的参数恢复为：
```python
EFFECT_STRENGTH = 1.1
GUIDANCE_SCALE = 7.0
NUM_INFERENCE_STEPS = 40
```

---

## 🔗 相关链接

- **Replicate 账单**: https://replicate.com/account/billing
- **模型详情**: https://replicate.com/lucataco/illusion-diffusion-hq
- **定价说明**: https://replicate.com/pricing

---

## 📞 获取帮助

### 飞书中
```
@我是机器人 /milady help
```

### 文档中
- 基础使用: `LARK_QUICK_START.md`
- 详细命令: `MILADY_COMMAND_GUIDE.md`
- 参数配置: `PROMPT_TEMPLATE_GUIDE.md`
- 购买额度: `REPLICATE_BILLING_GUIDE.md`

---

## 🎉 开始使用

现在就在飞书中发送以下命令开始吧：

```
@我是机器人 /milady help
```

祝你玩得开心！🎨✨
