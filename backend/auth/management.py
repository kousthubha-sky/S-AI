from datetime import datetime, timedelta
import httpx
import os
from typing import Optional
import asyncio
from fastapi import HTTPException, status

class Auth0ManagementAPI:
    def __init__(self):
        self._token = None
        self._token_expires_at = None
        self._lock = asyncio.Lock()
        
    async def get_token(self) -> str:
        """
        Get a valid Management API token.
        If there's no token or it's expired, get a new one.
        """
        async with self._lock:
            if not self._is_token_valid():
                await self._fetch_new_token()
            return self._token

    def _is_token_valid(self) -> bool:
        """Check if the current token is valid and not expired"""
        if not self._token or not self._token_expires_at:
            return False
        # Add 5 minute buffer before expiration
        return datetime.now() < self._token_expires_at - timedelta(minutes=5)

    async def _fetch_new_token(self) -> None:
        """Fetch a new Management API token"""
        try:
            auth0_domain = os.getenv("AUTH0_DOMAIN")
            url = f"https://{auth0_domain}/oauth/token"
            
            payload = {
                "client_id": os.getenv("AUTH0_CLIENT_ID"),
                "client_secret": os.getenv("AUTH0_CLIENT_SECRET"),
                "audience": f"https://{auth0_domain}/api/v2/",
                "grant_type": "client_credentials"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload)
                data = response.json()
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to get management token: {data.get('error_description', 'Unknown error')}"
                    )
                
                self._token = data["access_token"]
                # Token expires in 24 hours by default
                self._token_expires_at = datetime.now() + timedelta(seconds=data["expires_in"])
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching management token: {str(e)}"
            )

    async def get_user_info(self, user_id: str) -> dict:
        """
        Get user information from Auth0
        """
        try:
            token = await self.get_token()
            auth0_domain = os.getenv("AUTH0_DOMAIN")
            url = f"https://{auth0_domain}/api/v2/users/{user_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail="Failed to fetch user information"
                    )
                    
                return response.json()
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching user info: {str(e)}"
            )

    async def update_user_metadata(self, user_id: str, metadata: dict) -> dict:
        """
        Update user metadata in Auth0
        """
        try:
            token = await self.get_token()
            auth0_domain = os.getenv("AUTH0_DOMAIN")
            url = f"https://{auth0_domain}/api/v2/users/{user_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    json={"user_metadata": metadata}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail="Failed to update user metadata"
                    )
                    
                return response.json()
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating user metadata: {str(e)}"
            )

    async def get_user_roles(self, user_id: str) -> list:
        """
        Get user roles from Auth0
        """
        try:
            token = await self.get_token()
            auth0_domain = os.getenv("AUTH0_DOMAIN")
            url = f"https://{auth0_domain}/api/v2/users/{user_id}/roles"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail="Failed to fetch user roles"
                    )
                    
                return response.json()
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching user roles: {str(e)}"
            )

# Create a singleton instance
auth0_management = Auth0ManagementAPI()