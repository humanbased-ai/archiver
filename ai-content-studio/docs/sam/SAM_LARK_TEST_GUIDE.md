# SAM Lark 测试指南

**日期**: 2026-01-07
**功能**: SAM (Segment Anything Model) 自动配饰检测 + FLUX Fill Pro 智能替换

---

## 🚀 快速开始

### 在 Lark/飞书中测试 SAM

SAM 功能已集成到 Lark Meme Bot，可以通过新命令 `/milady_replace_sam` 测试。

---

## 📝 测试命令

### 1. 查看帮助

```
/milady_replace_sam
```

会显示完整的使用指南和示例。

### 2. 简单测试（推荐）

**测试帽子检测:**
```
/milady_replace_sam 5050 hat cyberpunk cap with neon blue lights
```

**测试眼镜检测:**
```
/milady_replace_sam 5050 glasses purple holographic sunglasses with neon glow
```

**测试耳环检测:**
```
/milady_replace_sam 3274 earrings glowing diamond earrings, futuristic
```

**测试项链检测:**
```
/milady_replace_sam 8888 necklace holographic necklace with purple glow
```

### 3. 中文测试

```
/milady_replace_sam 5050 帽子 未来主义全息帽子
/milady_replace_sam 1234 眼镜 赛博朋克紫色墨镜
/milady_replace_sam 3274 耳环 发光钻石耳环
```

### 4. 高级测试（多行格式）

```
/milady_replace_sam 5050
accessory: glasses
description: cyberpunk sunglasses with purple glow, futuristic, highly detailed
guidance: 30.0
steps: 28
```

---

## 🔍 SAM vs 普通模式对比

### 普通模式（预定义区域）

```
/milady_replace 5050 glasses cyberpunk sunglasses
```

- ✅ 更便宜（$0.032）
- ❌ 使用固定坐标，精度较低
- ❌ 对不同 NFT 适配性差

### SAM 模式（自动检测）

```
/milady_replace_sam 5050 glasses cyberpunk sunglasses
```

- ✅ 自动检测配饰位置（智能匹配）
- ✅ 精度更高（位置分数 0.93-1.0）
- ✅ 适配所有 NFT
- ⚠️ 稍贵（$0.043，增加 $0.011）
- ✅ 缓存可节省 50-70% 成本

---

## 📊 测试预期结果

### 成功案例

当 SAM 成功检测时，你会看到：

```
🔍 正在使用 SAM 检测并替换配饰...

NFT 编号: 5050
配饰类型: hat
新描述: cyberpunk cap with neon blue lights
Guidance: 30.0
Steps: 28

⏳ 步骤:
1. 生成基础 NFT 图片
2. 使用 SAM 自动检测配饰区域
3. FLUX Fill Pro 智能替换

预计需要 40-80 秒...
```

**终端输出（你能看到）:**
```
🔄 运行 SAM-2 模型...
✅ SAM 检测到 22 个掩码
✅ 检测到帽子:
   位置分数: 1.000
   IoU: 0.595
   综合分数: 0.797
   区域: (53, 15, 389, 159)
✨ 调用 FLUX Fill Pro...
✅ FLUX Fill Pro 生成成功
💾 已保存到: /tmp/milady_5050_sam_replaced_hat.png
```

**Lark 卡片消息:**
```
✅ SAM 配饰替换成功！

NFT 编号: 5050
配饰类型: hat
新描述: cyberpunk cap with neon blue lights

🔍 SAM 检测:
• 自动检测配饰区域
• 智能匹配算法
• 比预定义区域更精确

💡 提示:
• SAM 检测成本: $0.011
• FLUX Fill Pro: $0.032
• 缓存可节省 50-70% 成本
```

然后会收到生成的图片。

### 检测指标解读

- **位置分数 (Position Score)**: 0.0-1.0
  - >0.9 = 优秀（配饰在预期位置）
  - 0.7-0.9 = 良好
  - 0.5-0.7 = 可接受
  - <0.5 = 较差（可能使用预定义区域）

- **IoU (Intersection over Union)**: 0.0-1.0
  - >0.6 = 优秀（与预定义区域高度重合）
  - 0.4-0.6 = 良好
  - 0.2-0.4 = 可接受（预定义区域可能不准确）
  - <0.2 = 差（预定义区域很不准确）

- **综合分数 (Combined Score)**: IoU * 0.5 + 位置分数 * 0.5
  - >0.7 = 优秀
  - 0.5-0.7 = 良好
  - <0.5 = 可接受（但建议检查结果）

---

## 🧪 推荐测试流程

### 第一步：快速验证（1 个测试）

测试一个简单的配饰（帽子），验证 SAM 能否正常工作：

```
/milady_replace_sam 5050 hat cyberpunk cap with neon lights
```

**预期**:
- 40-80 秒后收到图片
- 帽子应该被替换成赛博朋克风格
- 终端显示检测分数

### 第二步：多配饰验证（3-4 个测试）

测试不同类型的配饰：

```
/milady_replace_sam 5050 glasses purple holographic sunglasses
/milady_replace_sam 3274 earrings glowing diamond earrings
/milady_replace_sam 8888 necklace holographic necklace
```

**预期**:
- 所有配饰都能被检测到
- 位置分数 >0.9
- 生成的图片效果自然

### 第三步：对比测试（可选）

对比 SAM 模式 vs 普通模式：

```
# 普通模式
/milady_replace 5050 hat futuristic cap

# SAM 模式
/milady_replace_sam 5050 hat futuristic cap
```

**预期**:
- SAM 模式的检测区域更精确
- 生成效果更自然
- 边缘处理更好

### 第四步：中文测试（可选）

```
/milady_replace_sam 5050 帽子 全息帽子
/milady_replace_sam 1234 眼镜 紫色墨镜
```

**预期**:
- 中文配饰类型正确转换为英文
- 功能正常工作

---

## ⚠️ 常见问题

### 问题 1: SAM 检测失败

**症状**: 收到"⚠️ 未找到合适的掩码，使用预定义区域"

**可能原因**:
- 配饰不存在或不明显
- NFT 图片质量问题
- 配饰太小（如小耳环）

**解决方案**:
- 选择有明显配饰的 NFT
- 使用 `/milady_replace` (不使用 SAM)

### 问题 2: 处理时间过长

**症状**: 超过 2 分钟没有响应

**可能原因**:
- Replicate API 排队
- SAM 模型冷启动
- 网络问题

**解决方案**:
- 等待或重试
- 检查 Replicate 账户余额
- 检查 API Token 是否有效

### 问题 3: 成本过高

**症状**: Replicate 费用增长快

**原因**:
- 每次调用 SAM: $0.011
- 每次调用 FLUX Fill Pro: $0.032
- 总计: $0.043/张

**解决方案**:
- 启用缓存（自动）
- 相同 NFT 会命中缓存（节省 $0.011）
- 10 张测试约 $0.25-0.43

### 问题 4: 图片效果不好

**症状**: 生成的图片不如预期

**原因**:
- 描述不够详细
- guidance 参数不合适
- 配饰区域检测不准

**解决方案**:
- 使用更详细的英文描述
- 调整 guidance (20-40)
- 增加 steps (30-50)

---

## 💰 成本估算

### 测试成本

**快速验证（1 张）:**
- SAM: $0.011
- FLUX Fill Pro: $0.032
- **总计: $0.043**

**多配饰测试（4 张）:**
- 第一张: $0.043
- 后续 3 张: $0.032 x 3 = $0.096 (如果是同一 NFT，SAM 缓存命中)
- **总计: $0.139**

**对比测试（2 张）:**
- 普通模式: $0.032
- SAM 模式: $0.043
- **总计: $0.075**

**完整测试流程（约 10 张）:**
- 假设 50% 缓存命中率
- SAM: $0.011 x 5 = $0.055
- FLUX Fill Pro: $0.032 x 10 = $0.320
- **总计: $0.375**

### 生产成本

**100 张 NFT（不同 NFT）:**
- 无缓存: $0.043 x 100 = **$4.30**
- 50% 缓存: $0.038 x 100 = **$3.80** (节省 $0.50)

**1000 张 NFT（不同 NFT）:**
- 无缓存: $0.043 x 1000 = **$43.00**
- 70% 缓存: $0.035 x 1000 = **$35.00** (节省 $8.00)

---

## 📈 成功标准

测试通过的标准：

✅ **基础功能**:
- [ ] SAM 能成功初始化
- [ ] 命令能正常解析
- [ ] 能生成基础 NFT 图片

✅ **检测精度**:
- [ ] 帽子位置分数 >0.9
- [ ] 眼镜位置分数 >0.9
- [ ] 耳环能被检测到（位置分数 >0.8）
- [ ] 项链能被检测到（位置分数 >0.8）

✅ **生成质量**:
- [ ] 配饰替换位置正确
- [ ] 边缘处理自然
- [ ] 风格与描述匹配
- [ ] 无明显瑕疵

✅ **系统稳定性**:
- [ ] 无崩溃或异常
- [ ] 错误提示清晰友好
- [ ] 处理时间合理 (40-80 秒)

✅ **用户体验**:
- [ ] 命令简单易用
- [ ] 帮助文档清晰
- [ ] 中文支持正常
- [ ] 卡片消息信息完整

---

## 🎯 下一步

测试完成后，根据结果决定：

### 如果测试成功（4/4 或 3/4 通过）
1. ✅ 启用 SAM 作为可选功能
2. 📝 更新用户文档
3. 🚀 考虑设为默认模式（`/milady_replace` 也使用 SAM）
4. 📊 收集真实用户反馈

### 如果测试部分成功（2/4 通过）
1. 🔍 分析失败原因
2. 🛠️ 调整位置启发式规则
3. 🧪 增加更多测试用例
4. ⚠️ 仅对成功的配饰类型启用 SAM

### 如果测试失败（0-1/4 通过）
1. ❌ 不启用 SAM
2. 🐛 调试 SAM 集成问题
3. 📧 联系 Replicate 支持
4. 🔄 回退到预定义区域模式

---

## 📞 支持

如有问题：

1. **检查日志**: 终端会显示详细的 SAM 检测信息
2. **查看文档**: `SAM_INTEGRATION_COMPLETE.md`
3. **运行本地测试**: `python3 test_sam_integration.py`
4. **Replicate 状态**: https://replicate.com/status

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
