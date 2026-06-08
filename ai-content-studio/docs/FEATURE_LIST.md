# AI Content Studio 完整功能清单

最后更新: 2026-01-07

## 📊 功能总览

### ✅ 已实现功能 (稳定)

| 功能 | 状态 | 成本 | 说明 |
|------|------|------|------|
| NFT 梗图生成 | ✅ 稳定 | $0 | 基于 10,000 个 Milady NFT |
| 图层叠加系统 | ✅ 稳定 | $0 | 324 个装饰图层 |
| 自定义文字 | ✅ 稳定 | $0 | 顶部/底部文字，多种字体 |
| Memegen 模板 | ✅ 稳定 | $0 | 207 个经典梗图模板 |
| 中文支持 | ✅ 稳定 | $0 | 自动检测并使用中文字体 |
| 自然语言解析 | ✅ 稳定 | $0 | 智能解析命令参数 |
| Illusion Diffusion | ✅ 稳定 | $0.006/张 | 视觉错觉特效 |
| FLUX Fill Pro | ✅ 稳定 | $0.05/张 | AI 智能替换配饰 |
| SAM-2 检测 | ✅ 生产 | <$0.01/次 | Meta SAM-2 精确定位 |
| 飞书机器人 | ✅ 稳定 | $0 | 完整飞书集成 |

### ⚠️ 实验性功能

| 功能 | 状态 | 说明 |
|------|------|------|
| Overlay 图层 | ⚠️ 受限 | 文字缩放问题，默认小尺寸 |
| Prompt 增强 | ⚠️ 可选 | 需要 Claude API，效果有限 |

### ❌ 已移除功能

| 功能 | 移除原因 |
|------|---------|
| Overlay 自动大尺寸 | 技术限制，图层缩放问题 |

---

## 📋 详细功能说明

## 1. NFT 梗图生成

### 基础生成
```bash
/milady              # 随机 NFT
/milady 5050         # 指定 NFT #5050
```

**特点:**
- 10,000 个 Milady NFT 原图
- 1000x1250 标准输出
- 本地处理，零成本

### 支持的参数
- `nft_id`: NFT 编号 (0-9999)
- `top`: 顶部文字
- `bottom`: 底部文字
- `font`: 字体风格 (impact/chinese/glow)
- `template`: 模板名称

---

## 2. 图层叠加系统

### 可用图层类别

| 类别 | 数量 | 示例 |
|------|------|------|
| Hat (帽子) | 89 个 | `Beret.png`, `Cowboy.png` |
| Glasses (眼镜) | 24 个 | `Sunglasses.png`, `Heart Glasses.png` |
| Earrings (耳环) | 21 个 | `Gold Hoops.png`, `Pearl.png` |
| Necklaces (项链) | 13 个 | `Gold Chain.png`, `Pearl.png` |
| Face Decoration | 134 个 | `Blush.png`, `Hearts.png` |
| Overlay (特效) | 43 个 | `Heart Meme.png`, `Stars.png` |

**总计:** 324 个图层

### 使用方法
```bash
# 单个图层
/milady 5050 Hat:Beret.png

# 多个图层
/milady 5050 Hat:Beret.png Glasses:Sunglasses.png

# 同类别多个图层
/milady 5050 Overlay:Stars.png Overlay:Hearts.png
```

### 图层查看
查看所有可用图层：
```bash
ls assets/milady_layers/Hat/
ls assets/milady_layers/Glasses/
# ... 等等
```

---

## 3. 文字系统

### 支持的字体

| 字体 | 说明 | 适用场景 |
|------|------|---------|
| Impact | 经典梗图字体 | 英文梗图 |
| Chinese | 中文黑体 | 中文梗图 |
| Glow | 发光效果 | 特殊效果 |

### 文字功能
```bash
# 基础文字
/milady 5050 top:"GM" bottom:"WAGMI"

# 中文文字（自动检测）
/milady 5050 top:"早安" bottom:"冲"

# 指定字体
/milady 5050 top:"Hello" font:impact

# 全大写
/milady 5050 top:"gm" caps:true
```

---

## 4. Memegen 模板

### 热门模板

| 模板名 | 原始梗图 |
|--------|---------|
| `drake` | Drake Hotline Bling |
| `blinking_guy` | Distracted Boyfriend |
| `thinking` | Roll Safe |
| `disaster` | Disaster Girl |
| `stonks` | Stonks Guy |

### 使用方法
```bash
/milady 5050 template:drake
/milady 5050 template:blinking_guy
```

**查看所有模板:** 访问 https://memegen.link/templates/

---

## 5. AI 特效功能

### 5.1 Illusion Diffusion

**说明:** 创建视觉错觉效果

**成本:** $0.006/张

**用法:**
```bash
/milady_illusion 5050 spiral pattern
/milady_illusion 5050 optical illusion
```

**参数:**
- `prompt`: 错觉效果描述
- `strength`: 效果强度 (0-2, 默认 1.0)

### 5.2 FLUX Fill Pro（AI 配饰替换）

**说明:** 使用 AI 智能替换配饰

**成本:** $0.05/张

**用法:**
```bash
# 基础用法
/milady_replace 5050 hat red baseball cap

# 多个配饰
/milady_replace 5050 hat blue cap glasses cool sunglasses
```

**支持的配饰类型:**
- `hat` - 帽子
- `glasses` - 眼镜
- `earrings` - 耳环
- `necklace` - 项链
- `scarf` - 围巾
- `other` - 其他

### 5.3 SAM-2 智能检测

**说明:** Meta SAM-2 模型精确定位配饰

**成本:** <$0.01/次（几乎可忽略）

**用法:**
```bash
/milady_replace_sam 5050 hat blue baseball cap
/milady_replace_sam 5050 glasses futuristic sunglasses
```

**优势:**
- 精确物体分割
- 自动定位配饰
- 避免误检

**智能模式选择:**
系统会自动决定何时使用 SAM：
- 检测到"添加/增加"关键词 → 使用预定义区域
- 替换常见配饰(hat/glasses) → 使用 SAM（更准确）
- 不常见配饰(scarf) → 使用预定义区域（避免误检）

---

## 6. 飞书机器人

### 支持的命令

| 命令 | 功能 |
|------|------|
| `/milady` | 梗图生成 |
| `/milady_illusion` | 视觉错觉 |
| `/milady_replace` | AI 替换 |
| `/milady_replace_sam` | SAM 检测替换 |
| `/milady help` | 显示帮助 |

### 消息格式
- 文本消息：支持自然语言
- 图片：自动回复
- @提及：触发机器人

### 权限要求
- `im:message` - 接收消息
- `im:message:send_as_bot` - 发送消息
- `im:resource` - 上传图片（可选）

---

## 7. 其他功能

### 自然语言处理
系统可以理解自然语言描述：
```
"给我生成一个戴墨镜的 Milady"
"NFT 5050 加一个红色帽子"
"随机生成一个梗图"
```

### 中文支持
- 自动检测中文文字
- 自动使用中文字体
- 支持中文命令参数

### 图片质量
- 标准输出: 1000x1250
- 支持自定义尺寸（开发中）
- PNG 格式，RGBA 透明通道

---

## 📊 成本分析

### 零成本功能
- NFT 梗图生成
- 图层叠加
- 文字添加
- 模板使用

### 付费功能

| 功能 | 单价 | 建议使用场景 |
|------|------|------------|
| Illusion | $0.006 | 特殊效果需求 |
| FLUX Fill Pro | $0.05 | 复杂配饰替换 |
| SAM + FLUX | ≈$0.05 | 精确替换需求 |

### 成本优化建议
1. 优先使用图层叠加系统（324 个免费素材）
2. 简单替换使用预定义区域
3. 复杂场景才使用 AI 功能

---

## 🔧 技术栈

### 后端
- Python 3.x
- Flask (Webhook 服务器)
- Pillow (图像处理)
- Replicate API (AI 模型)

### AI 模型
- **FLUX Fill Pro**: AI 图像填充
- **Meta SAM-2**: 物体分割
- **Illusion Diffusion**: 视觉错觉

### 集成
- 飞书开放平台
- Memegen.link API
- Replicate API

---

## 📈 性能指标

### 响应时间
- 本地梗图生成: <1 秒
- Illusion 特效: 15-30 秒
- FLUX 替换: 10-20 秒
- SAM 检测: 5-10 秒

### 并发处理
- Webhook: 支持多用户并发
- AI 模型: 按 Replicate 队列处理

---

## 🚀 未来计划

### 短期
- [ ] 优化 SAM 检测精度
- [ ] 增加更多图层素材
- [ ] 改进自然语言理解

### 中期
- [ ] 批量生成功能
- [ ] 视频梗图支持
- [ ] 自定义模板系统

### 长期
- [ ] 本地 AI 模型（降低成本）
- [ ] 社区图层市场
- [ ] NFT 铸造集成

---

## 📞 获取支持

- 📖 查看完整文档: `docs/`
- 🐛 报告问题: GitHub Issues
- 💬 社区支持: 飞书群

---

**最后更新:** 2026-01-07
**版本:** v2.0
