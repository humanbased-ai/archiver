# Memegen 高级功能指南

## ✅ 已实现的功能

### 1. 基础功能
- ✅ 文字生成（上方/下方）
- ✅ 207个模板支持
- ✅ 中文文字支持
- ✅ 特殊字符编码

### 2. 图片格式
- ✅ PNG（默认）
- ✅ JPG
- ✅ WebP
- ✅ GIF（支持动画）

### 3. 自定义尺寸
```python
api.generate_meme(
    template="drake",
    top_text="小图",
    bottom_text="大图",
    width=1000,
    height=750
)
```

### 4. 字体选项
- ✅ `impact` - 经典 Impact 字体
- ✅ `comic` / `kalam` - 漫画风格
- ✅ `thick` / `titilliumweb` - 加粗字体
- ✅ `notosans` - 多语言支持
- ✅ `he` / `notosanshebrew` - 希伯来语
- ✅ `jp` / `hgminchob` - 日语

```python
api.generate_meme(
    template="fine",
    top_text="Using comic font",
    bottom_text="This is fine",
    font="comic"
)
```

### 5. 自定义颜色
- ✅ HTML 颜色名（red, blue, purple, gold等）
- ✅ Hex 颜色代码（FF80ED, 00FF00等）
- ✅ 两行文字可设置不同颜色

```python
# 使用HTML颜色名
api.generate_meme(
    template="both",
    top_text="红色文字",
    bottom_text="蓝色文字",
    color="red,blue"
)

# 使用Hex颜色
api.generate_meme(
    template="drake",
    top_text="粉色文字",
    bottom_text="绿色文字",
    color="FF80ED,00FF00"
)
```

### 6. 文字布局
- ✅ `layout="top"` - 文字在顶部
- ✅ `layout="default"` - 默认布局（底部）

```python
api.generate_meme(
    template="fine",
    top_text="顶部文字",
    bottom_text="",
    layout="top"
)
```

### 7. 备用样式（Alternate Styles）
部分模板支持多个样式变体：
```python
api.generate_meme(
    template="ds",  # Drake 系列
    top_text="默认样式",
    bottom_text="备用样式",
    style="hotline"
)
```

### 8. 自定义背景
使用任何图片URL作为背景：
```python
api.generate_meme(
    template="custom",
    top_text="自定义背景",
    bottom_text="从URL加载",
    background="https://i.imgur.com/2lw4qvF.jpg"
)
```

### 9. 图片叠加（Overlays）
使用图片URL作为叠加层：
```python
api.generate_meme(
    template="drake",
    top_text="基础图",
    bottom_text="叠加图",
    style="https://i.imgur.com/overlay.png"
)
```

### 10. 组合功能
可以同时使用多个高级功能：
```python
api.generate_meme(
    template="drake",
    top_text="普通梗图",
    bottom_text="高级梗图",
    width=1000,
    height=750,
    font="thick",
    color="purple,gold",
    format="webp"
)
```

## 📋 API 参数完整列表

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `template` | str | 模板名称 | `"drake"`, `"fine"` |
| `top_text` | str | 上方文字 | `"上方文字"` |
| `bottom_text` | str | 下方文字 | `"下方文字"` |
| `output_path` | str | 输出路径 | `"output/meme.png"` |
| `format` | str | 图片格式 | `"png"`, `"jpg"`, `"webp"`, `"gif"` |
| `width` | int | 图片宽度（像素） | `800`, `1000` |
| `height` | int | 图片高度（像素） | `600`, `750` |
| `font` | str | 字体名称 | `"impact"`, `"comic"`, `"thick"` |
| `style` | str | 样式或叠加图URL | `"hotline"`, `"https://..."` |
| `layout` | str | 文字布局 | `"top"`, `"default"` |
| `background` | str | 背景图片URL | `"https://i.imgur.com/..."` |
| `color` | str | 文字颜色 | `"red,blue"`, `"FF80ED,00FF00"` |

## 🎨 飞书中使用高级功能

目前飞书 bot 支持基础功能。如需使用高级功能，可以：

### 方案 1: 扩展飞书命令
添加高级参数支持：
```
@机器人 /memegen drake 上方文字 下方文字 --font=comic --color=red,blue
```

### 方案 2: Python 脚本直接调用
```python
from src.meme.memegen_api import MemegenAPI

api = MemegenAPI()
api.generate_meme(
    template="drake",
    top_text="你的文字",
    bottom_text="你的文字",
    width=1000,
    font="comic",
    color="purple,gold"
)
```

## 🔧 特殊功能说明

### Emoji 支持
支持 Unicode emoji 和别名：
```python
api.generate_meme(
    template="oprah",
    top_text="You get emoji 👍",
    bottom_text="And you get emoji :thumbsup:"
)
```

### 换行支持
使用 `~n` 插入换行：
```python
api.generate_meme(
    template="fine",
    top_text="第一行~n第二行",
    bottom_text="This is fine"
)
```

### GIF 动画
- 静态背景 + 动态文字
- 动态背景 + 静态文字
```python
api.generate_meme(
    template="drake",
    top_text="静态图",
    bottom_text="动态GIF",
    format="gif"
)
```

## 📊 测试结果

✅ **已测试成功的功能：**
1. ✅ 基础文字生成
2. ✅ 自定义尺寸（800x600, 1000x750等）
3. ✅ Comic 字体
4. ✅ Impact 字体
5. ✅ 自定义颜色（HTML名称）
6. ✅ Hex 颜色代码
7. ✅ WebP 格式
8. ✅ JPG 格式
9. ✅ 组合多个功能

⚠️ **部分模板限制：**
- 不是所有模板都支持所有样式
- 某些模板的备用样式可能不存在

## 🚀 下一步

### 可以添加到飞书 bot 的功能：
1. `/memegen-advanced` 命令支持高级参数
2. 字体选择器（让用户选择字体）
3. 颜色选择器（预设常用颜色）
4. 尺寸预设（Square, Wide, Tall等）
5. 样式预览（显示模板的所有可用样式）

### 示例扩展命令：
```
/memegen-advanced drake 上方 下方 font=comic color=red,blue width=1000
```

---

**总结**: 所有 GitHub 官方文档中提到的功能都已实现在 `MemegenAPI.generate_meme()` 函数中！✅
