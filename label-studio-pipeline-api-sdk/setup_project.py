#!/usr/bin/env python3
"""
Step 1: 创建 Label Studio 标注项目并连接 YOLO ML Backend.

用法:
    # 使用默认标签 (person, car, truck, bus, motorcycle, bicycle)
    python setup_project.py

    # 自定义标签
    python setup_project.py --labels dog cat bird

    # 指定项目名称
    python setup_project.py --title "交通场景标注" --labels person car truck

环境变量:
    LABEL_STUDIO_URL      Label Studio 地址 (默认 http://localhost:8080)
    LABEL_STUDIO_API_KEY  API 密钥 (必填, 从 Account & Settings 获取)
"""

import argparse
import os
import sys

import requests
from label_studio_sdk import LabelStudio

COLORS = [
    "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF",
    "#00FFFF", "#FFA500", "#800080", "#008000", "#800000",
    "#FFD700", "#4B0082", "#DC143C", "#00CED1", "#FF4500",
]

DEFAULT_LABELS = ["person", "car", "truck", "bus", "motorcycle", "bicycle"]


def build_label_config(labels: list[str]) -> str:
    """Generate Label Studio XML config for image object detection."""
    items = []
    for i, label in enumerate(labels):
        color = COLORS[i % len(COLORS)]
        items.append(f'    <Label value="{label}" background="{color}"/>')
    labels_xml = "\n".join(items)
    return (
        "<View>\n"
        '  <Image name="image" value="$image" zoom="true"'
        ' zoomControl="true" rotateControl="true"/>\n'
        '  <RectangleLabels name="label" toName="image"'
        ' strokeWidth="2" smart="true">\n'
        f"{labels_xml}\n"
        "  </RectangleLabels>\n"
        "</View>"
    )


def main():
    parser = argparse.ArgumentParser(description="创建 Label Studio 标注项目")
    parser.add_argument(
        "--url",
        default=os.environ.get("LABEL_STUDIO_URL", "http://localhost:8080"),
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("LABEL_STUDIO_API_KEY"),
    )
    parser.add_argument("--title", default="YOLO 目标检测标注")
    parser.add_argument(
        "--labels", nargs="+", default=DEFAULT_LABELS, help="标注标签列表"
    )
    parser.add_argument(
        "--ml-backend-url",
        default="http://ml-backend:9090",
        help="ML Backend URL (Docker 内部网络地址)",
    )
    args = parser.parse_args()

    if not args.api_key:
        print("=" * 50)
        print("错误: 需要 API Key")
        print("=" * 50)
        print(f"1. 打开 Label Studio: {args.url}")
        print("2. 注册账户并登录")
        print("3. 点击右上角头像 → Account & Settings")
        print("4. 复制 Access Token")
        print("5. 设置环境变量:")
        print("   export LABEL_STUDIO_API_KEY=<your_token>")
        print("   或在 .env 文件中设置")
        sys.exit(1)

    client = LabelStudio(base_url=args.url, api_key=args.api_key)

    # --- Create project ---
    label_config = build_label_config(args.labels)
    project = client.projects.create(
        title=args.title,
        label_config=label_config,
    )
    print(f"[OK] 项目已创建: {project.title} (ID: {project.id})")

    # --- Connect ML backend ---
    try:
        resp = requests.post(
            f"{args.url}/api/ml/",
            headers={"Authorization": f"Token {args.api_key}"},
            json={
                "url": args.ml_backend_url,
                "project": project.id,
                "title": "YOLO Detector",
                "is_interactive": False,
            },
            timeout=10,
        )
        resp.raise_for_status()
        print(f"[OK] ML Backend 已连接: {args.ml_backend_url}")
    except Exception as e:
        print(f"[WARN] ML Backend 连接失败: {e}")
        print(f"  请手动在项目设置中添加: {args.ml_backend_url}")

    # --- Enable prediction display ---
    try:
        client.projects.update(id=project.id, show_collab_predictions=True)
    except Exception:
        pass

    # --- Summary ---
    print()
    print("=" * 50)
    print(f"项目地址: {args.url}/projects/{project.id}")
    print(f"项目 ID:  {project.id}")
    print(f"标签:     {', '.join(args.labels)}")
    print("=" * 50)
    print()
    print("下一步:")
    print(f"  python import_data.py --project-id {project.id} --dir /path/to/images --data-root /path/to/core/data")
    print(f"  python import_data.py --project-id {project.id} --video /path/to/video.mp4 --upload")


if __name__ == "__main__":
    main()
