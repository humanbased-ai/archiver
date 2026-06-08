# AI Content Studio 用户指令手册

## 📖 概述

这份文档说明你(作为管理员)如何通过 Lark 与 AI Content Studio 交互。

**重要**: 所有指令都需要 @机器人 才会触发响应。

---

## 🤖 Bot 自动化能力(来自 SKILL.md)

Bot 会**自动执行**以下任务,无需你手动触发:

### 1. 自动监控 Twitter
- **监控 Founders 账号**: @drtwo101, @qiw, @codatta_io
  - 发现新推文自动生成回复
  - 发送到 Lark 审核卡片
  - 响应时间: 1-2小时内

- **监控高优先级账号**:
  - Base 生态: @buildonbase, @base, @jessepollak, @AIonBase_
  - x402/8004: @DavideCrapis, @yq_acc, @VittoStack, @HeyElsaAI
  - AI/Data: @huggingface, @OpenAI, @claudeai, @drfeifei
  - 判断是否"值得互动"(相关话题 + GM类post + 社区时刻)
  - 自动生成回复建议发送到 Lark

- **监控 @提及**:
  - 任何 @codatta_io, @codatta_intern 的推文
  - 立即生成回复发送审核

### 2. 自动生成内容(已实现部分)
- **每日原创推文**: 根据星期几生成对应主题的推文(需要定时任务,暂未实现)
  - 周一: Base 生态 + data ownership
  - 周二: 批评 AI 行业不公平
  - 周三: 荒谬叙事 Meme
  - 周四: x402/8004 或 Builder 日常
  - 周五: 周总结
  - 周末: 少发或不发

### 3. 自动判断逻辑
Bot 使用 SKILL.md 中的判断逻辑:
- **必须互动**: Founders、@提及
- **值得互动**: 高优先级账号 + 相关话题/GM类post
- **相关话题关键词**: data ownership, AI training, labeling, fair compensation, Base, AI Agent, dataset
- **内容风格**: Milady 风格(邪教/meme/对线/真实) + Codatta 话题
- **质量检查**: 长度限制、禁止关键词、风格检查

---

## 💬 Lark 手动指令(你的操作)

### 生成推文类

#### 1. 斜杠命令
```
@机器人 /tweet
```
- 生成默认主题的推文(Codatta - data ownership, AI training, data labeling)
- 后台异步生成,不会卡住
- 生成后发送审核卡片到 Lark

```
@机器人 /tweet 数据所有权
@机器人 /tweet AI agents need quality data
```
- 生成指定主题的推文
- 可以用中文或英文主题

#### 2. 自然语言生成
```
@机器人 生成一条推文
@机器人 帮我写个推文
@机器人 写一条关于数据所有权的推文
@机器人 生成周二的推文
@机器人 创建一条原创内容
```
- 支持灵活的自然语言表达
- Bot 会理解你的意图并提取主题
- 关键词: 生成、写、创建、帮我 + 推文

---

### 查询推文类

#### 1. 按星期查询
```
@机器人 查看周二的推文
@机器人 周五有几条推文?
@机器人 列出周一的推文
```
- 查询指定星期的所有推文(不限日期)
- 支持: 周一/Monday, 周二/Tuesday, ..., 周日/Sunday

#### 2. 按日期查询
```
@机器人 今天安排发布哪些推文?
@机器人 查看今天的推文
@机器人 明天有哪些推文?
```
- 查询指定日期的推文
- 支持: 今天/today, 明天/tomorrow

#### 3. 查询待审核
```
@机器人 列出所有待审核的推文
@机器人 查看pending的推文
@机器人 哪些推文需要审核?
```
- 查询所有 approval_status = 'pending' 的推文
- 最多显示10条

#### 查询结果格式
```
📋 找到 3 条推文:

1. ⏳ Monday (ID: 5)
   主题: Codatta - data ownership
   内容: AI companies raising $50B rounds while paying data labelers $3/hour...
   状态: pending

2. ✅ Tuesday (ID: 6)
   主题: AI industry unfairness
   内容: been cleaning AI training data all weekend and honestly?...
   状态: approved

3. ❌ Wednesday (ID: 7)
   主题: Meme format
   内容: therapist: "so you clean AI training data?"...
   状态: rejected
```

**状态说明**:
- ⏳ pending: 待审核
- ✅ approved: 已批准
- ❌ rejected: 已拒绝

---

### 审核操作

#### Lark 交互式卡片
当 Bot 生成推文后,会发送审核卡片到 Lark 群,包含:

**回复推文卡片**(3个版本):
```
原始推文: [推文内容]
作者: @username

建议回复(3个版本):
1️⃣ 简短: gm
2️⃣ 中等: gm from the data trenches!
3️⃣ 详细: gm! another day of making AI models less stupid...

[✅ 发送 1] [✅ 发送 2] [✅ 发送 3] [❌ 拒绝]
```

**原创推文卡片**:
```
主题: Codatta - data ownership
推文内容: AI companies raising $50B...

[✅ 批准发送] [❌ 拒绝] [🔄 重新生成]
```

#### 操作说明
- **批准**: 点击"✅ 发送 1/2/3"或"✅ 批准发送",立即发布到 Twitter
- **拒绝**: 点击"❌ 拒绝",标记为 rejected,不会发布
- **重新生成**: 点击"🔄 重新生成"(原创推文),重新生成内容(暂未实现)

---

## 🎯 使用场景示例

### 场景 1: 每天早上检查待审核推文
```
你: @机器人 今天安排发布哪些推文?
Bot: 📋 找到 3 条推文:
     1. ⏳ Monday (ID: 8)...
     2. ⏳ Tuesday (ID: 9)...
     3. ⏳ Wednesday (ID: 10)...
```
然后你去 Lark 审核卡片批准/拒绝

### 场景 2: 临时生成周五的推文
```
你: @机器人 生成周五要发的推文
Bot: (后台生成,几秒后发送审核卡片到 Lark)
```

### 场景 3: 检查周二生成了哪些内容
```
你: @机器人 查看周二的推文
Bot: 📋 找到 2 条推文:
     1. ⏳ Tuesday (ID: 11) - 主题: AI industry unfairness...
     2. ✅ Tuesday (ID: 6) - 主题:批评对线...
```

### 场景 4: 快速生成特定主题
```
你: @机器人 /tweet AI agents need better training data
Bot: (生成推文并发送审核卡片)
```

---

## 🔧 当前系统状态

### ✅ 已实现功能
1. **回复生成**(3个版本: 短/中/长)
   - 监控 must_interact 账号
   - 监控 high_priority 账号(相关话题)
   - 生成3个版本回复供选择

2. **原创推文生成**(手动触发)
   - `/tweet` 命令
   - 自然语言生成
   - 按主题生成

3. **查询功能**
   - 按星期查询
   - 按日期查询
   - 查询待审核

4. **Lark 交互式审核**
   - 3个回复版本选择
   - 批准/拒绝按钮
   - 即时反馈

5. **@提及要求**
   - 必须 @机器人 才响应

### 🚧 计划中功能(未实现)
1. **定时自动生成原创推文**
   - 每天固定时间生成当天主题的推文
   - 需要 cron 或 APScheduler

2. **定时发布功能**
   - 批准后不立即发,等到指定时间发布
   - 需要添加 scheduled_publish_time 字段

3. **重新生成功能**
   - 原创推文卡片的"🔄 重新生成"按钮
   - 需要实现 regenerate 逻辑

4. **编辑功能**
   - 审核卡片的"✏️ 编辑"按钮
   - 需要实现编辑界面

---

## 📊 SKILL.md 核心能力总结

### 内容生成能力
- **主题分配**: ~85% Codatta 相关 + ~15% 社区真实感
- **内容类型**:
  - 40% 行业 Insights
  - 20% 批评对线
  - 20% 荒谬叙事
  - 10% Builder 日常
  - 5% GM/Casual
  - 5% 纯 Milady/社区观察

- **风格**: Milady 风格(邪教/meme/对线/真实) + Codatta 话题
- **签名**: 🎀(Milady) + 🧹(janitor)

### 互动判断能力
- **必须互动**: Founders(@drtwo101, @qiw, @codatta_io), @提及
- **值得互动**: 高优先级账号 + (相关话题 OR GM类post OR 社区时刻)
- **相关话题**: data ownership, AI training, labeling, fair compensation, contributors, Base, AI Agent, dataset, data quality

### 质量控制
- **长度**: 原创推文 200-280 字符,回复 150-200 字符
- **安全检查**: 禁止政治攻击、仇恨言论
- **风格检查**: 通常有 🧹 或 🎀,提及 Codatta(不强制)
- **频率限制**: 回复 30/天,原创 10/天

---

## 🎓 最佳实践

### 1. 每天审核流程
1. 早上打开 Lark,检查有几条待审核
2. 使用 `@机器人 今天安排发布哪些推文?` 查看列表
3. 逐个审核 Lark 卡片,批准/拒绝
4. 如果内容不够,用 `/tweet` 生成补充

### 2. 生成推文建议
- **优先用自然语言**: `@机器人 生成周二的推文`(更灵活)
- **需要精确主题用命令**: `@机器人 /tweet AI agents on Base`
- **临时需要快速生成**: `@机器人 /tweet`(默认主题)

### 3. 查询推文建议
- **查看某天准备**: `@机器人 查看周五的推文`
- **检查今天待发**: `@机器人 今天安排发布哪些推文?`
- **审核pending**: `@机器人 列出所有待审核的推文`

---

## ⚠️ 注意事项

1. **必须 @机器人**: 所有指令都需要 @机器人,否则机器人会忽略消息
2. **查询 vs 生成**:
   - 查询关键词: 哪些、查看、列出、查询、安排、有几条
   - 生成关键词: 生成、写、创建、帮我、原创
3. **审核及时性**: Bot 生成的内容会立即发送审核卡片,建议及时处理
4. **3个回复版本**: 回复推文时可以选择短/中/长版本,根据上下文选择合适的
5. **推文质量**: Bot 遵循 SKILL.md 规范生成内容,但仍需人工审核确保质量

---

## 📞 问题排查

### Bot 没有响应?
1. 检查是否 @了机器人
2. 检查关键词是否正确
3. 查看 `/Users/pengsun/ai-content-studio/logs/webhook_server.log`

### 查询没有结果?
1. 检查数据库是否有对应星期/日期的推文
2. 使用 `sqlite3 jessie.db "SELECT * FROM original_content"`查看数据

### 生成的推文不符合预期?
1. 检查 SKILL.md 是否更新
2. 调整 `src/intelligence/claude_client.py` 的 prompt
3. 使用更具体的主题描述

---

**版本**: 1.0
**最后更新**: 2025-12-29
**作者**: AI Content Studio Team
