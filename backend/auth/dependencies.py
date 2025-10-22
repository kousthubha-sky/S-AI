from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from functools import wraps
import jwt
from jwt import PyJWTError
import httpx
from functools import lru_cache
import os

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
    except PyJWTError:
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
        
        # Check if required environment variables are set
        auth0_domain = os.getenv("AUTH0_DOMAIN")
        auth0_audience = os.getenv("AUTH0_API_AUDIENCE")
        
        if not auth0_domain or not auth0_audience:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Auth0 configuration missing"
            )
        
        rsa_key = get_rsa_key(token)
        
        # Convert RSA key to PEM format for PyJWT
        from jwt.algorithms import RSAAlgorithm
        public_key = RSAAlgorithm.from_jwk(rsa_key)
        
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=auth0_audience,
            issuer=f"https://{auth0_domain}/"
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification failed: {str(e)}"
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
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    return user_id

def get_user_permissions(payload: dict = Depends(verify_token)) -> List[str]:
    """
    Extract permissions from the token payload
    """
    return payload.get("permissions", [])