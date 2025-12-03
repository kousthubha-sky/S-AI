# backend/services/github_cache.py - NEW FILE

import json
from typing import Optional, Dict, Any
from datetime import timedelta

try:
    from redis_config import redis_client
except ImportError:
    redis_client = None
    print("⚠️ Redis not available for GitHub caching")

class GitHubCacheService:
    """Cache GitHub connection status and data"""
    
    # Cache keys
    CONNECTION_STATUS_PREFIX = "github:connection:"
    REPOS_PREFIX = "github:repos:"
    
    # Cache durations
    CONNECTION_TTL = 3600  # 1 hour
    REPOS_TTL = 600  # 10 minutes
    
    @staticmethod
    def get_connection_status(user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached GitHub connection status"""
        if not redis_client:
            return None
        
        try:
            key = f"{GitHubCacheService.CONNECTION_STATUS_PREFIX}{user_id}"
            cached = redis_client.get(key)
            
            if cached:
                if isinstance(cached, bytes):
                    cached = cached.decode('utf-8')
                
                data = json.loads(cached)
                print(f"✅ Cache HIT: GitHub connection status for {user_id}")
                return data
            
            print(f"❌ Cache MISS: GitHub connection status for {user_id}")
            return None
            
        except Exception as e:
            print(f"⚠️ Error reading GitHub connection cache: {e}")
            return None
    
    @staticmethod
    def set_connection_status(user_id: str, status: Dict[str, Any]) -> bool:
        """Cache GitHub connection status"""
        if not redis_client:
            return False
        
        try:
            key = f"{GitHubCacheService.CONNECTION_STATUS_PREFIX}{user_id}"
            value = json.dumps(status)
            
            redis_client.setex(
                key,
                GitHubCacheService.CONNECTION_TTL,
                value
            )
            
            print(f"✅ Cached GitHub connection status for {user_id}")
            return True
            
        except Exception as e:
            print(f"⚠️ Error caching GitHub connection status: {e}")
            return False
    
    @staticmethod
    def invalidate_connection_status(user_id: str) -> bool:
        """Invalidate cached connection status"""
        if not redis_client:
            return False
        
        try:
            key = f"{GitHubCacheService.CONNECTION_STATUS_PREFIX}{user_id}"
            redis_client.delete(key)
            
            print(f"🗑️ Invalidated GitHub connection cache for {user_id}")
            return True
            
        except Exception as e:
            print(f"⚠️ Error invalidating connection cache: {e}")
            return False
    
    @staticmethod
    def get_repos(user_id: str, page: int = 1) -> Optional[Dict[str, Any]]:
        """Get cached GitHub repositories"""
        if not redis_client:
            return None
        
        try:
            key = f"{GitHubCacheService.REPOS_PREFIX}{user_id}:page:{page}"
            cached = redis_client.get(key)
            
            if cached:
                if isinstance(cached, bytes):
                    cached = cached.decode('utf-8')
                
                data = json.loads(cached)
                print(f"✅ Cache HIT: GitHub repos for {user_id} page {page}")
                return data
            
            return None
            
        except Exception as e:
            print(f"⚠️ Error reading repos cache: {e}")
            return None
    
    @staticmethod
    def set_repos(user_id: str, page: int, repos_data: Dict[str, Any]) -> bool:
        """Cache GitHub repositories"""
        if not redis_client:
            return False
        
        try:
            key = f"{GitHubCacheService.REPOS_PREFIX}{user_id}:page:{page}"
            value = json.dumps(repos_data)
            
            redis_client.setex(
                key,
                GitHubCacheService.REPOS_TTL,
                value
            )
            
            print(f"✅ Cached repos for {user_id} page {page}")
            return True
            
        except Exception as e:
            print(f"⚠️ Error caching repos: {e}")
            return False
    
    @staticmethod
    def invalidate_repos(user_id: str) -> bool:
        """Invalidate all cached repos for user"""
        if not redis_client:
            return False
        
        try:
            # Delete all repo pages
            pattern = f"{GitHubCacheService.REPOS_PREFIX}{user_id}:page:*"
            
            # Get all matching keys
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
                print(f"🗑️ Invalidated {len(keys)} repo cache entries for {user_id}")
            
            return True
            
        except Exception as e:
            print(f"⚠️ Error invalidating repos cache: {e}")
            return False