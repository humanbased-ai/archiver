# 🎨 Milady Meme 生成器 - 使用指南

## 📱 如何使用

在飞书群里 @ Milady_Bot，然后用自然语言描述你想要的梗图！

**示例**：
```
@我是机器人 帮我生成一张 GM 的梗图
@我是机器人 来个币圈的，加个墨镜，用发光风格
@我是机器人 整个 crypto 主题的，NFT 用 #5678，戴上墨镜，加个爱心特效
```

---

## ✨ Prompt Enhancer（提示词增强器）

**什么是 Prompt Enhancer？**

将你的简短描述自动扩展成详细的、专业级的 Meme 生成提示词！就像给你的创意加上"超级加成"。

**工作原理**：
- 📝 你输入：`"milady celebrating thanksgiving"`
- ✨ 系统增强为：`"A cheerful Milady NFT character joyfully celebrating Thanksgiving, wearing a cute pilgrim hat with autumn leaves..."`
- 🎨 生成更精准、更有创意的梗图

**自动启用条件**：
- ✅ 提示词长度 ≤ 350 字符（自动增强）
- ❌ 提示词长度 > 350 字符（跳过增强）

**如何使用**：

1. **自然语言（自动增强）**：
   ```
   @我是机器人 milady at the beach with sunglasses
   @我是机器人 gm builders
   @我是机器人 crypto trading at 3am
   ```

2. **跳过增强（使用 -raw 标志）**：
   ```
   @我是机器人 -raw milady at the party
   ```
   使用 `-raw` 标志可以完全按照你的原始描述生成，不进行任何扩展。

**增强示例**：

| 原始输入 | 增强后效果 |
|---------|-----------|
| `"gm builders"` | 能量满满的 Milady 戴着粉色安全帽，背景是区块链建设工地，日出金色光辉，充满乐观主义... |
| `"wen moon"` | 梦幻的 Milady 仰望由加密货币硬币组成的巨大发光月亮，背景是超现实的数字景观... |
| `"milady celebrating thanksgiving"` | 欢快的 Milady 戴着可爱的朝圣者帽子，秋叶点缀，温暖的橙色和金色秋季装饰... |

**适用场景**：
- ✅ 快速创意生成（简短描述 → 详细场景）
- ✅ 未来 Effect/Mirage 功能的图像生成
- ✅ 需要精准、富有创意的 Meme

**注意**：
- 📏 当前版本：Prompt Enhancer 返回增强后的提示词（供查看）
- 🚀 未来版本：将与 Text-to-Image、Effect、Mirage 功能集成

---

## 🎨 视觉风格描述（高级）

**支持直接使用视觉风格描述**，系统会自动识别并使用 Prompt Enhancer 增强！

### 支持的视觉风格

| 风格类别 | 关键词 | 效果描述 |
|---------|--------|---------|
| **Liminal Space** | liminal, liminal space, 边缘空间, 过渡空间 | 边缘空间、过渡地带的诡异氛围 |
| **Illusion** | illusion, 幻觉, 错觉 | 视觉幻觉、错觉效果 |
| **Vaporwave** | vaporwave, 蒸汽波, 赛博 | 80/90年代怀旧赛博美学 |
| **Retrowave** | retrowave, 复古波, 80年代 | 80年代复古未来主义 |
| **Cyberpunk** | cyberpunk, 赛博朋克, 未来主义 | 高科技低生活赛博朋克 |
| **Glitch** | glitch, 故障, 故障艺术 | 数字故障艺术效果 |
| **Neon** | neon, 霓虹, 发光 | 霓虹灯光效果 |
| **Glow** | glow, 发光, 辉光 | 发光辉光效果 |
| **Bokeh** | bokeh, 散景, 虚化 | 背景虚化散景效果 |
| **Dreamy** | dreamy, 梦幻, 如梦似幻 | 梦幻朦胧氛围 |
| **Nostalgic** | nostalgic, 怀旧, 复古 | 怀旧复古感觉 |
| **Surreal** | surreal, 超现实, 超现实主义 | 超现实主义风格 |

### 使用示例

**纯视觉风格描述**：
```
@我是机器人 liminal space illusion
@我是机器人 vaporwave aesthetic
@我是机器人 cyberpunk neon glow
@我是机器人 边缘空间幻觉效果
@我是机器人 赛博朋克霓虹发光
```

**结合模板使用**：
```
@我是机器人 gm builders with vaporwave aesthetic
@我是机器人 crypto meme with cyberpunk glow
@我是机器人 milady with liminal space illusion effect
```

**完整组合**：
```
@我是机器人 生成一张 GM 的梗图，NFT #1234，加个墨镜，liminal space illusion 风格
@我是机器人 来个 crypto 的，用蒸汽波风格，加点星星
```

**工作原理**：
1. 系统检测到视觉风格关键词
2. 自动启用 Prompt Enhancer 增强描述
3. 生成详细的视觉风格描述
4. （未来）使用 Effect/Mirage 功能生成对应风格的图像

**当前状态**：
- ✅ 视觉风格自动识别
- ✅ Prompt Enhancer 自动增强
- ⏳ Effect/Mirage 图像生成（开发中）

---

## 🎯 主题风格

| 主题 | 说什么都行 | 会生成什么 |
|------|------------|------------|
| **GM/早安** | gm / 早安 / good morning / 建设者 | "GM BUILDERS / LFG" |
| **Crypto/币圈** | crypto / 加密 / 币圈 / moon / 钻石手 | "WEN MOON / SOON™" |
| **Milady** | milady / 米拉迪 / remilia | "MILADY SZNN / ALWAYS" |
| **励志鸡汤** | 励志 / 鸡汤 / motivational / 打气 | "KEEP BUILDING" |

**示例**：
- "来个 GM 的"
- "整个币圈梗图"
- "生成一个 milady 风格的"
- "来点励志的"

---

## 🖼️ 选择 NFT（可选）

想用特定的 Milady NFT？加上编号就行！

**关键词**: `#数字` / `NFT 编号` / `ID` / `编号`

**示例**：
- "NFT 用 #1234"
- "编号 5678"
- "ID 用 100"

不指定？系统会随机选一个（有 9,955+ 个可选）！

---

## 🎨 装饰图层（可选）

**总计 149 个可叠加图层**，分为 6 大类：

### 快速参考

| 类别 | 数量 | 常用示例 |
|------|------|----------|
| **帽子** | 57 个 | 贝雷帽、牛仔帽、粉色帽子、熊帽 |
| **眼镜** | 10 个 | 墨镜、爱心眼镜、圆框眼镜 |
| **耳环** | 16 个 | 樱桃耳环、十字耳环、钻石耳钉 |
| **项链** | 12 个 | 珍珠项链、ETH 项链、笑脸珠链 |
| **脸部装饰** | 12 个 | 鼻环、纹身、脸部穿孔 |
| **特效叠加** | 42 个 | 爱心、星星、生日帽、光环 |

### 常用图层示例

**帽子类**（57 种）：
- "加个贝雷帽" - 艺术家风格
- "牛仔帽" / "棕色牛仔帽" - 西部风格
- "粉色帽子" - 可爱风格
- "熊帽" - 萌系风格

**眼镜类**（10 种）：
- "戴上墨镜" / "太阳镜" - 酷炫风格
- "圆框眼镜" - 文艺风格
- "原宿眼镜" - 日系风格

**耳环类**（16 种）：
- "樱桃耳环" - 可爱风格
- "十字耳环" - 朋克风格
- "钻石耳钉" - 高雅风格

**项链类**（12 种）：
- "珍珠项链" - 优雅风格
- "ETH 项链" - 加密风格
- "笑脸珠链" - 活泼风格

**脸部装饰**（12 种）：
- "鼻环" / "金鼻环" - 朋克风格
- "泪滴纹身" - 街头风格
- "脸部穿孔" - 个性风格

**特效叠加**（42 种）：
- "加个爱心" / "爱心特效" - 浪漫氛围
- "加点星星" / "星星特效" - 闪耀效果
- "生日帽" - 庆祝氛围
- "光环" - 神圣效果
- "clippy" - 复古网络风

### 使用示例：
- "加个贝雷帽和墨镜"
- "戴上墨镜，加个爱心和星星"
- "粉色帽子，樱桃耳环，珍珠项链"

<details>
<summary><b>📋 点击查看所有 149 个图层完整列表</b></summary>

### 🎩 帽子 Hat (57 个)

贝雷帽、蓝色帽子、牛仔帽、粉色帽子、熊帽、头巾、渔夫帽、猫耳、耳罩、光环、耳机、女仆帽、毛线帽、水手帽、草莓帽、网球帽、校队帽、工作帽...

**完整列表**：
1. Alien Hat - 外星人帽
2. Aloha Visor - 遮阳帽
3. Backwards Trucker Pink - 粉色卡车帽
4. Bandana - 头巾
5. Bean Hat - 豆豆帽
6. Bear Ears - 熊耳朵
7. Bear Hat - 熊帽
8. Beret - 贝雷帽 ⭐
9. Blue Cap - 蓝色帽子 ⭐
10. Blue Pink Bow - 蓝粉蝴蝶结
11. Brown Cowboy Hat - 棕色牛仔帽 ⭐
12. Buckethat - 渔夫帽
13. Cake Hat - 蛋糕帽
14. Cat Earmuffs - 猫耳罩
15. Cat Ears with Bell - 带铃铛猫耳
16. Cross Cap Pink - 粉色十字帽
17. Cross Cap White - 白色十字帽
18. Denim Cap - 牛仔帽
19. Denim Fish Cap - 鱼帽
20. Denim USA Cap - 美国帽
21. Dubai Hat - 迪拜帽
22. Earflap Cap - 护耳帽
23. Fez - 土耳其帽
24. Flower Clip - 花朵发夹
25. Fuzz Earmuffs - 毛绒耳罩
26. Goth Headband - 哥特发带
27. Halo - 光环
28. Heihei Hat
29. Ivy Cap - 常春藤帽
30. Kossphones - 耳机
31. Maid Hat - 女仆帽
32. Meedles Headband - 发带
33. Migoko Hat
34. Miteryx Beanie - 毛线帽
35. Orange Beret - 橙色贝雷帽
36. Pink Bonnet - 粉色帽子 ⭐
37. Pink Bow - 粉色蝴蝶结
38. Plaid Bonnet - 格子帽
39. Rhinestone Skull Cap - 骷髅帽
40. Sailor Hat - 水手帽
41. Shy Saints Cap
42. Spotted Fur Hat - 斑点帽
43. Strawberry Hat - 草莓帽
44. Tennis Visor - 网球帽
45. Treeprint Bucket - 树印花帽
46. Trucker Anime - 动漫帽
47. Trucker Black - 黑色卡车帽
48. Trucker Construction - 建筑帽
49. Trucker Gothic Milady - 哥特帽
50. Trucker Hat 911
51. Trucker Im So
52. Trucker Oasis
53. Trucker Pink Camo - 粉色迷彩帽
54. Trucker White Rabbit - 白兔帽
55. Varsity Cap - 校队帽
56. White Cowboy Hat - 白色牛仔帽
57. Workin Cap - 工作帽

### 👓 眼镜 Glasses (10 个)

墨镜、爱心眼镜、圆框眼镜、原宿眼镜、3D眼镜...

**完整列表**：
1. Cobain Glasses
2. Harajuku Glasses - 原宿眼镜
3. Larry Glasses
4. Moakleys
5. Mottega Sunglasses Blue - 蓝色墨镜
6. Mottega Sunglasses Yellow - 黄色墨镜
7. Prescription Glasses - 处方眼镜
8. Round Glasses - 圆框眼镜
9. Sunglasses - 墨镜 ⭐
10. YY Glasses

### 💎 耳环 Earrings (16 个)

樱桃耳环、十字耳环、钻石耳钉、链条耳环、花朵耳环、草莓耳环...

**完整列表**：
1. Bar Piercings - 杆状穿孔
2. Burger Earring - 汉堡耳环
3. Celine Dog - 狗耳环
4. Chain Earrings - 链条耳环
5. Cherry Earring - 樱桃耳环 ⭐
6. Chrome Cross - 镀铬十字
7. Cross Earring - 十字耳环 ⭐
8. Diamond Stud - 钻石耳钉 ⭐
9. Double Safety Pins - 双别针
10. Dual Rings Gold - 金色双环
11. Dual Rings Silver - 银色双环
12. Flower Earring - 花朵耳环
13. Heart Pearls Earring - 爱心珍珠
14. Loop Chain Earring - 环链耳环
15. Safety Pin Piercing - 别针穿孔
16. Strawberry Earring - 草莓耳环

### 📿 项链 Necklaces (12 个)

珍珠项链、樱桃项链、ETH项链、笑脸珠链、颈巾...

**完整列表**：
1. Cherry Necklace - 樱桃项链
2. Coral Cross Necklace - 珊瑚十字
3. ETH Necklace - ETH项链 ⭐
4. Evil Eye Necklace - 邪眼项链
5. Fliphone Lanyard - 手机挂绳
6. Girl Necklace - 女孩项链
7. Lean Neck Tattoo - 颈部纹身
8. Mestwood Pearl Necklace - 珍珠项链 ⭐
9. Milady Beads - Milady珠链
10. Neckscarf - 颈巾
11. Silver Coin Necklace - 银币项链
12. Smiley Bead Necklace - 笑脸珠链 ⭐

### 💄 脸部装饰 Face Decoration (12 个)

鼻环、纹身、脸部穿孔、泪滴纹身...

**完整列表**：
1. Black Hearts Tattoo - 黑色爱心纹身
2. Crescent Tattoo - 月牙纹身
3. Face Piercings - 脸部穿孔
4. Gucci Cone Tattoo
5. Milady Pilled Tattoo
6. Nose Ring Gold - 金鼻环 ⭐
7. Nose Ring Silver - 银鼻环
8. Snakebites - 蛇咬穿孔
9. Star Heart Tattoo - 星心纹身
10. Teardrops Tattoo - 泪滴纹身
11. Temple Cross Tattoo - 太阳穴十字
12. Tyson Tribal Tattoo - 泰森纹身

### ✨ 特效叠加 Overlay (42 个)

爱心、星星、生日帽、光环、派对帽、Clippy、祈祷、聊天气泡...

**完整列表**：
1. 100Crazy - 100%疯狂
2. Add Text - 添加文字
3. Allegations - 指控
4. Banana Sticker - 香蕉贴纸
5. Birthday Hat - 生日帽 ⭐
6. Cancelled - 取消
7. Chat Bubble - 聊天气泡
8. Clippy - 回形针助手 ⭐
9. Counterstrike - 反恐精英
10. Doomguy - 毁灭战士
11. Face Sticker - 脸贴
12. Fraps
13. Gunpoint - 枪口
14. Halo No Gun - 光环
15. Halo - 光环持枪
16. Hanging In There Star - 坚持之星
17. Heart Meme - 爱心梗图 ⭐
18. Home Along - 独自在家
19. HyperCam
20. Is Your Child A Milady
21. Love Is Violence - 爱即暴力
22. Love Love
23. M1 Blood - 血迹1
24. M2 Blood - 血迹2
25. M3 Blood - 血迹3
26. M4 Blood - 血迹4
27. Milady Is For
28. Milady Stare - Milady凝视
29. Milady - Milady文字
30. Motivational - 励志特效
31. Orange - 橙色
32. Party Hat - 派对帽 ⭐
33. Please Respond - 请回复
34. Poverty - 贫困
35. Prayer - 祈祷 ⭐
36. Sniper - 狙击
37. Soyface - 惊讶脸
38. Stars - 星星特效 ⭐
39. Tap To Add Text
40. Tolking 2 My Frends - 聊天
41. Top Text - 顶部文字
42. U Pray On My Downfall

⭐ = 常用推荐

**使用方法**：
- 中文描述："加个贝雷帽和墨镜，来点星星"
- 或精确指定：`Hat:Beret.png Glasses:Sunglasses.png Overlay:Stars.png`

</details>

---

## ✨ 字体风格（可选）

| 风格 | 怎么说 | 效果 |
|------|--------|------|
| **Impact** | 经典 / 粗体 / 传统 | 经典 Meme 字体（默认） |
| **Glow** | 发光 / 赛博 / 霓虹 / cyberpunk | 赛博朋克发光效果 |
| **Angelic** | 优雅 / 天使 / elegant | 优雅天使字体 |
| **Chinese** | 中文自动识别 | 中文粗体 |

**示例**：
- "风格用发光的"
- "赛博朋克风格"
- "优雅一点"

---

## 📋 完整示例

### 💡 简单示例

```
帮我生成一张 GM 的
```
→ 随机 GM 梗图

```
来个 crypto 的
```
→ 随机 Crypto 梗图

---

### 🎯 指定 NFT

```
来个 GM 的，NFT 用 #1234
```
→ 使用 NFT #1234 + GM 文字

```
整个 milady 的，编号 5678
```
→ 使用 NFT #5678 + Milady 文字

---

### 🎨 添加装饰

```
生成一个 GM 的，加个贝雷帽
```
→ 随机 NFT + GM 文字 + 贝雷帽

```
来个 crypto 的，戴上墨镜和爱心
```
→ 随机 NFT + Crypto 文字 + 墨镜 + 爱心

---

### ✨ 选择字体

```
整个 GM 的，用发光风格
```
→ 随机 NFT + GM 文字 + 发光字体

```
来个 milady 的，优雅一点
```
→ 随机 NFT + Milady 文字 + 优雅字体

---

### 🚀 完整配置

```
帮我生成一张 crypto 主题的梗图，NFT 用 #5678，戴上墨镜，加个爱心特效，风格用发光的
```
→ NFT #5678 + Crypto 文字 + 墨镜 + 爱心 + 发光字体

```
来张 GM 的，编号 2000，加个粉色帽子和星星，用优雅字体
```
→ NFT #2000 + GM 文字 + 粉色帽子 + 星星 + 优雅字体

---

## 🎨 推荐组合

### 🌟 经典 GM 风格
```
生成一个 GM 的，加个贝雷帽
```

### 💎 酷炫 Crypto 风格
```
来个币圈的，戴上墨镜，用发光风格
```

### 💖 可爱 Milady 风格
```
整个 milady 的，加个粉色帽子和爱心
```

### 🚀 励志打气风格
```
来个励志的，加点星星，优雅一点
```

---

## 💡 使用技巧

1. **关键词很灵活**：
   - "来个 GM 的" = "生成一个早安的" = "整个 good morning 的"

2. **可以省略部分**：
   - 不说 NFT → 随机选
   - 不说图层 → 纯文字
   - 不说字体 → 用经典字体

3. **中文自动识别**：
   - 文字里有中文，自动用中文字体

4. **随机生成**：
   - "随机来一张"
   - "给我整一个"

---

## 📊 所有可用选项速查

### 主题
- GM: `gm / 早安 / good morning / 建设者`
- Crypto: `crypto / 加密 / 币圈 / moon / 钻石手`
- Milady: `milady / 米拉迪 / remilia`
- 励志: `励志 / 鸡汤 / motivational / 打气`

### 帽子
`贝雷帽 / 牛仔帽 / 蓝色帽子 / 粉色帽子 / 棒球帽`

### 眼镜
`墨镜 / 爱心眼镜 / 3D眼镜 / 太阳镜`

### 特效
`爱心 / 星星 / 生日帽`

### 字体
`经典 / 发光 / 赛博 / 优雅 / 天使`

---

## ❓ 常见问题

**Q: 我不知道说什么怎么办？**
A: 最简单的："来一张"，系统会随机生成！

**Q: 可以同时加多个装饰吗？**
A: 可以！"加个帽子和墨镜和爱心"

**Q: NFT 编号是多少？**
A: 0-9999，目前有 9,955+ 可用

**Q: 能看到生成的效果吗？**
A: 机器人会直接发图片到群里

---

## 🎉 开始使用

在飞书群里试试：

```
@我是机器人 帮我生成一张 GM 的梗图
```

或者

```
@我是机器人 来个 crypto 的，加个墨镜，用发光风格
```

就这么简单！🚀

---

**系统能力**:
- ✅ 9,955+ NFT 原图
- ✅ 324 个图层装饰
- ✅ 4 种字体风格
- ✅ 中文完整支持
- ✅ 自然语言识别

**技术支持**: AI Content Studio Team
**更新日期**: 2025-12-30
