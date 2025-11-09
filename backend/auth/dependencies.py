# auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from functools import wraps
import httpx
from functools import lru_cache
import os
from datetime import datetime

# USE ONLY JOSE - remove pyjwt imports
from jose import jwt, JWTError, ExpiredSignatureError

# Import Supabase database service
from services.supabase_database import db

security = HTTPBearer()

@lru_cache()
def get_jwks():
    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
    if not AUTH0_DOMAIN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AUTH0_DOMAIN environment variable not set"
        )
    
    url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    try:
        with httpx.Client() as client:
            response = client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch JWKS: {str(e)}"
        )

def get_rsa_key(token: str):
    try:
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header"
        )
    
    rsa_key = {}
    if "kid" not in unverified_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No key ID in token header"
        )
    
    for key in jwks["keys"]:
        if key["kid"] == unverified_header["kid"]:
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"]
            }
            break
    
    if not rsa_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid key ID"
        )
    
    return rsa_key

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify the JWT token and return the payload
    """
    try:
        token = credentials.credentials
        
        # Check if required environment variables are set
        auth0_domain = os.getenv("AUTH0_DOMAIN")
        auth0_audience = os.getenv("AUTH0_API_AUDIENCE")
        
        if not auth0_domain or not auth0_audience:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Auth0 configuration missing"
            )
        
        rsa_key = get_rsa_key(token)
        
        # Use jose.jwt.decode with the RSA key directly
        payload = jwt.decode(
            token,
            rsa_key,  # jose can use the key directly
            algorithms=["RS256"],
            audience=auth0_audience,
            issuer=f"https://{auth0_domain}/"
        )
        
        # Ensure user exists in Supabase database
        user_id = payload.get("sub")
        if user_id:
            ensure_user_in_database(payload)
        
        return payload
        
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except JWTError as e:  # FIXED: Use JWTError from jose
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification failed: {str(e)}"
        )

def ensure_user_in_database(payload: dict):
    """
    Ensure user exists in Supabase database, create if not exists
    """
    try:
        user_id = payload.get("sub")
        email = payload.get("email")
        name = payload.get("name")
        
        if not user_id:
            return
        
        # Check if user exists in database
        existing_user = db.get_user_by_auth0_id(user_id)
        if existing_user:
            return existing_user
        
        # Create new user if doesn't exist
        user_data = {
            "auth0_id": user_id,
            "email": email or "",
            "name": name or "User",
            "subscription_tier": "free",
            "is_active": True,
            "is_paid": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        new_user = db.create_user(user_data)
        return new_user
        
    except Exception as e:
        print(f"Error ensuring user in database: {str(e)}")
        # Don't raise exception here to avoid breaking auth flow
        return None
            
def has_permissions(required_permissions: List[str]):
    """
    Dependency to check if the user has the required permissions
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, payload: dict = Depends(verify_token), **kwargs):
            user_permissions = payload.get("permissions", [])
            for permission in required_permissions:
                if permission not in user_permissions:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Permission '{permission}' required"
                    )
            return await func(*args, payload=payload, **kwargs)
        return wrapper
    return decorator

async def get_user_id(payload: dict = Depends(verify_token)) -> str:
    """
    Extract user ID from the token payload and ensure user exists in database
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    # Ensure user exists in database
    ensure_user_in_database(payload)
    
    return user_id

async def get_user_permissions(payload: dict = Depends(verify_token)) -> List[str]:
    """
    Extract permissions from the token payload
    """
    return payload.get("permissions", [])

async def get_current_user(payload: dict = Depends(verify_token)) -> dict:
    """
    Get current user data from Supabase database
    """
    try:
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        user_data = db.get_user_by_auth0_id(user_id)
        if not user_data:
            # Create user if doesn't exist
            user_data = ensure_user_in_database(payload)
        
        return user_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user data: {str(e)}"
        )

def require_subscription(tier: str = "pro"):
    """
    Dependency to check if user has required subscription tier
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, payload: dict = Depends(verify_token), **kwargs):
            user_id = payload.get("sub")
            
            # Get user from database to check subscription
            user_data = db.get_user_by_auth0_id(user_id)
            if not user_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user_tier = user_data.get("subscription_tier", "free")
            is_paid = user_data.get("is_paid", False)
            subscription_end = user_data.get("subscription_end_date")
            
            # Check if subscription is active and not expired
            if subscription_end:
                from datetime import datetime
                if datetime.fromisoformat(subscription_end) < datetime.now():
                    is_paid = False
            
            # Check tier requirements
            tier_hierarchy = {"free": 0, "basic": 1, "pro": 2}
            required_level = tier_hierarchy.get(tier, 0)
            user_level = tier_hierarchy.get(user_tier, 0)
            
            if user_level < required_level or not is_paid:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"{tier.capitalize()} subscription required"
                )
            
            return await func(*args, payload=payload, **kwargs)
        return wrapper
    return decorator