# backend/auth/auth0_handlers.py
from fastapi import APIRouter, Depends, HTTPException, status
from services.supabase_database import db
from datetime import datetime

router = APIRouter()

@router.post("/api/users/validate")
async def validate_user(data: dict):
    """Validate user before registration"""
    email = data.get("email")
    
    # Check if email is blacklisted or invalid
    if email and email.endswith("@tempmail.com"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email domain not allowed"
        )
    
    return {"valid": True}

@router.post("/api/users/password-changed")
async def password_changed(data: dict):
    """Handle password change notification"""
    user_id = data.get("user_id")
    
    # Update password change timestamp
    await db.update_user(user_id, {
        "password_changed_at": datetime.now().isoformat()
    })
    
    return {"status": "success"}