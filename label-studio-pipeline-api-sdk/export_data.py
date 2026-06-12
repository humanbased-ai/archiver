#!/usr/bin/env python3
"""
Step 4: 导出标注结果.

导出所有标注 (JSON):
    python export_data.py --project-id 1

导出 YOLO 格式:
    python export_data.py --project-id 1 --format YOLO --output ../output

导出 COCO 格式:
    python export_data.py --project-id 1 --format COCO

仅导出已审核通过的标注:
    python export_data.py --project-id 1 --reviewed-only

支持格式: JSON, JSON_MIN, COCO, YOLO, VOC, CSV, TSV, CoNLL2003

环境变量:
    LABEL_STUDIO_URL      Label Studio 地址 (默认 http://localhost:8080)
    LABEL_STUDIO_API_KEY  API 密钥
"""

import argparse
import json
import os
import sys

import requests
from label_studio_sdk import LabelStudio

EXPORT_FORMATS = ["JSON", "JSON_MIN", "COCO", "YOLO", "VOC", "CSV", "TSV", "CONLL2003"]

FORMAT_EXT = {
    "JSON": "json",
    "JSON_MIN": "json",
    "COCO": "json",
    "CSV": "csv",
    "TSV": "tsv",
    "YOLO": "zip",
    "VOC": "zip",
    "CONLL2003": "conll",
}


def export_reviewed_only(client: LabelStudio, project_id: int, output_dir: str):
    """Export only annotations marked as ground_truth (reviewed)."""
    tasks = list(client.tasks.list(project=project_id))

    reviewed_tasks = []
    for task in tasks:
        annotations = task.annotations or []
        reviewed_anns = [a for a in annotations if getattr(a, "ground_truth", False)]
        if not reviewed_anns:
            continue
        reviewed_tasks.append(
            {
                "id": task.id,
                "data": task.data,
                "annotations": [
                    {"id": a.id, "result": a.result, "completed_by": getattr(a, "completed_by", None)}
                    for a in reviewed_anns
                ],
            }
        )

    output_path = os.path.join(output_dir, "reviewed_annotations.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(reviewed_tasks, f, ensure_ascii=False, indent=2)

    print(f"[OK] 已导出 {len(reviewed_tasks)} 个已审核任务 → {output_path}")


def export_full(url: str, api_key: str, project_id: int, fmt: str, output_dir: str):
    """Export all annotations via Label Studio export API."""
    resp = requests.get(
        f"{url}/api/projects/{project_id}/export",
        headers={"Authorization": f"Token {api_key}"},
        params={"exportType": fmt},
        timeout=120,
    )
    resp.raise_for_status()

    ext = FORMAT_EXT.get(fmt, "json")
    output_path = os.path.join(output_dir, f"export_{project_id}.{ext}")

    with open(output_path, "wb") as f:
        f.write(resp.content)

    size_kb = len(resp.content) / 1024
    print(f"[OK] 已导出 → {output_path} ({fmt}, {size_kb:.1f} KB)")


def main():
    parser = argparse.ArgumentParser(description="导出标注结果")
    parser.add_argument(
        "--url",
        default=os.environ.get("LABEL_STUDIO_URL", "http://localhost:8080"),
    )
    parser.add_argument(
        "--api-key", default=os.environ.get("LABEL_STUDIO_API_KEY")
    )
    parser.add_argument("--project-id", type=int, required=True)
    parser.add_argument(
        "--format",
        default="JSON",
        choices=EXPORT_FORMATS,
        help="导出格式 (默认 JSON)",
    )
    parser.add_argument("--output", default="../output", help="输出目录")
    parser.add_argument(
        "--reviewed-only",
        action="store_true",
        help="仅导出已审核通过的标注",
    )
    args = parser.parse_args()

    if not args.api_key:
        print("错误: 需要 LABEL_STUDIO_API_KEY 环境变量")
        sys.exit(1)

    os.makedirs(args.output, exist_ok=True)

    if args.reviewed_only:
        client = LabelStudio(base_url=args.url, api_key=args.api_key)
        export_reviewed_only(client, args.project_id, args.output)
    else:
        export_full(args.url, args.api_key, args.project_id, args.format, args.output)


if __name__ == "__main__":
    main()
