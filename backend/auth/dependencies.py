from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from functools import wraps
import jwt
import httpx
from functools import lru_cache
import os

security = HTTPBearer()

@lru_cache()
def get_jwks():
    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
    url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    with httpx.Client() as client:
        response = client.get(url)
        return response.json()

def get_key(token: str):
    jwks = get_jwks()
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.JWTError:
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

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify the JWT token and return the payload
    """
    try:
        token = credentials.credentials
        rsa_key = get_key(token)
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=os.getenv("AUTH0_API_AUDIENCE"),
            issuer=f"https://{os.getenv('AUTH0_DOMAIN')}/"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTClaimsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid claims"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

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

def get_user_id(payload: dict = Depends(verify_token)) -> str:
    """
    Extract user ID from the token payload
    """
    return payload.get("sub")

def get_user_permissions(payload: dict = Depends(verify_token)) -> List[str]:
    """
    Extract permissions from the token payload
    """
    return payload.get("permissions", [])