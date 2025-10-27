# state.py
from typing import Dict
from datetime import datetime, timedelta
from models.payment import UserUsage

# Constants
FREE_TIER_DAILY_LIMIT = 500

# In-memory storage for user usage (replace with database in production)
user_usage: Dict[str, UserUsage] = {}

def get_user_usage(user_id: str) -> UserUsage:
    """Get or create user usage record with reset logic"""
    if user_id not in user_usage:
        user_usage[user_id] = UserUsage(
            user_id=user_id,
            prompt_count=0,
            daily_message_count=0,
            last_reset_date=datetime.now(),
            is_paid=False
        )
    
    user = user_usage[user_id]
    
    # Check if we need to reset daily count
    if user.last_reset_date:
        now = datetime.now()
        next_reset = user.last_reset_date + timedelta(days=1)
        next_reset = next_reset.replace(hour=0, minute=0, second=0, microsecond=0)
        
        if now >= next_reset:
            user.daily_message_count = 0
            user.last_reset_date = now
    
    return user

def check_message_limit(user_id: str) -> bool:
    """Check if user has reached their daily message limit"""
    user = get_user_usage(user_id)
    
    # Pro users have unlimited messages
    if user.subscription_tier == "pro":
        return True
    
    # Free users have a daily limit
    return user.daily_message_count < FREE_TIER_DAILY_LIMIT

def increment_message_count(user_id: str):
    """Increment user's message count"""
    user = get_user_usage(user_id)
    user.daily_message_count += 1
    user.prompt_count += 1

def get_next_reset_time(user_id: str) -> datetime:
    """Get the next reset time for user's daily limit"""
    user = get_user_usage(user_id)
    if not user.last_reset_date:
        return datetime.now() + timedelta(days=1)
    
    next_reset = user.last_reset_date + timedelta(days=1)
    return next_reset.replace(hour=0, minute=0, second=0, microsecond=0)