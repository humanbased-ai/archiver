# 数据处理脚本使用说明

## 功能描述

这个脚本实现了以下功能：
1. 解析 `Result_13.csv` 文件，**只处理 `status` 为 `Claimed` 的记录**
2. 获取这些记录的 `user_address` 字段
3. 连接远端数据库，通过 `user_address` 查询对应的 `user_id`
4. 将查询到的 `user_id` 补充到过滤后的数据中
5. 对比查询结果中的 `user_id` 和 `deduct.csv` 中的 `user_id`
6. 找到匹配的行，合并成完整数据，保存到新的CSV文件中

## 文件结构

- `process-data.py` - 主要的数据处理脚本
- `requirements.txt` - Python依赖包列表
- `Result_13.csv` - 输入文件，包含 user_address, amount, status
- `deduct.csv` - 输入文件，包含 user_id, address, balance_result

## 安装依赖

```bash
pip install -r requirements.txt
```

## 配置环境变量

### 方法1：使用 .env 文件（推荐）

1. 复制示例配置文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，设置你的数据库连接信息：
```bash
# 数据库配置
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_CHARSET=utf8mb4

# 可选配置
BATCH_SIZE=1000
LOG_LEVEL=INFO
```

### 方法2：直接设置系统环境变量

```bash
export DB_HOST=your_database_host
export DB_PORT=3306
export DB_USER=your_username
export DB_PASSWORD=your_password
export DB_NAME=your_database_name
export DB_CHARSET=utf8mb4
export BATCH_SIZE=1000
```

### 方法3：运行时设置环境变量

```bash
DB_HOST=localhost DB_USER=root DB_PASSWORD=password DB_NAME=mydb python process-data.py
```

## 数据库表结构要求

脚本假设数据库中存在一个名为 `users` 的表，包含以下字段：
- `account` - 用户钱包地址
- `user_id` - 用户ID

如果实际的表结构不同，请修改 `batch_query_user_ids` 方法中的SQL语句：

```python
sql = f"""
SELECT user_id, LOWER(account) as account_lower
FROM your_table_name 
WHERE LOWER(account) IN ({placeholders})
"""
```

## 性能优化特性

1. **批量数据库查询** - 使用 IN 查询批量获取用户ID，大幅提升查询效率
2. **忽略大小写比较** - 钱包地址对比时自动忽略大小写差异
3. **分批处理** - 每批处理1000个地址，避免SQL语句过长
4. **高效数据合并** - 使用pandas的merge功能进行数据合并
5. **去重优化** - 只查询唯一地址，避免重复查询

## 环境变量说明

### 必需的环境变量
- `DB_HOST` - 数据库主机地址
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名称

### 可选的环境变量
- `DB_PORT` - 数据库端口（默认：3306）
- `DB_CHARSET` - 数据库字符集（默认：utf8mb4）
- `BATCH_SIZE` - 批处理大小（默认：1000）
- `LOG_LEVEL` - 日志级别（默认：INFO）

## 运行脚本

```bash
python process-data.py
```

## 输出文件

脚本会生成一个带时间戳的输出文件，格式为：
`merged_result_YYYYMMDD_HHMMSS.csv`

输出文件包含以下字段：
- `user_address` - 用户钱包地址
- `user_id` - 用户ID
- `reward_value` - 奖励值（deduct.csv中balance_result的负数）
- `reward_type` - 奖励类型（固定值：POINTS）
- `transaction_id` - 交易ID（固定值：airdrop-point-deduct-season-1）
- `task_id` - 任务ID（固定值：airdrop-point-deduct-season-1）
- `stage` - 阶段（固定值：EXTERNAL）

## 注意事项

1. 确保数据库连接信息正确
2. 确保有足够的数据库查询权限
3. **重要**：只有 `Result_13.csv` 中 `status` 为 `Claimed` 的记录才会被处理
4. 对于大量数据，脚本会显示处理进度
5. 只有成功查询到 `user_id` 且在 `deduct.csv` 中找到匹配的记录才会被输出
6. 脚本包含完整的错误处理和日志记录

## 日志输出

脚本会输出详细的处理日志，包括：
- 文件读取状态
- 数据库连接状态
- 查询进度
- 数据合并结果
- 最终统计信息
