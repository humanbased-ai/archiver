"""Twitter 监听服务"""
import json
from typing import List, Dict
from pathlib import Path
from ..core.config import Config
from ..core.logger import setup_logger
from .client import TwitterClient

logger = setup_logger('twitter_monitor')

class TwitterMonitor:
    """Twitter 监听器"""
    
    def __init__(self):
        self.client = TwitterClient()
        self.accounts = self._load_accounts()
        self.user_ids = {}  # 缓存用户ID
    
    def _load_accounts(self) -> Dict:
        """加载账号配置"""
        accounts_path = Config.SKILLS_PATH / 'accounts.json'
        with open(accounts_path, encoding='utf-8') as f:
            return json.load(f)
    
    def _get_must_interact_accounts(self) -> List[str]:
        """获取必须互动的账号"""
        accounts = []
        for acc in self.accounts['must_interact']['accounts']:
            accounts.append(acc['handle'].replace('@', ''))
        return accounts
    
    def _get_high_priority_accounts(self) -> List[str]:
        """获取高优先级账号"""
        accounts = []
        
        # Base 生态
        for acc in self.accounts['base_ecosystem']['accounts']:
            if acc.get('priority') in ['highest', 'high']:
                accounts.append(acc['handle'].replace('@', ''))
        
        # x402/8004
        for acc in self.accounts['x402_8004_ecosystem']['core_members']:
            accounts.append(acc['handle'].replace('@', ''))
        
        for acc in self.accounts['x402_8004_ecosystem']['ai_agent_projects']:
            if acc.get('priority') == 'high':
                accounts.append(acc['handle'].replace('@', ''))
        
        # AI/Data
        for acc in self.accounts['ai_data_industry']['accounts']:
            if acc.get('priority') in ['highest', 'high']:
                accounts.append(acc['handle'].replace('@', ''))
        
        return accounts
    
    def monitor_accounts(self, priority: str = 'must_interact') -> List[Dict]:
        """
        监听账号
        
        Args:
            priority: 'must_interact' 或 'high_priority'
        """
        if priority == 'must_interact':
            usernames = self._get_must_interact_accounts()
        else:
            usernames = self._get_high_priority_accounts()
        
        all_tweets = []
        
        for username in usernames:
            # 获取或缓存用户ID
            if username not in self.user_ids:
                user_id = self.client.get_user_id(username)
                if user_id:
                    self.user_ids[username] = user_id
                else:
                    continue
            else:
                user_id = self.user_ids[username]
            
            # 获取最近推文
            tweets = self.client.get_recent_tweets(user_id, max_results=5)
            
            for tweet in tweets:
                all_tweets.append({
                    'id': tweet.id,
                    'text': tweet.text,
                    'author': username,
                    'created_at': tweet.created_at,
                    'metrics': tweet.public_metrics,
                    'priority': 'highest' if priority == 'must_interact' else 'high'
                })
        
        logger.info(f"Monitored {len(usernames)} accounts, found {len(all_tweets)} tweets")
        return all_tweets
    
    def monitor_mentions(self) -> List[Dict]:
        """监听 @提及"""
        tweets = self.client.search_mentions()
        
        mentions = []
        for tweet in tweets:
            mentions.append({
                'id': tweet.id,
                'text': tweet.text,
                'author_id': tweet.author_id,
                'created_at': tweet.created_at,
                'priority': 'highest'  # @提及最高优先级
            })
        
        logger.info(f"Found {len(mentions)} mentions")
        return mentions
