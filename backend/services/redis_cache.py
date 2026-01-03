# Create new file: backend/services/redis_cache.py

import redis
import json
import os
from typing import Optional, List, Dict, Any
from datetime import timedelta

class RedisCache:
    """Redis cache service for chat sessions and messages"""
    
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6380")
        
        try:
            self.redis = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis.ping()
            print("[OK] Redis connected successfully")
            self.enabled = True
        except Exception as e:
            print(f"[WARNING] Redis not available: {e}")
            print("[WARNING] Running without cache")
            self.enabled = False
            self.redis = None
            self.memory_cache = {}
    
    def _get_session_key(self, session_id: str) -> str:
        """Generate cache key for session metadata"""
        return f"session:{session_id}"
    
    def _get_messages_key(self, session_id: str) -> str:
        """Generate cache key for session messages"""
        return f"messages:{session_id}"
    
    def _get_user_sessions_key(self, user_id: str) -> str:
        """Generate cache key for user's session list"""
        return f"user_sessions:{user_id}"
    
    # ==================== SESSION OPERATIONS ====================
    
    async def cache_session(self, session_id: str, session_data: Dict[str, Any], ttl: int = 3600):
        """
        Cache a chat session
        TTL: 1 hour by default (3600 seconds)
        """
        if not self.enabled:
            return False
        
        try:
            key = self._get_session_key(session_id)
            self.redis.setex(
                key,
                ttl,
                json.dumps(session_data)
            )
            return True
        except Exception as e:
            print(f"Redis cache_session error: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get cached session metadata"""
        if not self.enabled:
            return None
        
        try:
            key = self._get_session_key(session_id)
            data = self.redis.get(key)
            
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Redis get_session error: {e}")
            return None
    
    # ==================== MESSAGE OPERATIONS ====================
    
    async def cache_messages(self, session_id: str, messages: List[Dict[str, Any]], ttl: int = 3600):
        """
        Cache all messages for a session
        TTL: 1 hour by default
        """
        if not self.enabled:
            return False
        
        try:
            key = self._get_messages_key(session_id)
            self.redis.setex(
                key,
                ttl,
                json.dumps(messages)
            )
            return True
        except Exception as e:
            print(f"Redis cache_messages error: {e}")
            return False
    
    async def get_messages(self, session_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached messages for a session"""
        if not self.enabled:
            return None
        
        try:
            key = self._get_messages_key(session_id)
            data = self.redis.get(key)
            
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Redis get_messages error: {e}")
            return None
    
    async def append_message(self, session_id: str, message: Dict[str, Any]):
        """
        Append a new message to cached session
        This updates the cache without hitting the database
        """
        if not self.enabled:
            return False
        
        try:
            # Get existing messages
            messages = await self.get_messages(session_id)
            
            if messages is None:
                # If not cached, just cache this single message
                messages = [message]
            else:
                messages.append(message)
            
            # Update cache
            await self.cache_messages(session_id, messages)
            return True
        except Exception as e:
            print(f"Redis append_message error: {e}")
            return False
    
    # ==================== USER SESSION LIST OPERATIONS ====================
    
    async def cache_user_sessions(self, user_id: str, sessions: List[Dict[str, Any]], ttl: int = 1800):
        """
        Cache user's session list
        TTL: 30 minutes (1800 seconds)
        """
        if not self.enabled:
            return False
        
        try:
            key = self._get_user_sessions_key(user_id)
            self.redis.setex(
                key,
                ttl,
                json.dumps(sessions)
            )
            return True
        except Exception as e:
            print(f"Redis cache_user_sessions error: {e}")
            return False
    
    async def get_user_sessions(self, user_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached user session list"""
        if not self.enabled:
            return None
        
        try:
            key = self._get_user_sessions_key(user_id)
            data = self.redis.get(key)
            
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Redis get_user_sessions error: {e}")
            return None
    
    # ==================== INVALIDATION OPERATIONS ====================
    
    async def invalidate_session(self, session_id: str):
        """Invalidate (delete) cached session and its messages"""
        if not self.enabled:
            return False
        
        try:
            session_key = self._get_session_key(session_id)
            messages_key = self._get_messages_key(session_id)
            
            self.redis.delete(session_key)
            self.redis.delete(messages_key)
            return True
        except Exception as e:
            print(f"Redis invalidate_session error: {e}")
            return False
    
    async def invalidate_user_tier_cache(self, user_id: str):
        """[OK] CRITICAL: Invalidate subscription tier cache for user"""
        if not self.enabled:
            return False
        
        try:
            cache_keys = [
                f"user:{user_id}:tier",
                f"user:{user_id}:limits",
                f"user:{user_id}:usage",
                f"user:{user_id}:daily_messages",
                f"user:{user_id}:subscription",
            ]
            
            for key in cache_keys:
                self.redis.delete(key)
            
            print(f"[DELETED] Subscription tier cache invalidated for user {user_id}")
            return True
        except Exception as e:
            print(f"Redis invalidate_user_tier_cache error: {e}")
            return False
    
    async def invalidate_user_sessions(self, user_id: str):
        """Invalidate user's session list cache"""
        if not self.enabled:
            return False
        
        try:
            key = self._get_user_sessions_key(user_id)
            self.redis.delete(key)
            return True
        except Exception as e:
            print(f"Redis invalidate_user_sessions error: {e}")
            return False
    
    async def invalidate_all_user_data(self, user_id: str):
        """Invalidate all cached data for a user"""
        if not self.enabled:
            return False
        
        try:
            # Get all keys matching user's pattern
            pattern = f"*{user_id}*"
            keys = self.redis.keys(pattern)
            
            if keys:
                self.redis.delete(*keys)
            
            return True
        except Exception as e:
            print(f"Redis invalidate_all_user_data error: {e}")
            return False
    
    # ==================== UTILITY OPERATIONS ====================
    
    async def clear_all(self):
        """Clear entire cache (use with caution!)"""
        if not self.enabled:
            return False
        
        try:
            self.redis.flushdb()
            return True
        except Exception as e:
            print(f"Redis clear_all error: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            info = self.redis.info()
            return {
                "enabled": True,
                "keys": self.redis.dbsize(),
                "memory_used": info.get("used_memory_human"),
                "uptime": info.get("uptime_in_seconds"),
                "connected_clients": info.get("connected_clients")
            }
        except Exception as e:
            print(f"Redis get_stats error: {e}")
            return {"enabled": True, "error": str(e)}

# Create singleton instance
redis_cache = RedisCache()