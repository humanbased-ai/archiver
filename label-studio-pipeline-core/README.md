# Label Studio Pipeline - Core

部署基础设施：Label Studio + YOLO ML Backend 的 Docker Compose 编排，以及标注界面模板。

## 目录结构

```
core/
├── docker-compose.yml           服务编排
├── .env.example                 环境变量模板
├── label-configs/               标注界面 XML 模板
│   ├── image_detection.xml        图像目标检测
│   ├── image_segmentation.xml     图像语义分割
│   ├── image_detection_with_review.xml  检测 + 审核
│   └── video_frame_detection.xml  视频帧检测
├── data/                        标注数据
│   ├── images/                    图片
│   └── videos/                    视频
└── models/                      自定义 YOLO 模型 (.pt)
```

## 快速启动

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 LABEL_STUDIO_API_KEY (首次启动后获取)

# 2. 启动服务
docker compose up -d

# 3. 访问
# Label Studio: http://localhost:8080
# ML Backend:   http://localhost:9090
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| label-studio | 8080 | 标注平台 Web UI + REST API |
| ml-backend | 9090 | YOLO 目标检测预标注服务 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LABEL_STUDIO_API_KEY` | (必填) | Label Studio API 密钥 |
| `LS_PORT` | 8080 | Label Studio 端口 |
| `ML_PORT` | 9090 | ML Backend 端口 |
| `MODEL_PATH` | yolov8n.pt | YOLO 模型 (默认自动下载) |
| `CONF_THRESHOLD` | 0.25 | 检测置信度阈值 |
| `IOU_THRESHOLD` | 0.45 | NMS IoU 阈值 |

## 使用自定义模型

1. 将 `.pt` 模型文件放入 `models/` 目录
2. 修改 `.env`: `MODEL_PATH=your_model.pt`
3. 重启: `docker compose up -d`

## 标注模板

### image_detection.xml - 目标检测

矩形框标注，默认标签：person, car, truck, bus, motorcycle, bicycle。配合 ML Backend 自动预标注。

### image_segmentation.xml - 语义分割

多边形标注，适合需要精确轮廓的场景。

### image_detection_with_review.xml - 检测 + 审核

在标注界面内嵌审核控件（通过/需修改/驳回 + 备注），适合标注和审核在同一界面完成。

### video_frame_detection.xml - 视频帧检测

配合 `api-sdk/import_data.py --video` 使用，视频抽帧后逐帧标注。

## 数据目录约定

- `data/images/` - 放入待标注图片
- `data/videos/` - 放入待标注视频
- `models/` - 放入自定义 YOLO 模型

docker-compose 将 `./data` 挂载到容器的 `/data/local`，Label Studio 通过此路径访问本地文件。
