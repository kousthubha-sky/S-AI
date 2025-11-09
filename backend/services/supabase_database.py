# services/supabase_database.py
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from supabase import create_client, Client
from functools import lru_cache
import os

class SupabaseService:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not configured")
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    # Remove the @lru_cache() method as it's not needed
    
    def get_user_tier(self, user_id: str) -> str:  # REMOVED async
        """Get user's subscription tier and validate it"""
        try:
            # First get user data - REMOVED await
            user = self.get_user_by_auth0_id(user_id)
            if not user:
                return 'free'
            
            # Get subscription data
            response = self.client.table('subscriptions').select('*').eq('user_id', user['id']).eq('status', 'active').execute()
            active_subscription = response.data[0] if response.data else None
            
            # Verify subscription is valid
            if active_subscription:
                end_date = datetime.fromisoformat(active_subscription['current_end'])
                if end_date > datetime.now():
                    return user.get('subscription_tier', 'free')
            
            # If no active subscription or expired, ensure user is set to free tier
            if user.get('subscription_tier') != 'free':
                self.update_user(user_id, {'subscription_tier': 'free', 'is_paid': False})  # REMOVED await
            
            return 'free'
            
        except Exception as e:
            print(f"Error getting user tier: {str(e)}")
            return 'free'

    def get_user_usage(self, user_id: str) -> Dict:  # REMOVED async
        """Get user usage data"""
        try:
            # Get user data first - REMOVED await
            user = self.get_user_by_auth0_id(user_id)
            if not user:
                return {
                    'daily_message_count': 0,
                    'total_message_count': 0,
                    'last_reset_date': datetime.now().isoformat(),
                    'subscription_tier': 'free',
                    'is_paid': False,
                    'subscription_end_date': None
                }

            # Get current month's usage
            month_year = datetime.now().strftime("%Y-%m")
            response = self.client.table('user_usage').select('*').eq('user_id', user['id']).eq('month_year', month_year).execute()
            usage = response.data[0] if response.data else {}

            # Get subscription status
            sub_response = self.client.table('subscriptions').select('*').eq('user_id', user['id']).eq('status', 'active').execute()
            active_subscription = sub_response.data[0] if sub_response.data else None

            # Determine if subscription is valid
            is_paid = False
            subscription_tier = 'free'
            subscription_end_date = None

            if active_subscription:
                end_date = datetime.fromisoformat(active_subscription['current_end'])
                if end_date > datetime.now():
                    is_paid = True
                    subscription_tier = user.get('subscription_tier', 'free')
                    subscription_end_date = end_date
                else:
                    # Update user to free tier if subscription expired
                    self.update_user(user['auth0_id'], {  # REMOVED await
                        'subscription_tier': 'free',
                        'is_paid': False,
                        'subscription_end_date': None
                    })

            return {
                'daily_message_count': usage.get('daily_message_count', 0),
                'total_message_count': usage.get('total_message_count', 0),
                'last_reset_date': usage.get('last_reset_date', datetime.now().isoformat()),
                'subscription_tier': subscription_tier,
                'is_paid': is_paid,
                'subscription_end_date': subscription_end_date.isoformat() if subscription_end_date else None
            }

        except Exception as e:
            print(f"Error getting user usage: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get usage: {str(e)}"
            )

    # ==================== User Management ====================
    def get_user_by_auth0_id(self, auth0_id: str) -> Optional[Dict]:  # REMOVED async
        """Get user by Auth0 ID"""
        try:
            response = self.client.table('users').select('*').eq('auth0_id', auth0_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user by auth0_id: {str(e)}")
            return None

    def create_user(self, user_data: Dict) -> Dict:  # REMOVED async
        """Create a new user"""
        try:
            # Check if user exists - REMOVED await
            existing = self.get_user_by_auth0_id(user_data['auth0_id'])
            if existing:
                return existing
            
            # Map to your Supabase schema
            supabase_user_data = {
                "auth0_id": user_data['auth0_id'],
                "email": user_data.get('email', ''),
                "name": user_data.get('name'),
                "subscription_tier": user_data.get('subscription_tier', 'free'),
                "is_paid": user_data.get('is_paid', False),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Create user
            response = self.client.table('users').insert(supabase_user_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            user = response.data[0]
            
            # Initialize usage tracking for current month
            self.initialize_usage_tracking(user['id'])  # REMOVED await
            
            return user
            
        except Exception as e:
            print(f"Error creating user: {str(e)}")
            # If user already exists or other error, try to return existing
            existing = self.get_user_by_auth0_id(user_data['auth0_id'])  # REMOVED await
            if existing:
                return existing
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    def update_user(self, auth0_id: str, update_data: Dict) -> Dict:  # REMOVED async
        """Update user data"""
        try:
            response = self.client.table('users').update(update_data).eq('auth0_id', auth0_id).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return response.data[0]
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    # ==================== Usage Tracking ====================
    def initialize_usage_tracking(self, user_id: str):  # REMOVED async
        """Initialize usage tracking for a user"""
        try:
            month_year = datetime.now().strftime("%Y-%m")
            
            usage_data = {
                'user_id': user_id,
                'month_year': month_year,
                'daily_message_count': 0,
                'total_message_count': 0,
                'daily_token_count': 0,
                'total_token_count': 0,
                'last_reset_date': datetime.now().isoformat(),
                'is_paid': False,
                'subscription_tier': 'free',
                'subscription_end_date': None
            }
            
            self.client.table('user_usage').upsert(usage_data).execute()
            
        except Exception as e:
            print(f"Failed to initialize usage tracking: {e}")

    def get_user_usage(self, user_id: str) -> Dict:  # REMOVED async
        """Get user usage statistics"""
        try:
            month_year = datetime.now().strftime("%Y-%m")
            
            response = self.client.table('user_usage').select('*').eq('user_id', user_id).eq('month_year', month_year).execute()
            
            if not response.data:
                # Initialize if doesn't exist
                self.initialize_usage_tracking(user_id)  # REMOVED await
                response = self.client.table('user_usage').select('*').eq('user_id', user_id).eq('month_year', month_year).execute()
            
            usage = response.data[0] if response.data else {}
            
            # Check if daily reset is needed
            last_reset = datetime.fromisoformat(usage.get('last_reset_date', datetime.now().isoformat()))
            now = datetime.now()
            
            if last_reset.date() < now.date():
                # Reset daily counts
                update_data = {
                    'daily_message_count': 0,
                    'daily_token_count': 0,
                    'last_reset_date': now.isoformat()
                }
                self.client.table('user_usage').update(update_data).eq('user_id', user_id).eq('month_year', month_year).execute()
                usage.update(update_data)
            
            return usage
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get usage: {str(e)}"
            )

    def increment_usage(self, user_id: str, message_count: int = 1, token_count: int = 0):  # REMOVED async
        """Increment usage counters"""
        try:
            month_year = datetime.now().strftime("%Y-%m")
            
            # Get current usage - REMOVED await
            usage = self.get_user_usage(user_id)
            
            # Increment counts
            update_data = {
                'daily_message_count': usage['daily_message_count'] + message_count,
                'total_message_count': usage['total_message_count'] + message_count,
                'daily_token_count': usage['daily_token_count'] + token_count,
                'total_token_count': usage['total_token_count'] + token_count
            }
            
            self.client.table('user_usage').update(update_data).eq('user_id', user_id).eq('month_year', month_year).execute()
            
        except Exception as e:
            print(f"Failed to increment usage: {e}")

    # ==================== Subscription Management ====================
    def create_subscription(self, subscription_data: Dict) -> Dict:  # REMOVED async
        """Create a new subscription record"""
        try:
            response = self.client.table('subscriptions').insert(subscription_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create subscription"
                )
            
            return response.data[0]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Subscription error: {str(e)}"
            )

    def update_subscription(self, razorpay_subscription_id: str, update_data: Dict) -> Dict:  # REMOVED async
        """Update subscription status"""
        try:
            response = self.client.table('subscriptions').update(update_data).eq('razorpay_subscription_id', razorpay_subscription_id).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Subscription not found"
                )
            
            return response.data[0]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Subscription error: {str(e)}"
            )

    def get_active_subscription(self, user_id: str) -> Optional[Dict]:  # REMOVED async
        """Get user's active subscription"""
        try:
            response = self.client.table('subscriptions').select('*').eq('user_id', user_id).eq('status', 'active').execute()
            
            return response.data[0] if response.data else None
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get subscription: {str(e)}"
            )

    # ==================== Chat Management ====================
    def create_chat_session(self, session_data: Dict) -> Dict:  # REMOVED async
        """Create a new chat session"""
        try:
            response = self.client.table('chat_sessions').insert(session_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create chat session"
                )
            
            return response.data[0]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Chat error: {str(e)}"
            )

    def get_chat_sessions(self, user_id: str, limit: int = 50) -> List[Dict]:  # REMOVED async
        """Get user's chat sessions"""
        try:
            response = self.client.table('chat_sessions').select('*').eq('user_id', user_id).order('updated_at', desc=True).limit(limit).execute()
            
            return response.data or []
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get chat sessions: {str(e)}"
            )

    def update_chat_session(self, session_id: str, update_data: Dict):  # REMOVED async
        """Update chat session"""
        try:
            self.client.table('chat_sessions').update(update_data).eq('id', session_id).execute()
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update session: {str(e)}"
            )

    def delete_chat_session(self, session_id: str):  # REMOVED async
        """Delete a chat session and its messages"""
        try:
            # Messages will be cascade deleted
            self.client.table('chat_sessions').delete().eq('id', session_id).execute()
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete session: {str(e)}"
            )

    def create_chat_message(self, message_data: Dict) -> Dict:  # REMOVED async
        """Create a new chat message"""
        try:
            response = self.client.table('chat_messages').insert(message_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create message"
                )
            
            # Update session's updated_at
            self.client.table('chat_sessions').update({'updated_at': datetime.now().isoformat()}).eq('id', message_data['session_id']).execute()
            
            return response.data[0]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create message: {str(e)}"
            )

    def get_chat_messages(self, session_id: str) -> List[Dict]:  # REMOVED async
        """Get messages for a chat session"""
        try:
            response = self.client.table('chat_messages').select('*').eq('session_id', session_id).order('created_at', desc=False).execute()
            
            return response.data or []
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get messages: {str(e)}"
            )

    # ==================== Payment Transactions ====================
    def create_payment_transaction(self, transaction_data: Dict) -> Dict:  # REMOVED async
        """Record a payment transaction"""
        try:
            response = self.client.table('payment_transactions').insert(transaction_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to record transaction"
                )
            
            return response.data[0]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Transaction error: {str(e)}"
            )

    def get_payment_transactions(self, user_id: str) -> List[Dict]:  # REMOVED async
        """Get user's payment history"""
        try:
            response = self.client.table('payment_transactions').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            return response.data or []
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get transactions: {str(e)}"
            )
            
    def create_security_event(self, event_data: Dict) -> Dict:  # REMOVED async
        """Log a security event"""
        try:
            response = self.client.table('security_events').insert(event_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create security event"
                )
            
            return response.data[0]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Security event error: {str(e)}"
            )

    def get_user_security_events(self, user_id: str, limit: int = 50) -> List[Dict]:  # REMOVED async
        """Get user's security events"""
        try:
            response = self.client.table('security_events')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('timestamp', desc=True)\
                .limit(limit)\
                .execute()
            
            return response.data or []
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get security events: {str(e)}"
            )

    def check_email_exists(self, email: str) -> bool:  # REMOVED async
        """Check if email exists"""
        try:
            response = self.client.table('users').select('id').eq('email', email).execute()
            return len(response.data) > 0
        except:
            return False

# Create singleton instance
db = SupabaseService()