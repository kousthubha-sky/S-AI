# backend/web/github.py - GitHub Integration API

from fastapi import APIRouter, Depends, HTTPException, status
from auth.dependencies import verify_token
from auth.management import auth0_management
import httpx
from typing import List, Dict, Optional
from utils.github_processor import GitHubContentProcessor
from utils.validators import InputValidator
import base64
from datetime import datetime
import os
from urllib.parse import quote
from services.github_cache import GitHubCacheService

router = APIRouter()

async def get_github_token(user_id: str) -> Optional[str]:
    """Get GitHub access token from Auth0 user metadata"""
    try:
        user_info = await auth0_management.get_user_info(user_id)
        print(f"User info for {user_id}: {user_info}")

        # First check user metadata (set by PostLogin flow)
        user_metadata = user_info.get('user_metadata', {})
        github_token = user_metadata.get('github_access_token')
        if github_token:
            print(f"Found GitHub token in user_metadata")
            return github_token

        # Fallback: check identities
        identities = user_info.get('identities', [])
        print(f"User identities: {identities}")
        github_identity = next(
            (i for i in identities if i.get('provider') == 'github'),
            None
        )

        if github_identity and github_identity.get('access_token'):
            print(f"Found GitHub token in identity")
            return github_identity['access_token']

        print(f"No GitHub token found for user {user_id}")
        return None

    except Exception as e:
        print(f"Error getting GitHub token: {e}")
        import traceback
        traceback.print_exc()
        return None


@router.get("/api/github/repos", tags=["GitHub"])
async def get_github_repos(
    page: int = 1,
    per_page: int = 30,
    payload: dict = Depends(verify_token)
):
    """Get user's GitHub repositories (with caching)"""
    user_id = payload.get("sub")
    
    # ✅ Check cache first
    cached_repos = GitHubCacheService.get_repos(user_id, page)
    if cached_repos:
        return cached_repos
    
    github_token = await get_github_token(user_id)
    if not github_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub account not connected. Please reconnect your GitHub account."
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # Get user's repos (both owned and accessible)
            response = await client.get(
                "https://api.github.com/user/repos",
                params={
                    "sort": "updated",
                    "per_page": per_page,
                    "page": page,
                    "affiliation": "owner,collaborator,organization_member"
                },
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=30.0
            )
            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="GitHub token expired. Please reconnect your GitHub account."
                )
            
            response.raise_for_status()
            repos = response.json()
            
            # Format response
            formatted_repos = []
            for repo in repos:
                formatted_repos.append({
                    "id": repo["id"],
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "owner": repo["owner"]["login"],
                    "private": repo["private"],
                    "description": repo.get("description"),
                    "url": repo["html_url"],
                    "default_branch": repo["default_branch"],
                    "updated_at": repo["updated_at"],
                    "language": repo.get("language"),
                    "size": repo["size"]
                })
            
            result = {
                "repos": formatted_repos,
                "page": page,
                "per_page": per_page
            }
            
            # ✅ Cache the result
            GitHubCacheService.set_repos(user_id, page, result)
            
            return result
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"GitHub API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch repositories: {str(e)}"
        )


@router.get("/api/github/repos/{owner}/{repo}/contents{path:path}", tags=["GitHub"])
async def get_repo_contents(
    owner: str,
    repo: str,
    path: str = "",
    payload: dict = Depends(verify_token)
):
    """Get contents of a repository path"""
    user_id = payload.get("sub")

    # Validate and sanitize GitHub identifiers
    owner = InputValidator.sanitize_string(owner, max_length=100)
    repo = InputValidator.sanitize_string(repo, max_length=100)
    path = InputValidator.sanitize_string(path, max_length=500)

    github_token = await get_github_token(user_id)
    if not github_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub account not connected"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            encoded_path = quote(path.lstrip('/')) if path else ""
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}"
            
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=30.0
            )
            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="GitHub token expired"
                )
            
            response.raise_for_status()
            contents = response.json()
            
            # If single file, return as array
            if isinstance(contents, dict):
                contents = [contents]
            
            # Format and filter contents
            formatted_contents = []
            for item in contents:
                # Skip large files and binaries
                if item["type"] == "file" and item.get("size", 0) > 1_000_000:
                    continue
                
                formatted_contents.append({
                    "name": item["name"],
                    "path": item["path"],
                    "type": item["type"],
                    "size": item.get("size", 0),
                    "download_url": item.get("download_url"),
                    "sha": item["sha"]
                })
            
            return {
                "contents": formatted_contents,
                "path": path
            }
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository or path not found"
            )
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"GitHub API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch contents: {str(e)}"
        )


# backend/routes/github.py - UPDATED
# backend/web/github.py - FETCH ENDPOINT ONLY (REPLACE IN YOUR FILE)

@router.post("/api/github/files/fetch", tags=["GitHub"])
async def fetch_github_files(
    request_data: dict,
    payload: dict = Depends(verify_token)
):
    """Fetch GitHub files with enhanced safety processing"""
    user_id = payload.get("sub")
    
    # Get GitHub token
    github_token = await get_github_token(user_id)
    if not github_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub account not connected"
        )
    
    try:
        files = request_data.get('files', [])
        
        if not files:
            return {'files': [], 'total': 0}
        
        if len(files) > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 20 files allowed"
            )
        
        fetched_files = []
        
        async with httpx.AsyncClient() as client:
            for file_info in files:
                try:
                    owner = file_info.get('owner')
                    repo = file_info.get('repo')
                    path = file_info.get('path')
                    
                    if not all([owner, repo, path]):
                        print(f"⚠️ Missing required fields in file_info")
                        continue
                    
                    # Fetch from GitHub API
                    encoded_path = quote(path) if path else ""
                    url = f'https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}'
                    
                    response = await client.get(
                        url,
                        headers={
                            'Authorization': f'Bearer {github_token}',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Decode content (GitHub returns base64)
                        content_encoded = data.get('content', '')
                        if content_encoded:
                            try:
                                content = base64.b64decode(content_encoded).decode('utf-8')
                            except UnicodeDecodeError:
                                print(f"⚠️ Failed to decode {path} as UTF-8 (binary file?)")
                                continue
                        else:
                            content = ""
                        
                        # Get file details
                        file_name = data.get('name', '')
                        language = GitHubContentProcessor.detect_language(file_name)
                        
                        fetched_files.append({
                            'name': file_name,
                            'path': path,
                            'repo': f'{owner}/{repo}',
                            'content': content,
                            'language': language,
                            'size': len(content),
                            'sha': data.get('sha', '')
                        })
                        
                        print(f"✅ Fetched {file_name}: {len(content)} chars")
                    else:
                        print(f"⚠️ Failed to fetch {owner}/{repo}/{path}: {response.status_code}")
                        
                except Exception as e:
                    print(f"⚠️ Error fetching file {file_info}: {e}")
                    continue
        
        # ✅ Process files for safety with GitHubContentProcessor
        processed = GitHubContentProcessor.preprocess_files_for_context(fetched_files)
        
        print(f"📊 Processed {processed['successfully_processed']} files")
        
        return {
            'files': processed['files'],
            'total': processed['successfully_processed'],
            'warnings': processed.get('warnings', [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in fetch_github_files: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch GitHub files: {str(e)}"
        )
        
@router.get("/api/github/status", tags=["GitHub"])
async def github_connection_status(payload: dict = Depends(verify_token)):
    """Check GitHub connection status"""
    user_id = payload.get("sub")
    print(f"Checking GitHub status for user: {user_id}")

    github_token = await get_github_token(user_id)

    if not github_token:
        print(f"No GitHub token found for user {user_id}")
        return {
            "connected": False,
            "message": "GitHub account not connected"
        }

    print(f"Found GitHub token, verifying...")
    # Verify token is valid
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
                user_data = response.json()
                print(f"GitHub token valid for user: {user_data.get('login')}")
                return {
                    "connected": True,
                    "username": user_data.get("login"),
                    "name": user_data.get("name"),
                    "avatar_url": user_data.get("avatar_url")
                }
            else:
                print(f"GitHub token invalid, status: {response.status_code}")
                return {
                    "connected": False,
                    "message": "GitHub token expired or invalid"
                }

    except Exception as e:
        print(f"Error verifying GitHub token: {e}")
        return {
            "connected": False,
            "message": "Failed to verify GitHub connection"
        }


@router.post("/api/github/connect", tags=["GitHub"])
async def connect_github_account(token_data: dict, payload: dict = Depends(verify_token)):
    """Manually connect GitHub account with personal access token"""
    user_id = payload.get("sub")
    github_token = token_data.get("token")

    if not github_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub token is required"
        )

    # Sanitize the GitHub token
    github_token = InputValidator.sanitize_string(github_token, max_length=200)

    try:
        # Verify token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"token {github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid GitHub token"
                )

            user_data = response.json()

        # Save token to user metadata
        await auth0_management.update_user_metadata(user_id, {
            "github_access_token": github_token,
            "github_username": user_data.get("login"),
            "github_id": user_data.get("id"),
            "github_connected_at": datetime.now().isoformat()
        })

        return {
            "connected": True,
            "username": user_data.get("login"),
            "message": "GitHub account connected successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect GitHub account: {str(e)}"
        )