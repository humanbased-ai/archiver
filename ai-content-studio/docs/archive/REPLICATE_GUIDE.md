# Replicate API 快速上手指南

## 🚀 为什么选择 Replicate？

相比本地安装 AUTOMATIC1111 WebUI：

| 对比项 | Replicate API | 本地 SD WebUI |
|--------|--------------|--------------|
| **安装难度** | ✅ 5分钟 | ❌ 复杂，需要配置 |
| **硬件要求** | ✅ 无需 GPU | ❌ 需要 GPU（或很慢）|
| **速度** | ✅ 快（云端 GPU）| ⚠️ MacBook Air 很慢 |
| **成本** | 💰 $0.001-0.01/次 | ✅ 免费（但电费）|
| **维护** | ✅ 无需维护 | ❌ 需要更新模型 |

**适合场景：**
- ✅ 快速原型开发
- ✅ 生产环境（稳定）
- ✅ 无 GPU 设备
- ✅ 不想折腾安装

## 📝 设置步骤

### 1. 注册 Replicate 账号

访问：https://replicate.com/

- 使用 GitHub 账号登录
- 免费注册，无需信用卡（有免费额度）

### 2. 获取 API Token

1. 访问：https://replicate.com/account/api-tokens
2. 点击 "Create token"
3. 复制生成的 token（格式: `r8_xxx...`）

### 3. 设置环境变量

**临时设置（当前终端）：**
```bash
export REPLICATE_API_TOKEN='r8_你的token'
```

**永久设置（推荐）：**
```bash
echo 'export REPLICATE_API_TOKEN="r8_你的token"' >> ~/.zshrc
source ~/.zshrc
```

验证：
```bash
echo $REPLICATE_API_TOKEN
```

## 🧪 测试 Effect/Mirage

### 方法 1：运行测试脚本

```bash
cd /Users/pengsun/ai-content-studio
python3 src/meme/sd_effects_replicate.py
```

### 方法 2：在代码中使用

```python
from src.meme.sd_effects_replicate import StableDiffusionEffectsReplicate

# 初始化
sd = StableDiffusionEffectsReplicate()

# 应用 Effect
result = sd.apply_effect(
    image_path="output/mcdonald_employee.png",
    prompt="liminal space, dreamlike",
    strength=0.4
)

# 应用 Mirage
result = sd.apply_mirage(
    image_path="output/mcdonald_employee.png",
    prompt="cyberpunk aesthetic, neon lights",
    strength=0.7
)
```

## 💰 价格

Replicate 按 API 调用收费：

- **Stable Diffusion 1.5**: ~$0.0023/次
- **SDXL**: ~$0.005/次
- **免费额度**: 注册送 $5 积分（约 2000 次调用）

**估算：**
- 测试期：免费额度足够
- 生产环境：假设每天 100 次调用 = $0.23/天 = $7/月

比阿里云 PAI-EAS（500元/月）便宜很多！

## 📊 参数建议

### Effect（轻度滤镜）
```python
strength=0.3-0.5  # 保留原图特征
steps=30          # 平衡速度和质量
cfg_scale=7.0     # 标准相关性
```

### Mirage（激进转换）
```python
strength=0.6-0.8  # 大幅改变风格
steps=50          # 更多细节
cfg_scale=8.0     # 更强的提示词控制
```

## 🎨 提示词示例

### 艺术风格
- `"oil painting, impressionist style"`
- `"anime art style, studio ghibli"`
- `"pixel art, 8-bit retro game"`
- `"watercolor painting, soft colors"`

### 氛围效果
- `"liminal space, eerie atmosphere"`
- `"cyberpunk city, neon lights"`
- `"dreamy, ethereal, soft focus"`
- `"dramatic lighting, cinematic"`

### 特殊效果
- `"glitch art, digital corruption"`
- `"vaporwave aesthetic, retro"`
- `"fantasy realm, magical"`
- `"horror, dark, ominous"`

## 🔄 集成到 Lark Bot

下一步可以在飞书中使用：

```
@机器人 /effect liminal space 生成一张梗图
@机器人 /mirage cyberpunk 生成一张 NFT #1234
```

## ❌ 常见问题

### Q: Token 无效
**A:** 检查 token 格式，确保以 `r8_` 开头

```bash
echo $REPLICATE_API_TOKEN
# 应该看到: r8_xxx...
```

### Q: API 超时
**A:** Replicate 首次运行会冷启动模型（10-30秒），之后会快很多

### Q: 成本控制
**A:** 在代码中添加调用计数：

```python
# 每次调用后记录
with open('api_usage.log', 'a') as f:
    f.write(f"{datetime.now()}: Effect called\n")
```

### Q: 想切换回本地
**A:** 两个实现接口相同，只需改 import：

```python
# 从 Replicate
from src.meme.sd_effects_replicate import StableDiffusionEffectsReplicate as SD

# 改为本地
from src.meme.sd_effects import StableDiffusionEffects as SD
```

## 🚀 下一步

1. ✅ 测试 Effect/Mirage 功能
2. ⏭️ 集成到 Lark Bot
3. ⏭️ 调优最佳参数组合
4. ⏭️ 监控 API 使用成本

## 📚 参考资源

- [Replicate 文档](https://replicate.com/docs)
- [Stable Diffusion 模型](https://replicate.com/stability-ai/stable-diffusion)
- [价格计算器](https://replicate.com/pricing)
