import base64
import uvicorn
import os
import re
import mimetypes
import traceback  # Ensure traceback is imported at the top
from fastapi import FastAPI, Depends, HTTPException, Request, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pathlib import Path
from services.redis_cache import redis_cache
import uuid

# Import slowapi for rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import security middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Create limiter instance
def get_rate_limit_key(request: Request):
    # Use user ID if authenticated, otherwise use IP address
    if hasattr(request.state, 'user_id'):
        return request.state.user_id
    return get_remote_address(request)

limiter = Limiter(key_func=get_rate_limit_key)


load_dotenv()

# Import Supabase database service
from services.supabase_database import db

import httpx
from typing import List, Optional
from models.chat import ChatRequest, ChatResponse
from models.auth import UserProfile, ErrorResponse
from models.payment import (
    OrderCreate,          # ← NEW
    OrderVerify,          # ← NEW
    OrderResponse,        # ← NEW (optional)
    UserUsage,
    SubscriptionCreate,   # ← Keep for now (legacy)
    SubscriptionVerify,
    RefundCreate# ← Keep for now (legacy)
)
import logging
from auth.dependencies import verify_token, has_permissions, get_user_id, get_user_permissions
from auth.payment import PaymentManager
from web.webhook import router as webhook_router
from web.chat import router as chat_router
from web.news import router as news_router
from web.auth_actions import router as auth_actions_router

# Import Supabase state management
from models.supabase_state import (
    get_user_usage,
    increment_message_count,
    update_user_subscription,
    get_next_reset_time,
    create_user_if_not_exists
)
logger = logging.getLogger(__name__)
# Import validation utilities
from utils.validators import InputValidator

app = FastAPI(
    title="SAAS API",
    description="Backend API for SAAS application with Supabase integration",
    version="2.0.0"
)

# Add rate limiting middleware
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.middleware("http")
async def filter_invalid_requests(request: Request, call_next):
    """
    Filter out invalid requests that are causing warnings
    """
    # Check if it's a valid HTTP request
    if not request.headers.get("host"):
        return JSONResponse(
            status_code=400,
            content={"detail": "Invalid HTTP request"}
        )
    
    # Check for common bot/user-agent patterns that cause issues
    user_agent = request.headers.get("user-agent", "").lower()
    
    # # Block common malicious patterns
    blocked_patterns = [
         r"python", r"curl", r"wget", r"scanner", r"bot",
         r"zgrab", r"masscan", r"nmap", r"sqlmap"
    ]
    
    if any(re.search(pattern, user_agent) for pattern in blocked_patterns):
        return JSONResponse(
            status_code=403,
            content={"detail": "Forbidden"}
        )
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"Request processing error: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )

# CORS middleware
ALLOWED_ORIGINS = []
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    ALLOWED_ORIGINS.append(frontend_url)

# Only add localhost in development
if os.getenv("ENVIRONMENT", "development") == "development":
    ALLOWED_ORIGINS.extend([
        "http://localhost:5173",
    ])

if not ALLOWED_ORIGINS:
    raise ValueError("No CORS origins configured. Set FRONTEND_URL environment variable.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ Explicit list
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # ✅ Specific methods
    allow_headers=[  # ✅ Specific headers only
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "User-Agent",
        "DNT",
        "Cache-Control",
        "X-Requested-With",
    ],
    max_age=600,  # ✅ Cache preflight for 10 minutes
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # ✅ Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # ✅ Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # ✅ Enable XSS protection (for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # ✅ Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # ✅ Content Security Policy
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.anthropic.com https://openrouter.ai https://*.auth0.com",
            "frame-ancestors 'none'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # ✅ Permissions Policy (formerly Feature Policy)
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # ✅ Strict Transport Security (HSTS) - only in production
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        return response

# Add the middleware (place after CORS middleware):
app.add_middleware(SecurityHeadersMiddleware)

# Error handling middleware
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

# main.py - health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Check if the API is running and database is connected"""
    try:
        # Test Supabase connection - REMOVE AWAIT
        db.client.table('users').select('id').limit(1).execute()
        db_status = "connected"
    except Exception as e:
        print(f"Database connection error: {e}")
        db_status = "disconnected"
    
    return {
        "status": "healthy",
    }

# Pricing endpoint
@app.get("/api/pricing", tags=["Pricing"])
async def get_pricing():
    """Get all available pricing plans (public endpoint)"""
    plans = []
    
    # Free tier
    plans.append({
        "id": "free",
        "name": "Free",
        "price": 0,
        "currency": "INR",
        "period": "forever",
        "description": "Perfect for trying out Xcore-ai",
        "limits": {
            "requests_per_day": 50,
            "tokens_per_day": 50000,
            "requests_per_month": None,
            "tokens_per_month": None
        },
        "features": [
            "Basic AI models",
            "Chat history (7 days)",
            "Standard support"
        ],
        "popular": False
    })
    
    # Add paid plans from payment manager
    for plan_id, plan_info in payment_manager.PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan_info["name"],
            "price": plan_info["amount"] // 100,  # Convert paise to rupees
            "currency": plan_info["currency"],
            "period": "month",
            "tier": plan_info["tier"],
            "description": f"₹{plan_info['amount'] // 100} per month subscription",
            "limits": {
                "requests_per_month": plan_info["requests_per_month"],
                "tokens_per_month": plan_info["tokens_per_month"]
            },
            "popular": plan_info["tier"] == "pro"
        })
    
    # Enterprise tier
    plans.append({
        "id": "enterprise",
        "name": "Enterprise",
        "price": None,
        "currency": "INR",
        "period": "custom",
        "description": "Custom solutions for large teams",
        "limits": {
            "requests_per_day": -1,
            "tokens_per_day": -1,
            "requests_per_month": -1,
            "tokens_per_month": -1
        },
        "features": [
            "Unlimited everything",
            "API access",
            "Dedicated support",
            "Custom integrations",
            "SLA guarantee",
            "Dedicated account manager"
        ],
        "contact_sales": "sales@xcore-ai.com",
        "popular": False
    })
    
    return {"plans": plans}

# User profile endpoints
@app.get("/api/profile", response_model=UserProfile, tags=["User"])
async def get_profile(payload: dict = Depends(verify_token)):
    """Get the current user's profile - creates user if doesn't exist"""
    try:
        user_id = payload.get("sub")
        
        # Ensure user exists in database first
        db_user = await create_user_if_not_exists(payload)
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in database"
            )
        
        return UserProfile(
            user_id=user_id,
            email=db_user.get("email", ""),
            name=db_user.get("name", "User"),
            picture=db_user.get("picture"),
            permissions=payload.get("permissions", [])
        )
        
    except Exception as e:
        print(f"Profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(e)}"
        )

# Protected routes with different permission levels
@app.get("/api/admin", tags=["Admin"])
@has_permissions(["admin:access"])
async def admin_route(payload: dict = Depends(verify_token)):
    """Admin only route - requires admin:access permission"""
    return {
        "message": "Welcome to admin area",
        "user": payload.get("sub")
    }

@app.get("/api/user/data", tags=["User"])
@has_permissions(["read:data"])
async def user_data(payload: dict = Depends(verify_token)):
    """Protected user route - requires read:data permission"""
    return {
        "message": "Here's your data",
        "user": payload.get("sub")
    }

@app.post("/api/user/data", tags=["User"])
@has_permissions(["write:data"])
async def create_user_data(payload: dict = Depends(verify_token)):
    """Protected user route - requires write:data permission"""
    return {
        "message": "Data created successfully",
        "user": payload.get("sub")
    }

# Permission check endpoint
@app.get("/api/permissions", tags=["User"])
async def get_permissions(permissions: List[str] = Depends(get_user_permissions)):
    """Get the current user's permissions"""
    return {"permissions": permissions}

# Initialize payment manager
payment_manager = PaymentManager()

def get_monthly_limit(subscription_tier: str) -> int:
    """Get monthly message limit based on subscription tier"""
    limits = {
        "free": 25,           # Free tier: 25 messages/day
        "basic": 1000,        # Basic tier: 1000 messages/month
        "pro": float('inf')   # Pro tier: unlimited
    }
    return limits.get(subscription_tier, 25)

@app.get("/api/usage", tags=["Payment"])
async def get_usage(payload: dict = Depends(verify_token)):
    """Get current user's usage information with tier details"""
    user_id = payload.get("sub")
    usage = await get_user_usage(user_id)
    
    # Get tier information
    tier = usage.subscription_tier or "free"
    tier = tier.lower()
    
    # Get plan limits
    plan_limits = payment_manager.get_plan_limits(tier)
    
    # Get tier features
    from models.ai_models import get_tier_features, get_tier_name
    tier_features = get_tier_features(tier)
    
    # Calculate usage percentages
    daily_usage_percent = 0
    monthly_usage_percent = 0
    
    if tier == "free":
        # Daily limits for free tier
        if plan_limits["requests_per_day"] > 0:
            daily_usage_percent = (usage.daily_message_count / plan_limits["requests_per_day"]) * 100
    else:
        # Monthly limits for paid tiers (except pro_plus which is unlimited)
        if plan_limits["requests_per_month"] > 0:
            monthly_usage_percent = (usage.prompt_count / plan_limits["requests_per_month"]) * 100
    
    # Calculate days remaining in subscription
    days_remaining = None
    if usage.subscription_end_date:
        from datetime import timezone
        now_aware = datetime.now(timezone.utc)
        if usage.subscription_end_date.tzinfo is None:
            subscription_end_date = usage.subscription_end_date.replace(tzinfo=timezone.utc)
        else:
            subscription_end_date = usage.subscription_end_date
        
        if subscription_end_date > now_aware:
            days_remaining = (subscription_end_date - now_aware).days
    
    return {
        "user_id": usage.user_id,
        "tier": tier,
        "tier_name": get_tier_name(tier),
        "is_paid": usage.is_paid,
        
        # Usage statistics
        "daily_message_count": usage.daily_message_count,
        "monthly_message_count": usage.prompt_count,
        "last_reset_date": usage.last_reset_date.isoformat() if usage.last_reset_date else None,
        
        # Limits
        "limits": {
            "requests_per_day": plan_limits["requests_per_day"],
            "requests_per_month": plan_limits["requests_per_month"],
            "tokens_per_day": plan_limits["tokens_per_day"],
            "tokens_per_month": plan_limits["tokens_per_month"],
            "is_unlimited": plan_limits["requests_per_month"] == -1
        },
        
        # Usage percentages
        "usage_percentage": {
            "daily": round(daily_usage_percent, 2) if tier == "free" else None,
            "monthly": round(monthly_usage_percent, 2) if tier != "free" and plan_limits["requests_per_month"] > 0 else None
        },
        
        # Subscription details
        "subscription": {
            "end_date": usage.subscription_end_date.isoformat() if usage.subscription_end_date else None,
            "days_remaining": days_remaining,
            "is_active": usage.is_paid and (days_remaining > 0 if days_remaining is not None else False)
        },
        
        # Feature access
        "features": tier_features,
        
        # Warnings
        "warnings": {
            "approaching_limit": (
                daily_usage_percent > 80 if tier == "free" 
                else monthly_usage_percent > 80 if tier != "free" and plan_limits["requests_per_month"] > 0
                else False
            ),
            "limit_reached": (
                usage.daily_message_count >= plan_limits["requests_per_day"] if tier == "free"
                else usage.prompt_count >= plan_limits["requests_per_month"] if tier != "free" and plan_limits["requests_per_month"] > 0
                else False
            ),
            "subscription_expiring_soon": days_remaining is not None and days_remaining <= 7
        }
    }

@app.post("/api/users", tags=["User"])
async def create_user(user_data: dict, payload: dict = Depends(verify_token)):
    """Create a new user"""
    try:
        user_id = payload.get("sub")
        
        # ✅ Validate inputs
        email = InputValidator.validate_email(user_data.get("email", ""))
        name = InputValidator.sanitize_string(user_data.get("name", "User"), max_length=100)
        
        new_user = {
            "auth0_id": user_id,
            "email": email,
            "name": name,
            "subscription_tier": "free",
            "is_paid": False
        }
        
        print(f"Creating user: {new_user}")
        
        # ✅ NO AWAIT - db methods are synchronous
        result = db.create_user(new_user)
        
        print(f"✅ User created: {result}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@app.get("/api/users/me", tags=["User"])
async def get_current_user(payload: dict = Depends(verify_token)):
    """Get current user data"""
    try:
        user_id = payload.get("sub")
        
        # ✅ NO AWAIT
        user_data = db.get_user_by_auth0_id(user_id)
            
        if not user_data:
            # Create user if doesn't exist
            user_data = await create_user_if_not_exists(payload)
            
        return user_data
        
    except Exception as e:
        print(f"Error getting user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )

#payment endpoints
# backend/main.py - REPLACE PAYMENT ENDPOINTS SECTION

# ==================== PAYMENT ENDPOINTS ====================

# 1. CREATE ORDER (First step)
# In main.py - UPDATE THE CREATE ORDER ENDPOINT
@app.post("/api/payment/create-order", response_model=OrderResponse, tags=["Payment"])
async def create_payment_order(
    order: OrderCreate, 
    payload: dict = Depends(verify_token)
):
    """
    Step 1: Create a Razorpay order before payment
    """
    user_id = payload.get("sub")
    print(f"🔧 DEBUG: Received order creation request")
    print(f"🔧 DEBUG: User ID: {user_id}")
    print(f"🔧 DEBUG: Plan type: {order.plan_type}")
    print(f"🔧 DEBUG: Available plans: {list(payment_manager.PLANS.keys())}")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Validate plan_type
        if not order.plan_type:
            print("❌ DEBUG: No plan_type provided")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan type is required"
            )
        
        if order.plan_type not in payment_manager.PLANS:
            print(f"❌ DEBUG: Invalid plan_type: {order.plan_type}")
            print(f"❌ DEBUG: Available plans: {list(payment_manager.PLANS.keys())}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {order.plan_type}. Available: {list(payment_manager.PLANS.keys())}"
            )
        
        print(f"✅ DEBUG: Plan type validated: {order.plan_type}")
        
        # Create order with authenticated user ID
        order_response = await payment_manager.create_order(
            order.plan_type,
            user_id
        )
        
        print(f"✅ DEBUG: Order created successfully: {order_response}")
        
        return OrderResponse(**order_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order creation failed: {str(e)}")
        import traceback
        print(f"❌ DEBUG: Unexpected error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )

# 2. VERIFY PAYMENT (After successful payment)
@app.post("/api/payment/verify", tags=["Payment"])
async def verify_payment(
    verification: OrderVerify, 
    payload: dict = Depends(verify_token)
):
    """
    Step 2: Verify payment signature after user completes payment
    """
    user_id = payload.get("sub")
    
    try:
        # Verify payment with Razorpay
        is_valid = await payment_manager.verify_payment(verification)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment verification failed"
            )
        
        print(f"✅ Payment verified for user {user_id}")
        
        # Get payment details
        payment_details = await payment_manager.get_payment_details(
            verification.razorpay_payment_id
        )
        
        # Get order to extract plan info
        order = payment_manager.client.order.fetch(verification.razorpay_order_id)
        plan_type = order.get('notes', {}).get('plan_type')
        
        if not plan_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan type not found in order"
            )
        
        # ✅ Get tier from payment manager based on Razorpay plan ID
        tier = payment_manager.get_plan_tier(plan_type)
        
        print(f"📊 Plan Type: {plan_type}")
        print(f"📊 Tier: {tier}")
        
        # Calculate subscription end date (30 days)
        end_date = datetime.now() + timedelta(days=30)
        
        # Get user from database
        user = db.get_user_by_auth0_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # ✅ Update user subscription with correct tier
        db.update_user(user_id, {
            'subscription_tier': tier,  # starter, pro, or pro_plus
            'subscription_end_date': end_date.isoformat(),
            'is_paid': True,
            'updated_at': datetime.now().isoformat()
        })
        
        print(f"✅ User updated with tier: {tier}")
        
        # ✅ CRITICAL FIX: Update Redis cache so get_user_usage() returns correct tier
        await update_user_subscription(user_id, tier, True, end_date)
        print(f"✅ Database subscription updated with tier: {tier}")
        
        # ✅ CRITICAL FIX: Create subscription record in subscriptions table
        subscription_record = {
            'user_id': user['id'],
            'razorpay_subscription_id': verification.razorpay_payment_id,  # Using payment ID as subscription ref
            'razorpay_payment_id': verification.razorpay_payment_id,
            'plan_type': plan_type,
            'tier': tier,
            'status': 'active',  # ✅ Set to active so get_user_usage() finds it
            'current_start': datetime.now().isoformat(),
            'current_end': end_date.isoformat(),
            'renewal_date': end_date.isoformat(),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        try:
            db.create_subscription(subscription_record)
            print(f"✅ Subscription record created with status='active'")
        except Exception as sub_error:
            print(f"⚠️ Subscription record error (non-critical): {sub_error}")
        
        # Record payment transaction
        payment_data = {
            'user_id': user['id'],
            'razorpay_payment_id': verification.razorpay_payment_id,
            'razorpay_order_id': verification.razorpay_order_id,
            'amount': payment_details['amount'] / 100,  # Convert paise to rupees
            'currency': payment_details['currency'],
            'status': 'captured',
            'payment_method': payment_details.get('method', 'card'),
            'plan_type': plan_type,
            'tier': tier,
            'created_at': datetime.now().isoformat()
        }
        
        db.create_payment_transaction(payment_data)
        print(f"✅ Payment transaction recorded")
        
        # Update user_usage table
        month_year = datetime.now().strftime("%Y-%m")
        usage_update = {
            'is_paid': True,
            'subscription_tier': tier,
            'subscription_end_date': end_date.isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        try:
            db.client.table('user_usage').update(usage_update).eq(
                'user_id', user['id']
            ).eq('month_year', month_year).execute()
            print(f"✅ User usage updated with tier: {tier}")
        except Exception as usage_error:
            print(f"⚠️ Usage update error: {usage_error}")
        
        # Invalidate caches
        try:
            from services.redis_cache import redis_cache
            await redis_cache.invalidate_user_sessions(user_id)
            print(f"✅ Cache invalidated")
        except:
            pass
        
        # ✅ Get plan limits for response
        plan_limits = payment_manager.get_plan_limits(tier)
        
        return {
            "status": "success",
            "message": "Payment verified and subscription activated",
            "subscription": {
                "tier": tier,
                "tier_name": get_tier_name(tier),
                "end_date": end_date.isoformat(),
                "is_paid": True,
                "limits": plan_limits
            },
            "payment": {
                "id": verification.razorpay_payment_id,
                "amount": payment_details['amount'] / 100,
                "currency": payment_details['currency'],
                "plan_type": plan_type
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Payment verification error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(e)}"
        )



# 3. GET PAYMENT STATUS
@app.get("/api/payment/{payment_id}", tags=["Payment"])
async def get_payment_status(
    payment_id: str,
    payload: dict = Depends(verify_token)
):
    """Get payment details"""
    try:
        payment_details = await payment_manager.get_payment_details(payment_id)
        return payment_details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment status: {str(e)}"
        )


# 4. CREATE REFUND (Optional - for customer service)
@app.post("/api/payment/refund", tags=["Payment"])
@has_permissions(["admin:access"])  # Admin only
async def create_refund(
    refund: RefundCreate,
    payload: dict = Depends(verify_token)
):
    """Create a refund (Admin only)"""
    try:
        refund_response = await payment_manager.create_refund(
            refund.payment_id,
            refund.amount
        )
        
        return {
            "status": "success",
            "refund": refund_response
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refund failed: {str(e)}"
        )

# Import AI models validation
from models.ai_models import validate_model_access, get_tier_name

# Document upload endpoint
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = {
    'text/plain',
    'text/markdown',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
}

ALLOWED_EXTENSIONS = {'.txt', '.md', '.pdf', '.png', '.jpg', '.jpeg', '.webp'}

@app.post("/api/upload-document")
@limiter.limit("5/minute")  # Rate limit
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    payload: dict = Depends(verify_token)
):
    """Upload and process documents for chat context - SECURED"""
    user_id = payload.get("sub")
    
    try:
        # ✅ 1. Validate filename
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
        
        filename = InputValidator.validate_filename(file.filename)
        file_ext = Path(filename).suffix.lower()
        
        # ✅ 2. Check extension
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed"
            )
        
        # ✅ 3. Read file content
        content = await file.read()
        
        # ✅ 4. Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # ✅ 5. Validate MIME type using mimetypes
        detected_mime, _ = mimetypes.guess_type(filename)
        if detected_mime is None:
            # Try to detect from content for images
            if content.startswith(b'\x89PNG'):
                detected_mime = 'image/png'
            elif content.startswith(b'\xFF\xD8\xFF'):
                detected_mime = 'image/jpeg'
            elif content.startswith(b'RIFF') and b'WEBP' in content[:20]:
                detected_mime = 'image/webp'
            elif content.startswith(b'%PDF'):
                detected_mime = 'application/pdf'
            elif content.startswith(b'\xFF\xFE') or content.startswith(b'\xFE\xFF') or content.startswith(b'\xEF\xBB\xBF'):
                detected_mime = 'text/plain'
            else:
                # Default to text for unknown files
                detected_mime = 'text/plain'
        
        if detected_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {detected_mime}"
            )
        
        # ✅ 6. Generate secure filename
        secure_filename = f"{uuid.uuid4()}_{filename}"
        
        # ✅ 7. Process based on file type
        if detected_mime.startswith('text/'):
            try:
                text_content = content.decode('utf-8')
                # Sanitize text content
                text_content = InputValidator.sanitize_string(text_content, max_length=50000)
                
                # Store in database with user_id
                # await db.store_document(user_id, secure_filename, text_content)
                
                return {
                    "filename": filename,
                    "secure_filename": secure_filename,
                    "type": "text",
                    "size": len(content),
                    "content_preview": text_content[:200] + "..."
                }
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid text encoding"
                )
        
        elif detected_mime == 'application/pdf':
            # ✅ Scan PDF for malicious content
            try:
                import PyPDF2
                from io import BytesIO
                
                pdf_reader = PyPDF2.PdfReader(BytesIO(content))
                
                # Check for JavaScript in PDF
                for page in pdf_reader.pages:
                    if '/JS' in str(page) or '/JavaScript' in str(page):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="PDF contains potentially malicious content"
                        )
                
                # Extract text
                text_content = ""
                for page in pdf_reader.pages:
                    text_content += page.extract_text()
                
                text_content = InputValidator.sanitize_string(text_content, max_length=50000)
                
                return {
                    "filename": filename,
                    "secure_filename": secure_filename,
                    "type": "pdf",
                    "size": len(content),
                    "pages": len(pdf_reader.pages),
                    "content_preview": text_content[:200] + "..."
                }
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or corrupted PDF file"
                )
        
        elif detected_mime.startswith('image/'):
            # ✅ Validate and sanitize image
            try:
                from PIL import Image
                from io import BytesIO
                
                img = Image.open(BytesIO(content))
                
                # Check image size
                max_dimension = 4096
                if img.width > max_dimension or img.height > max_dimension:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image dimensions too large. Max: {max_dimension}x{max_dimension}"
                    )
                
                # Convert to safe format and re-encode to remove any malicious data
                safe_img = BytesIO()
                img.save(safe_img, format='PNG')
                safe_content = safe_img.getvalue()
                
                # Convert to base64 for storage
                base64_content = base64.b64encode(safe_content).decode('utf-8')
                
                return {
                    "filename": filename,
                    "secure_filename": secure_filename,
                    "type": "image",
                    "size": len(safe_content),
                    "width": img.width,
                    "height": img.height,
                    "format": img.format
                }
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or corrupted image file"
                )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        # ✅ Log error but don't expose details
        print(f"File upload error for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload failed"
        )
    finally:
        # ✅ Ensure file is closed
        await file.close()

# Document list endpoint
@app.get("/api/documents/list", tags=["Documents"])
async def list_documents(payload: dict = Depends(verify_token)):
    """List all documents for the current user"""
    user_id = payload.get("sub")
    # For now, return an empty list until document storage is implemented
    return []

# Include routers
app.include_router(webhook_router)
app.include_router(chat_router)
app.include_router(news_router)
app.include_router(auth_actions_router)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "saas_api"}

# ADD cache stats endpoint for monitoring
@app.get("/api/cache/stats", tags=["System"])
async def get_cache_stats(payload: dict = Depends(verify_token)):
    """Get Redis cache statistics"""
    stats = await redis_cache.get_stats()
    return stats

@app.get("/api/debug/subscription-status", tags=["Debug"])
def debug_subscription_status(payload: dict = Depends(verify_token)):
    """
    Diagnostic endpoint to check subscription status across all tables
    """
    user_id = payload.get("sub")
    
    try:
        # Get user from database
        user = db.get_user_by_auth0_id(user_id)
        
        if not user:
            return {
                "error": "User not found",
                "auth0_id": user_id
            }
        
        # Get subscription from subscriptions table
        subscription = db.get_active_subscription(user['id'])
        
        # Get usage from user_usage table
        month_year = datetime.now().strftime("%Y-%m")
        usage_response = db.client.table('user_usage').select('*').eq(
            'user_id', user['id']
        ).eq('month_year', month_year).execute()
        usage = usage_response.data[0] if usage_response.data else None
        
        # Get payment transactions
        payments_response = db.client.table('payment_transactions').select('*').eq(
            'user_id', user['id']
        ).order('created_at', desc=True).limit(5).execute()
        payments = payments_response.data
        
        return {
            "user": {
                "id": user['id'],
                "auth0_id": user['auth0_id'],
                "email": user['email'],
                "subscription_tier": user.get('subscription_tier'),
                "is_paid": user.get('is_paid'),
                "subscription_end_date": user.get('subscription_end_date'),
                "created_at": user.get('created_at'),
                "updated_at": user.get('updated_at')
            },
            "subscription": subscription,
            "usage": usage,
            "recent_payments": payments,
            "diagnostic": {
                "has_active_subscription": bool(subscription and subscription.get('status') == 'active'),
                "subscription_is_valid": bool(
                    subscription 
                    and subscription.get('current_end') 
                    and datetime.fromisoformat(subscription['current_end']) > datetime.now()
                ) if subscription else False,
                "user_marked_as_paid": user.get('is_paid') == True,
                "user_tier_is_pro": user.get('subscription_tier') == 'pro',
                "recommendation": (
                    "✅ Everything looks good!" 
                    if (user.get('is_paid') and user.get('subscription_tier') == 'pro')
                    else "⚠️ Subscription status mismatch - run fix endpoint"
                )
            }
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "traceback": str(traceback.format_exc())  # Now traceback will be available
        }


@app.post("/api/debug/fix-subscription-status", tags=["Debug"])
def fix_subscription_status(payload: dict = Depends(verify_token)):
    """
    Force-fix subscription status based on active subscription
    """
    user_id = payload.get("sub")
    
    try:
        # Get user
        user = db.get_user_by_auth0_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get active subscription
        subscription =  db.get_active_subscription(user['id'])
        
        if not subscription:
            return {
                "status": "no_subscription",
                "message": "No active subscription found"
            }
        
        # Check if subscription is still valid
        end_date = datetime.fromisoformat(subscription['current_end'])
        is_valid = end_date > datetime.now()
        
        if not is_valid:
            return {
                "status": "expired",
                "message": "Subscription has expired",
                "expired_on": subscription['current_end']
            }
        
        # Force update user to pro status
        db.update_user(user_id, {
            'subscription_tier': 'pro',
            'is_paid': True,
            'subscription_end_date': subscription['current_end'],
            'updated_at': datetime.now().isoformat()
        })
        
        # Update user_usage table
        month_year = datetime.now().strftime("%Y-%m")
        db.client.table('user_usage').update({
            'is_paid': True,
            'subscription_tier': 'pro',
            'subscription_end_date': subscription['current_end']
        }).eq('user_id', user['id']).eq('month_year', month_year).execute()
        
        return {
            "status": "fixed",
            "message": "Subscription status updated successfully",
            "user": {
                "subscription_tier": "pro",
                "is_paid": True,
                "subscription_end_date": subscription['current_end']
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fix subscription: {str(e)}"
        )

if __name__ == "__main__":
    # Start the FastAPI server
    port = int(os.getenv("PORT", 8000))  # Render uses PORT env var
    uvicorn.run("main:app", host="0.0.0.0", port=port)