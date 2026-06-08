# 🤖 Segment Anything Model (SAM) 集成方案

## 📋 方案概述

使用 Meta 的 Segment Anything Model (SAM) 自动检测 Milady NFT 中的配饰位置，让 FLUX Fill Pro 可以自动适配任何配饰，而不需要手动预定义坐标。

---

## 🎯 目标

**现状问题：**
- ❌ 只支持 6 种预定义配饰区域
- ❌ 坐标是手动估算的，不够准确
- ❌ 不同 NFT 的配饰位置略有差异

**目标效果：**
- ✅ 自动识别任何配饰的准确位置
- ✅ 支持所有 Milady Maker 图层类型
- ✅ 适配不同 NFT 的配饰位置差异

---

## 🔧 技术方案

### 方案 A: 使用官方 SAM 模型 ⭐ 推荐

**使用：** Meta 的 Segment Anything Model

**安装：**
```bash
pip install segment-anything
pip install opencv-python
```

**模型下载：**
```python
# SAM 模型文件
sam_vit_h (2.4GB) - 最准确
sam_vit_l (1.2GB) - 平衡
sam_vit_b (375MB) - 最快
```

**工作流程：**
```
1. 加载 Milady NFT 图片
2. 使用 SAM 自动分割图像
3. 识别配饰区域（基于位置和大小）
4. 生成精确的遮罩
5. 传递给 FLUX Fill Pro
```

---

### 方案 B: 使用 GroundingDINO + SAM

**使用：** GroundingDINO (文本提示) + SAM (精确分割)

**优点：**
- ✅ 可以用文本描述配饰（如 "hat", "glasses"）
- ✅ 更准确的配饰识别
- ✅ 减少误检测

**缺点：**
- ❌ 需要两个模型
- ❌ 更慢（两次推理）
- ❌ 更复杂

---

### 方案 C: 使用 Replicate API 托管的 SAM

**使用：** 通过 Replicate API 调用 SAM

**优点：**
- ✅ 无需本地安装模型
- ✅ 无需本地计算资源
- ✅ 易于集成

**缺点：**
- ❌ 额外的 API 调用费用（~$0.001/张）
- ❌ 网络延迟
- ❌ 依赖外部服务

---

## 📊 方案对比

| 方案 | 准确度 | 速度 | 成本 | 复杂度 |
|------|--------|------|------|--------|
| 官方 SAM | ⭐⭐⭐⭐ | ⭐⭐⭐ | 免费 | ⭐⭐ |
| GroundingDINO+SAM | ⭐⭐⭐⭐⭐ | ⭐⭐ | 免费 | ⭐⭐⭐⭐ |
| Replicate SAM | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.001/张 | ⭐ |

**推荐：** 方案 C (Replicate API) 或 方案 A (官方 SAM)

---

## 💻 实现步骤

### 阶段 1: 基础集成（方案 C - Replicate API）

#### 1.1 创建 SAM 检测模块

**文件：** `src/meme/sam_detector.py`

```python
import replicate
from typing import Tuple, List, Dict

class SAMDetector:
    """使用 Segment Anything Model 检测配饰区域"""

    def __init__(self, api_token: str = None):
        self.api_token = api_token or os.getenv("REPLICATE_API_TOKEN")

    def detect_accessory_region(
        self,
        image_path: str,
        accessory_type: str
    ) -> Tuple[int, int, int, int]:
        """
        检测配饰区域

        Returns:
            (x, y, width, height) 配饰的边界框
        """
        # 使用 SAM 自动分割
        segments = self._segment_image(image_path)

        # 根据配饰类型和位置筛选
        region = self._identify_accessory(segments, accessory_type)

        return region

    def _segment_image(self, image_path: str) -> List[Dict]:
        """使用 SAM 分割图像"""
        output = replicate.run(
            "meta/sam:...",  # SAM 模型
            input={
                "image": open(image_path, "rb"),
                "points": [],  # 自动分割所有对象
            }
        )
        return output

    def _identify_accessory(
        self,
        segments: List[Dict],
        accessory_type: str
    ) -> Tuple[int, int, int, int]:
        """根据位置和大小识别配饰"""

        # 配饰在图像中的相对位置（启发式规则）
        position_hints = {
            "hat": {"y_range": (0, 0.4), "size_range": (0.1, 0.5)},
            "glasses": {"y_range": (0.3, 0.5), "size_range": (0.05, 0.3)},
            "necklace": {"y_range": (0.6, 0.8), "size_range": (0.05, 0.2)},
            # ...
        }

        hint = position_hints.get(accessory_type, {})

        # 筛选符合条件的分割区域
        for segment in segments:
            bbox = segment["bbox"]
            if self._matches_hint(bbox, hint):
                return bbox

        # 未找到，返回预定义区域
        return self._get_default_region(accessory_type)
```

#### 1.2 集成到 FLUX Fill Pro

**修改：** `src/meme/flux_fill_pro.py`

```python
from .sam_detector import SAMDetector

class FluxFillPro:
    def __init__(self, api_token: Optional[str] = None, use_sam: bool = True):
        self.api_token = api_token or os.getenv("REPLICATE_API_TOKEN")
        self.use_sam = use_sam

        # 初始化 SAM 检测器（可选）
        if self.use_sam:
            self.sam_detector = SAMDetector(api_token)

    def replace_accessory(
        self,
        image_path: str,
        accessory_type: str,
        new_description: str,
        output_path: str,
        guidance: float = 30.0,
        num_inference_steps: int = 28,
        auto_detect: bool = True,  # 新参数
        custom_region: Optional[Tuple[int, int, int, int]] = None
    ) -> str:

        # 获取区域
        if custom_region:
            region = custom_region
        elif auto_detect and self.use_sam:
            # 使用 SAM 自动检测
            print(f"🤖 使用 SAM 自动检测 {accessory_type} 区域...")
            region = self.sam_detector.detect_accessory_region(
                image_path,
                accessory_type
            )
            print(f"✅ 检测到区域: {region}")
        else:
            # 使用预定义区域
            region = self.ACCESSORY_REGIONS[accessory_type]["region"]

        # ... 后续处理
```

---

### 阶段 2: 优化和改进

#### 2.1 缓存 SAM 结果

避免重复调用 SAM：

```python
import hashlib
import json

class SAMDetector:
    def __init__(self, api_token: str = None, cache_dir: str = "/tmp/sam_cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def detect_accessory_region(self, image_path: str, accessory_type: str):
        # 计算图片哈希
        image_hash = self._get_image_hash(image_path)
        cache_key = f"{image_hash}_{accessory_type}"
        cache_file = f"{self.cache_dir}/{cache_key}.json"

        # 检查缓存
        if os.path.exists(cache_file):
            with open(cache_file, 'r') as f:
                return tuple(json.load(f))

        # 调用 SAM
        region = self._detect_region(image_path, accessory_type)

        # 保存缓存
        with open(cache_file, 'w') as f:
            json.dump(region, f)

        return region
```

#### 2.2 用户反馈和调整

允许用户查看和调整检测结果：

```python
# 新命令格式
@我是机器人 /milady_replace 5050 帽子 全息帽子
preview: true  # 先预览检测的区域
```

返回带有检测区域标记的预览图，用户确认后再进行替换。

---

## 💰 成本分析

### 使用 Replicate SAM API

**SAM 调用：** ~$0.001 USD / 张
**FLUX Fill Pro：** ~$0.05 USD / 张

**总成本：** ~$0.051 USD / 张（增加 2%）

### 使用本地 SAM

**SAM 模型：** 免费（一次性下载）
**FLUX Fill Pro：** ~$0.05 USD / 张

**总成本：** ~$0.05 USD / 张（无增加）

**推理时间：**
- 本地 SAM（GPU）：~2-5 秒
- 本地 SAM（CPU）：~10-30 秒
- Replicate SAM：~3-8 秒

---

## ⚠️ 挑战和风险

### 1. SAM 可能检测不准确

**问题：** SAM 可能将帽子和头发识别为一个区域

**解决：**
- 使用启发式规则筛选（位置、大小）
- 提供手动调整选项
- 回退到预定义区域

### 2. 增加处理时间

**问题：** SAM 检测需要额外 3-30 秒

**解决：**
- 使用缓存（同一图片只检测一次）
- 提供 `auto_detect: false` 选项跳过
- 使用 Replicate API（更快）

### 3. Milady NFT 特殊性

**问题：** Milady NFT 是像素艺术，SAM 可能不适用

**解决：**
- 先在少量 NFT 上测试
- 调整 SAM 参数
- 必要时使用专门的像素艺术分割模型

---

## 🚀 实施路线图

### Phase 1: 概念验证（1-2 天） ✅ 完成

- [x] 研究 SAM 集成方案
- [x] 创建测试脚本（test_sam_with_layer.py, analyze_sam_output.py）
- [x] 测试 Replicate SAM API（成功）
- [x] 在帽子图层上验证效果（成功）
- [x] 评估准确度和速度（IoU=0.431, 成本=$0.011）
- [x] 创建完整测试报告（SAM_TEST_FINAL_REPORT.md）

**结论：** ✅ SAM 2 能够有效处理像素艺术风格
- 成功检测帽子区域
- 提供准确的边界框 (7, 0, 385, 142)
- 成本略高于预期（$0.011 vs $0.001-0.003）
- 建议继续 Phase 2 测试更多配饰类型

### Phase 2: 扩展测试（1-2 天） ✅ 完成

- [x] 测试眼镜检测（成功，IoU=0.410）
- [x] 测试耳环检测（失败，配饰太小）
- [x] 测试项链检测（失败，配饰太小）
- [x] 分析所有结果，创建 Phase 2 报告（SAM_PHASE2_TEST_REPORT.md）

**结论：** ⚠️ SAM 对大配饰有效，小配饰失败
- ✅ 大配饰（帽子、眼镜）：平均 IoU 0.42，效果良好
- ❌ 小配饰（耳环、项链）：在单独图层上太小，无法检测
- 💡 建议：混合策略（大配饰用 SAM，小配饰用预定义）

### Phase 3: 混合策略实现（2-3 天） ⏸️ 待决定

- [ ] 在完整 NFT 上测试（验证小配饰是否可行）
- [ ] 创建 `sam_detector.py` 模块（实现混合策略）
- [ ] 集成到 `flux_fill_pro.py`
- [ ] 添加缓存机制
- [ ] 添加回退到预定义区域

### Phase 4: 优化和测试（3-5 天）

- [ ] 在 50+ NFT 上测试
- [ ] 调整启发式规则
- [ ] 添加用户预览功能
- [ ] 性能优化

### Phase 4: 上线和文档（1-2 天）

- [ ] 更新文档
- [ ] 添加使用示例
- [ ] 部署到生产环境

**总计：** 7-12 天

---

## 🔬 快速原型测试

✅ **已创建测试脚本！**

### 运行测试

```bash
# 1. 安装依赖
pip install replicate Pillow

# 2. 设置 API Token
export REPLICATE_API_TOKEN='your-token-here'

# 3. 运行简单测试
python test_sam_simple.py 5050

# 4. 查看测试文档
cat SAM_TESTING_README.md
```

### 测试脚本说明

- **`test_sam_simple.py`** - 快速验证 SAM 是否能在 Milady NFT 上运行
- **`test_sam_prototype.py`** - 完整的原型测试（待 SAM 输出格式确认后使用）
- **`SAM_TESTING_README.md`** - 详细测试指南和评估标准

如果效果好，再进行完整集成。

---

## ❓ 下一步

你想要：

**选项 A:** 立即开始实现（Phase 1 概念验证）
- 我会创建 `sam_detector.py` 和测试脚本
- 需要你提供几张测试用的 Milady NFT

**选项 B:** 先做快速原型测试
- 我创建一个简单的测试脚本
- 在 1-2 张 NFT 上验证 SAM 效果
- 根据结果决定是否继续

**选项 C:** 暂缓，先完善现有功能
- 保持当前的 6 个预定义区域
- 等有更多需求时再实施 SAM

---

**我的建议：** 选项 B（快速原型测试）

先验证 SAM 在像素艺术风格的 Milady NFT 上是否有效，再决定是否完整实现。

你觉得呢？
