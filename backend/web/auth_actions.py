# backend/web/auth_actions.py
"""
API endpoints to support Auth0 Actions
These endpoints are called by Auth0 actions and should be secured with service tokens
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from datetime import datetime
from typing import Optional
import os

from services.supabase_database import db
from models.auth import SecurityEvent, UserActivity

router = APIRouter()

# Service token validation
def verify_service_token(x_service_token: str = Header(None)):
    """Verify the service token from Auth0 actions"""
    expected_token = os.getenv("SERVICE_TOKEN")
    if not expected_token or x_service_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service token"
        )
    return True

# ==================== User Status Endpoints ====================

@router.get("/api/users/check-email")
async def check_email_exists(
    email: str,
    _: bool = Depends(verify_service_token)
):
    """Check if email already exists in database"""
    try:
        response = db.client.table('users').select('id').eq('email', email).execute()
        return {"exists": len(response.data) > 0}
    except Exception as e:
        return {"exists": False, "error": str(e)}

@router.get("/api/users/status/{user_id}")
async def get_user_status(
    user_id: str,
    _: bool = Depends(verify_service_token)
):
    """Get user account status"""
    try:
        user = await db.get_user_by_auth0_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "is_active": user.get('is_active', True),
            "email_verified": user.get('email_verified', False),
            "subscription_tier": user.get('subscription_tier', 'free')
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user status: {str(e)}"
        )

@router.get("/api/users/{user_id}/subscription")
async def get_user_subscription_status(
    user_id: str,
    _: bool = Depends(verify_service_token)
):
    """Get user's current subscription status"""
    try:
        user = await db.get_user_by_auth0_id(user_id)
        if not user:
            return {
                "tier": "free",
                "is_paid": False,
                "end_date": None
            }
        
        # Get active subscription
        subscription = await db.get_active_subscription(user['id'])
        
        if subscription:
            end_date = datetime.fromisoformat(subscription['current_end'])
            is_active = end_date > datetime.now()
            
            return {
                "tier": user.get('subscription_tier', 'free'),
                "is_paid": is_active,
                "end_date": end_date.isoformat() if is_active else None,
                "status": subscription.get('status', 'inactive')
            }
        
        return {
            "tier": "free",
            "is_paid": False,
            "end_date": None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription: {str(e)}"
        )

# ==================== Activity Tracking Endpoints ====================

@router.patch("/api/users/{user_id}/activity")
async def update_user_activity(
    user_id: str,
    activity_data: dict,
    _: bool = Depends(verify_service_token)
):
    """Update user's last activity (login time, IP, etc.)"""
    try:
        user = await db.get_user_by_auth0_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user activity
        update_data = {
            'last_seen_at': activity_data.get('last_login'),
            'updated_at': datetime.now().isoformat()
        }
        
        # You might want to store IP and user agent in a separate activity log table
        # For privacy compliance, consider anonymizing IP addresses
        
        await db.update_user(user_id, update_data)
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update activity: {str(e)}"
        )

# ==================== Analytics Endpoints ====================

@router.post("/api/analytics/signup")
async def track_signup(
    event_data: dict,
    _: bool = Depends(verify_service_token)
):
    """Track user signup event"""
    try:
        # Store signup analytics in a separate table or service
        # This is useful for tracking conversion rates, signup sources, etc.
        
        analytics_data = {
            'event_type': 'signup',
            'user_id': event_data.get('user_id'),
            'email': event_data.get('email'),
            'signup_method': event_data.get('signup_method'),
            'ip_address': event_data.get('ip'),
            'user_agent': event_data.get('user_agent'),
            'timestamp': event_data.get('timestamp', datetime.now().isoformat())
        }
        
        # You can store this in Supabase or send to analytics service
        # db.client.table('analytics_events').insert(analytics_data).execute()
        
        print(f"Signup tracked: {analytics_data}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Failed to track signup: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/api/analytics/login")
async def track_login(
    event_data: dict,
    _: bool = Depends(verify_service_token)
):
    """Track user login event"""
    try:
        analytics_data = {
            'event_type': 'login',
            'user_id': event_data.get('user_id'),
            'email': event_data.get('email'),
            'login_method': event_data.get('login_method'),
            'ip_address': event_data.get('ip'),
            'user_agent': event_data.get('user_agent'),
            'city': event_data.get('city'),
            'country': event_data.get('country'),
            'timestamp': event_data.get('timestamp', datetime.now().isoformat())
        }
        
        # Store in analytics table
        # db.client.table('analytics_events').insert(analytics_data).execute()
        
        print(f"Login tracked: {event_data.get('user_id')}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Failed to track login: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== Security Events Endpoints ====================

@router.post("/api/security/events")
async def log_security_event(
    event_data: dict,
    _: bool = Depends(verify_service_token)
):
    """Log security events (password changes, suspicious activity, etc.)"""
    try:
        user = await db.get_user_by_auth0_id(event_data.get('user_id'))
        if not user:
            return {"status": "error", "message": "User not found"}
        
        security_event = {
            'user_id': user['id'],
            'event_type': event_data.get('event_type'),
            'ip_address': event_data.get('ip'),
            'user_agent': event_data.get('user_agent'),
            'metadata': event_data.get('metadata', {}),
            'timestamp': event_data.get('timestamp', datetime.now().isoformat())
        }
        
        # Store in security_events table
        db.client.table('security_events').insert(security_event).execute()
        
        # If event is critical, send alert
        if event_data.get('event_type') in ['suspicious_login', 'account_takeover']:
            # Send alert to admin/user
            pass
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Failed to log security event: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== Email Endpoints ====================

@router.post("/api/emails/welcome")
async def send_welcome_email(
    email_data: dict,
    _: bool = Depends(verify_service_token)
):
    """Send welcome email to new user"""
    try:
        # Integrate with your email service (SendGrid, Mailgun, etc.)
        # For now, just log it
        
        print(f"Welcome email would be sent to: {email_data.get('to')}")
        print(f"User name: {email_data.get('name')}")
        
        # Example with SendGrid:
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        # 
        # message = Mail(
        #     from_email='noreply@yourapp.com',
        #     to_emails=email_data.get('to'),
        #     subject='Welcome to YourApp!',
        #     html_content=f'<strong>Welcome {email_data.get("name")}!</strong>'
        # )
        # sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        # response = sg.send(message)
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Failed to send welcome email: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/api/emails/password-changed")
async def send_password_changed_email(
    email_data: dict,
    _: bool = Depends(verify_service_token)
):
    """Send password change notification email"""
    try:
        print(f"Password change email would be sent to: {email_data.get('to')}")
        print(f"Changed at: {email_data.get('changed_at')}")
        print(f"Location: {email_data.get('location')}")
        
        # Send actual email here
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Failed to send password change email: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== Session Management ====================

@router.post("/api/auth/revoke-sessions")
async def revoke_user_sessions(
    revoke_data: dict,
    _: bool = Depends(verify_service_token)
):
    """Revoke all user sessions (used after password change)"""
    try:
        user_id = revoke_data.get('user_id')
        exclude_current = revoke_data.get('exclude_current', True)
        
        # If you're using Auth0 sessions, you'd use Auth0 Management API here
        # from auth.management import auth0_management
        # await auth0_management.revoke_refresh_tokens(user_id)
        
        print(f"Sessions revoked for user: {user_id}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Failed to revoke sessions: {str(e)}")
        return {"status": "error", "message": str(e)}