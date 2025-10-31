from typing import Dict, List, Optional, Any
import json
from fastapi import HTTPException, status
from redis_config import redis_client

class DatabaseService:
    def __init__(self):
        self.redis = redis_client

    async def get_user_by_auth0_id(self, auth0_id: str) -> Optional[Dict]:
        """Get user by Auth0 ID"""
        try:
            user_data = self.redis.get(f"user:{auth0_id}")
            return json.loads(user_data) if user_data else None
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def create_user(self, user_data: Dict) -> Dict:
        """Create a new user"""
        try:
            auth0_id = user_data["auth0_id"]
            if self.redis.exists(f"user:{auth0_id}"):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already exists"
                )
            
            # Store user data
            self.redis.set(f"user:{auth0_id}", json.dumps(user_data))
            return user_data
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def update_user(self, auth0_id: str, update_data: Dict) -> Dict:
        """Update user data"""
        try:
            user_data = await self.get_user_by_auth0_id(auth0_id)
            if not user_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Update user data
            user_data.update(update_data)
            self.redis.set(f"user:{auth0_id}", json.dumps(user_data))
            return user_data
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def get_chat_sessions(self, user_id: str) -> List[Dict]:
        """Get chat sessions for a user"""
        try:
            sessions_key = f"chat_sessions:{user_id}"
            sessions = self.redis.smembers(sessions_key)
            return [json.loads(session) for session in sessions]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def create_chat_session(self, session_data: Dict) -> Dict:
        """Create a new chat session"""
        try:
            user_id = session_data["user_id"]
            sessions_key = f"chat_sessions:{user_id}"
            session_id = str(self.redis.incr("chat_session_id_counter"))
            session_data["id"] = session_id
            
            # Store session data
            session_json = json.dumps(session_data)
            self.redis.sadd(sessions_key, session_json)
            return session_data
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def create_chat_message(self, message_data: Dict) -> Dict:
        """Create a new chat message"""
        try:
            session_id = message_data["session_id"]
            messages_key = f"chat_messages:{session_id}"
            message_id = str(self.redis.incr("chat_message_id_counter"))
            message_data["id"] = message_id
            
            # Store message data
            message_json = json.dumps(message_data)
            self.redis.rpush(messages_key, message_json)
            return message_data
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def get_chat_messages(self, session_id: str) -> List[Dict]:
        """Get messages for a chat session"""
        try:
            messages_key = f"chat_messages:{session_id}"
            messages = self.redis.lrange(messages_key, 0, -1)
            return [json.loads(message) for message in messages]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def delete_chat_session(self, session_id: str) -> None:
        """Delete a chat session"""
        try:
            # First get the session to find the user_id
            for user_key in self.redis.scan_iter("chat_sessions:*"):
                for session in self.redis.smembers(user_key):
                    session_data = json.loads(session)
                    if session_data["id"] == session_id:
                        # Remove session from user's set
                        self.redis.srem(user_key, session)
                        # Delete all messages
                        self.redis.delete(f"chat_messages:{session_id}")
                        return
                        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    async def update_chat_session(self, session_id: str, update_data: Dict) -> None:
        """Update a chat session"""
        try:
            # First get the session to update
            for user_key in self.redis.scan_iter("chat_sessions:*"):
                for session in self.redis.smembers(user_key):
                    session_data = json.loads(session)
                    if session_data["id"] == session_id:
                        # Remove old session data
                        self.redis.srem(user_key, session)
                        # Update and store new session data
                        session_data.update(update_data)
                        self.redis.sadd(user_key, json.dumps(session_data))
                        return
                        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

db = DatabaseService()