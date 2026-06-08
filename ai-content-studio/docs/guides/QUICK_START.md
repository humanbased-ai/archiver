# 🚀 AI Content Studio 快速开始

## 📋 可用命令总览

| 命令 | 功能 | 示例 |
|------|------|------|
| `/memegen` | 快速帮助 | `/memegen` |
| `/memegen list` | 查看207个模板 | `/memegen list` |
| `/memegen preview` | 预览模板 | `/memegen preview drake` |
| `/memegen 模板 文字` | 生成基础梗图 | `/memegen drake 旧 新` |
| `/memegen+ 模板 文字 [选项]` | 高级梗图 | `/memegen+ drake 文字 --font=comic --color=red,blue` |
| `/milady NFT编号 描述` | AI 特效生成 | `/milady 5555 holding pizza, caption $XNY to $1` |
| `milady #编号 描述` | 自然语言梗图 | `milady #5555 戴 heart glasses，caption WAGMI` |

## 🎨 Memegen - 经典梗图模板

### 快速生成
```
@机器人 /memegen drake 旧方案 新方案
@机器人 /memegen fine 又出bug了
@机器人 /memegen db 工作 摸鱼
```

### 高级功能
```
@机器人 /memegen+ drake 普通 高级 --font=comic --color=purple,gold --size=1200x900
```

**详细指南**: `LARK_MEMEGEN_GUIDE.md`

## 🤖 IllusionDiffusion - AI 特效

### 基本使用
```
@机器人 /milady 5555 holding pizza, caption $XNY to $1
@机器人 /milady 1234 cyberpunk style, neon lights
@机器人 /milady 9999 holding sword, epic fantasy
```

### 推荐场景
- 添加道具: `holding pizza`, `wearing sunglasses`
- 文字标注: `caption $XNY to $1`, `text saying WAGMI`
- 风格转换: `cyberpunk style`, `watercolor painting`
- 背景效果: `neon lights`, `fantasy background`

**详细指南**: `ILLUSION_DIFFUSION_GUIDE.md`

## 🎭 Milady Meme - 自然语言

### 自动生成
```
@机器人 milady #5555 戴 heart glasses，穿 shirt，caption WAGMI
@机器人 milady random gm
@机器人 milady random crypto
```

## 🌟 最常用的10个模板

| 英文ID | 中文名 | 用法 |
|--------|--------|------|
| `drake` | Drake选择 | `/memegen drake 旧 新` |
| `fine` | 这很好 | `/memegen fine 又出bug` |
| `db` | 分心男友 | `/memegen db 工作 摸鱼` |
| `buzz` | 到处都是 | `/memegen buzz Bug` |
| `both` | 两个都要 | `/memegen both 修Bug 写功能` |
| `astronaut` | 宇航员 | `/memegen astronaut 都是Bug?` |
| `afraid` | 不敢问 | `/memegen afraid 不懂的问题` |
| `spiderman` | 蜘蛛侠 | `/memegen spiderman 你 我` |
| `oprah` | 奥普拉 | `/memegen oprah Bug` |
| `balloon` | 气球 | `/memegen balloon 该做 想做` |

## 💡 实用技巧

### 1. 不确定用哪个？先预览！
```
/memegen preview drake
```

### 2. 忘记模板名？查列表！
```
/memegen list
```

### 3. 想要高级效果？用 +
```
/memegen+ drake 文字 --font=comic --color=red,blue
```

### 4. 想要 AI 效果？用 /milady
```
/milady 5555 holding pizza, neon lights
```

## ⚠️ 常见错误

### 错误1: 找不到模板 "很好"
```
❌ /memegen 很好 文字
✅ /memegen 这很好 文字
✅ /memegen fine 文字
```

**原因**: 中文别名必须完整

### 错误2: IllusionDiffusion 不可用
```
❌ IllusionDiffusion 服务暂时不可用
✅ 稍后重试，或使用其他功能
```

**原因**: Hugging Face Space 休眠或维护

### 错误3: 回复了两遍
```
✅ 已修复：消息去重机制
```

## 📚 完整文档

- **Memegen 用户指南**: `MEMEGEN_USER_GUIDE.md`
- **Lark Memegen 指南**: `LARK_MEMEGEN_GUIDE.md`
- **IllusionDiffusion 指南**: `ILLUSION_DIFFUSION_GUIDE.md`
- **集成报告**: `ILLUSION_DIFFUSION_INTEGRATION.md`

## 🎉 开始使用

1. 在飞书群里 @机器人
2. 输入命令（见上方示例）
3. 等待图片生成
4. 享受你的梗图！

**最简单的开始**:
```
@机器人 /memegen drake 旧方案 新方案
```

---

**提示**: 所有命令都需要 @机器人 才能触发！
