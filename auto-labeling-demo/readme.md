# 视频动作标注工具 — Task 2

自动切分视频中的有效动作片段，并提供流畅的键盘驱动标注界面，最终导出符合任务规范的 JSON。

## 项目结构

```
auto-labeling-demo/
├── labeling-api/             # 标注平台 API 服务 (port 8000)
│   ├── main.py               # API 路由入口
│   └── worker_client.py      # Vision Engine 客户端
├── vision-engine/            # 视觉算法引擎 (port 8001)
│   ├── main.py               # 引擎入口
│   ├── video_processor.py    # 视频处理 + YOLO 检测
│   └── image_sequence_processor.py  # 序列帧处理
└── frontend/                 # Vite + React + TailwindCSS 前端
    └── src/
        ├── api/              # Axios API 模块 & 类型定义
        └── pages/            # UploadPage / ProcessingPage / AnnotatePage / ExportPage
```

## 快速启动

### 首次使用 - 一键环境配置

```bash
# 自动配置 conda 环境和所有依赖
npm run setup
```

### 日常启动

```bash
# 1. 激活 conda 环境（必须！）
conda activate auto-labeling

# 2. 启动服务
npm run dev              # 启动全部 3 个服务
# 或单独启动
npm run dev:fe          # 只启动前端
npm run dev:api         # 只启动 Labeling API
npm run dev:engine      # 只启动 Vision Engine
```

**服务地址：**
- 前端: http://localhost:5173
- Labeling API: http://localhost:8000
- Vision Engine: http://localhost:8001
- 健康检查: http://localhost:8000/api/health

> **注意**: 
> - 必须在 conda 环境中启动后端，否则 YOLOv8 等依赖无法使用
> - 启动脚本会自动检查环境并安装缺失的依赖
> - 详细配置说明请查看 [SETUP.md](./SETUP.md)

## 工作流

1. **上传** — 选择视频文件，填写任务名 & 场景代码
2. **处理** — 后端运动检测算法自动切分片段（轮询状态）
3. **标注** — 键盘快捷键快速审核每个片段
4. **导出** — 下载符合 Task 2 规范的 JSON

## 快捷键

| 键 | 动作 |
|---|---|
| `1` | 折叠纸箱 |
| `2` | 折叠毛巾 |
| `3` | 装袋/打包 |
| `4` | 取放物品 |
| `5` | 其他有效动作 |
| `Space` | 无效/跳过 |
| `←` / `→` | 上/下一个片段 |

## 输出格式

```json
{
  "Labeling meta": [
    {
      "taskname": "hotel_packing_batch01",
      "start_time": 1200,
      "end_time": 5800,
      "description": "fold_box",
      "scenario_code": "HOTEL_01"
    }
  ]
}
```
