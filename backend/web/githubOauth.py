# backend/web/github_oauth.py
# NEW FILE: Handles GitHub OAuth flow independent of login

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from auth.dependencies import verify_token
from auth.management import auth0_management
import httpx
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory state store (use Redis in production)
oauth_states = {}

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Required GitHub scopes
GITHUB_SCOPES = "repo,read:user,user:email"


@router.get("/api/github/oauth/authorize", tags=["GitHub OAuth"])
async def github_oauth_authorize(payload: dict = Depends(verify_token)):
    """
    Initiate GitHub OAuth flow
    Returns authorization URL for user to visit
    """
    user_id = payload.get("sub")
    
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth not configured"
        )
    
    # Generate secure state token
    state = secrets.token_urlsafe(32)
    
    # Store state with user_id (expires in 10 minutes)
    oauth_states[state] = {
        "user_id": user_id,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(minutes=10)
    }
    
    # Clean up expired states
    current_time = datetime.now()
    expired_states = [
        s for s, data in oauth_states.items() 
        if data["expires_at"] < current_time
    ]
    for s in expired_states:
        del oauth_states[s]
    
    # Build GitHub authorization URL
    redirect_uri = f"{BACKEND_URL}/api/github/oauth/callback"
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={GITHUB_SCOPES}"
        f"&state={state}"
    )
    
    logger.info(f"Initiating GitHub OAuth for user: {user_id}")
    
    return {
        "authorization_url": github_auth_url,
        "state": state
    }


@router.get("/api/github/oauth/callback", tags=["GitHub OAuth"])
async def github_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None
):
    """
    Handle GitHub OAuth callback
    Exchange code for access token and store in user metadata
    """
    
    # Handle OAuth errors
    if error:
        logger.error(f"GitHub OAuth error: {error} - {error_description}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard?github_error={error}",
            status_code=status.HTTP_302_FOUND
        )
    
    # Validate required parameters
    if not code or not state:
        logger.error("Missing code or state in OAuth callback")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard?github_error=invalid_request",
            status_code=status.HTTP_302_FOUND
        )
    
    # Verify state token
    if state not in oauth_states:
        logger.error(f"Invalid or expired state token: {state}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard?github_error=invalid_state",
            status_code=status.HTTP_302_FOUND
        )
    
    state_data = oauth_states[state]
    
    # Check if state has expired
    if state_data["expires_at"] < datetime.now():
        del oauth_states[state]
        logger.error(f"Expired state token: {state}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard?github_error=expired_state",
            status_code=status.HTTP_302_FOUND
        )
    
    user_id = state_data["user_id"]
    
    # Clean up used state
    del oauth_states[state]
    
    try:
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={
                    "Accept": "application/json"
                },
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{BACKEND_URL}/api/github/oauth/callback"
                },
                timeout=30.0
            )
            
            if token_response.status_code != 200:
                logger.error(f"GitHub token exchange failed: {token_response.text}")
                return RedirectResponse(
                    url=f"{FRONTEND_URL}/oauth-callback?github_error=token_exchange_failed",
                    status_code=status.HTTP_302_FOUND
                )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                logger.error("No access token in GitHub response")
                return RedirectResponse(
                    url=f"{FRONTEND_URL}/oauth-callback?github_error=no_token",
                    status_code=status.HTTP_302_FOUND
                )
            
            # Get GitHub user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=30.0
            )
            
            if user_response.status_code != 200:
                logger.error(f"Failed to get GitHub user info: {user_response.text}")
                return RedirectResponse(
                    url=f"{FRONTEND_URL}/oauth-callback?github_error=user_info_failed",
                    status_code=status.HTTP_302_FOUND
                )
            
            github_user = user_response.json()
            
            # Store GitHub token and user info in Auth0 user metadata
            await auth0_management.update_user_metadata(user_id, {
                "github_access_token": access_token,
                "github_username": github_user.get("login"),
                "github_id": github_user.get("id"),
                "github_avatar_url": github_user.get("avatar_url"),
                "github_connected_at": datetime.now().isoformat(),
                "github_scopes": token_data.get("scope", GITHUB_SCOPES)
            })
            
            logger.info(f"Successfully connected GitHub for user: {user_id} (GitHub: {github_user.get('login')})")
            
            # Return HTML page that communicates with parent window
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>GitHub Connection Complete</title>
                <script>
                    window.opener.postMessage('github_connected', '{FRONTEND_URL}');
                    window.close();
                </script>
            </head>
            <body>
                <p>GitHub connection successful! You can close this window.</p>
            </body>
            </html>
            """
            
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html_content, status_code=200)
            
    except Exception as e:
        logger.error(f"Error in GitHub OAuth callback: {str(e)}")
        import traceback
        traceback.print_exc()
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>GitHub Connection Failed</title>
            <script>
                window.opener.postMessage('github_error', '{FRONTEND_URL}');
                window.close();
            </script>
        </head>
        <body>
            <p>Failed to connect GitHub. Please try again.</p>
        </body>
        </html>
        """
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content, status_code=200)

@router.post("/api/github/oauth/disconnect", tags=["GitHub OAuth"])
async def github_disconnect(payload: dict = Depends(verify_token)):
    """
    Disconnect GitHub account
    Removes GitHub token from user metadata
    """
    user_id = payload.get("sub")
    
    try:
        # Get current user metadata
        user_info = await auth0_management.get_user_info(user_id)
        user_metadata = user_info.get("user_metadata", {})
        
        # Remove GitHub-related fields
        github_fields = [
            "github_access_token",
            "github_username", 
            "github_id",
            "github_avatar_url",
            "github_connected_at",
            "github_scopes"
        ]
        
        for field in github_fields:
            user_metadata.pop(field, None)
        
        # Update user metadata
        await auth0_management.update_user_metadata(user_id, user_metadata)
        
        logger.info(f"Disconnected GitHub for user: {user_id}")
        
        return {
            "success": True,
            "message": "GitHub account disconnected successfully"
        }
        
    except Exception as e:
        logger.error(f"Error disconnecting GitHub: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect GitHub: {str(e)}"
        )


@router.get("/api/github/oauth/status", tags=["GitHub OAuth"])
async def github_connection_status_detailed(payload: dict = Depends(verify_token)):
    """
    Get detailed GitHub connection status including username and avatar
    """
    user_id = payload.get("sub")
    
    try:
        user_info = await auth0_management.get_user_info(user_id)
        user_metadata = user_info.get("user_metadata", {})
        
        github_token = user_metadata.get("github_access_token")
        
        if not github_token:
            return {
                "connected": False,
                "username": None,
                "avatar_url": None,
                "connected_at": None
            }
        
        # Verify token is still valid
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.github.com/user",
                    headers={
                        "Authorization": f"Bearer {github_token}",
                        "Accept": "application/vnd.github.v3+json"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    github_user = response.json()
                    return {
                        "connected": True,
                        "username": github_user.get("login"),
                        "avatar_url": github_user.get("avatar_url"),
                        "connected_at": user_metadata.get("github_connected_at"),
                        "scopes": user_metadata.get("github_scopes", GITHUB_SCOPES)
                    }
                else:
                    # Token invalid, clean up metadata
                    logger.warning(f"Invalid GitHub token for user {user_id}, cleaning up")
                    await auth0_management.update_user_metadata(user_id, {
                        "github_access_token": None,
                        "github_username": None,
                        "github_id": None
                    })
                    return {
                        "connected": False,
                        "username": None,
                        "avatar_url": None,
                        "connected_at": None,
                        "error": "Token expired or invalid"
                    }
                    
        except Exception as verify_error:
            logger.error(f"Error verifying GitHub token: {verify_error}")
            return {
                "connected": False,
                "username": user_metadata.get("github_username"),
                "avatar_url": user_metadata.get("github_avatar_url"),
                "connected_at": user_metadata.get("github_connected_at"),
                "error": "Failed to verify token"
            }
            
    except Exception as e:
        logger.error(f"Error checking GitHub status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check GitHub status: {str(e)}"
        )