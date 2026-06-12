#!/usr/bin/env python3
"""
Step 3: 标注审核工具 - 查看进度、通过/驳回标注.

查看进度:
    python review_tasks.py --project-id 1 status

列出待审核任务:
    python review_tasks.py --project-id 1 list

通过审核 (标记为 ground_truth):
    python review_tasks.py --project-id 1 accept 1 2 3

驳回标注:
    python review_tasks.py --project-id 1 reject 4 5

批量通过所有已标注任务:
    python review_tasks.py --project-id 1 accept-all

环境变量:
    LABEL_STUDIO_URL      Label Studio 地址 (默认 http://localhost:8080)
    LABEL_STUDIO_API_KEY  API 密钥
"""

import argparse
import os
import sys

import requests
from label_studio_sdk import LabelStudio


def get_client(url: str, api_key: str) -> LabelStudio:
    if not api_key:
        print("错误: 需要 LABEL_STUDIO_API_KEY 环境变量")
        sys.exit(1)
    return LabelStudio(base_url=url, api_key=api_key)


def cmd_status(client: LabelStudio, project_id: int):
    """Show annotation and review progress."""
    tasks = list(client.tasks.list(project=project_id))
    total = len(tasks)
    if total == 0:
        print("项目中没有任务")
        return

    annotated = 0
    reviewed = 0
    total_annotations = 0

    for task in tasks:
        if task.is_labeled:
            annotated += 1
        annotations = task.annotations or []
        total_annotations += len(annotations)
        for ann in annotations:
            if getattr(ann, "ground_truth", False):
                reviewed += 1
                break

    print(f"项目 {project_id} 进度:")
    print(f"  总任务:   {total}")
    print(f"  已标注:   {annotated} ({annotated / total * 100:.1f}%)")
    print(f"  已审核:   {reviewed} ({reviewed / total * 100:.1f}%)")
    print(f"  待标注:   {total - annotated}")
    print(f"  待审核:   {annotated - reviewed}")
    print(f"  标注总数: {total_annotations}")


def cmd_list(client: LabelStudio, project_id: int):
    """List tasks ready for review."""
    tasks = list(client.tasks.list(project=project_id))

    pending_review = []
    reviewed = []

    for task in tasks:
        if not task.is_labeled:
            continue
        annotations = task.annotations or []
        is_reviewed = any(getattr(a, "ground_truth", False) for a in annotations)
        entry = {
            "id": task.id,
            "ann_count": len(annotations),
            "reviewed": is_reviewed,
        }
        if is_reviewed:
            reviewed.append(entry)
        else:
            pending_review.append(entry)

    if pending_review:
        print(f"待审核 ({len(pending_review)}):")
        print(f"  {'Task ID':<10} {'标注数':<8}")
        print(f"  {'-' * 20}")
        for t in pending_review:
            print(f"  {t['id']:<10} {t['ann_count']:<8}")
    else:
        print("没有待审核的任务")

    if reviewed:
        print(f"\n已审核 ({len(reviewed)}):")
        for t in reviewed:
            print(f"  Task {t['id']} ✓")


def _update_ground_truth(
    url: str, api_key: str, client: LabelStudio, task_ids: list[int], value: bool
):
    """Set ground_truth on all annotations for given tasks."""
    label = "通过" if value else "驳回"
    for task_id in task_ids:
        task = client.tasks.get(id=task_id)
        annotations = task.annotations or []
        if not annotations:
            print(f"  Task {task_id}: 无标注, 跳过")
            continue

        for ann in annotations:
            requests.patch(
                f"{url}/api/annotations/{ann.id}/",
                headers={"Authorization": f"Token {api_key}"},
                json={"ground_truth": value},
                timeout=10,
            )

        symbol = "✓" if value else "✗"
        print(f"  Task {task_id}: 已{label} {symbol}")


def cmd_accept(url: str, api_key: str, client: LabelStudio, project_id: int, task_ids: list[int]):
    """Mark annotations as reviewed (ground_truth=True)."""
    print("审核通过:")
    _update_ground_truth(url, api_key, client, task_ids, True)


def cmd_reject(url: str, api_key: str, client: LabelStudio, project_id: int, task_ids: list[int]):
    """Mark annotations as rejected (ground_truth=False)."""
    print("审核驳回:")
    _update_ground_truth(url, api_key, client, task_ids, False)


def cmd_accept_all(url: str, api_key: str, client: LabelStudio, project_id: int):
    """Accept all annotated tasks."""
    tasks = list(client.tasks.list(project=project_id))
    task_ids = [
        t.id
        for t in tasks
        if t.is_labeled
        and not any(getattr(a, "ground_truth", False) for a in (t.annotations or []))
    ]
    if not task_ids:
        print("没有待审核的任务")
        return
    print(f"批量通过 {len(task_ids)} 个任务:")
    _update_ground_truth(url, api_key, client, task_ids, True)


def main():
    parser = argparse.ArgumentParser(description="标注审核工具")
    parser.add_argument(
        "--url",
        default=os.environ.get("LABEL_STUDIO_URL", "http://localhost:8080"),
    )
    parser.add_argument(
        "--api-key", default=os.environ.get("LABEL_STUDIO_API_KEY")
    )
    parser.add_argument("--project-id", type=int, required=True)

    sub = parser.add_subparsers(dest="command")
    sub.add_parser("status", help="查看标注进度")
    sub.add_parser("list", help="列出待审核任务")

    p_accept = sub.add_parser("accept", help="通过审核")
    p_accept.add_argument("task_ids", type=int, nargs="+", help="任务 ID")

    p_reject = sub.add_parser("reject", help="驳回标注")
    p_reject.add_argument("task_ids", type=int, nargs="+", help="任务 ID")

    sub.add_parser("accept-all", help="批量通过所有已标注任务")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    client = get_client(args.url, args.api_key)

    if args.command == "status":
        cmd_status(client, args.project_id)
    elif args.command == "list":
        cmd_list(client, args.project_id)
    elif args.command == "accept":
        cmd_accept(args.url, args.api_key, client, args.project_id, args.task_ids)
    elif args.command == "reject":
        cmd_reject(args.url, args.api_key, client, args.project_id, args.task_ids)
    elif args.command == "accept-all":
        cmd_accept_all(args.url, args.api_key, client, args.project_id)


if __name__ == "__main__":
    main()
