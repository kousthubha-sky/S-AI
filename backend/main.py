import base64
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Request, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv

import os
import httpx
from typing import List, Optional
from datetime import datetime
from models.chat import ChatRequest, ChatResponse
from models.auth import UserProfile, ErrorResponse
from models.payment import UserUsage, SubscriptionCreate, SubscriptionVerify, SubscriptionResponse
from auth.dependencies import verify_token, has_permissions, get_user_id, get_user_permissions
from auth.payment import PaymentManager
from web.webhook import router as webhook_router
from models.state import user_usage

# Load environment variables
load_dotenv()

app = FastAPI(
    title="SAAS API",
    description="Backend API for SAAS application with Auth0 integration",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",  # React development server
    "http://localhost:8000",  # FastAPI development server
    os.getenv("FRONTEND_URL", ""),  # Production frontend URL
    "*"  # Allow all origins temporarily for debugging
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    """Check if the API is running"""
    return {"status": "healthy"}

# User profile endpoints
@app.get("/api/profile", response_model=UserProfile, tags=["User"])
async def get_profile(payload: dict = Depends(verify_token)):
    """Get the current user's profile"""
    try:
        from auth.management import auth0_management
        user_id = payload.get("sub")
        user_data = await auth0_management.get_user_info(user_id)
        
        return UserProfile(
            user_id=user_id,
            email=user_data.get("email", ""),
            name=user_data.get("name"),
            picture=user_data.get("picture"),
            permissions=payload.get("permissions", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
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

# User usage is now imported from models.state

def get_monthly_limit(subscription_tier: str) -> int:
    """Get monthly message limit based on subscription tier"""
    limits = {
        "basic": float('inf'),    # Basic tier: 1000 messages/month
        "pro": 600  # Pro tier: unlimited
    }
    return limits.get(subscription_tier, 0)

@app.get("/api/usage", tags=["Payment"])
async def get_usage(payload: dict = Depends(verify_token)):
    """Get current user's usage information"""
    user_id = payload.get("sub")
    usage = user_usage.get(user_id, UserUsage(user_id=user_id, prompt_count=0, is_paid=False))
    return usage

# In main.py, add these endpoints:

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

@app.post("/api/subscription/verify", tags=["Subscription"])
async def verify_subscription(
    verification: SubscriptionVerify, 
    payload: dict = Depends(verify_token)
):
    """Verify a subscription payment and activate user's subscription"""
    user_id = payload.get("sub")
    if await payment_manager.verify_subscription_payment(verification):
        # Update user's subscription status
        subscription_details = await payment_manager.get_subscription_details(
            verification.razorpay_subscription_id
        )
        
        # Calculate subscription end date
        from datetime import datetime, timedelta
        if subscription_details.get('current_end'):
            end_date = datetime.fromtimestamp(subscription_details['current_end'])
        else:
            end_date = datetime.now() + timedelta(days=30)  # Default 30 days
        
        user_usage[user_id] = UserUsage(
            user_id=user_id,
            prompt_count=0,
            last_payment_date=datetime.now(),
            is_paid=True,
            subscription_tier=subscription_details.get('plan_id'),
            subscription_end_date=end_date
        )
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
        return {"status": "success", "message": "Subscription cancelled successfully"}
    return {"status": "error", "message": "Failed to cancel subscription"}

# In main.py, update the chat endpoint:
@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest, payload: dict = Depends(verify_token)):
    """Process chat messages through OpenRouter"""
    user_id = payload.get("sub")
    usage = user_usage.get(user_id, UserUsage(user_id=user_id, prompt_count=0, is_paid=False))
    
    print(f"User {user_id} - Current usage: {usage.prompt_count} messages, Paid: {usage.is_paid}")
    
    # Check subscription status and expiry
    if usage.subscription_end_date and usage.subscription_end_date < datetime.now():
        print(f"User {user_id} - Subscription expired")
        usage.is_paid = False
        usage.subscription_tier = None
        user_usage[user_id] = usage  # Update stored usage
    
    # Check if user has exceeded free limit and hasn't paid
    if usage.prompt_count >= 3 and not usage.is_paid:
        print(f"User {user_id} - Trial limit reached, requesting payment")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Free trial limit reached. Please subscribe to continue."
        )
    
    # Check monthly limits based on subscription tier
    if usage.is_paid and usage.subscription_tier:
        monthly_limit = get_monthly_limit(usage.subscription_tier)
        if usage.prompt_count >= monthly_limit:
            print(f"User {user_id} - Monthly limit reached for {usage.subscription_tier} plan")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Monthly limit reached for {usage.subscription_tier} plan. Please upgrade."
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
            "X-Title": "SAAS Chat Application",  # Add application identifier
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
                    "model": request.model or "tngtech/deepseek-r1t2-chimera:free",  # Allow model selection
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
            
            # Increment usage counter
            usage.prompt_count += 1
            user_usage[user_id] = usage
            
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

# Include the webhook router
app.include_router(webhook_router)

if __name__ == "__main__":
    
    
    # Update CORS settings with ngrok URL
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Start the FastAPI server
    uvicorn.run("main:app", host="0.0.0.0", port= 8000, reload=True)