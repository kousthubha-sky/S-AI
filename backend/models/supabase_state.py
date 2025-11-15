# models/supabase_state.py - FIXED VERSION
from datetime import datetime, timedelta, timezone
from models.payment import UserUsage
from typing import Optional, Dict
from fastapi import HTTPException, status
from services.supabase_database import db

async def get_user_usage(user_id: str) -> UserUsage:
    """Get or create user usage record with reset logic"""
    try:
        print(f"🔍 Getting usage for user: {user_id}")
        
        # Get user from database (NO await)
        user = db.get_user_by_auth0_id(user_id)
        
        if not user:
            print(f"⚠️ User not found, returning default free tier")
            return UserUsage(
                user_id=user_id,
                prompt_count=0,
                daily_message_count=0,
                last_reset_date=datetime.now(),
                is_paid=False,
                subscription_tier='free',
                subscription_end_date=None
            )
        
        # Get usage statistics (NO await)
        usage_data = db.get_user_usage(user['id'])
        
        # Determine subscription status - FIXED LOGIC
        is_paid = False
        subscription_tier = user.get('subscription_tier', 'free')
        subscription_end_date = None
        
        # ✅ PRIMARY: Check if subscription record exists and is active
        subscription = db.get_active_subscription(user['id'])
        
        if subscription and subscription.get('status') == 'active':
            end_date_str = subscription.get('current_end')
            
            if end_date_str:
                try:
                    subscription_end_date = datetime.fromisoformat(end_date_str)
                    now_aware = datetime.now(timezone.utc)
                    
                    if subscription_end_date.tzinfo is None:
                        subscription_end_date = subscription_end_date.replace(tzinfo=timezone.utc)
                    
                    if subscription_end_date > now_aware:
                        is_paid = True
                        subscription_tier = subscription.get('tier', user.get('subscription_tier', 'pro'))
                        print(f"✅ Active subscription found: tier={subscription_tier}, expires={subscription_end_date}")
                    else:
                        print(f"⚠️ Subscription expired: {subscription_end_date}")
                        # Update user record to reflect expired subscription
                        db.update_user(user['auth0_id'], {
                            'subscription_tier': 'free',
                            'is_paid': False,
                            'subscription_end_date': None
                        })
                        subscription_tier = 'free'
                        is_paid = False
                except ValueError as e:
                    print(f"❌ Error parsing subscription date: {e}")
        
        # ✅ FALLBACK: Check users table if no active subscription record
        if not is_paid and user.get('is_paid'):
            user_end_date_str = user.get('subscription_end_date')
            print(f"📋 User table shows: is_paid={user.get('is_paid')}, tier={user.get('subscription_tier')}, end_date={user_end_date_str}")
            
            if user_end_date_str:
                try:
                    user_end_date = datetime.fromisoformat(user_end_date_str)
                    now_aware = datetime.now(timezone.utc)
                    
                    if user_end_date.tzinfo is None:
                        user_end_date = user_end_date.replace(tzinfo=timezone.utc)
                    
                    if user_end_date > now_aware:
                        is_paid = True
                        subscription_tier = user.get('subscription_tier', 'pro')
                        subscription_end_date = user_end_date
                        print(f"✅ Valid subscription in users table: tier={subscription_tier}, expires={subscription_end_date}")
                    else:
                        print(f"⚠️ Subscription in users table is expired")
                except ValueError as e:
                    print(f"❌ Error parsing user table date: {e}")
        
        # ✅ Use tier from users table as ultimate source of truth
        if is_paid:
            subscription_tier = user.get('subscription_tier', subscription_tier)
            print(f"📊 FINAL RESULT: is_paid=True, tier={subscription_tier}")
        else:
            subscription_tier = 'free'
            print(f"📊 FINAL RESULT: is_paid=False, tier=free")
        
        result = UserUsage(
            user_id=user_id,
            prompt_count=usage_data.get('total_message_count', 0),
            daily_message_count=usage_data.get('daily_message_count', 0),
            last_reset_date=datetime.fromisoformat(
                usage_data.get('last_reset_date', datetime.now().isoformat())
            ),
            is_paid=is_paid,
            subscription_tier=subscription_tier,
            subscription_end_date=subscription_end_date
        )
        
        print(f"✅ Returning UserUsage: tier={result.subscription_tier}, is_paid={result.is_paid}")
        return result
        
    except Exception as e:
        print(f"❌ Error getting user usage: {e}")
        import traceback
        traceback.print_exc()
        
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
        
        if usage.subscription_tier in ['pro', 'basic']:
            return True
        
        FREE_TIER_DAILY_LIMIT = 25
        return usage.daily_message_count < FREE_TIER_DAILY_LIMIT
        
    except Exception as e:
        print(f"Error checking message limit: {e}")
        return False

async def increment_message_count(user_id: str, token_count: int = 0):
    """Increment user's message count"""
    try:
        # Get user (NO await)
        user = db.get_user_by_auth0_id(user_id)
        
        if user:
            # Increment usage (NO await)
            db.increment_usage(user['id'], message_count=1, token_count=token_count)
        
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
        # Get user (NO await)
        user = db.get_user_by_auth0_id(user_id)
        
        if user:
            # Update user (NO await)
            db.update_user(user_id, {
                'subscription_tier': tier,
                'is_paid': is_paid,
                'subscription_end_date': end_date.isoformat() if end_date else None
            })
        
    except Exception as e:
        print(f"Error updating subscription: {e}")

async def get_user_by_id(user_id: str):
    """Get user by auth0 ID"""
    try:
        # NO await
        return db.get_user_by_auth0_id(user_id)
    except Exception as e:
        print(f"Error getting user: {e}")
        return None

async def create_user_if_not_exists(auth0_user_data: dict):
    """Create user if they don't exist"""
    try:
        # NO await
        user = db.get_user_by_auth0_id(auth0_user_data['sub'])
        
        if not user:
            user_data = {
                'auth0_id': auth0_user_data['sub'],
                'email': auth0_user_data.get('email', ''),
                'name': auth0_user_data.get('name', 'User'),
                'picture': auth0_user_data.get('picture'),
                'subscription_tier': 'free'
            }
            # NO await
            user = db.create_user(user_data)
        
        return user
        
    except Exception as e:
        print(f"Error creating user: {e}")
        import traceback
        traceback.print_exc()
        return None