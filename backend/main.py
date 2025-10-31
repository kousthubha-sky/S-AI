import base64
import uvicorn
import os
import re
from fastapi import FastAPI, Depends, HTTPException, Request, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

# Import Supabase database service
from services.supabase_database import db

import httpx
from typing import List, Optional
from models.chat import ChatRequest, ChatResponse
from models.auth import UserProfile, ErrorResponse
from models.payment import UserUsage, SubscriptionCreate, SubscriptionVerify, SubscriptionResponse
from auth.dependencies import verify_token, has_permissions, get_user_id, get_user_permissions
from auth.payment import PaymentManager
from web.webhook import router as webhook_router
from web.chat import router as chat_router

# Import Supabase state management
from models.supabase_state import (
    get_user_usage,
    increment_message_count,
    update_user_subscription,
    get_next_reset_time,
    create_user_if_not_exists
)

app = FastAPI(
    title="SAAS API",
    description="Backend API for SAAS application with Supabase integration",
    version="2.0.0"
)

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
    
    # Block common malicious patterns
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handling middleware
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Check if the API is running and database is connected"""
    try:
        # Test Supabase connection
        await db.client.table('users').select('id').limit(1).execute()
        db_status = "connected"
    except Exception as e:
        print(f"Database connection error: {e}")
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "database": db_status,
        "version": "2.0.0"
    }

# User profile endpoints
@app.get("/api/profile", response_model=UserProfile, tags=["User"])
async def get_profile(payload: dict = Depends(verify_token)):
    """Get the current user's profile - creates user if doesn't exist"""
    try:
        user_id = payload.get("sub")
        
        # First, try to get user from Auth0
        from auth.management import auth0_management
        user_data = await auth0_management.get_user_info(user_id)
        
        # Check if user exists in database, create if not
        db_user = await create_user_if_not_exists(payload)
        
        return UserProfile(
            user_id=user_id,
            email=db_user.get("email", user_data.get("email", "")),
            name=db_user.get("name", user_data.get("name")),
            picture=user_data.get("picture"),
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
    """Get current user's usage information"""
    user_id = payload.get("sub")
    usage = await get_user_usage(user_id)  # This now uses Supabase
    return usage

# User endpoints
@app.post("/api/users", tags=["User"])
async def create_user(user_data: dict, payload: dict = Depends(verify_token)):
    """Create a new user"""
    try:
        user_id = payload.get("sub")
        
        # Create new user data
        new_user = {
            "auth0_id": user_id,
            "email": user_data.get("email"),
            "name": user_data.get("name"),
            "subscription_tier": "free"
        }
        
        # Use Supabase database service to create user
        result = await db.create_user(new_user)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@app.get("/api/users/me", tags=["User"])
async def get_current_user(payload: dict = Depends(verify_token)):
    """Get current user data"""
    try:
        user_id = payload.get("sub")
        user_data = await db.get_user_by_auth0_id(user_id)
            
        if not user_data:
            # Create user if doesn't exist
            user_data = await create_user_if_not_exists(payload)
            
        return user_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )

@app.post("/api/subscription/create", response_model=SubscriptionResponse, tags=["Subscription"])
async def create_subscription(
    subscription: SubscriptionCreate, 
    payload: dict = Depends(verify_token)
):
    """Create a new subscription"""
    # Extract user ID from auth token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    # Create a new subscription model with the authenticated user ID
    subscription_data = SubscriptionCreate(
        plan_type=subscription.plan_type,
        total_count=subscription.total_count or 12,
        user_id=user_id
    )
    
    return await payment_manager.create_subscription(subscription_data)

# In main.py - UPDATE THE SUBSCRIPTION VERIFICATION ENDPOINT:

@app.post("/api/subscription/verify", tags=["Subscription"])
async def verify_subscription(
    verification: SubscriptionVerify, 
    payload: dict = Depends(verify_token)
):
    """Verify a subscription payment and activate user's subscription"""
    user_id = payload.get("sub")
    
    if await payment_manager.verify_subscription_payment(verification):
        subscription_details = await payment_manager.get_subscription_details(
            verification.razorpay_subscription_id
        )
        
        # Calculate subscription end date
        if subscription_details.get('current_end'):
            end_date = datetime.fromtimestamp(subscription_details['current_end'])
        else:
            end_date = datetime.now() + timedelta(days=30)
        
        # Get user from database
        user = await db.get_user_by_auth0_id(user_id)
        
        if user:
            # Update user subscription in users table
            await db.update_user(user_id, {
                'subscription_tier': 'pro',
                'subscription_end_date': end_date.isoformat(),
                'is_paid': True
            })
            
            # Create subscription record in Supabase
            subscription_data = {
                'user_id': user['id'],
                'razorpay_subscription_id': verification.razorpay_subscription_id,
                'razorpay_plan_id': subscription_details.get('plan_id'),
                'status': subscription_details.get('status'),
                'current_start': datetime.fromtimestamp(subscription_details.get('current_start', 0)).isoformat() if subscription_details.get('current_start') else None,
                'current_end': end_date.isoformat(),
                'total_count': subscription_details.get('total_count'),
                'paid_count': subscription_details.get('paid_count'),
                'remaining_count': subscription_details.get('remaining_count')
            }
            
            await db.create_subscription(subscription_data)
            
            # Record payment transaction in Supabase
            payment_data = {
                'user_id': user['id'],
                'razorpay_payment_id': verification.razorpay_payment_id,
                'amount': subscription_details.get('charge_at', 0) / 100,  # Convert from paisa to rupees
                'currency': 'INR',
                'status': 'captured',
                'payment_method': 'subscription'
            }
            
            await db.create_payment_transaction(payment_data)
        
        return {"status": "success", "message": "Subscription activated successfully"}
    
    return {"status": "error", "message": "Subscription verification failed"}
@app.get("/api/subscription/details/{subscription_id}", tags=["Subscription"])
async def get_subscription_details(
    subscription_id: str,
    payload: dict = Depends(verify_token)
):
    """Get subscription details"""
    return await payment_manager.get_subscription_details(subscription_id)

@app.post("/api/subscription/cancel/{subscription_id}", tags=["Subscription"])
async def cancel_subscription(
    subscription_id: str,
    payload: dict = Depends(verify_token)
):
    """Cancel a subscription"""
    if await payment_manager.cancel_subscription(subscription_id):
        # Update user subscription status in Supabase
        user_id = payload.get("sub")
        await update_user_subscription(user_id, "free", False, datetime.now())
        
        return {"status": "success", "message": "Subscription cancelled successfully"}
    
    return {"status": "error", "message": "Failed to cancel subscription"}

# Import AI models validation
from models.ai_models import validate_model_access

# Chat endpoint
@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest, payload: dict = Depends(verify_token)):
    """Process chat messages through OpenRouter"""
    user_id = payload.get("sub")
    usage = await get_user_usage(user_id)  # This now uses Supabase
    
    print(f"User {user_id} - Current usage: {usage.daily_message_count} messages, Paid: {usage.is_paid}")
    
    # Check subscription status and expiry
    if usage.subscription_end_date and usage.subscription_end_date < datetime.now():
        print(f"User {user_id} - Subscription expired")
        usage.is_paid = False
        usage.subscription_tier = "free"
        await update_user_subscription(user_id, "free", False, datetime.now())
    
    # Validate model access based on user's tier
    tier = usage.subscription_tier or "free"
    has_access = validate_model_access(request.model, tier == "pro")
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This model is only available to Pro users. Please upgrade your subscription."
        )
    
    # Check if user has exceeded free limit and hasn't paid
    FREE_TIER_DAILY_LIMIT = 25
    
    if usage.daily_message_count >= FREE_TIER_DAILY_LIMIT and not usage.is_paid:
        print(f"User {user_id} - Daily limit reached, requesting payment")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Daily limit reached. Please subscribe to continue."
        )

    try:
        # Add more robust error handling for missing API key
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenRouter API key not configured"
            )
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": os.getenv('FRONTEND_URL', 'http://localhost:5173'),
            "X-Title": "SAAS Chat Application",
            "Content-Type": "application/json"
        }
        
        # Prepare messages with system prompt if needed
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Add system message for better responses
        if request.system_prompt:
            messages.insert(0, {"role": "system", "content": request.system_prompt})
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": request.model or "tngtech/deepseek-r1t2-chimera:free",
                    "messages": messages,
                    "max_tokens": request.max_tokens or 1000,
                    "temperature": request.temperature or 0.7
                }
            )
            
            if response.status_code != 200:
                error_detail = f"OpenRouter API error: {response.status_code}"
                try:
                    error_data = response.json()
                    error_detail = error_data.get('error', {}).get('message', error_detail)
                except:
                    pass
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
                
            data = response.json()
            
            # Increment usage counter in Supabase
            tokens_used = data.get("usage", {}).get("total_tokens", 0)
            await increment_message_count(user_id, token_count=tokens_used)
            
            return ChatResponse(
                message=data["choices"][0]["message"]["content"],
                usage=data.get("usage", {}),
                model=data.get("model", "unknown")
            )
            
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to OpenRouter timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing error: {str(e)}"
        )

# Document upload endpoint
@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    payload: dict = Depends(verify_token)
):
    """Upload and process documents for chat context"""
    try:
        # Read file content
        content = await file.read()
        
        # For text files, extract text
        if file.content_type.startswith('text/') or file.filename.endswith('.txt'):
            text_content = content.decode('utf-8')
            # Store in database or process as needed
            return {"filename": file.filename, "content_preview": text_content[:200] + "..."}
        
        # For images, you could use OCR or other processing
        elif file.content_type.startswith('image/'):
            # Convert to base64 or process with vision models
            base64_content = base64.b64encode(content).decode('utf-8')
            return {"filename": file.filename, "type": "image", "processed": True}
            
        else:
            return {"filename": file.filename, "message": "File uploaded successfully"}
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

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

# Chat history endpoints
@app.get("/api/chat/sessions", tags=["Chat History"])
async def get_chat_sessions(payload: dict = Depends(verify_token)):
    """Get user's chat sessions"""
    user_id = payload.get("sub")
    try:
        # Get user from database
        user = await db.get_user_by_auth0_id(user_id)
        if user:
            # Get chat sessions using Supabase database service
            sessions = await db.get_chat_sessions(user['id'])
            return sessions
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chat sessions: {str(e)}"
        )

@app.get("/api/chat/sessions/{session_id}/messages", tags=["Chat History"])
async def get_chat_messages(session_id: str, payload: dict = Depends(verify_token)):
    """Get messages for a specific chat session"""
    try:
        # Get chat messages using Supabase database service
        messages = await db.get_chat_messages(session_id)
        return messages
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chat messages: {str(e)}"
        )

if __name__ == "__main__":
    # Start the FastAPI server
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)