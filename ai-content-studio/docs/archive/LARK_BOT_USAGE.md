# 🤖 飞书 Milady Meme Bot 使用指南

## 🎉 权限已通过！

恭喜！飞书 Bot 已获得所需权限，现在可以在飞书中直接生成和发送 Milady Meme 了！

---

## 📝 基础用法

### 命令格式

```
/meme [模板] [NFT_ID] [图层] [选项]
```

所有参数都是可选的，可以按需组合！

---

## 🎯 使用示例

### 1. 最简单用法

```
/meme gm
```
使用 GM 模板，随机 NFT，随机文字

**输出**: "GM BUILDERS / LFG" 或其他 GM 模板文字

---

### 2. 选择模板

```
/meme crypto          # 加密货币梗
/meme milady          # Milady 文化
/meme motivational    # 励志语录
```

**可用模板:**
- `gm` - GM 相关 ("GM BUILDERS / LFG")
- `crypto` - 加密货币 ("WEN MOON / SOON™")
- `milady` - Milady 文化 ("MILADY SZNN / ALWAYS")
- `motivational` - 励志 ("KEEP BUILDING / NGMI OTHERWISE")

---

### 3. 指定 NFT

```
/meme gm 1234
```
使用 GM 模板 + Milady NFT #1234

**NFT ID 范围**: 0-9999（接近 10,000 个可选）

---

### 4. 添加图层装饰

```
/meme gm Hat:Beret.png
/meme gm 1234 Glasses:Sunglasses.png
/meme gm Hat:Beret.png Glasses:Heart Glasses.png
```

**可用图层类别:**
- `Hat:文件名` - 帽子（57 种）
- `Glasses:文件名` - 眼镜（10 种）
- `Earrings:文件名` - 耳环（16 种）
- `Necklaces:文件名` - 项链（12 种）
- `Face Decoration:文件名` - 脸部装饰（12 种）
- `Overlay:文件名` - 特效叠加（42 种）

**常用图层:**
- 帽子: `Beret.png`, `Blue Cap.png`, `Brown Cowboy Hat.png`
- 眼镜: `Sunglasses.png`, `Heart Glasses.png`, `3D Glasses.png`
- 特效: `Heart Meme.png`, `Stars.png`, `Birthday Hat.png`

---

### 5. 选择字体风格

```
/meme gm font:impact      # 经典粗体（默认）
/meme gm font:glow        # 发光效果
/meme gm font:angelic     # 优雅字体
/meme gm font:chinese     # 中文字体（自动检测）
```

**字体说明:**
- **impact** - 经典 Meme 字体，粗体有力
- **glow** - 赛博朋克发光效果
- **angelic** - 优雅天使字体
- **chinese** - 中文粗体（检测到中文自动启用）

---

### 6. 自定义文字

```
/meme "Hello World" "Bottom Text"
/meme "早安" "建设者们"
/meme gm 1234 "Custom Top" "Custom Bottom" font:glow
```

**注意:**
- 用引号包裹文字（支持空格）
- 中文会自动使用中文字体
- 第一个参数是顶部文字，第二个是底部文字

---

### 7. All Caps 控制

```
/meme "hello world" "test" caps:off     # 保持小写
/meme gm caps:on                        # 强制大写（默认）
```

**说明:**
- 默认英文自动转大写（经典 Meme 风格）
- 中文不受影响
- `caps:off` 关闭大写转换

---

### 8. 组合使用（高级）

```bash
# GM 模板 + NFT #5678 + 贝雷帽 + 发光字体
/meme gm 5678 Hat:Beret.png font:glow

# 加密货币模板 + NFT #100 + 墨镜 + 心形特效
/meme crypto 100 Glasses:Sunglasses.png Overlay:Heart Meme.png

# 自定义中文 + NFT #2000 + 保持小写
/meme "早安 建设者" "一起冲" 2000 caps:off

# Milady 模板 + 帽子 + 眼镜 + 项链 + Angelic 字体
/meme milady Hat:Pink Bonnet.png Glasses:Heart Glasses.png Necklaces:Pearl.png font:angelic
```

---

## 📋 完整命令参考

| 参数类型 | 格式 | 示例 | 说明 |
|---------|------|------|------|
| 模板 | `gm/crypto/milady/motivational` | `/meme gm` | 预设文字模板 |
| NFT ID | `数字` | `/meme 1234` | 选择特定 NFT (0-9999) |
| 图层 | `类别:文件名` | `Hat:Beret.png` | 添加装饰图层 |
| 字体 | `font:风格` | `font:glow` | 选择字体风格 |
| 大写 | `caps:on/off` | `caps:off` | 控制大写转换 |
| 文字 | `"文本"` | `"Hello World"` | 自定义文字 |

---

## 🎨 图层文件名速查

### 帽子 (Hat:)
```
Beret.png
Blue Cap.png
Brown Cowboy Hat.png
White Cowboy Hat.png
Pink Bonnet.png
Trucker Anime.png
Bear Hat.png
```

### 眼镜 (Glasses:)
```
Sunglasses.png
Heart Glasses.png
3D Glasses.png
Robotic Shades.png
Round Shades.png
```

### 特效 (Overlay:)
```
Heart Meme.png
Stars.png
Birthday Hat.png
Love Is Violence.png
Clippy.png
```

**查看所有图层**: 检查 `assets/milady_layers/` 目录

---

## 💡 实用技巧

### 1. 快速生成

```
/meme gm           # 最快，使用默认
```

### 2. 个性化 NFT

```
/meme gm 1234      # 使用你喜欢的 NFT ID
```

### 3. 节日主题

```
/meme gm Overlay:Birthday Hat.png    # 生日
/meme gm Overlay:Stars.png           # 庆祝
```

### 4. 中文梗图

```
/meme "早安 建设者" "冲冲冲"
/meme "GM 建设者" "LFG" caps:off
```

### 5. 赛博朋克风格

```
/meme "CYBER PUNK" "NEON VIBES" font:glow
```

---

## 🔧 故障排除

### Q: 机器人没反应？
**A**: 确保在命令前加 `/` 并 @ 机器人

### Q: 图层名称不对？
**A**: 检查大小写和空格，参考 `assets/milady_layers/` 目录

### Q: 想看所有可用图层？
**A**: 运行以下命令查看：
```bash
ls assets/milady_layers/Hat/
ls assets/milady_layers/Glasses/
ls assets/milady_layers/Overlay/
```

### Q: 中文显示不正常？
**A**: 系统会自动检测并使用中文字体，无需手动设置

---

## 🎯 推荐组合

### 经典 GM
```
/meme gm Hat:Beret.png
```

### 酷炫加密风
```
/meme crypto Glasses:Sunglasses.png font:glow
```

### 可爱 Milady
```
/meme milady Hat:Pink Bonnet.png Overlay:Heart Meme.png
```

### 励志打气
```
/meme motivational font:impact
```

### 中文社区
```
/meme "早安 建设者" "WAGMI"
```

---

## 📊 系统能力

- ✅ **9,802+ NFT** 可选（98% 完成，接近 10,000）
- ✅ **324 个图层** (17 个类别)
- ✅ **4 种字体** (Impact, Angelic, Chinese, Glow)
- ✅ **中文完整支持** (自动检测)
- ✅ **发光特效** (多层渐变)
- ✅ **预设模板** (4 类)

---

## 🚀 开始使用

**在飞书群聊中输入:**

```
@Milady_Bot /meme gm
```

**或者创意发挥:**

```
@Milady_Bot /meme "你的文字" "你的文字" 1234 Hat:Beret.png font:glow
```

享受创作吧！🎨

---

**技术支持**: AI Content Studio Team
**文档更新**: 2025-12-30
