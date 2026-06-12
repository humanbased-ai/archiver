# Label Studio Pipeline

基于 Label Studio 的数据标注流水线，集成 YOLO 预标注、人工标注、人工审核、标注导出全流程。

## 流水线全景

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐
│  启动服务 │ →  │ 创建项目   │ →  │ 导入数据   │ →  │  人工标注  │ →  │  人工审核  │ →  │ 导出结果  │
│  core    │    │  api-sdk  │    │  api-sdk  │    │  浏览器    │    │  api-sdk  │    │  api-sdk │
│          │    │           │    │           │    │           │    │           │    │          │
│ docker   │    │ setup_    │    │ import_   │    │ Label     │    │ review_   │    │ export_  │
│ compose  │    │ project   │    │ data      │    │ Studio UI │    │ tasks     │    │ data     │
│ up       │    │ .py       │    │ .py       │    │           │    │ .py       │    │ .py      │
└─────────┘    └───────────┘    └─────┬─────┘    └───────────┘    └───────────┘    └──────────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │ YOLO 预标注   │
                               │ ml-backend   │
                               │              │
                               │ 自动为每张图   │
                               │ 生成检测框     │
                               └─────────────┘
```

| 步骤 | 做什么 | 谁做 | make 命令 |
|------|--------|------|-----------|
| 0 | 克隆仓库 + 安装依赖 | 开发者 | `make clone deps` |
| 1 | 启动 Label Studio + ML Backend | core | `make start` |
| 2 | 创建标注项目，连接 YOLO Backend | api-sdk | `make setup` |
| 3 | 导入图片/视频，触发 YOLO 预标注 | api-sdk + ml-backend | `make import` |
| 4 | 标注者在浏览器中审核修正预标注框 | 人工 | `make open` |
| 5 | 查看进度，通过/驳回标注 | api-sdk | `make status` / `make review` |
| 6 | 导出 YOLO/COCO/VOC 等格式 | api-sdk | `make export` |

## 快速开始

```bash
# 一键初始化 (克隆 + 安装依赖 + 启动服务)
make pipeline

# 首次使用: 打开 http://localhost:8080 注册, 获取 API Key
# 写入 core/.env: LABEL_STUDIO_API_KEY=<your_token>
make restart

# 创建项目
make setup

# 导入图片 (放入 core/data/images/ 后)
make import

# 打开标注界面
make open

# 查看进度
make status

# 审核通过所有
make accept-all

# 导出 YOLO 格式
make export EXPORT_FORMAT=YOLO
```

## 各步骤详解

### Step 0: 环境准备

```bash
# 克隆所有子仓库
make clone

# 安装 Python 依赖 (api-sdk 需要)
make deps
```

或手动克隆:
```bash
git clone https://github.com/codatta/label-studio-pipeline.git
cd label-studio-pipeline
git clone https://github.com/codatta/label-studio-pipeline-core.git core
git clone https://github.com/codatta/label-studio-pipeline-ml-backend.git ml-backend
git clone https://github.com/codatta/label-studio-pipeline-api-sdk.git api-sdk
```

### Step 1: 启动服务

```bash
make start
```

启动两个 Docker 容器:

| 服务 | 端口 | 来源 | 职责 |
|------|------|------|------|
| Label Studio | 8080 | 官方镜像 | 标注平台 Web UI + API |
| ML Backend | 9090 | ml-backend/ 构建 | YOLO 推理，自动预标注 |

首次启动后需要:
1. 打开 http://localhost:8080 注册账户
2. **Account & Settings → Access Token** 复制 API Key
3. 填入 `core/.env` 的 `LABEL_STUDIO_API_KEY` 字段
4. `make restart` 使 ML Backend 获取密钥

### Step 2: 创建标注项目

```bash
# 默认标签: person, car, truck, bus, motorcycle, bicycle
make setup

# 自定义标签
make setup LABELS="dog cat bird" PROJECT_TITLE="动物检测"
```

此步骤自动:
- 创建 Label Studio 项目
- 生成标注界面 XML 配置 (`<Image>` + `<RectangleLabels>`)
- 连接 YOLO ML Backend 到项目
- 开启预标注显示

### Step 3: 导入数据

**图片:**
```bash
# 将图片放入 core/data/images/ 目录, 然后:
make import

# 或指定其他目录:
make import IMAGE_DIR=path/to/images

# 通过 API 上传 (图片可在任意位置):
make import-upload IMAGE_DIR=path/to/images
```

**视频:**
```bash
# 自动抽帧, 每秒取 2 帧
make import-video VIDEO_FILE=core/data/videos/sample.mp4 VIDEO_FPS=2
```

导入后，YOLO ML Backend 会在标注者打开每个任务时自动运行推理，生成预标注检测框。

### Step 4: 人工标注

```bash
make open   # 打开浏览器
```

标注者在 Label Studio UI 中:
1. 看到 YOLO 自动生成的检测框 (预标注)
2. **修正**错误的框 (拖拽调整位置/大小)
3. **删除**误检的框
4. **补充**漏检的目标
5. 点击 **Submit** 提交

### Step 5: 人工审核

```bash
# 查看标注进度
make status

# 列出待审核任务
make review-list

# 通过指定任务
make review TASK_IDS="1 2 3" ACTION=accept

# 驳回指定任务
make review TASK_IDS="4 5" ACTION=reject

# 批量通过所有已标注任务
make accept-all
```

审核机制: 标注的 `ground_truth` 字段标记是否审核通过，导出时可筛选。

### Step 6: 导出

```bash
# JSON (默认)
make export

# YOLO 格式
make export EXPORT_FORMAT=YOLO

# COCO 格式
make export EXPORT_FORMAT=COCO

# 仅导出已审核通过的标注
make export-reviewed
```

支持格式: JSON, JSON_MIN, COCO, YOLO, VOC, CSV, TSV, CoNLL2003

## 架构

```
label-studio-pipeline/              ← 主仓库 (编排 + 文档)
├── Makefile                         流水线编排入口
├── docs/                            调研报告
│
├── core/                          ← 子仓库: 部署基础设施
│   ├── docker-compose.yml           Label Studio + ML Backend 编排
│   ├── .env.example                 环境变量模板
│   ├── label-configs/               标注界面 XML 模板
│   │   ├── image_detection.xml
│   │   ├── image_segmentation.xml
│   │   ├── image_detection_with_review.xml
│   │   └── video_frame_detection.xml
│   ├── data/                        标注数据
│   └── models/                      自定义 YOLO 模型
│
├── ml-backend/                    ← 子仓库: YOLO ML Backend
│   ├── model.py                     YOLO 推理 + Label Studio 格式转换
│   ├── Dockerfile                   容器构建
│   └── requirements.txt
│
└── api-sdk/                       ← 子仓库: SDK 自动化脚本
    ├── setup_project.py             创建项目 + 连接 Backend
    ├── import_data.py               导入图片/视频
    ├── review_tasks.py              标注审核
    ├── export_data.py               导出结果
    └── requirements.txt
```

**子仓库独立管理**, 主仓库通过 Makefile 将三者串联为完整流水线。

## 子仓库说明

| 仓库 | 职责 | 独立使用 |
|------|------|---------|
| [core](https://github.com/codatta/label-studio-pipeline-core) | 部署编排、标注模板、数据/模型 | `cd core && docker compose up` |
| [ml-backend](https://github.com/codatta/label-studio-pipeline-ml-backend) | YOLO 预标注推理服务 | `docker build && docker run` |
| [api-sdk](https://github.com/codatta/label-studio-pipeline-api-sdk) | 标注流程自动化脚本 | `pip install -r requirements.txt` |

## 使用自定义模型

```bash
# 1. 将训练好的模型放入 core/models/
cp best.pt core/models/

# 2. 修改 core/.env
MODEL_PATH=best.pt

# 3. 重启
make restart
```

## 所有 make 命令

```bash
make help          # 显示帮助
make clone         # 克隆子仓库
make deps          # 安装 Python 依赖
make start         # 启动服务
make restart       # 重启服务
make stop          # 停止服务
make logs          # 查看日志
make setup         # 创建项目
make import        # 导入图片
make import-video  # 导入视频
make import-upload # 上传图片
make open          # 打开标注界面
make status        # 查看进度
make review-list   # 待审核列表
make review        # 审核任务
make accept-all    # 批量通过
make export        # 导出标注
make export-reviewed # 导出已审核
make clean         # 清理导出
make pipeline      # 一键初始化
```
