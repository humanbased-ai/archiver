"""判断是否值得互动"""
import json
from pathlib import Path
from typing import Tuple, Dict
from ..core.config import Config
from ..core.logger import setup_logger

logger = setup_logger('judge')

class InteractionJudge:
    """互动判断器"""
    
    def __init__(self):
        self.accounts = self._load_accounts()
        self.keywords = self._load_keywords()
    
    def _load_accounts(self) -> dict:
        """加载账号配置"""
        path = Config.SKILLS_PATH / 'accounts.json'
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    
    def _load_keywords(self) -> dict:
        """加载关键词"""
        return self.accounts.get('relevance_keywords', {})
    
    def should_interact(self, tweet: dict) -> Tuple[bool, str]:
        """
        判断是否应该互动
        
        Returns:
            (should_interact, reason)
        """
        
        # 1. Founders = 必须
        must_interact = [
            acc['handle'].replace('@', '') 
            for acc in self.accounts['must_interact']['accounts']
        ]
        if tweet['author'] in must_interact:
            return True, "Founders (must interact)"
        
        # 2. @提及 = 必须
        if '@codatta' in tweet['text'].lower():
            return True, "@mention"
        
        # 3. GM 类 post（高优先级账号）
        if tweet.get('priority') in ['highest', 'high']:
            if self._is_gm_post(tweet['text']):
                return True, "GM/casual post (show presence)"
        
        # 4. 相关话题
        relevance = self._check_relevance(tweet['text'])
        if relevance > 0.7:
            return True, f"High relevance ({relevance:.2f})"
        
        # 5. 社区时刻
        if self._is_community_moment(tweet['text']):
            return True, "Community moment"
        
        # 6. 热门相关
        if tweet.get('metrics', {}).get('like_count', 0) > 500:
            if relevance > 0.5:
                return True, f"Viral + relevant ({relevance:.2f})"
        
        return False, "Not relevant"
    
    def _is_gm_post(self, text: str) -> bool:
        """判断是否是 GM 类 post"""
        gm_keywords = self.keywords.get('gm_casual', [])
        text_lower = text.lower()
        return any(kw in text_lower for kw in gm_keywords)
    
    def _is_community_moment(self, text: str) -> bool:
        """判断是否是社区时刻"""
        community_keywords = self.keywords.get('community_moments', [])
        text_lower = text.lower()
        return any(kw in text_lower for kw in community_keywords)
    
    def _check_relevance(self, text: str) -> float:
        """检查相关性（0-1）"""
        deep_keywords = self.keywords.get('deep_engagement', [])
        text_lower = text.lower()
        
        matches = sum(1 for kw in deep_keywords if kw in text_lower)
        return matches / len(deep_keywords) if deep_keywords else 0
