# redis_config.py
import redis
import os

def get_redis_client():
    """Create and return Redis client"""
    try:
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6380)),
            password=os.getenv('REDIS_PASSWORD', None),
            db=int(os.getenv('REDIS_DB', 0)),
            decode_responses=True
        )
        # Test connection
        redis_client.ping()
        print("✅ Redis connected successfully")
        return redis_client
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return None

# Global Redis client instance
redis_client = get_redis_client()