# 🧪 SAM (Segment Anything Model) 测试指南

## 📋 概述

这是 SAM 集成的第一阶段：**快速原型测试**

**目标：** 验证 SAM 在像素艺术风格的 Milady NFT 上是否能有效检测配饰区域。

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install replicate Pillow
```

或使用 requirements.txt:

```bash
pip install -r requirements.txt
```

### 2. 设置 API Token

确保已设置 Replicate API Token（与 FLUX Fill Pro 使用相同的 token）:

```bash
export REPLICATE_API_TOKEN='your-token-here'
```

### 3. 运行测试

**简单测试（推荐）：**

```bash
python test_sam_simple.py 5050
```

这将：
1. 生成 Milady NFT #5050
2. 使用 SAM 进行自动分割
3. 显示 SAM 输出结果
4. 保存可视化图像

**完整测试（待 SAM 输出格式确认后）：**

```bash
python test_sam_prototype.py --nft-id 5050 --accessory hat
```

---

## 📊 测试目标

### 我们要验证的问题

1. **SAM 能否分割像素艺术？**
   - Milady NFT 是像素艺术风格
   - SAM 主要为照片级图像设计
   - 需要验证其在像素艺术上的效果

2. **SAM 能否识别小配饰？**
   - 帽子、眼镜、耳环等配饰相对较小
   - 需要足够的分割精度

3. **SAM 输出格式是什么？**
   - 是否提供边界框 (bounding box)?
   - 是否提供分割掩码 (segmentation mask)?
   - 如何从输出中提取区域坐标？

4. **位置启发式规则是否可行？**
   - 帽子应该在图像顶部
   - 眼镜应该在中间偏上
   - 衣服应该在底部
   - 能否根据位置筛选出正确的分割区域？

---

## 🎯 预期结果

### ✅ 成功标准

如果测试成功，我们应该能够：

1. SAM 成功分割 Milady NFT，产生多个区域
2. 可以从输出中提取边界框坐标 (x, y, width, height)
3. 使用位置启发式规则，能够识别出正确的配饰区域
4. 检测到的区域与手动预定义区域的 IoU > 0.6

### ⚠️ 可能的问题

**问题 1: SAM 无法分割像素艺术**
- **表现：** SAM 输出为空或只有一个大区域
- **解决：** 调整 SAM 参数，或考虑专门的像素艺术分割模型

**问题 2: 分割过于细碎**
- **表现：** 输出数百个小区域，无法识别完整配饰
- **解决：** 调整 SAM 参数，或使用后处理合并区域

**问题 3: 无法区分配饰和身体部位**
- **表现：** 帽子和头发被识别为一个区域
- **解决：** 使用 GroundingDINO + SAM 方案（方案 B）

**问题 4: 不同 NFT 差异较大**
- **表现：** 在一个 NFT 上效果好，另一个效果差
- **解决：** 扩大测试集，调整启发式规则

---

## 📂 测试输出

测试脚本会在 `test_output/sam_test/` 目录下生成：

```
test_output/sam_test/
├── milady_5050.png              # 原始 NFT
├── milady_5050_sam_visual.png   # SAM 分割可视化
└── sam_results.json             # SAM 输出数据（如果有）
```

---

## 🔍 测试案例

建议在以下 NFT 上测试（它们有不同的配饰）：

| NFT ID | 特点 | 适合测试 |
|--------|------|----------|
| 5050 | 有帽子 | Hat 检测 |
| 1234 | 有眼镜 | Glasses 检测 |
| 8888 | 不同衣服 | Clothes 检测 |
| 3274 | 有耳环 | Earrings 检测 |
| 3261 | 有项链 | Necklace 检测 |

---

## 💰 成本估算

SAM API 调用成本：

- **每次调用：** ~$0.001 USD
- **测试 5 个 NFT：** ~$0.005 USD
- **测试 20 个 NFT：** ~$0.02 USD

非常便宜，可以放心测试。

---

## 📈 测试流程

### Phase 1: 单个 NFT 快速验证

```bash
# 测试一个 NFT
python test_sam_simple.py 5050
```

**检查：**
- ✅ SAM 调用成功？
- ✅ 输出格式是什么？
- ✅ 是否包含边界框或掩码？

---

### Phase 2: 多个 NFT 对比测试

```bash
# 测试多个 NFT
python test_sam_simple.py 5050
python test_sam_simple.py 1234
python test_sam_simple.py 8888
```

**检查：**
- ✅ 不同 NFT 上效果是否一致？
- ✅ 能否识别不同类型的配饰？

---

### Phase 3: 精度评估

一旦确认 SAM 输出格式，更新 `test_sam_prototype.py` 来：

1. 提取边界框
2. 应用位置启发式规则
3. 与预定义区域对比（计算 IoU）
4. 生成准确度报告

---

## 🔬 启发式规则设计

基于 500x500 图像的相对位置：

### 帽子 (Hat)
```python
{
    "y_range": (0, 0.4),      # 图像顶部 40%
    "size_range": (0.1, 0.5)  # 占 10-50% 面积
}
```

### 眼镜 (Glasses)
```python
{
    "y_range": (0.3, 0.5),    # 30-50% 高度
    "size_range": (0.05, 0.3) # 占 5-30% 面积
}
```

### 耳环 (Earrings)
```python
{
    "y_range": (0.35, 0.6),   # 35-60% 高度
    "x_range": (0, 0.4),      # 左侧 40%（左耳）
    "size_range": (0.02, 0.15)
}
```

### 项链 (Necklace)
```python
{
    "y_range": (0.6, 0.8),    # 60-80% 高度
    "size_range": (0.05, 0.2)
}
```

### 衣服 (Clothes)
```python
{
    "y_range": (0.7, 1.0),    # 底部 30%
    "size_range": (0.2, 0.6)
}
```

---

## 🎯 决策标准

测试完成后，根据结果决定下一步：

### ✅ 如果 SAM 效果好（IoU > 0.6）

**继续 Phase 2:**
- 实现完整的 `sam_detector.py` 模块
- 集成到 `flux_fill_pro.py`
- 添加缓存机制
- 上线到生产环境

**预期收益：**
- ✅ 支持所有 Milady Maker 图层类型
- ✅ 自动适配不同 NFT 的配饰位置差异
- ✅ 不需要手动预定义坐标

---

### ⚠️ 如果 SAM 效果一般（0.3 < IoU < 0.6）

**尝试优化：**
- 调整 SAM 参数
- 优化启发式规则
- 尝试 GroundingDINO + SAM 方案

**或者混合方案：**
- SAM 检测为主
- 预定义区域作为回退
- 用户可以手动调整

---

### ❌ 如果 SAM 效果不好（IoU < 0.3）

**暂缓 SAM 集成：**
- 保持当前的 6 个预定义区域
- 考虑其他方案：
  - 手动标注更多 NFT 样本
  - 使用专门的像素艺术分割模型
  - 等待 SAM 更新版本

---

## 📝 测试报告模板

测试完成后，填写以下报告：

```
# SAM 测试报告

**测试日期：** YYYY-MM-DD
**测试人员：** [你的名字]

## 测试配置
- SAM 模型：meta/sam-2
- 测试 NFT 数量：X
- 测试配饰类型：hat, glasses, ...

## 测试结果

### NFT #5050 (帽子)
- ✅/❌ SAM 调用成功
- SAM 输出格式：[描述]
- 检测到的区域数量：X
- 帽子区域检测：✅/❌
- IoU 分数：0.XX

### NFT #1234 (眼镜)
- ...

## 总结

### 优点
- [列出 SAM 表现好的方面]

### 缺点
- [列出 SAM 表现不好的方面]

### 建议
- [ ] 继续 Phase 2（完整集成）
- [ ] 尝试优化方案
- [ ] 暂缓 SAM 集成
```

---

## 🔗 相关文档

- [SAM 集成方案](SAM_INTEGRATION_PLAN.md) - 完整技术方案
- [FLUX Fill Pro 指南](FLUX_FILL_PRO_GUIDE.md) - 当前实现
- [Replicate SAM 文档](https://replicate.com/meta/sam-2) - API 参考

---

## 📞 下一步

完成测试后，向我报告：

1. SAM 是否成功运行？
2. SAM 输出格式是什么？
3. 是否能够识别配饰区域？
4. 你的建议：继续、优化、还是暂缓？

我会根据测试结果更新实施计划。

---

**创建日期：** 2026-01-07
**状态：** 🧪 Phase 1 原型测试中
