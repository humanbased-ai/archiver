# Label Studio Pipeline - ML Backend

YOLO 目标检测预标注服务，为 Label Studio 提供自动预标注能力。

## 工作原理

```
Label Studio 打开标注任务
       │
       ▼ POST /predict
YOLO ML Backend
  ├── 下载图片
  ├── YOLO 推理
  ├── 过滤匹配项目标签
  └── 转换为 Label Studio 坐标格式 (百分比)
       │
       ▼ 返回预测 JSON
Label Studio 显示预标注框
```

## 独立使用

### Docker 构建运行

```bash
docker build -t yolo-backend .
docker run -p 9090:9090 \
  -e LABEL_STUDIO_URL=http://host.docker.internal:8080 \
  -e LABEL_STUDIO_API_KEY=<your_key> \
  yolo-backend
```

### 本地开发

```bash
pip install -r requirements.txt
export LABEL_STUDIO_URL=http://localhost:8080
export LABEL_STUDIO_API_KEY=<your_key>
label-studio-ml start . --host 0.0.0.0 --port 9090
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LABEL_STUDIO_URL` | (必填) | Label Studio 实例地址 |
| `LABEL_STUDIO_API_KEY` | (必填) | API 密钥 (用于下载任务图片) |
| `MODEL_PATH` | yolov8n.pt | YOLO 模型路径或名称 |
| `CONF_THRESHOLD` | 0.25 | 检测置信度阈值 |
| `IOU_THRESHOLD` | 0.45 | NMS IoU 阈值 |

## 自定义模型

默认使用 `yolov8n.pt` (COCO 80 类，自动下载)。使用自定义模型：

```bash
# 挂载模型目录
docker run -p 9090:9090 \
  -v /path/to/models:/app/models \
  -e MODEL_PATH=my_model.pt \
  -e LABEL_STUDIO_URL=http://host.docker.internal:8080 \
  -e LABEL_STUDIO_API_KEY=<key> \
  yolo-backend
```

## 标签匹配

ML Backend 自动解析项目的 XML 标注配置，只返回项目中已定义的标签。例如项目配置了 `person` 和 `car`，即使 YOLO 检测到 `dog`，也不会返回。

## 核心代码

`model.py` 实现 `LabelStudioMLBase` 接口：

- `setup()` - 加载 YOLO 模型，解析标注配置
- `predict(tasks)` - 对每个任务执行推理，返回 Label Studio 格式的预测结果

预测结果坐标为百分比格式 (0-100)，匹配 Label Studio 的坐标系统。
