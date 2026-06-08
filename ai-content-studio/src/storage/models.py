"""数据模型"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Tweet(Base):
    """推文记录"""
    __tablename__ = 'tweets'
    
    id = Column(String, primary_key=True)  # Twitter tweet ID
    author = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    priority = Column(String, nullable=False)
    
    # 判断结果
    should_interact = Column(Boolean, nullable=False)
    interaction_reason = Column(String)
    
    # 生成的回复（3 个版本）
    reply_short = Column(Text)   # 超简短版本
    reply_medium = Column(Text)  # 中等版本
    reply_long = Column(Text)    # 详细版本
    selected_reply = Column(String)  # 'short', 'medium', or 'long'
    
    # 审核状态
    approval_status = Column(String)  # pending, approved, rejected, expired
    approved_at = Column(DateTime)
    
    # 发送状态
    posted = Column(Boolean, default=False)
    posted_at = Column(DateTime)
    posted_tweet_id = Column(String)
    
    # 时间戳
    processed_at = Column(DateTime, default=datetime.utcnow)

class OriginalContent(Base):
    """原创内容记录"""
    __tablename__ = 'original_content'
    
    id = Column(Integer, primary_key=True)
    theme = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    day_of_week = Column(String)
    
    # 审核状态
    approval_status = Column(String)
    approved_at = Column(DateTime)
    
    # 发送状态
    posted = Column(Boolean, default=False)
    posted_at = Column(DateTime)
    posted_tweet_id = Column(String)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
