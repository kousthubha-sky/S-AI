# state.py
import json
from datetime import datetime, timedelta
from models.payment import UserUsage
from redis_config import redis_client

# Constants
FREE_TIER_DAILY_LIMIT = 500
USER_KEY_PREFIX = "user:"
DAILY_COUNT_SUFFIX = ":daily_count"
TOTAL_COUNT_SUFFIX = ":total_count"
LAST_RESET_SUFFIX = ":last_reset"
SUBSCRIPTION_SUFFIX = ":subscription"

def _get_user_key(user_id: str, suffix: str = "") -> str:
    """Generate Redis key for user data"""
    return f"{USER_KEY_PREFIX}{user_id}{suffix}"

def get_user_usage(user_id: str) -> UserUsage:
    """Get or create user usage record with reset logic"""
    if not redis_client:
        # Fallback to in-memory storage if Redis is not available
        from models.state_fallback import user_usage, get_user_usage_fallback
        return get_user_usage_fallback(user_id)
    
    try:
        # Get all user data from Redis
        pipe = redis_client.pipeline()
        pipe.get(_get_user_key(user_id, DAILY_COUNT_SUFFIX))
        pipe.get(_get_user_key(user_id, TOTAL_COUNT_SUFFIX))
        pipe.get(_get_user_key(user_id, LAST_RESET_SUFFIX))
        pipe.hgetall(_get_user_key(user_id, SUBSCRIPTION_SUFFIX))
        daily_count, total_count, last_reset_str, subscription_data = pipe.execute()

        # Convert from Redis types and provide defaults
        daily_count = int(daily_count or 0)
        total_count = int(total_count or 0)
        last_reset = datetime.fromisoformat(last_reset_str) if last_reset_str else datetime.now()

        # Check if we need to reset daily count
        now = datetime.now()
        next_reset = last_reset + timedelta(days=1)
        next_reset = next_reset.replace(hour=0, minute=0, second=0, microsecond=0)

        if now >= next_reset:
            daily_count = 0
            last_reset = now
            # Update Redis with reset values
            pipe = redis_client.pipeline()
            pipe.set(_get_user_key(user_id, DAILY_COUNT_SUFFIX), daily_count)
            pipe.set(_get_user_key(user_id, LAST_RESET_SUFFIX), last_reset.isoformat())
            pipe.execute()

        # Parse subscription data
        is_paid = subscription_data.get('is_paid', '0') == '1'
        subscription_tier = subscription_data.get('tier')
        subscription_end_date = None
        if subscription_data.get('end_date'):
            subscription_end_date = datetime.fromisoformat(subscription_data.get('end_date'))

        # Create UserUsage object
        return UserUsage(
            user_id=user_id,
            prompt_count=total_count,
            daily_message_count=daily_count,
            last_reset_date=last_reset,
            is_paid=is_paid,
            subscription_tier=subscription_tier,
            subscription_end_date=subscription_end_date
        )
        
    except Exception as e:
        print(f"Redis error, falling back to memory: {e}")
        from models.state_fallback import user_usage, get_user_usage_fallback
        return get_user_usage_fallback(user_id)

def check_message_limit(user_id: str) -> bool:
    """Check if user has reached their daily message limit"""
    if not redis_client:
        from models.state_fallback import check_message_limit_fallback
        return check_message_limit_fallback(user_id)
    
    try:
        pipe = redis_client.pipeline()
        pipe.get(_get_user_key(user_id, DAILY_COUNT_SUFFIX))
        pipe.hget(_get_user_key(user_id, SUBSCRIPTION_SUFFIX), 'tier')
        daily_count, tier = pipe.execute()

        daily_count = int(daily_count or 0)

        # Pro users have unlimited messages
        if tier == "pro":
            return True

        # Free users have a daily limit
        return daily_count < FREE_TIER_DAILY_LIMIT
        
    except Exception as e:
        print(f"Redis error, falling back to memory: {e}")
        from models.state_fallback import check_message_limit_fallback
        return check_message_limit_fallback(user_id)

def increment_message_count(user_id: str):
    """Increment user's message count"""
    if not redis_client:
        from models.state_fallback import increment_message_count_fallback
        return increment_message_count_fallback(user_id)
    
    try:
        pipe = redis_client.pipeline()
        pipe.incr(_get_user_key(user_id, DAILY_COUNT_SUFFIX))
        pipe.incr(_get_user_key(user_id, TOTAL_COUNT_SUFFIX))
        pipe.execute()
        
    except Exception as e:
        print(f"Redis error, falling back to memory: {e}")
        from models.state_fallback import increment_message_count_fallback
        return increment_message_count_fallback(user_id)

def get_next_reset_time(user_id: str) -> datetime:
    """Get the next reset time for user's daily limit"""
    if not redis_client:
        from models.state_fallback import get_next_reset_time_fallback
        return get_next_reset_time_fallback(user_id)
    
    try:
        last_reset_str = redis_client.get(_get_user_key(user_id, LAST_RESET_SUFFIX))
        
        if not last_reset_str:
            next_reset = datetime.now() + timedelta(days=1)
        else:
            last_reset = datetime.fromisoformat(last_reset_str)
            next_reset = last_reset + timedelta(days=1)
        
        return next_reset.replace(hour=0, minute=0, second=0, microsecond=0)
        
    except Exception as e:
        print(f"Redis error, falling back to memory: {e}")
        from models.state_fallback import get_next_reset_time_fallback
        return get_next_reset_time_fallback(user_id)

def update_user_subscription(user_id: str, tier: str, is_paid: bool, end_date: datetime):
    """Update user subscription information"""
    if not redis_client:
        from models.state_fallback import update_user_subscription_fallback
        return update_user_subscription_fallback(user_id, tier, is_paid, end_date)
    
    try:
        redis_client.hset(
            _get_user_key(user_id, SUBSCRIPTION_SUFFIX),
            mapping={
                'tier': tier,
                'is_paid': '1' if is_paid else '0',
                'end_date': end_date.isoformat()
            }
        )
        
    except Exception as e:
        print(f"Redis error, falling back to memory: {e}")
        from models.state_fallback import update_user_subscription_fallback
        return update_user_subscription_fallback(user_id, tier, is_paid, end_date)