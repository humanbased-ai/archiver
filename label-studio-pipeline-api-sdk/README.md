# Label Studio Pipeline - API SDK

Label Studio 标注流水线自动化脚本，基于 [label-studio-sdk](https://github.com/HumanSignal/label-studio-sdk) 实现项目创建、数据导入、标注审核、结果导出。

## 安装

```bash
pip install -r requirements.txt
export LABEL_STUDIO_URL=http://localhost:8080
export LABEL_STUDIO_API_KEY=<your_token>
```

## 使用流程

### Step 1: 创建项目

```bash
# 默认标签 (person, car, truck, bus, motorcycle, bicycle)
python setup_project.py

# 自定义
python setup_project.py --title "交通标注" --labels person car truck bus
```

创建项目并自动连接 YOLO ML Backend (Docker 内网 `http://ml-backend:9090`)。

### Step 2: 导入数据

```bash
# 图片 - 本地文件引用 (需指定 core/data 挂载目录)
python import_data.py --project-id 1 \
  --dir /path/to/images \
  --data-root /path/to/core/data

# 图片 - API 直接上传 (无目录依赖)
python import_data.py --project-id 1 --dir /path/to/images --upload

# 视频 - 自动抽帧为图片
python import_data.py --project-id 1 \
  --video /path/to/video.mp4 \
  --video-fps 2 \
  --upload
```

**两种导入模式**:

| 模式 | 参数 | 适用场景 |
|------|------|---------|
| 本地文件引用 | `--data-root` | 图片在 core/data 目录，Label Studio 直接读取挂载卷 |
| API 上传 | `--upload` | 图片在任意位置，通过 API 上传到 Label Studio |

### Step 3: 审核

```bash
# 查看标注进度
python review_tasks.py --project-id 1 status

# 列出待审核任务
python review_tasks.py --project-id 1 list

# 通过指定任务
python review_tasks.py --project-id 1 accept 1 2 3

# 驳回指定任务
python review_tasks.py --project-id 1 reject 4 5

# 批量通过所有已标注任务
python review_tasks.py --project-id 1 accept-all
```

审核机制：通过 Label Studio 的 `ground_truth` 字段标记标注是否已审核通过。

### Step 4: 导出

```bash
# JSON 格式 (默认)
python export_data.py --project-id 1 --output ./output

# YOLO 格式
python export_data.py --project-id 1 --format YOLO --output ./output

# COCO 格式
python export_data.py --project-id 1 --format COCO --output ./output

# 仅导出已审核通过的标注
python export_data.py --project-id 1 --reviewed-only --output ./output
```

支持格式：JSON, JSON_MIN, COCO, YOLO, VOC, CSV, TSV, CoNLL2003

## 脚本说明

| 脚本 | 职责 |
|------|------|
| `setup_project.py` | 创建项目、生成标注配置、连接 ML Backend |
| `import_data.py` | 导入图片/视频、视频抽帧 |
| `review_tasks.py` | 标注进度查看、审核通过/驳回 |
| `export_data.py` | 导出标注结果 (多格式) |

## 环境变量

| 变量 | 说明 |
|------|------|
| `LABEL_STUDIO_URL` | Label Studio 地址，默认 `http://localhost:8080` |
| `LABEL_STUDIO_API_KEY` | API 密钥 (必填) |

所有脚本也支持 `--url` 和 `--api-key` 命令行参数覆盖。
