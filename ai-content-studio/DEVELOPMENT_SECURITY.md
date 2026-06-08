# 🛡️ 开发安全规范

**基于:** Claude Skills 开发者最佳实践  
**适用于:** AI 生成代码项目  
**版本:** 1.0

---

## 1. 🚨 破坏性操作前必须确认

### 规则
在执行以下操作前，**必须先询问用户**：
- 删除数据（文件、数据库、配置）
- 修改 API 配置
- 更改持久化存储
- 重写 Git 历史（rebase, force push）
- 修改生产环境配置

### 示例

❌ **错误：**
```python
# 直接删除
os.remove("important_data.json")
```

✅ **正确：**
```python
def delete_data(confirm=False):
    """删除数据
    
    Args:
        confirm: 必须明确确认才执行删除
    """
    if not confirm:
        raise ValueError(
            "⚠️  这是破坏性操作！请设置 confirm=True 确认"
        )
    
    # 创建备份
    backup_path = f"{filepath}.backup"
    shutil.copy(filepath, backup_path)
    print(f"✅ 已创建备份: {backup_path}")
    
    # 执行删除
    os.remove(filepath)
```

---

## 2. 🔐 密钥卫生（Secret Hygiene）

### 规则：绝不硬编码密钥

#### ❌ 禁止的做法
```python
# 硬编码 API key
api_key = "sk-ant-api03-..."
token = "r8_RaxTdw..."

# 硬编码在 URL 中
url = "https://api.example.com?key=secret123"

# 硬编码在配置文件中（会被提交）
config = {
    "api_key": "actual_secret_key"
}
```

#### ✅ 正确的做法
```python
import os
from dotenv import load_dotenv

# 从环境变量读取
load_dotenv()
api_key = os.getenv('CLAUDE_API_KEY')
if not api_key:
    raise ValueError(
        "❌ CLAUDE_API_KEY 未配置\n"
        "请在 config/.env 中设置"
    )

# 使用占位符（文档/示例）
api_key = os.getenv('CLAUDE_API_KEY', 'your-api-key-here')

# 配置文件只存模板
config_example = {
    "api_key": "${CLAUDE_API_KEY}"  # 占位符
}
```

### 检查清单

在提交代码前：
```bash
# 1. 检查硬编码密钥
bash scripts/security_check.sh

# 2. 手动检查
grep -r "sk-ant-" --include="*.py" src/ skills/
grep -r "r8_" --include="*.py" src/ skills/
grep -r "password.*=" --include="*.py" src/ skills/

# 3. 验证 .gitignore
git check-ignore config/.env .env
```

---

## 3. ✅ 验证优先（Verification First）

### 规则：提供可验证的步骤

#### ❌ 不可接受
```python
# 声称已测试，但没有证据
def process_data():
    # This has been tested and works perfectly
    pass
```

#### ✅ 正确做法
```python
def process_data():
    """处理数据
    
    验证步骤:
        1. 运行测试:
           $ pytest tests/test_process_data.py
           
        2. 手动验证:
           $ python -c "from src.processor import process_data; \
              result = process_data('test.csv'); \
              print(f'Processed {len(result)} records')"
           
        3. 预期输出:
           Processed 100 records
    """
    pass
```

### 验证命令模板

每个功能都应该提供：

```python
"""
功能: 生成 Milady meme

验证步骤:
    1. 单元测试
       $ pytest tests/test_meme_generator.py -v
       
    2. 集成测试
       $ python -c "
       from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2
       gen = MemeGeneratorV2()
       meme = gen.generate_meme(nft_id=5050, top_text='TEST')
       assert meme is not None
       print('✅ 验证通过')
       "
       
    3. 性能测试
       $ python -m timeit -n 100 -r 3 "
       from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2
       gen = MemeGeneratorV2()
       gen.generate_meme(nft_id=5050)
       "
       
预期结果:
    - 测试通过率: 100%
    - 生成时间: < 2 秒
    - 内存使用: < 100MB
"""
```

---

## 4. 📊 可观测性语言（Observability Language）

### 规则：性能声明必须有指标定义

#### ❌ 模糊的声明
```python
# 快速生成 meme
def generate_meme():
    pass

# 优化了性能
# 提高了响应速度
```

#### ✅ 明确的指标
```python
def generate_meme():
    """生成 Milady meme
    
    性能指标:
        - P50 延迟: 1.2 秒
        - P95 延迟: 2.5 秒
        - P99 延迟: 4.0 秒
        - 吞吐量: 10 memes/秒
        
    测量方法:
        使用 time.perf_counter() 测量 wall time
        
    测量命令:
        $ python benchmark/meme_generation.py --iterations 100
        
    基准环境:
        - CPU: M1 Pro
        - RAM: 16GB
        - Python: 3.11
    """
    import time
    start = time.perf_counter()
    
    # 生成逻辑
    result = _do_generation()
    
    duration = time.perf_counter() - start
    print(f"⏱️  生成耗时: {duration:.2f}s")
    
    return result
```

### 标准指标定义

| 指标 | 定义 | 测量方法 |
|------|------|---------|
| **Wall Time** | 从调用到返回的总时间 | `time.perf_counter()` |
| **TTFB** | Time To First Byte（首字节时间） | 网络请求开始到第一个字节 |
| **Handler Duration** | 处理器执行时间 | 不含 I/O 的纯计算时间 |
| **Memory Usage** | 内存占用 | `tracemalloc` 或 `memory_profiler` |
| **Throughput** | 吞吐量 | 每秒处理请求数 |

### 实施示例

```python
# src/monitoring/metrics.py
import time
import functools
from typing import Callable

def measure_performance(func: Callable):
    """性能测量装饰器
    
    自动记录:
        - Wall time
        - 调用次数
        - 失败率
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        
        try:
            result = func(*args, **kwargs)
            success = True
            return result
        except Exception as e:
            success = False
            raise
        finally:
            duration = time.perf_counter() - start
            
            # 记录指标
            print(f"📊 {func.__name__}")
            print(f"   Duration: {duration:.3f}s")
            print(f"   Success: {success}")
    
    return wrapper


# 使用
@measure_performance
def generate_meme(nft_id: int):
    # 实现
    pass
```

---

## 5. 📝 文档更新义务

### 规则：行为变更必须更新文档

#### 何时需要更新文档

| 变更类型 | 必须更新的文档 |
|---------|---------------|
| API 接口变更 | `docs/api/`, `SKILL.md` |
| 配置项增删 | `CONFIG.md`, `.env.example` |
| 新增功能 | `README.md`, `CHANGELOG.md` |
| 安全变更 | `SECURITY.md`, `SECURITY_AUDIT.md` |
| 依赖更新 | `requirements.txt`, `CHANGELOG.md` |
| 架构调整 | `docs/architecture/README.md` |

#### 文档更新检查清单

```bash
# 提交前检查
git diff --name-only | while read file; do
    case "$file" in
        src/core/config.py)
            echo "⚠️  config.py 变更，需要更新:"
            echo "   - CONFIG.md"
            echo "   - .env.example"
            ;;
        src/*/api*.py)
            echo "⚠️  API 变更，需要更新:"
            echo "   - docs/api/"
            echo "   - SKILL.md"
            ;;
        requirements.txt)
            echo "⚠️  依赖变更，需要更新:"
            echo "   - CHANGELOG.md"
            echo "   - README.md (如果有重大变化)"
            ;;
    esac
done
```

---

## 6. 🔍 代码审查清单

### 提交前自查

```bash
#!/bin/bash
# scripts/pre_commit_check.sh

echo "🔍 提交前安全检查"
echo ""

# 1. 密钥检查
echo "1️⃣  检查硬编码密钥..."
if grep -r "sk-ant-api" --include="*.py" src/ skills/ | grep -v ".env"; then
    echo "❌ 发现硬编码的 Claude API key"
    exit 1
fi

# 2. 敏感文件检查
echo "2️⃣  检查敏感文件..."
if git ls-files | grep -E "\.env$|.*\.key$|.*\.pem$"; then
    echo "❌ 敏感文件未加入 .gitignore"
    exit 1
fi

# 3. 测试检查
echo "3️⃣  运行测试..."
if ! pytest tests/ -q; then
    echo "❌ 测试失败"
    exit 1
fi

# 4. 文档检查
echo "4️⃣  检查文档更新..."
CHANGED_FILES=$(git diff --cached --name-only)
if echo "$CHANGED_FILES" | grep -q "src/core/config.py"; then
    if ! echo "$CHANGED_FILES" | grep -q "CONFIG.md"; then
        echo "⚠️  config.py 变更但 CONFIG.md 未更新"
        read -p "继续提交? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo "✅ 所有检查通过"
```

---

## 7. 🚀 部署安全检查

### 生产部署前清单

```bash
# scripts/production_check.sh

echo "🚀 生产部署前检查"
echo ""

# 1. 环境变量
echo "1️⃣  验证环境变量..."
required_vars=(
    "CLAUDE_API_KEY"
    "REPLICATE_API_TOKEN"
    "LARK_APP_ID"
    "LARK_APP_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 缺少环境变量: $var"
        exit 1
    fi
done

# 2. 安全扫描
echo "2️⃣  运行安全扫描..."
pip-audit || exit 1
bandit -r src/ skills/ -ll || exit 1

# 3. 性能测试
echo "3️⃣  性能基准测试..."
python benchmark/run_all.py || exit 1

# 4. 配置验证
echo "4️⃣  验证配置..."
python -c "from src.core.config import Config; Config.validate()" || exit 1

echo "✅ 生产部署检查通过"
```

---

## 8. 📈 持续监控

### 运行时指标

```python
# src/monitoring/runtime_monitor.py

class RuntimeMonitor:
    """运行时监控"""
    
    def __init__(self):
        self.metrics = {
            'api_calls': 0,
            'errors': 0,
            'avg_duration': 0,
        }
    
    def record_api_call(self, duration: float, success: bool):
        """记录 API 调用
        
        指标:
            - 调用次数
            - 成功率
            - 平均延迟
        """
        self.metrics['api_calls'] += 1
        if not success:
            self.metrics['errors'] += 1
        
        # 更新平均延迟（移动平均）
        alpha = 0.1  # 平滑因子
        self.metrics['avg_duration'] = (
            alpha * duration + 
            (1 - alpha) * self.metrics['avg_duration']
        )
    
    def get_health_status(self) -> dict:
        """获取健康状态
        
        返回:
            {
                'status': 'healthy' | 'degraded' | 'down',
                'metrics': {...}
            }
        """
        error_rate = (
            self.metrics['errors'] / self.metrics['api_calls']
            if self.metrics['api_calls'] > 0 else 0
        )
        
        if error_rate > 0.5:
            status = 'down'
        elif error_rate > 0.1:
            status = 'degraded'
        else:
            status = 'healthy'
        
        return {
            'status': status,
            'metrics': self.metrics,
            'error_rate': f"{error_rate:.2%}"
        }
```

---

## ✅ 总结

### 核心原则

1. **破坏性操作必须确认** - 防止意外数据丢失
2. **绝不硬编码密钥** - 使用环境变量和占位符
3. **提供验证步骤** - 所有声明必须可验证
4. **明确性能指标** - 定义测量方法和基准
5. **同步更新文档** - 行为变更必须更新文档

### 日常实践

```bash
# 每天
- 运行 scripts/security_check.sh
- 检查告警和日志

# 每周
- 审查性能指标
- 更新依赖（如有安全补丁）

# 每月
- 全面安全审计
- 性能基准测试
- 文档完整性检查

# 每季度
- 轮换 API keys
- 架构审查
- 安全培训
```

---

**制定日期:** 2026-01-07  
**适用范围:** AI Content Studio 及所有 AI 生成代码项目  
**维护责任:** 全体开发者
