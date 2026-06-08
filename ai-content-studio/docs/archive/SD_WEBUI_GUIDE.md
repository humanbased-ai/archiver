# AUTOMATIC1111 WebUI 安装和使用指南

## 📦 安装步骤

### 1. 运行安装脚本

```bash
cd /Users/pengsun/ai-content-studio
./install_sd_webui.sh
```

这个脚本会：
- 克隆 AUTOMATIC1111 仓库
- 创建配置文件（自动启用 API）

### 2. 首次启动 WebUI

```bash
cd stable-diffusion-webui
./webui.sh
```

**⚠️ 重要提示：**
- 首次启动会自动下载模型和依赖（约 4-7GB）
- 下载时间取决于网速，可能需要 10-30 分钟
- 请保持网络连接稳定

### 3. 验证安装

启动成功后，你会看到：

```
Running on local URL:  http://127.0.0.1:7860
```

在浏览器打开 `http://127.0.0.1:7860` 可以看到 WebUI 界面。

## 🔌 API 使用

### 检查 API 是否可用

```bash
curl http://127.0.0.1:7860/sdapi/v1/options
```

如果返回 JSON 数据，说明 API 已启用。

### API 文档

浏览器访问：`http://127.0.0.1:7860/docs`

## 🧪 测试 Effect/Mirage 功能

### 方法 1：使用 Python 脚本测试

```bash
# 确保 SD WebUI 已启动
python3 src/meme/sd_effects.py
```

这会：
1. 检查 API 连接
2. 对测试图片应用 Effect 效果
3. 输出结果到 `output/test_effect.png`

### 方法 2：在代码中使用

```python
from src.meme.sd_effects import StableDiffusionEffects

# 初始化
sd = StableDiffusionEffects(api_url="http://127.0.0.1:7860")

# 应用 Effect（轻度滤镜）
result = sd.apply_effect(
    image_path="output/mcdonald_employee.png",
    prompt="liminal space, dreamlike",
    strength=0.4,  # 40% 变化
    output_path="output/effect_result.png"
)

# 应用 Mirage（激进重诠释）
result = sd.apply_mirage(
    image_path="output/mcdonald_employee.png",
    prompt="cyberpunk aesthetic, neon lights",
    strength=0.75,  # 75% 变化
    output_path="output/mirage_result.png"
)
```

## 📊 参数说明

### `strength` (效果强度)
- `0.0-0.3`: 轻微变化，保留大部分原图
- `0.3-0.5`: 中等变化（Effect 推荐）
- `0.5-0.8`: 较大变化（Mirage 推荐）
- `0.8-1.0`: 极大变化，几乎重新生成

### `steps` (采样步数)
- `20-30`: 快速生成，质量一般
- `30-50`: 平衡速度和质量（推荐）
- `50-80`: 高质量，速度较慢

### `cfg_scale` (提示词相关性)
- `5.0-7.0`: 较自然（Effect 推荐）
- `7.0-10.0`: 更强烈（Mirage 推荐）
- `10.0+`: 非常强烈，可能过度

## 🚀 性能优化

### MacBook Air (无 GPU)
- 使用 CPU 模式（已在配置中设置）
- 预期速度：30 steps 约 2-5 分钟
- 建议降低 steps 到 20-30

### 提升速度
```bash
# 编辑 webui-user.sh，添加：
export COMMANDLINE_ARGS="$COMMANDLINE_ARGS --lowvram --medvram"
```

## ❌ 常见问题

### Q: 启动失败，提示找不到模块
**A:** 删除 `venv` 目录后重新运行 `./webui.sh`

```bash
cd stable-diffusion-webui
rm -rf venv
./webui.sh
```

### Q: 下载模型失败
**A:** 手动下载模型放到 `models/Stable-diffusion/` 目录

推荐模型：
- Stable Diffusion 1.5: https://huggingface.co/runwayml/stable-diffusion-v1-5
- Realistic Vision: https://civitai.com/models/4201

### Q: API 返回错误
**A:** 检查是否启用了 `--api` 参数

```bash
# 查看 webui-user.sh 中是否包含 --api
cat stable-diffusion-webui/webui-user.sh
```

### Q: MacBook Air 生成太慢
**A:** 考虑使用云服务（阿里云 PAI-EAS），本地仅用于测试

## 🔄 后台运行

如果想让 SD WebUI 在后台持续运行：

```bash
cd stable-diffusion-webui
nohup ./webui.sh > sd_webui.log 2>&1 &
echo "SD WebUI PID: $!"
```

停止：
```bash
pkill -f webui.sh
```

## 📝 下一步

安装成功后：

1. **集成到 Lark Bot** - 修改 `lark_meme_bot.py` 添加 Effect/Mirage 命令
2. **测试不同提示词** - 找到最佳效果参数
3. **部署到云服务** - 生产环境使用阿里云 PAI-EAS

## 🆘 需要帮助？

如遇到问题：
1. 查看日志：`cat stable-diffusion-webui/sd_webui.log`
2. 检查 API：`curl http://127.0.0.1:7860/sdapi/v1/options`
3. 参考官方文档：https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki
