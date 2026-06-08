#!/usr/bin/env python3
"""审核工具 - 用于批准或拒绝推文"""
import sys
from src.storage.database import Database
from src.twitter.client import TwitterClient
from src.core.logger import setup_logger

logger = setup_logger('approve')

def main():
    if len(sys.argv) < 2:
        print("Usage: python approve.py <action> [tweet_id]")
        print("Actions: approve, reject, edit, list")
        sys.exit(1)

    action = sys.argv[1]
    
    db = Database()
    
    if action == "list":
        # 列出所有待审核
        pending = db.get_pending_approvals()
        
        if not pending:
            print("✅ No pending approvals")
            return
        
        print(f"\n📋 Pending Approvals ({len(pending)}):\n")
        for tweet in pending:
            print(f"ID: {tweet.id}")
            print(f"Author: @{tweet.author}")
            print(f"Priority: {tweet.priority}")
            print(f"Reason: {tweet.interaction_reason}")
            print(f"Original: {tweet.text[:100]}...")
            print(f"Reply: {tweet.suggested_reply}")
            print("-" * 50)
        
        return

    if len(sys.argv) < 3:
        print(f"Error: {action} requires a tweet_id")
        print("Usage: python approve.py <action> <tweet_id>")
        sys.exit(1)

    tweet_id = sys.argv[2]

    if action == "approve":
        # 批准并发送
        session = db.get_session()
        try:
            from src.storage.models import Tweet
            tweet = session.query(Tweet).filter(Tweet.id == tweet_id).first()
            
            if not tweet:
                print(f"❌ Tweet {tweet_id} not found")
                return
            
            if tweet.approval_status != 'pending':
                print(f"⚠️  Tweet {tweet_id} status: {tweet.approval_status}")
                return
            
            # 发送推文
            twitter = TwitterClient()
            success = twitter.post_tweet(
                text=tweet.suggested_reply,
                reply_to=tweet_id
            )
            
            if success:
                db.update_approval_status(tweet_id, 'approved')
                db.mark_as_posted(tweet_id, 'posted')
                print(f"✅ Tweet {tweet_id} approved and posted!")
            else:
                print(f"❌ Failed to post tweet")
                
        finally:
            session.close()
    
    elif action == "reject":
        # 拒绝
        db.update_approval_status(tweet_id, 'rejected')
        print(f"❌ Tweet {tweet_id} rejected")

    elif action == "edit":
        # 编辑回复
        session = db.get_session()
        try:
            from src.storage.models import Tweet
            tweet = session.query(Tweet).filter(Tweet.id == tweet_id).first()

            if not tweet:
                print(f"❌ Tweet {tweet_id} not found")
                return

            print("\n" + "=" * 60)
            print(f"编辑推文回复 - Tweet ID: {tweet_id}")
            print("=" * 60)
            print(f"\n原推文 (@{tweet.author}):")
            print(f"{tweet.text}\n")
            print(f"当前建议回复:")
            print(f"{tweet.suggested_reply}\n")
            print("-" * 60)
            print("请输入新的回复内容 (输入空行结束):")
            print("-" * 60)

            # 读取多行输入
            lines = []
            while True:
                try:
                    line = input()
                    if line == "":
                        break
                    lines.append(line)
                except EOFError:
                    break

            new_reply = "\n".join(lines).strip()

            if not new_reply:
                print("❌ 回复内容不能为空")
                return

            # 更新数据库
            tweet.suggested_reply = new_reply
            session.commit()

            print(f"\n✅ 回复已更新！")
            print(f"\n新回复:")
            print(f"{new_reply}\n")
            print("现在可以使用以下命令批准:")
            print(f"python3 approve.py approve {tweet_id}")

        finally:
            session.close()

    else:
        print(f"Unknown action: {action}")
        print("Valid actions: approve, reject, edit, list")

if __name__ == "__main__":
    main()
