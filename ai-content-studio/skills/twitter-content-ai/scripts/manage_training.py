#!/usr/bin/env python3
"""
训练管理命令行工具
用于监控内容新鲜度和添加训练样本
"""

import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from src.intelligence.content_freshness_monitor import ContentFreshnessMonitor
from src.intelligence.continuous_learning_system import ContinuousLearningSystem
from src.intelligence.unified_freshness_monitor import get_unified_monitor
import argparse


def main():
    parser = argparse.ArgumentParser(description="AI Content Studio 训练管理工具")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # 1. 检查新鲜度
    check_parser = subparsers.add_parser("check", help="检查内容新鲜度")
    check_parser.add_argument(
        "--type", "-t", default="gm", choices=["gm", "main", "casual"], help="内容类型"
    )

    # 2. 查看仪表板
    subparsers.add_parser("dashboard", help="显示学习状态仪表板")

    # 3. 获取训练建议
    suggest_parser = subparsers.add_parser("suggest", help="获取训练建议")
    suggest_parser.add_argument(
        "--type", "-t", default="gm", choices=["gm", "main", "casual"], help="内容类型"
    )

    # 4. 生成训练模板
    template_parser = subparsers.add_parser("template", help="生成训练样本模板")
    template_parser.add_argument(
        "--type", "-t", default="gm", choices=["gm", "main", "casual"], help="内容类型"
    )
    template_parser.add_argument(
        "--count", "-c", type=int, default=5, help="生成几个样本模板"
    )
    template_parser.add_argument(
        "--output", "-o", help="输出文件路径（默认打印到终端）"
    )

    # 5. 导入训练样本
    import_parser = subparsers.add_parser("import", help="从模板文件导入训练样本")
    import_parser.add_argument("file", help="模板文件路径")

    # 6. 手动添加样本
    add_parser = subparsers.add_parser("add", help="手动添加单个训练样本")
    add_parser.add_argument(
        "--type", "-t", default="gm", choices=["gm", "main", "casual"], help="内容类型"
    )
    add_parser.add_argument("--text", required=True, help="推文内容")
    add_parser.add_argument("--style", default="unknown", help="风格")
    add_parser.add_argument("--engagement", default="unknown", help="互动情况")
    add_parser.add_argument("--notes", default="", help="备注")

    # 7. 查看历史记录
    history_parser = subparsers.add_parser("history", help="查看生成历史和报警")
    history_parser.add_argument(
        "--type",
        "-t",
        default="all",
        choices=["all", "posts", "alerts", "training"],
        help="历史类型",
    )
    history_parser.add_argument(
        "--limit", "-n", type=int, default=10, help="显示最近 N 条"
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # 执行命令
    if args.command == "check":
        cmd_check(args.type)

    elif args.command == "dashboard":
        cmd_dashboard()

    elif args.command == "suggest":
        cmd_suggest(args.type)

    elif args.command == "template":
        cmd_template(args.type, args.count, args.output)

    elif args.command == "import":
        cmd_import(args.file)

    elif args.command == "add":
        cmd_add(args.type, args.text, args.style, args.engagement, args.notes)

    elif args.command == "history":
        cmd_history(args.type, args.limit)


def cmd_check(content_type: str):
    """检查新鲜度"""
    monitor = ContentFreshnessMonitor()
    report = monitor.get_freshness_report(content_type)
    print(report)


def cmd_dashboard():
    """显示仪表板"""
    # 使用统一监控器的仪表板
    monitor = get_unified_monitor()
    print(monitor.get_dashboard_summary())

    # 如果需要详细的训练建议，显示传统仪表板
    print("\n" + "=" * 70)
    print("📚 训练数据详情")
    print("=" * 70 + "\n")
    system = ContinuousLearningSystem()
    print(system.get_learning_dashboard())


def cmd_suggest(content_type: str):
    """获取训练建议"""
    system = ContinuousLearningSystem()
    suggestions = system.suggest_training_samples(content_type)

    print(f"\n📊 {content_type.upper()} 训练建议\n")
    print(f"需要训练: {'是' if suggestions['needs_training'] else '否'}")
    print(f"优先级: {suggestions['priority']}")
    print(f"新鲜度得分: {suggestions['freshness_score']:.2f} / 1.00\n")

    if suggestions["suggestions"]:
        print("💡 建议:\n")
        for i, s in enumerate(suggestions["suggestions"], 1):
            print(f"{i}. {s['description']}")
            print(f"   例如: {s['example']}\n")


def cmd_template(content_type: str, count: int, output_file: str = None):
    """生成训练模板"""
    system = ContinuousLearningSystem()
    template = system.generate_training_template(content_type, count)

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(template)
        print(f"✅ 模板已保存到: {output_file}")
        print(f"📝 请填写模板后使用 'manage_training.py import {output_file}' 导入")
    else:
        print(template)


def cmd_import(template_file: str):
    """导入训练样本"""
    system = ContinuousLearningSystem()
    result = system.import_from_template(template_file)

    if result["success"]:
        print(f"✅ {result['message']}")
        print(f"   已添加: {result['added_count']} 个样本")
        print(f"   总样本数: {result['total_samples']}")
        print(f"   新样本 ID: {', '.join(result['new_ids'])}")
    else:
        print(f"❌ 导入失败: {result['message']}")


def cmd_add(content_type: str, text: str, style: str, engagement: str, notes: str):
    """手动添加单个样本"""
    system = ContinuousLearningSystem()

    sample = {"text": text, "style": style, "engagement": engagement}

    result = system.add_training_samples(
        content_type=content_type, samples=[sample], source="manual", notes=notes
    )

    if result["success"]:
        print(f"✅ {result['message']}")
        print(f"   新样本 ID: {result['new_ids'][0]}")
    else:
        print(f"❌ 添加失败: {result['message']}")


def cmd_history(history_type: str, limit: int):
    """查看历史记录"""
    monitor = ContentFreshnessMonitor()
    history = monitor.history

    if history_type in ["all", "posts"]:
        print(f"\n📝 最近生成的推文 (最新 {limit} 条):\n")
        posts = history["generated_posts"][-limit:]
        for post in posts:
            print(f"[{post['id']}] {post['timestamp'][:10]} | {post['content_type']}")
            print(f"    {post['text'][:80]}{'...' if len(post['text']) > 80 else ''}")
            print()

    if history_type in ["all", "alerts"]:
        print(f"\n⚠️ 最近的报警 (最新 {limit} 条):\n")
        alerts = history["alerts"][-limit:]
        if alerts:
            for alert_record in alerts:
                print(f"时间: {alert_record['timestamp'][:19]}")
                print(f"类型: {alert_record['content_type']}")
                print(f"新鲜度: {alert_record['freshness_score']:.2f}")
                for alert in alert_record["alerts"]:
                    print(f"  - {alert['message']}")
                print()
        else:
            print("  (无报警记录)")
            print()

    if history_type in ["all", "training"]:
        print(f"\n📚 训练更新历史 (最新 {limit} 条):\n")
        updates = history["training_data_updates"][-limit:]
        if updates:
            for update in updates:
                print(
                    f"{update['date'][:10]} | {update['type']} (+{update['samples_added']} 样本)"
                )
                if update["notes"]:
                    print(f"  备注: {update['notes']}")
                print()
        else:
            print("  (无训练记录)")
            print()


if __name__ == "__main__":
    main()
