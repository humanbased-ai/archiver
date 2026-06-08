# 修复：100% Crazy Overlay 被模板覆盖的问题

## 问题描述

### 用户反馈
用户发送命令：
```
生成一张带有 100% crazy（红色印章）的 overlay 的 milady nft，背景都是 McDonald 标志
```

**预期结果**：
- ONE 图片
- 随机 Milady NFT
- 100Crazy.png overlay（红色印章）
- 无文字

**实际结果（修复前）**：
- TWO 图片（原因未明，可能用户多次请求）
- 使用了模板文字（"REMILIA COLLECTIVE / CULT OF BEAUTY" 或 "MILADY SZNN / ALWAYS"）
- **缺少 100% crazy overlay**

## 根本原因分析

### 1. 解析器正确识别了所有元素

`prompt_parser.py` 正确解析：
```python
{
    'template': 'milady',  # 检测到 "milady" 关键词
    'layers': {'Overlay': ['100Crazy.png']},  # 检测到 "100% crazy"
    'top_text': '',
    'bottom_text': ''
}
```

### 2. 问题出在逻辑优先级

在 `src/bots/lark_meme_bot.py` 的 `handle_natural_language()` 方法中：

**修复前的逻辑**：
```python
if params["top_text"] or params["bottom_text"]:
    # 使用自定义文字
    return self.meme_generator.generate(...)
elif params["template"]:
    # ❌ 问题：检测到 template="milady" 就直接用模板
    return self.meme_generator.generate_from_template(
        template_name=params["template"],
        layers=params["layers"]  # 这个参数被 generate_from_template 忽略了！
    )
```

**问题**：
1. 命令中包含 "milady nft" → `template="milady"` 被检测到
2. 逻辑走到 `elif params["template"]` 分支
3. 调用 `generate_from_template("milady")`
4. `generate_from_template()` 方法随机选择一个 milady 模板文字
5. **忽略了用户指定的 `layers={'Overlay': ['100Crazy.png']}`**

### 3. 语义理解问题

用户说 "milady nft" 并不是想要 "milady template"：
- "milady nft" = 指代 Milady NFT 图片（名词）
- "milady template" = 使用预设的 milady 模板文字（功能）

但解析器无法区分这两种语义，都会触发 `template="milady"`。

## 解决方案

### 修改优先级逻辑

新的优先级（从高到低）：
1. **自定义文字** - 用户明确指定了文字
2. **图层** - 用户指定了图层，说明要自定义 NFT + 图层
3. **模板** - 用户想用预设模板
4. **默认** - 啥都没指定，随机生成

修复后的代码 (`src/bots/lark_meme_bot.py:342-387`)：

```python
# 标准流程：根据解析结果生成
# 优先级：1. 自定义文字 > 2. 有图层 > 3. 模板 > 4. 默认

# 1. 如果有自定义文字，优先使用（即使有模板或图层）
if params["top_text"] or params["bottom_text"]:
    return self.meme_generator.generate(
        nft_id=params["nft_id"],
        layers=params["layers"] if params["layers"] else None,
        top_text=params["top_text"],
        bottom_text=params["bottom_text"],
        font_style=params["font_style"],
        all_caps=params["all_caps"],
        output_path=output_path
    )

# 2. ✅ 新增：如果指定了图层，用户想要自定义 NFT + 图层，不要用模板
# （即使命令中包含 "milady" 关键词）
elif params["layers"]:
    return self.meme_generator.generate(
        nft_id=params["nft_id"],
        layers=params["layers"],
        top_text=None,  # 不使用文字
        bottom_text=None,
        font_style=params["font_style"],
        all_caps=params["all_caps"],
        output_path=output_path
    )

# 3. 如果有模板，使用模板
elif params["template"]:
    return self.meme_generator.generate_from_template(
        template_name=params["template"],
        nft_id=params["nft_id"],
        layers=None,  # 模板模式不使用额外图层
        output_path=output_path
    )

# 4. 默认：随机 NFT + 默认文字
else:
    return self.meme_generator.generate(
        nft_id=params["nft_id"],
        layers=None,
        top_text="MILADY",
        bottom_text="MEME",
        output_path=output_path
    )
```

## 修复效果

### 测试用例 1：用户的实际命令
```
命令: 生成一张带有 100% crazy（红色印章）的 overlay 的 milady nft
解析: template=milady, layers={'Overlay': ['100Crazy.png']}
结果: ✅ 随机 NFT #9523 + 100Crazy.png overlay，无文字
```

### 测试用例 2：纯 milady 模板
```
命令: 生成一张 milady 梗图
解析: template=milady, layers={}
结果: ✅ 使用 milady 模板（MILADY SZNN / ALWAYS 等）
```

### 测试用例 3：milady + 墨镜
```
命令: 生成一张戴墨镜的 milady nft
解析: template=milady, layers={'Glasses': ['Sunglasses.png']}
结果: ✅ 随机 NFT + 墨镜，无文字（不使用模板）
```

### 测试用例 4：milady + 自定义文字
```
命令: 生成一张 milady 图，上文字："GM FRENS"，下文字："LFG"
解析: template=gm, top_text='GM FRENS'
结果: ✅ 使用自定义文字（优先级最高）
```

### 测试用例 5：100% crazy + 自定义文字
```
命令: 生成一张带有 100% crazy 的图，上文字："MILADY"，下文字："FOREVER"
解析: template=milady, layers={'Overlay': ['100Crazy.png']}, top_text='MILADY'
结果: ✅ NFT + 100Crazy overlay + 自定义文字
```

## 技术细节

### 关键改动
- **文件**: `src/bots/lark_meme_bot.py`
- **方法**: `handle_natural_language()`
- **行数**: 342-387
- **改动类型**: 逻辑优先级调整

### 向后兼容性
✅ 完全兼容，所有现有命令都正常工作：
- 纯模板命令依然使用模板
- 自定义文字优先级不变
- 新增的图层优先级不影响现有功能

### 测试
运行测试：
```bash
python3 test_100crazy_fix.py
```

所有 5 个测试用例均通过 ✅

## 相关问题

### 为什么用户收到两张图？
根据代码分析，单次请求只会生成一张图。可能原因：
1. 用户发送了两次请求
2. Lark webhook 重复调用（网络问题）
3. 测试脚本运行了多次

需要查看 Lark 日志确认。

### McDonald 背景支持
用户提到 "背景都是 McDonald 标志"，当前系统不支持自定义背景：
- NFT 背景是固定的（来自原图）
- 要支持需要新增 Background 图层类别
- 或使用 Prompt Enhancer + Effect/Mirage 功能（未实现）

## 总结

**问题**：template 检测过于激进，覆盖了用户的图层指定

**解决方案**：调整优先级，图层 > 模板

**影响范围**：仅影响同时有 template 和 layers 的命令

**测试状态**：✅ 通过所有测试用例

**部署建议**：可以直接部署，无风险
