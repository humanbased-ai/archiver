# 飞书 Webhook 配置图文教程

## 🎯 目标

配置飞书通知后，当 AI Content Studio 检测到内容新鲜度问题时，会自动发送消息到飞书群聊，即使你不在电脑前也能及时收到提醒。

---

## 📱 Step 1: 创建飞书机器人

### 1.1 打开飞书群聊

- 打开飞书 App 或网页版
- 进入你想接收通知的群聊（建议创建专门的 "AI Content Studio 监控" 群）

### 1.2 进入机器人设置

点击群聊右上角的 **`···`（更多）** 按钮

<img src="https://sf3-cn.feishucdn.com/obj/open-platform-opendoc/89d5a5f7c7c8417e7ce3b24849ab0d19_iA9WKNwFxW.png" alt="飞书群设置" width="300">

选择 **`设置`** → **`群机器人`**

### 1.3 添加自定义机器人

点击 **`添加机器人`** → **`自定义机器人`**

<img src="https://sf3-cn.feishucdn.com/obj/open-platform-opendoc/a77e3b5e4d0f37ec7dd30d5bc4e09e21_wGOPRF3JJy.png" alt="添加机器人" width="400">

### 1.4 配置机器人信息

填写以下信息：

- **机器人名称**: `AI Content Studio 内容监控`
- **描述**（可选）: `自动监控内容新鲜度，提醒需要更新训练素材`
- **头像**（可选）: 上传一个机器人图标

<img src="https://sf3-cn.feishucdn.com/obj/open-platform-opendoc/3d4c6e5a1f2b8c9d0e3a4b5c6d7e8f90_example.png" alt="机器人配置" width="400">

### 1.5 复制 Webhook 地址

点击 **`添加`** 后，会显示 Webhook 地址。

**重要：复制完整的 Webhook URL**

格式类似：
```
https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

<img src="https://sf3-cn.feishucdn.com/obj/open-platform-opendoc/8f7e6d5c4b3a2918e7d6c5b4a3928170_webhook.png" alt="复制 Webhook" width="500">

⚠️ **注意**: 这个 URL 是机器人的密钥，不要泄露给他人！

---

## 💻 Step 2: 配置到 AI Content Studio

### 方法 1: 使用配置向导（推荐）

在终端运行：

```bash
python3 setup_lark_webhook.py
```

按照提示操作：

```
======================================================================
🔧 AI Content Studio - 飞书 Webhook 配置向导
======================================================================

📖 配置步骤:

1️⃣  打开飞书，进入目标群聊
2️⃣  点击右上角 ··· → 设置 → 群机器人
3️⃣  点击 添加机器人 → 自定义机器人
4️⃣  填写机器人名称：AI Content Studio 内容监控
5️⃣  复制 Webhook 地址

----------------------------------------------------------------------

📋 请粘贴飞书 Webhook URL:
   (格式: https://open.feishu.cn/open-apis/bot/v2/hook/...)

Webhook URL: [粘贴你的 URL]
```

配置向导会：
1. ✅ 自动保存到配置文件
2. ✅ 验证 URL 格式
3. ✅ 发送测试消息
4. ✅ 显示后续步骤

---

### 方法 2: 手动编辑配置文件

编辑 `config/.env` 文件：

```bash
vim config/.env
```

添加或更新以下行：

```bash
# 飞书 Webhook
LARK_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-url"
```

保存并退出（`:wq`）

---

## 🧪 Step 3: 测试配置

### 3.1 测试 Webhook 连接

运行测试脚本：

```bash
python3 test_alert_system.py --scenario high
```

如果配置成功，你会看到：

**终端输出：**
```
======================================================================
🚨 【AI Content Studio 提醒】 🚨
======================================================================
...
```

**飞书群消息：**

<img src="https://example.com/lark-test-message.png" alt="飞书测试消息" width="400">

你应该在飞书群收到一条带有 **红色标题** 的卡片消息。

### 3.2 查看消息内容

飞书消息会包含：

- **标题**: 🚨 AI Content Studio 内容新鲜度提醒（红色/橙色/灰色）
- **新鲜度得分**: 0.35 / 1.00
- **问题列表**: 完全重复率过高、短语重复率过高
- **建议行动**: 立即补充训练素材
- **快速操作**: 查看训练指南按钮

---

## ✅ Step 4: 验证自动提醒

### 4.1 生成测试推文

生成 20 条推文触发自动检查：

```bash
python3 test_gm_with_ascii.py
```

### 4.2 模拟低新鲜度场景

生成大量重复推文（测试用）：

```bash
# 创建测试脚本
cat > test_freshness_alert.py << 'EOF'
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').absolute()))

from src.intelligence.claude_client import ClaudeClient

client = ClaudeClient()

# 生成 25 条推文（会有重复，触发报警）
for i in range(25):
    gm = client.generate_original('work', 'Monday', 'gm')
    print(f"[{i+1}/25] {gm}")

    # 第 20 条会触发检查
    if i == 19:
        print("\n⚠️ 应该触发检查了...\n")
EOF

python3 test_freshness_alert.py
```

**预期结果：**
- 第 20 条推文后，终端显示提醒
- 飞书群收到通知（如果新鲜度 < 0.6）

---

## 🎨 自定义通知样式

### 修改颜色主题

编辑 `src/notifications/alert_system.py` 第 67-71 行：

```python
severity_colors = {
    'LOW': 'grey',      # 改成 'blue'
    'MEDIUM': 'orange', # 改成 'yellow'
    'HIGH': 'red'       # 保持红色
}
```

### 修改消息内容

编辑 `src/notifications/alert_system.py` 的 `FreshnessAlertBuilder.build_message()` 方法。

---

## 🔍 故障排查

### 问题 1: 飞书没收到消息

**检查清单：**

1. ✅ Webhook URL 是否正确？
   ```bash
   cat config/.env | grep LARK_WEBHOOK_URL
   ```

2. ✅ 机器人是否被移出群聊？
   - 打开飞书群 → 设置 → 群机器人
   - 查看 "AI Content Studio 内容监控" 是否还在

3. ✅ 网络是否正常？
   ```bash
   curl -I https://open.feishu.cn
   ```

4. ✅ 日志中是否有报错？
   ```bash
   cat data/alerts.log | tail -1 | jq .
   ```

**手动测试 Webhook：**

```bash
curl -X POST 'YOUR_WEBHOOK_URL' \
  -H 'Content-Type: application/json' \
  -d '{
    "msg_type": "text",
    "content": {
      "text": "测试消息"
    }
  }'
```

如果收到消息，说明 Webhook 正常。

---

### 问题 2: 提醒太频繁

**调整检查间隔：**

编辑 `src/intelligence/claude_client.py` 第 331 行：

```python
# 改成每 40 条检查一次（默认 20）
alert = self.freshness_monitor.auto_check_and_alert(
    content_type='gm',
    check_interval=40  # 改这里
)
```

**调整阈值：**

编辑 `src/intelligence/content_freshness_monitor.py` 第 32 行：

```python
'content_staleness_score': 0.5  # 改成 0.5（更宽松）
```

---

### 问题 3: requests 库缺失

如果看到错误：`ModuleNotFoundError: No module named 'requests'`

安装依赖：

```bash
pip3 install requests
```

---

## 📊 消息类型示例

### 高严重度（红色）

**条件**: 新鲜度 < 0.4

<img src="https://example.com/high-severity.png" alt="高严重度" width="400">

**消息特点：**
- 🚨 红色标题
- "紧急" 字样
- 建议立即补充 10+ 样本

---

### 中等严重度（橙色）

**条件**: 新鲜度 0.4 - 0.6

<img src="https://example.com/medium-severity.png" alt="中等严重度" width="400">

**消息特点：**
- ⚠️ 橙色标题
- "建议" 字样
- 建议 1 周内补充 5-8 样本

---

### 低严重度（灰色）

**条件**: 新鲜度 0.6 - 0.7

<img src="https://example.com/low-severity.png" alt="低严重度" width="400">

**消息特点：**
- 📅 灰色标题
- "提醒" 字样
- 建议 2 周内补充 3-5 样本

---

## 🎯 最佳实践

### 1. 创建专门的监控群

- ✅ 创建一个 "AI Content Studio 监控" 群
- ✅ 只邀请相关人员（运营、开发）
- ✅ 设置重要消息提醒

### 2. 设置提醒策略

根据团队工作节奏调整：

**快节奏（每天生成大量内容）：**
```python
check_interval=10  # 每 10 条检查
content_staleness_score=0.7  # 严格阈值
```

**慢节奏（每周生成少量内容）：**
```python
check_interval=20  # 每 20 条检查
content_staleness_score=0.5  # 宽松阈值
```

### 3. 定期查看历史

```bash
# 查看本周的所有提醒
cat data/alerts.log | jq 'select(.timestamp | startswith("2025-12-"))'

# 统计各严重度数量
cat data/alerts.log | jq -r '.severity' | sort | uniq -c
```

---

## 📱 移动端体验

### iOS / Android

- ✅ 飞书 App 会推送通知
- ✅ 点击通知直接进入群聊
- ✅ 支持快速查看卡片内容
- ✅ 可以直接点击 "查看训练指南" 按钮

### 通知设置

建议设置：
- 🔔 **重要消息提醒**：开启
- 📱 **推送通知**：开启
- 🔕 **免打扰时段**：根据需要设置

---

## 🎉 完成！

现在你已经成功配置飞书通知！

**接下来：**

1. ✅ 运行 AI Content Studio，观察提醒
2. ✅ 根据提醒及时补充训练素材
3. ✅ 调整阈值和频率以适应你的需求

**需要帮助？**

- 📖 查看完整文档: `docs/ALERT_SETUP.md`
- 🧪 运行测试: `python3 test_alert_system.py`
- 📊 查看仪表板: `python3 manage_training.py dashboard`

---

**Happy Training! 🚀**
