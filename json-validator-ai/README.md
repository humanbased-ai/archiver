# JSON Validator AI

一个结合 jsonschema 和 Claude AI 的 JSON 数据验证工具。

## 功能特点

- 使用 jsonschema 进行基础的 JSON 结构和类型验证
- 使用 Claude API 进行基于自然语言描述规则的高级验证
- 两阶段验证流程：先进行 schema 验证，通过后再进行 AI 验证
- 详细的验证结果报告，包括成功/失败状态和原因

## 安装

本项目使用 uv 进行环境管理。

```bash
# 安装依赖
uv pip install -r requirements.txt
```

## 使用方法

```python
from json_validator_ai import JsonValidator

# 初始化验证器
validator = JsonValidator(
    schema_path="path/to/schema.json",  # JSON Schema 文件路径
    rules_path="path/to/rules.txt"     # 自然语言规则文件路径
)

# 验证 JSON 数据
result = validator.validate(json_data)

# 检查结果
if result.is_valid:
    print("验证通过")
else:
    print(f"验证失败: {result.reason}")
```

## 项目结构

```
.
├── src/                  # 源代码
│   └── json_validator_ai/  # 主模块
├── tests/                # 测试代码
├── requirements.txt      # 项目依赖
└── README.md            # 项目说明
```