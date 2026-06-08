"""数据库操作"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from ..core.config import Config
from ..core.logger import setup_logger
from .models import Base, Tweet, OriginalContent

logger = setup_logger('database')

class Database:
    """数据库管理"""
    
    def __init__(self):
        self.engine = create_engine(Config.DATABASE_URL)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
    
    def get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()
    
    def save_tweet(self, tweet_data: dict) -> bool:
        """保存推文记录"""
        session = self.get_session()
        try:
            tweet = Tweet(**tweet_data)
            session.add(tweet)
            session.commit()
            logger.info(f"Saved tweet {tweet.id}")
            return True
        except Exception as e:
            session.rollback()
            logger.error(f"Error saving tweet: {e}")
            return False
        finally:
            session.close()
    
    def get_pending_approvals(self) -> list:
        """获取待审核的推文"""
        session = self.get_session()
        try:
            tweets = session.query(Tweet).filter(
                Tweet.approval_status == 'pending'
            ).all()
            return tweets
        finally:
            session.close()
    
    def update_approval_status(
        self,
        tweet_id: str,
        status: str
    ) -> bool:
        """更新审核状态"""
        session = self.get_session()
        try:
            tweet = session.query(Tweet).filter(
                Tweet.id == tweet_id
            ).first()
            
            if tweet:
                tweet.approval_status = status
                if status == 'approved':
                    tweet.approved_at = datetime.utcnow()
                session.commit()
                logger.info(f"Updated tweet {tweet_id} status to {status}")
                return True
            return False
        except Exception as e:
            session.rollback()
            logger.error(f"Error updating approval: {e}")
            return False
        finally:
            session.close()
    
    def mark_as_posted(self, tweet_id: str, posted_tweet_id: str) -> bool:
        """标记为已发送"""
        session = self.get_session()
        try:
            tweet = session.query(Tweet).filter(
                Tweet.id == tweet_id
            ).first()
            
            if tweet:
                tweet.posted = True
                tweet.posted_at = datetime.utcnow()
                tweet.posted_tweet_id = posted_tweet_id
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    def tweet_exists(self, tweet_id: str) -> bool:
        """检查推文是否已处理"""
        session = self.get_session()
        try:
            tweet = session.query(Tweet).filter(
                Tweet.id == tweet_id
            ).first()
            return tweet is not None
        finally:
            session.close()
