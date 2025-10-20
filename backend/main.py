import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
import os
import httpx
from typing import List, Optional

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)