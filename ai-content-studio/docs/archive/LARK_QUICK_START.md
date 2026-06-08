# 📱 飞书快速使用指南

## 🚀 如何在飞书查看 Milady Illusion 指南

### 方法 1: 使用 help 命令（推荐）

在飞书群聊中发送：

```
@我是机器人 /milady help
```

或者：

```
@我是机器人 /milady guide
```

机器人会自动回复完整的使用指南，包括：
- ✅ 简单模式和高级模式的使用方法
- ✅ 参数说明（effect_strength, positive_prompt, negative_prompt）
- ✅ 实际案例（赛博朋克、冬季雪景、温和效果）
- ✅ 常用关键词库

---

## 📖 可用的指南文档

系统中包含以下完整指南文档：

### 1. **MILADY_COMMAND_GUIDE.md**
- 两种使用模式（简单/高级）
- 完整的参数说明
- 实际使用案例
- Prompt 编写技巧
- 参数对照表

### 2. **PROMPT_TEMPLATE_GUIDE.md**
- Replicate ControlNet 参数配置
- 调整策略（保留原图/风格转换/极致质量）
- 常用 Prompt 关键词库
- 实用模板示例
- 测试流程

### 3. **REPLICATE_BILLING_GUIDE.md**
- 如何购买 Replicate 额度
- 定价说明
- 费用预估
- 省钱技巧
- 常见问题

---

## 💡 快速开始

### 第一次使用（简单模式）

```
@我是机器人 /milady 5555 holding pizza, cyberpunk style
```

### 进阶使用（高级模式）

```
@我是机器人 /milady 3456
effect_strength: 1.2
positive_prompt: winter wonderland, snowy street, cozy houses, christmas lights, realistic, highly detailed
negative_prompt: low quality, blurry, bad anatomy
```

---

## 🔧 参数快速参考

| 参数 | 范围 | 推荐值 | 说明 |
|------|------|--------|------|
| **effect_strength** | 0.0 - 2.5 | 0.8 / 1.1 / 1.5 | 0.8=温和, 1.1=适中, 1.5=强烈 |
| **guidance_scale** | 1.0 - 20.0 | 6.0 / 7.0 / 9.0 | 文本引导强度 |
| **num_inference_steps** | 20 - 100 | 30 / 40 / 50 | 推理步数（质量vs速度）|

---

## 📊 常见场景

### 场景 1: 保留更多原图特征
```
effect_strength: 0.8
positive_prompt: anime girl, {description}
```

### 场景 2: 明显的风格转换
```
effect_strength: 1.5
positive_prompt: anime girl, {description}, masterpiece, best quality, vibrant colors
```

### 场景 3: 赛博朋克专用
```
effect_strength: 1.4
positive_prompt: anime girl, {description}, cyberpunk style, neon lights, futuristic, vibrant colors
```

---

## 💰 费用说明

- **每张图成本**: 约 $0.007（不到 7 分钱人民币）
- **每天生成 10 张**: 月费约 $2
- **每天生成 50 张**: 月费约 $10

推荐充值: $10-$20（可用很久）

---

## ❓ 常见问题

**Q: 如何查看指南？**
A: 发送 `@我是机器人 /milady help`

**Q: 生成需要多久？**
A: 约 7-10 秒（使用 Replicate ControlNet）

**Q: 如何调整参数？**
A: 使用高级模式，自定义 effect_strength, positive_prompt, negative_prompt

**Q: positive_prompt 可以写多长？**
A: 没有限制！越详细越好

**Q: 余额不足怎么办？**
A: 查看 `REPLICATE_BILLING_GUIDE.md` 了解如何购买额度

---

## 🎉 快速测试

发送以下消息测试功能：

```
@我是机器人 /milady help
```

你会收到完整的使用指南！

---

## 📞 需要帮助？

- 查看帮助: `@我是机器人 /milady help`
- 完整文档: 查看 `MILADY_COMMAND_GUIDE.md`
- 参数配置: 查看 `PROMPT_TEMPLATE_GUIDE.md`
- 购买额度: 查看 `REPLICATE_BILLING_GUIDE.md`
