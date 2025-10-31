from datetime import datetime, timedelta
import json
from typing import Optional, Dict, Any
from redis_config import redis_client

class UserSessionService:
    """Handles user sessions and rate limiting"""
    
    @staticmethod
    def store_session(user_id: str, token: str, expires_in: int = 3600):
        """Store user session with expiration"""
        redis_client.setex(f"session:{user_id}", expires_in, token)
    
    @staticmethod
    def validate_session(user_id: str) -> Optional[str]:
        """Validate and return user session token"""
        return redis_client.get(f"session:{user_id}")
    
    @staticmethod
    def check_rate_limit(user_id: str, action: str, limit: int, window: int) -> bool:
        """
        Check if user has exceeded rate limit
        action: type of action (e.g., 'messages', 'uploads')
        limit: maximum number of actions
        window: time window in seconds
        """
        key = f"ratelimit:{user_id}:{action}"
        current = redis_client.incr(key)
        if current == 1:
            redis_client.expire(key, window)
        return current <= limit

class SubscriptionService:
    """Handles subscription management"""
    
    @staticmethod
    def update_subscription(
        user_id: str,
        tier: str,
        is_active: bool,
        end_date: datetime,
        features: list
    ):
        """Update user subscription details"""
        pipe = redis_client.pipeline()
        
        # Store subscription details
        sub_key = f"subscription:{user_id}"
        pipe.hmset(sub_key, {
            'tier': tier,
            'is_active': '1' if is_active else '0',
            'end_date': end_date.isoformat(),
            'features': json.dumps(features)
        })
        
        # Set expiry to match subscription end date
        ttl = int((end_date - datetime.now()).total_seconds())
        if ttl > 0:
            pipe.expire(sub_key, ttl)
        
        pipe.execute()
    
    @staticmethod
    def get_subscription(user_id: str) -> Dict[str, Any]:
        """Get user subscription details"""
        sub_key = f"subscription:{user_id}"
        data = redis_client.hgetall(sub_key)
        
        if not data:
            return {
                'tier': 'free',
                'is_active': False,
                'end_date': None,
                'features': []
            }
        
        return {
            'tier': data.get('tier', 'free'),
            'is_active': data.get('is_active', '0') == '1',
            'end_date': datetime.fromisoformat(data['end_date']) if 'end_date' in data else None,
            'features': json.loads(data.get('features', '[]'))
        }
    
    @staticmethod
    def check_feature_access(user_id: str, feature: str) -> bool:
        """Check if user has access to a specific feature"""
        sub_key = f"subscription:{user_id}"
        features = redis_client.hget(sub_key, 'features')
        if features:
            return feature in json.loads(features)
        return False

class AnalyticsService:
    """Handles user analytics"""
    
    @staticmethod
    def track_user_action(user_id: str, action: str, metadata: Optional[Dict] = None):
        """Track user actions with timestamps"""
        now = datetime.now()
        date_key = now.strftime("%Y-%m-%d")
        hour_key = now.strftime("%Y-%m-%d:%H")
        
        pipe = redis_client.pipeline()
        
        # Track daily actions
        pipe.hincrby(f"analytics:daily:{date_key}", f"{action}:{user_id}", 1)
        
        # Track hourly actions for more granular analysis
        pipe.hincrby(f"analytics:hourly:{hour_key}", f"{action}:{user_id}", 1)
        
        # Store action metadata if provided
        if metadata:
            pipe.lpush(
                f"analytics:actions:{user_id}",
                json.dumps({
                    'action': action,
                    'timestamp': now.isoformat(),
                    **metadata
                })
            )
            # Keep only last 100 actions
            pipe.ltrim(f"analytics:actions:{user_id}", 0, 99)
        
        pipe.execute()
    
    @staticmethod
    def get_user_stats(user_id: str, date: Optional[str] = None) -> Dict[str, int]:
        """Get user statistics for a specific date"""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        stats = redis_client.hgetall(f"analytics:daily:{date}")
        return {
            k.split(':')[0]: int(v)
            for k, v in stats.items()
            if k.endswith(f":{user_id}")
        }
    
    @staticmethod
    def get_action_history(user_id: str, limit: int = 10) -> list:
        """Get user's recent action history"""
        actions = redis_client.lrange(f"analytics:actions:{user_id}", 0, limit - 1)
        return [json.loads(action) for action in actions]