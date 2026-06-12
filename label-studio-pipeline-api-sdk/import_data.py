#!/usr/bin/env python3
"""
Step 2: 导入图片或视频数据到 Label Studio 项目.

图片导入 (本地文件引用, 需配合 core/docker-compose 的 volume 挂载):
    python import_data.py --project-id 1 --dir /path/to/images --data-root /path/to/core/data

视频导入 (自动抽帧为图片):
    python import_data.py --project-id 1 --video /path/to/video.mp4 --data-root /path/to/core/data

直接上传图片到 Label Studio (无需 data-root, 通过 API 上传):
    python import_data.py --project-id 1 --dir /path/to/images --upload

环境变量:
    LABEL_STUDIO_URL      Label Studio 地址 (默认 http://localhost:8080)
    LABEL_STUDIO_API_KEY  API 密钥
"""

import argparse
import glob
import os
import sys

import cv2
import requests
from label_studio_sdk import LabelStudio


def extract_video_frames(
    video_path: str, output_dir: str, fps: float = 1.0
) -> list[str]:
    """Extract frames from video at specified FPS."""
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"错误: 无法打开视频 {video_path}")
        sys.exit(1)

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_interval = max(1, int(video_fps / fps))
    video_name = os.path.splitext(os.path.basename(video_path))[0]

    print(f"  视频: {video_path}")
    print(f"  原始帧率: {video_fps:.1f} fps, 总帧数: {total_frames}")
    print(f"  抽帧间隔: 每 {frame_interval} 帧取 1 帧 (目标 {fps} fps)")

    paths = []
    frame_idx = 0
    saved = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            fname = f"{video_name}_frame_{saved:06d}.jpg"
            fpath = os.path.join(output_dir, fname)
            cv2.imwrite(fpath, frame)
            paths.append(fpath)
            saved += 1
        frame_idx += 1

    cap.release()
    print(f"  已抽取 {saved} 帧 → {output_dir}")
    return paths


def collect_images(directory: str) -> list[str]:
    """Collect all image files from a directory."""
    extensions = ("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.webp")
    paths = []
    for ext in extensions:
        paths.extend(glob.glob(os.path.join(directory, ext)))
        paths.extend(glob.glob(os.path.join(directory, ext.upper())))
    return sorted(set(paths))


def import_via_local_path(client, project_id, image_paths, data_root):
    """Import by referencing files on Label Studio's mounted volume."""
    tasks = []
    for path in image_paths:
        abs_path = os.path.abspath(path)
        try:
            rel_path = os.path.relpath(abs_path, data_root)
        except ValueError:
            rel_path = os.path.basename(abs_path)
        # /data/local is the container mount point (see docker-compose volumes)
        tasks.append({"image": f"/data/local/{rel_path}"})

    batch_size = 100
    total = len(tasks)
    for i in range(0, total, batch_size):
        batch = tasks[i : i + batch_size]
        client.projects.import_tasks(id=project_id, request=batch)
        print(f"  已导入: {min(i + batch_size, total)}/{total}")

    return total


def import_via_upload(url, api_key, project_id, image_paths):
    """Import by uploading files directly to Label Studio via API."""
    total = len(image_paths)
    for i, path in enumerate(image_paths):
        with open(path, "rb") as f:
            resp = requests.post(
                f"{url}/api/projects/{project_id}/import",
                headers={"Authorization": f"Token {api_key}"},
                files={"file": (os.path.basename(path), f, "image/jpeg")},
                timeout=30,
            )
            resp.raise_for_status()
        if (i + 1) % 10 == 0 or i + 1 == total:
            print(f"  已上传: {i + 1}/{total}")

    return total


def main():
    parser = argparse.ArgumentParser(description="导入数据到 Label Studio")
    parser.add_argument(
        "--url",
        default=os.environ.get("LABEL_STUDIO_URL", "http://localhost:8080"),
    )
    parser.add_argument(
        "--api-key", default=os.environ.get("LABEL_STUDIO_API_KEY")
    )
    parser.add_argument("--project-id", type=int, required=True)
    parser.add_argument("--dir", help="图片目录路径")
    parser.add_argument("--video", help="视频文件路径")
    parser.add_argument(
        "--video-fps", type=float, default=1.0, help="视频抽帧频率, 默认 1 fps"
    )
    parser.add_argument(
        "--data-root",
        help="core/data 目录的本地路径 (本地文件引用模式需要)",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="通过 API 直接上传文件 (无需 --data-root)",
    )
    args = parser.parse_args()

    if not args.api_key:
        print("错误: 需要 LABEL_STUDIO_API_KEY 环境变量")
        sys.exit(1)

    if not args.dir and not args.video:
        print("错误: 需要 --dir 或 --video 参数")
        sys.exit(1)

    if not args.upload and not args.data_root:
        print("错误: 需要 --data-root 指定 core/data 目录, 或使用 --upload 模式")
        print("  本地引用: --data-root /path/to/core/data")
        print("  直接上传: --upload")
        sys.exit(1)

    client = LabelStudio(base_url=args.url, api_key=args.api_key)

    # --- Collect image paths ---
    image_paths = []

    if args.video:
        print("正在抽取视频帧...")
        if args.data_root:
            frames_dir = os.path.join(args.data_root, "images", "video_frames")
        else:
            frames_dir = os.path.join(os.path.dirname(os.path.abspath(args.video)), "frames")
        image_paths = extract_video_frames(args.video, frames_dir, args.video_fps)

    if args.dir:
        image_paths.extend(collect_images(args.dir))

    if not image_paths:
        print("未找到图片文件")
        sys.exit(1)

    print(f"\n共找到 {len(image_paths)} 张图片")

    # --- Import ---
    if args.upload:
        print("模式: API 直接上传")
        total = import_via_upload(args.url, args.api_key, args.project_id, image_paths)
    else:
        print("模式: 本地文件引用")
        total = import_via_local_path(client, args.project_id, image_paths, args.data_root)

    print(f"\n[OK] 共导入 {total} 个标注任务")
    print(f"打开 Label Studio 开始标注:")
    print(f"  {args.url}/projects/{args.project_id}/data")


if __name__ == "__main__":
    main()
