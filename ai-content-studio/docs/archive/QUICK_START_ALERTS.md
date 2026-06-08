# ✅ 飞书提醒系统已配置完成！

## 📱 你现在会收到提醒的 4 种方式

| 方式 | 状态 | 说明 |
|-----|------|------|
| 🖥️ **控制台输出** | ✅ 已启用 | 运行时实时显示 |
| 📄 **日志文件** | ✅ 已启用 | `data/alerts.log` |
| 📋 **JSON 文件** | ✅ 已启用 | `data/latest_alert.json` |
| 📱 **飞书通知** | ✅ 已启用 | 自动推送到群聊 |

---

## 🔔 触发条件

系统会在以下情况自动提醒你：

### 自动检查（每生成 20 条推文）

| 指标 | 阈值 | 严重度 |
|-----|------|--------|
| 新鲜度得分 < 0.35 | 严重 | 🚨 HIGH |
| 新鲜度得分 0.35-0.50 | 中等 | ⚠️ MEDIUM |
| 新鲜度得分 0.50-0.70 | 轻微 | 📅 LOW |
| 完全重复率 > 10% | - | 报警 |
| 短语重复率 > 40% | - | 报警 |
| 距上次训练 > 30天 | - | 提醒 |

---

## 🧪 测试飞书通知

### 快速测试

```bash
# 测试高严重度通知（红色卡片）
python3 test_alert_system.py --scenario high

# 测试中等严重度通知（橙色卡片）
python3 test_alert_system.py --scenario medium

# 测试所有场景
python3 test_alert_system.py
```

**预期结果：**
- ✅ 终端显示提醒
- ✅ 飞书群收到带颜色卡片的消息
- ✅ 日志文件更新

---

## 📊 飞书消息示例

### 高严重度（红色卡片）🚨

**标题**: 🚨 AI Content Studio 内容新鲜度提醒

**内容**:
```
类型: content_freshness_low
严重程度: HIGH
时间: 2025-12-29T23:21:18

详细信息:
- content_type: gm
- freshness_score: 0.35
- exact_duplicate_rate: 18.0%
- phrase_reuse_rate: 45.0%
```

**操作按钮**: [查看训练指南]

---

## 🔧 常用命令

### 检查当前状态

```bash
# 查看仪表板
python3 manage_training.py dashboard

# 检查 GM 新鲜度
python3 manage_training.py check --type gm

# 获取训练建议
python3 manage_training.py suggest --type gm
```

### 添加训练样本

```bash
# 1. 生成模板
python3 manage_training.py template --type gm --count 5 --output new.json

# 2. 填写 new.json（从 Twitter 收集素材）

# 3. 导入
python3 manage_training.py import new.json

# 4. 验证
python3 manage_training.py check --type gm
```

### 查看历史

```bash
# 查看最近提醒
python3 manage_training.py history --type alerts --limit 5

# 查看生成的推文
python3 manage_training.py history --type posts --limit 10

# 查看训练记录
python3 manage_training.py history --type training
```

---

## 📁 重要文件位置

```
ai-content-studio/
├── data/
│   ├── alerts.log              # 所有提醒日志
│   ├── latest_alert.json       # 最新提醒
│   └── generated_history.json  # 生成历史
├── config/
│   └── .env                    # Webhook 配置
└── docs/
    ├── ALERT_SETUP.md          # 完整配置文档
    └── LARK_WEBHOOK_TUTORIAL.md # 图文教程
```

---

## 🎯 响应流程

### 当你收到飞书提醒时

**Step 1: 查看严重度**
- 🚨 **HIGH** (< 0.35): 立即处理（今天内）
- ⚠️ **MEDIUM** (0.35-0.50): 1周内处理
- 📅 **LOW** (0.50-0.70): 2周内处理

**Step 2: 检查详情**
```bash
python3 manage_training.py check --type gm
```

**Step 3: 获取建议**
```bash
python3 manage_training.py suggest --type gm
```

**Step 4: 添加样本**
```bash
# 生成模板
python3 manage_training.py template --type gm --output new_samples.json

# 从 Twitter/X 收集 5-10 个高互动 GM 推文

# 填写 new_samples.json

# 导入
python3 manage_training.py import new_samples.json
```

**Step 5: 验证**
```bash
python3 manage_training.py check --type gm
# 应该看到新鲜度恢复到 > 0.7
```

---

## ⚙️ 调整配置

### 调整检查频率

编辑 `src/intelligence/claude_client.py` 第 331 行：

```python
# 默认每 20 条检查
check_interval=20

# 改成每 10 条（更频繁）
check_interval=10

# 改成每 40 条（较少）
check_interval=40
```

### 调整报警阈值

编辑 `src/intelligence/content_freshness_monitor.py` 第 27-33 行：

```python
self.THRESHOLDS = {
    'exact_duplicate_rate': 0.10,      # 完全重复率
    'similar_duplicate_rate': 0.25,    # 相似重复率
    'phrase_reuse_rate': 0.40,         # 短语重复率
    'days_since_training': 30,         # 训练天数
    'content_staleness_score': 0.6     # 新鲜度阈值
}
```

### 更换飞书 Webhook

```bash
# 运行配置向导
python3 setup_lark_webhook.py

# 或手动编辑
vim config/.env
# 修改 LARK_WEBHOOK_URL
```

---

## 📞 故障排查

### 飞书没收到通知

1. **检查配置**
   ```bash
   cat config/.env | grep LARK_WEBHOOK_URL
   ```

2. **手动测试 Webhook**
   ```bash
   curl -X POST 'YOUR_WEBHOOK_URL' \
     -H 'Content-Type: application/json' \
     -d '{"msg_type":"text","content":{"text":"测试"}}'
   ```

3. **查看日志**
   ```bash
   tail -f data/alerts.log
   ```

4. **检查机器人状态**
   - 打开飞书群
   - 设置 → 群机器人
   - 确认 "AI Content Studio 内容监控" 还在

### 提醒太频繁

```python
# 降低敏感度（提高阈值）
'content_staleness_score': 0.5  # 改成 0.5

# 减少检查频率
check_interval=40  # 改成 40
```

### 提醒不够及时

```python
# 提高敏感度（降低阈值）
'content_staleness_score': 0.7  # 改成 0.7

# 增加检查频率
check_interval=10  # 改成 10
```

---

## 📚 完整文档

- 📖 **配置指南**: `docs/ALERT_SETUP.md`
- 📱 **飞书配置**: `docs/LARK_WEBHOOK_TUTORIAL.md`
- 🎓 **训练指南**: `docs/TRAINING_GUIDE.md`
- 📄 **系统说明**: `README_CONTINUOUS_LEARNING.md`

---

## 🎉 下一步

现在提醒系统已经完全配置好了！

**建议操作：**

1. ✅ 生成 20 条推文测试自动检查
   ```bash
   python3 test_gm_with_ascii.py
   ```

2. ✅ 观察飞书是否收到通知

3. ✅ 练习添加训练样本流程
   ```bash
   python3 manage_training.py template --type gm --output practice.json
   ```

4. ✅ 定期查看仪表板
   ```bash
   python3 manage_training.py dashboard
   ```

---

**提醒系统已就绪！** 🚀

从现在起，你会在以下情况自动收到提醒：
- 🖥️ 运行时在终端看到
- 📱 飞书群收到推送
- 📄 日志文件自动记录

**无需手动检查，系统会主动提醒你！** ✨
