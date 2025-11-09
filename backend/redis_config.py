# redis_config.py
import redis
import os
from dotenv import load_dotenv

# Load .env locally (Kuberns will inject env vars automatically in cloud)
load_dotenv()

def get_redis_client():
    """Create and return Redis client"""
    try:
        # Use a single Redis URL environment variable
        redis_url = os.getenv("REDIS_URL")

        if not redis_url:
            raise ValueError("REDIS_URL not found in environment variables")

        # Connect using redis.from_url (handles host, port, password, db)
        redis_client = redis.from_url(redis_url, decode_responses=True)

        # Test connection
        redis_client.ping()
        print("✅ Redis connected successfully")
        return redis_client

    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return None

# Global Redis client instance
redis_client = get_redis_client()
