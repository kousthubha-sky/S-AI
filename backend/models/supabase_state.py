# models/supabase_state.py
from datetime import datetime, timedelta
from models.payment import UserUsage
from typing import Optional

# Import the Supabase database service
from services.supabase_database import db

# models/supabase_state.py - UPDATE THESE FUNCTIONS:

# models/supabase_state.py - FIX THE DATETIME COMPARISON

async def get_user_usage(user_id: str) -> UserUsage:
    """Get or create user usage record with reset logic"""
    try:
        print(f"🔍 Getting usage for user: {user_id}")
        
        # Get user from database
        user = await db.get_user_by_auth0_id(user_id)
        
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
        
        print(f"👤 Found user: {user['id']} - {user['email']}")
        print(f"📊 User subscription_tier from DB: {user.get('subscription_tier')}")
        print(f"💳 User is_paid from DB: {user.get('is_paid')}")
        
        # Get usage statistics from user_usage table
        usage_data = await db.get_user_usage(user['id'])
        print(f"📈 Usage data: {usage_data}")
        
        # Get active subscription from subscriptions table
        subscription = await db.get_active_subscription(user['id'])
        print(f"📜 Active subscription: {subscription}")
        
        # ✅ FIX: Determine subscription status with proper validation
        is_paid = False
        subscription_tier = user.get('subscription_tier', 'free')
        subscription_end_date = None
        
        # Check subscription from subscriptions table
        if subscription and subscription.get('status') == 'active':
            print(f"✅ Active subscription found")
            end_date_str = subscription.get('current_end')
            
            if end_date_str:
                try:
                    subscription_end_date = datetime.fromisoformat(end_date_str)
                    print(f"📅 Subscription end date: {subscription_end_date}")
                    
                    # ✅ FIX: Make both datetimes timezone-aware for comparison
                    from datetime import timezone
                    now_aware = datetime.now(timezone.utc)
                    
                    # If subscription_end_date is naive, make it aware
                    if subscription_end_date.tzinfo is None:
                        subscription_end_date = subscription_end_date.replace(tzinfo=timezone.utc)
                    
                    # Check if subscription is still valid
                    if subscription_end_date > now_aware:
                        is_paid = True
                        subscription_tier = user.get('subscription_tier', 'pro')
                        print(f"✅ Subscription is valid and active")
                    else:
                        print(f"⚠️ Subscription expired on {subscription_end_date}")
                        # Subscription expired - update user to free tier
                        await db.update_user(user['auth0_id'], {
                            'subscription_tier': 'free',
                            'is_paid': False,
                            'subscription_end_date': None
                        })
                        subscription_tier = 'free'
                        is_paid = False
                except ValueError as e:
                    print(f"❌ Error parsing date: {e}")
        else:
            print(f"ℹ️ No active subscription found")
        
        # ✅ Also check user table subscription status (backup check)
        if not is_paid and user.get('is_paid'):
            user_end_date_str = user.get('subscription_end_date')
            if user_end_date_str:
                try:
                    user_end_date = datetime.fromisoformat(user_end_date_str)
                    # Make timezone-aware comparison
                    now_aware = datetime.now(timezone.utc)
                    if user_end_date.tzinfo is None:
                        user_end_date = user_end_date.replace(tzinfo=timezone.utc)
                    
                    if user_end_date > now_aware:
                        is_paid = True
                        subscription_tier = user.get('subscription_tier', 'pro')
                        subscription_end_date = user_end_date
                        print(f"✅ Using subscription status from users table")
                except ValueError:
                    pass
        
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
        
        print(f"📊 Final usage result:")
        print(f"  - is_paid: {result.is_paid}")
        print(f"  - subscription_tier: {result.subscription_tier}")
        print(f"  - subscription_end_date: {result.subscription_end_date}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error getting user usage: {e}")
        import traceback
        traceback.print_exc()
        
        # Return default free tier usage on error
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
    
# Add this function to your supabase_state.py

# Add this function to your main.py or supabase_state.py

async def sync_all_user_subscriptions():
    """Sync subscription status for all users - run this once to fix data"""
    try:
        # Get all users
        response = db.client.table('users').select('*').execute()
        users = response.data
        
        for user in users:
            user_id = user['auth0_id']
            print(f"🔄 Syncing subscription for user: {user_id}")
            
            # Get active subscription
            subscription = await db.get_active_subscription(user['id'])
            
            if subscription and subscription.get('status') == 'active':
                end_date_str = subscription.get('current_end')
                if end_date_str:
                    from datetime import timezone
                    end_date = datetime.fromisoformat(end_date_str)
                    now_aware = datetime.now(timezone.utc)
                    
                    if end_date.tzinfo is None:
                        end_date = end_date.replace(tzinfo=timezone.utc)
                    
                    if end_date > now_aware:
                        # Update user table
                        await db.update_user(user_id, {
                            'subscription_tier': 'pro',
                            'is_paid': True,
                            'subscription_end_date': end_date_str
                        })
                        
                        # Update user_usage table
                        month_year = datetime.now().strftime("%Y-%m")
                        db.client.table('user_usage').update({
                            'is_paid': True,
                            'subscription_tier': 'pro',
                            'subscription_end_date': end_date_str
                        }).eq('user_id', user['id']).eq('month_year', month_year).execute()
                        
                        print(f"✅ Updated user {user_id} to pro tier")
            
        print("🎉 All user subscriptions synced!")
        
    except Exception as e:
        print(f"❌ Error syncing subscriptions: {e}")