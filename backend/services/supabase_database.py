# services/supabase_database.py - FIXED VERSION
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from supabase import create_client, Client
import os

class SupabaseService:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not configured")
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    def get_user_by_auth0_id(self, auth0_id: str) -> Optional[Dict]:
        """Get user by Auth0 ID"""
        try:
            response = self.client.table('users').select('*').eq('auth0_id', auth0_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user by auth0_id: {str(e)}")
            return None

    def create_user(self, user_data: Dict) -> Dict:
        """Create a new user"""
        try:
            # Check if user exists
            existing = self.get_user_by_auth0_id(user_data['auth0_id'])
            if existing:
                print(f"User already exists: {existing['id']}")
                return existing
            
            # Map to Supabase schema
            supabase_user_data = {
                "auth0_id": user_data['auth0_id'],
                "email": user_data.get('email', ''),
                "name": user_data.get('name', 'User'),
                "subscription_tier": user_data.get('subscription_tier', 'free'),
                "is_paid": user_data.get('is_paid', False),
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            print(f"Creating user with data: {supabase_user_data}")
            
            # Create user
            response = self.client.table('users').insert(supabase_user_data).execute()
            
            if not response.data:
                print(f"Failed to create user - no data returned")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            user = response.data[0]
            print(f"✅ User created successfully: {user['id']}")
            
            # Initialize usage tracking for current month
            self.initialize_usage_tracking(user['id'])
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error creating user: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Try to return existing user
            existing = self.get_user_by_auth0_id(user_data['auth0_id'])
            if existing:
                return existing
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    def update_user(self, auth0_id: str, update_data: Dict) -> Dict:
        """Update user data"""
        try:
            update_data['updated_at'] = datetime.now().isoformat()
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

    def initialize_usage_tracking(self, user_id: str):
        """Initialize usage tracking for a user"""
        try:
            month_year = datetime.now().strftime("%Y-%m")
            
            # Check if exists first
            existing = self.client.table('user_usage').select('*').eq('user_id', user_id).eq('month_year', month_year).execute()
            
            if existing.data:
                print(f"Usage tracking already exists for user {user_id}")
                return
            
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
            
            self.client.table('user_usage').insert(usage_data).execute()
            print(f"✅ Usage tracking initialized for user {user_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to initialize usage tracking: {e}")

    def get_user_usage(self, user_id: str) -> Dict:
        """Get user usage statistics"""
        try:
            month_year = datetime.now().strftime("%Y-%m")
            
            response = self.client.table('user_usage').select('*').eq('user_id', user_id).eq('month_year', month_year).execute()
            
            if not response.data:
                self.initialize_usage_tracking(user_id)
                response = self.client.table('user_usage').select('*').eq('user_id', user_id).eq('month_year', month_year).execute()
            
            usage = response.data[0] if response.data else {}
            
            # Check if daily reset is needed
            last_reset = datetime.fromisoformat(usage.get('last_reset_date', datetime.now().isoformat()))
            now = datetime.now()
            
            if last_reset.date() < now.date():
                update_data = {
                    'daily_message_count': 0,
                    'daily_token_count': 0,
                    'last_reset_date': now.isoformat()
                }
                self.client.table('user_usage').update(update_data).eq('user_id', user_id).eq('month_year', month_year).execute()
                usage.update(update_data)
            
            return usage
            
        except Exception as e:
            print(f"Error getting usage: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get usage: {str(e)}"
            )

    def increment_usage(self, user_id: str, message_count: int = 1, token_count: int = 0):
        """Increment usage counters"""
        try:
            month_year = datetime.now().strftime("%Y-%m")
            usage = self.get_user_usage(user_id)
            
            update_data = {
                'daily_message_count': usage['daily_message_count'] + message_count,
                'total_message_count': usage['total_message_count'] + message_count,
                'daily_token_count': usage['daily_token_count'] + token_count,
                'total_token_count': usage['total_token_count'] + token_count
            }
            
            self.client.table('user_usage').update(update_data).eq('user_id', user_id).eq('month_year', month_year).execute()
            
        except Exception as e:
            print(f"Failed to increment usage: {e}")

    def create_subscription(self, subscription_data: Dict) -> Dict:
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

    def update_subscription(self, razorpay_subscription_id: str, update_data: Dict) -> Dict:
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

    def get_active_subscription(self, user_id: str) -> Optional[Dict]:
        """Get user's active subscription"""
        try:
            response = self.client.table('subscriptions').select('*').eq('user_id', user_id).eq('status', 'active').execute()
            return response.data[0] if response.data else None
            
        except Exception as e:
            print(f"Error getting subscription: {str(e)}")
            return None

    def create_chat_session(self, session_data: Dict) -> Dict:
        """Create a new chat session"""
        try:
            session_data['created_at'] = datetime.now().isoformat()
            session_data['updated_at'] = datetime.now().isoformat()
            
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

    def get_chat_sessions(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get user's chat sessions"""
        try:
            response = self.client.table('chat_sessions').select('*').eq('user_id', user_id).order('updated_at', desc=True).limit(limit).execute()
            return response.data or []
            
        except Exception as e:
            print(f"Error getting sessions: {str(e)}")
            return []

    def update_chat_session(self, session_id: str, update_data: Dict):
        """Update chat session"""
        try:
            update_data['updated_at'] = datetime.now().isoformat()
            self.client.table('chat_sessions').update(update_data).eq('id', session_id).execute()
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update session: {str(e)}"
            )

    def delete_chat_session(self, session_id: str):
        """Delete a chat session and its messages"""
        try:
            self.client.table('chat_sessions').delete().eq('id', session_id).execute()
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete session: {str(e)}"
            )

    def create_chat_message(self, message_data: Dict) -> Dict:
        """Create a new chat message"""
        try:
            message_data['created_at'] = datetime.now().isoformat()
            
            response = self.client.table('chat_messages').insert(message_data).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create message"
                )
            
            # Update session timestamp
            self.client.table('chat_sessions').update({
                'updated_at': datetime.now().isoformat()
            }).eq('id', message_data['session_id']).execute()
            
            return response.data[0]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create message: {str(e)}"
            )

    def get_chat_messages(self, session_id: str) -> List[Dict]:
        """Get messages for a chat session"""
        try:
            response = self.client.table('chat_messages').select('*').eq('session_id', session_id).order('created_at', desc=False).execute()
            return response.data or []
            
        except Exception as e:
            print(f"Error getting messages: {str(e)}")
            return []

    def create_payment_transaction(self, transaction_data: Dict) -> Dict:
        """Record a payment transaction"""
        try:
            transaction_data['created_at'] = datetime.now().isoformat()
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

    def get_payment_transactions(self, user_id: str) -> List[Dict]:
        """Get user's payment history"""
        try:
            response = self.client.table('payment_transactions').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            return response.data or []
            
        except Exception as e:
            print(f"Error getting transactions: {str(e)}")
            return []

# Create singleton instance
db = SupabaseService()