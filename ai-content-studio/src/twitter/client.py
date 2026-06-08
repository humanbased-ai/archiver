"""Twitter API 客户端"""
import tweepy
from typing import Optional, List, Dict
from ..core.config import Config
from ..core.logger import setup_logger

logger = setup_logger('twitter_client')

class TwitterClient:
    """Twitter API 客户端"""
    
    def __init__(self):
        self.client = tweepy.Client(
            bearer_token=Config.TWITTER_BEARER_TOKEN,
            consumer_key=Config.TWITTER_API_KEY,
            consumer_secret=Config.TWITTER_API_SECRET,
            access_token=Config.TWITTER_ACCESS_TOKEN,
            access_token_secret=Config.TWITTER_ACCESS_SECRET,
            wait_on_rate_limit=True
        )
        
        # API v1.1 for media
        auth = tweepy.OAuth1UserHandler(
            Config.TWITTER_API_KEY,
            Config.TWITTER_API_SECRET,
            Config.TWITTER_ACCESS_TOKEN,
            Config.TWITTER_ACCESS_SECRET
        )
        self.api = tweepy.API(auth)
    
    def get_user_id(self, username: str) -> Optional[str]:
        """获取用户ID"""
        try:
            user = self.client.get_user(username=username.replace('@', ''))
            return user.data.id if user.data else None
        except Exception as e:
            logger.error(f"Error getting user ID for {username}: {e}")
            return None
    
    def get_recent_tweets(
        self, 
        user_id: str, 
        max_results: int = 10
    ) -> List:
        """获取用户最近推文"""
        try:
            tweets = self.client.get_users_tweets(
                id=user_id,
                max_results=max_results,
                tweet_fields=['created_at', 'public_metrics', 'conversation_id'],
                exclude=['retweets', 'replies']
            )
            return tweets.data if tweets.data else []
        except Exception as e:
            logger.error(f"Error getting tweets for user {user_id}: {e}")
            return []
    
    def search_mentions(self, username: str = "codatta_intern") -> List:
        """搜索 @提及"""
        try:
            query = f"@{username} -is:retweet"
            tweets = self.client.search_recent_tweets(
                query=query,
                max_results=10,
                tweet_fields=['created_at', 'author_id', 'conversation_id']
            )
            return tweets.data if tweets.data else []
        except Exception as e:
            logger.error(f"Error searching mentions: {e}")
            return []
    
    def post_tweet(self, text: str, reply_to: Optional[str] = None) -> bool:
        """发推"""
        try:
            params = {'text': text}
            if reply_to:
                params['in_reply_to_tweet_id'] = reply_to
            
            response = self.client.create_tweet(**params)
            logger.info(f"Posted tweet: {response.data['id']}")
            return True
            
        except Exception as e:
            logger.error(f"Error posting tweet: {e}")
            return False
    
    def get_tweet(self, tweet_id: str) -> Optional[Dict]:
        """获取推文详情"""
        try:
            tweet = self.client.get_tweet(
                id=tweet_id,
                tweet_fields=['created_at', 'author_id', 'text', 'public_metrics'],
                expansions=['author_id']
            )
            return tweet
        except Exception as e:
            logger.error(f"Error getting tweet {tweet_id}: {e}")
            return None
