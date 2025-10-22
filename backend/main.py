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
from models.chat import ChatRequest, ChatResponse
from models.auth import UserProfile, ErrorResponse
from auth.dependencies import verify_token, has_permissions, get_user_id, get_user_permissions

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

# In main.py, update the chat endpoint:
@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest, payload: dict = Depends(verify_token)):
    """Process chat messages through OpenRouter"""
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
  
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)