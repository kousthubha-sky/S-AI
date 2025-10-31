# models/supabase_state.py
from datetime import datetime, timedelta
from models.payment import UserUsage
from typing import Optional

# Import the Supabase database service
from services.supabase_database import db

# models/supabase_state.py - UPDATE THESE FUNCTIONS:

async def get_user_usage(user_id: str) -> UserUsage:
    """Get or create user usage record with reset logic"""
    try:
        # Get user from database
        user = await db.get_user_by_auth0_id(user_id)
        
        if not user:
            # User doesn't exist, return default usage
            return UserUsage(
                user_id=user_id,
                prompt_count=0,
                daily_message_count=0,
                last_reset_date=datetime.now(),
                is_paid=False,
                subscription_tier='free',  # Default to free
                subscription_end_date=None
            )
        
        # Get usage statistics - NOW USES user_usage TABLE
        usage_data = await db.get_user_usage(user['id'])
        
        # Get active subscription
        subscription = await db.get_active_subscription(user['id'])
        
        # Determine if user is paid
        is_paid = False
        subscription_tier = user.get('subscription_tier', 'free')
        subscription_end_date = user.get('subscription_end_date')
        
        if subscription:
            subscription_end_date = datetime.fromisoformat(subscription['current_end']) if subscription.get('current_end') else None
            
            # Check if subscription is still valid
            if subscription_end_date and subscription_end_date > datetime.now():
                is_paid = True
                subscription_tier = user.get('subscription_tier', 'pro')
        
        return UserUsage(
            user_id=user_id,
            prompt_count=usage_data.get('total_message_count', 0),
            daily_message_count=usage_data.get('daily_message_count', 0),
            last_reset_date=datetime.fromisoformat(usage_data.get('last_reset_date', datetime.now().isoformat())),
            is_paid=is_paid,
            subscription_tier=subscription_tier,
            subscription_end_date=subscription_end_date
        )
        
    except Exception as e:
        print(f"Error getting user usage: {e}")
        # Return default usage on error
        return UserUsage(
            user_id=user_id,
            prompt_count=0,
            daily_message_count=0,
            last_reset_date=datetime.now(),
            is_paid=False,
            subscription_tier='free',
            subscription_end_date=None
        )
        
async def check_message_limit(user_id: str) -> bool:
    """Check if user has reached their daily message limit"""
    try:
        usage = await get_user_usage(user_id)
        
        # Pro users have unlimited messages
        if usage.subscription_tier in ['pro', 'basic']:
            return True
        
        # Free users have a daily limit
        FREE_TIER_DAILY_LIMIT = 25
        return usage.daily_message_count < FREE_TIER_DAILY_LIMIT
        
    except Exception as e:
        print(f"Error checking message limit: {e}")
        return False

async def increment_message_count(user_id: str, token_count: int = 0):
    """Increment user's message count"""
    try:
        # Get user
        user = await db.get_user_by_auth0_id(user_id)
        
        if user:
            await db.increment_usage(user['id'], message_count=1, token_count=token_count)
        
    except Exception as e:
        print(f"Error incrementing message count: {e}")

async def get_next_reset_time(user_id: str) -> datetime:
    """Get the next reset time for user's daily limit"""
    try:
        usage = await get_user_usage(user_id)
        
        if usage.last_reset_date:
            next_reset = usage.last_reset_date + timedelta(days=1)
        else:
            next_reset = datetime.now() + timedelta(days=1)
        
        return next_reset.replace(hour=0, minute=0, second=0, microsecond=0)
        
    except Exception as e:
        print(f"Error getting next reset time: {e}")
        return datetime.now() + timedelta(days=1)

async def update_user_subscription(user_id: str, tier: str, is_paid: bool, end_date: datetime):
    """Update user subscription information"""
    try:
        # Get user
        user = await db.get_user_by_auth0_id(user_id)
        
        if user:
            # Update user subscription status
            await db.update_user(user_id, {
                'subscription_tier': tier,
                'subscription_end_date': end_date.isoformat() if end_date else None
            })
        
    except Exception as e:
        print(f"Error updating subscription: {e}")

async def get_user_by_id(user_id: str):
    """Get user by auth0 ID"""
    try:
        return await db.get_user_by_auth0_id(user_id)
    except Exception as e:
        print(f"Error getting user: {e}")
        return None

async def create_user_if_not_exists(auth0_user_data: dict):
    """Create user if they don't exist"""
    try:
        user = await db.get_user_by_auth0_id(auth0_user_data['sub'])
        
        if not user:
            user_data = {
                'auth0_id': auth0_user_data['sub'],
                'email': auth0_user_data.get('email', ''),
                'name': auth0_user_data.get('name'),
                'picture': auth0_user_data.get('picture'),
                'subscription_tier': 'free'
            }
            user = await db.create_user(user_data)
        
        return user
        
    except Exception as e:
        print(f"Error creating user: {e}")
        return None