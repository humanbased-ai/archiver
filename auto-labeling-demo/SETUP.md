# Auto-Labeling Demo - 环境配置指南

## 架构概览

项目拆分为 3 个服务：

| 服务 | 端口 | 目录 | 职责 |
|------|------|------|------|
| Frontend | 5173 | `frontend/` | React + Vite 前端 |
| Labeling API | 8000 | `labeling-api/` | 任务管理、文件存储、前端接口 |
| Vision Engine | 8001 | `vision-engine/` | 视觉算法引擎（YOLO/光流/视频处理） |

## 环境要求

- **前端**: Node.js 16+
- **后端**: Python 3.11+ (推荐使用 conda 环境)

## 快速开始

### 方式一：一键自动配置（推荐）

```bash
npm run setup
# 或
./setup_env.sh
```

**完成后启动：**
```bash
conda activate auto-labeling
npm run dev
```

---

### 方式二：手动配置

#### 1. 后端环境配置 (使用 conda)

```bash
conda create -n auto-labeling python=3.13 -y
conda activate auto-labeling

# 安装依赖
conda install -y -c conda-forge fastapi uvicorn python-multipart opencv numpy ultralytics httpx
conda install -y pytorch torchvision -c pytorch

# 验证
python -c "from ultralytics import YOLO; print('YOLOv8 available')"
```

#### 2. 前端环境配置

```bash
cd frontend && npm install
```

#### 3. 启动服务

```bash
# 激活 conda 环境（必须）
conda activate auto-labeling

# 一键启动全部服务
npm run dev

# 或单独启动
npm run dev:api       # 只启动 Labeling API
npm run dev:engine    # 只启动 Vision Engine
npm run dev:fe        # 只启动前端
```

**手动启动：**

```bash
# 终端 1 - Vision Engine
conda activate auto-labeling
cd vision-engine && python main.py

# 终端 2 - Labeling API
conda activate auto-labeling
cd labeling-api && python main.py

# 终端 3 - 前端
cd frontend && npm run dev
```

## 服务地址

- 前端: http://localhost:5173
- Labeling API: http://localhost:8000
- Vision Engine: http://localhost:8001
- 健康检查: http://localhost:8000/api/health

## 项目结构

```
auto-labeling-demo/
├── frontend/           # React + Vite 前端
├── labeling-api/       # 标注平台 API 服务
│   ├── data/           # 上传文件 & 帧文件存储
│   ├── main.py         # API 入口 (port 8000)
│   └── worker_client.py # Vision Engine 客户端
├── vision-engine/      # 视觉算法引擎（无状态）
│   ├── main.py                     # 引擎入口 (port 8001)
│   ├── video_processor.py          # 视频处理
│   ├── image_sequence_processor.py # 序列帧处理
│   └── models/                     # YOLO 模型文件
├── dev.sh             # 开发启动脚本
└── package.json       # 根目录 npm 脚本
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run setup` | 一键自动配置环境 |
| `npm run dev` | 启动全部服务 |
| `npm run dev:fe` | 重启前端 |
| `npm run dev:api` | 重启 Labeling API |
| `npm run dev:engine` | 重启 Vision Engine |
| `npm run stop` | 停止所有服务 |
| `npm run restart` | 重启全部服务 |
| `npm run build` | 构建前端 |

## 环境变量

| 变量 | 服务 | 默认值 | 说明 |
|------|------|--------|------|
| `WORKER_URL` | labeling-api | `http://localhost:8001` | Vision Engine 地址 |
| `API_BASE_URL` | labeling-api | `http://localhost:8000` | 本服务回调地址 |
| `DATA_DIR` | labeling-api | `./data` | 数据存储目录 |
| `TEMP_DIR` | vision-engine | 系统临时目录 | 处理临时文件目录 |
