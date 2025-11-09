# web/chat.py
from fastapi import APIRouter, Depends, HTTPException, status
from auth.dependencies import verify_token
from services.supabase_database import db
from datetime import datetime
from typing import Dict, Optional

router = APIRouter()

@router.post("/api/chat/sessions")
async def create_chat_session(
    session_data: Dict,
    payload: dict = Depends(verify_token)
):
    """Create a new chat session"""
    try:
        user_id = payload.get("sub")
        
        # Get user from database
        user = await db.get_user_by_auth0_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Create session with proper data
        new_session = {
            'user_id': user['id'],  # Use database user ID, not auth0_id
            'title': session_data.get('title', 'New Chat'),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"Creating chat session: {new_session}")
        
        session = await db.create_chat_session(new_session)
        
        print(f"Chat session created: {session}")
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}"
        )

@router.get("/api/chat/sessions")
async def get_chat_sessions(payload: dict = Depends(verify_token)):
    """Get user's chat sessions"""
    try:
        user_id = payload.get("sub")
        
        # Get user from database
        user = await db.get_user_by_auth0_id(user_id)
        if not user:
            # Return empty array if user doesn't exist yet
            return []
        
        print(f"Fetching chat sessions for user: {user['id']}")
        
        sessions = await db.get_chat_sessions(user['id'])
        
        print(f"Found {len(sessions)} chat sessions")
        
        return sessions
        
    except Exception as e:
        print(f"Error fetching chat sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chat sessions: {str(e)}"
        )

@router.get("/api/chat/sessions/{session_id}/messages")
async def get_chat_messages(
    session_id: str,
    payload: dict = Depends(verify_token)
):
    """Get messages for a specific chat session"""
    try:
        print(f"Fetching messages for session: {session_id}")
        
        messages = await db.get_chat_messages(session_id)
        
        print(f"Found {len(messages)} messages")
        
        return messages
        
    except Exception as e:
        print(f"Error fetching chat messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chat messages: {str(e)}"
        )

@router.post("/api/chat/sessions/{session_id}/messages")
async def create_chat_message(
    session_id: str,
    message_data: Dict,
    payload: dict = Depends(verify_token)
):
    """Create a new chat message"""
    try:
        print(f"Creating message for session {session_id}: {message_data}")
        
        new_message = {
            'session_id': session_id,
            'role': message_data.get('role'),
            'content': message_data.get('content'),
            'model_used': message_data.get('model_used'),
            'tokens_used': message_data.get('tokens_used'),
            'created_at': datetime.now().isoformat()
        }
        
        message = await db.create_chat_message(new_message)
        
        print(f"Message created: {message['id']}")
        
        return message
        
    except Exception as e:
        print(f"Error creating chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create message: {str(e)}"
        )

@router.patch("/api/chat/sessions/{session_id}")
async def update_chat_session(
    session_id: str,
    update_data: Dict,
    payload: dict = Depends(verify_token)
):
    """Update a chat session (e.g., title)"""
    try:
        print(f"Updating session {session_id}: {update_data}")
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.now().isoformat()
        
        await db.update_chat_session(session_id, update_data)
        
        return {"status": "success", "message": "Session updated"}
        
    except Exception as e:
        print(f"Error updating chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update session: {str(e)}"
        )

@router.post("/api/chat/sessions/{session_id}/messages")
async def create_chat_message(
    session_id: str,
    message_data: Dict,
    payload: dict = Depends(verify_token)
):
    """Create a new chat message with optional images"""
    try:
        print(f"Creating message for session {session_id}: {message_data}")
        
        # ✅ NEW: Extract and validate images
        images = message_data.get('images', [])
        if images and not isinstance(images, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Images must be an array"
            )
        
        # Validate image structure
        for img in images:
            if not isinstance(img, dict) or 'url' not in img or 'type' not in img:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each image must have 'url' and 'type' fields"
                )
        
        new_message = {
            'session_id': session_id,
            'role': message_data.get('role'),
            'content': message_data.get('content'),
            'model_used': message_data.get('model_used'),
            'tokens_used': message_data.get('tokens_used'),
            'created_at': datetime.now().isoformat(),
            'images': images  # ✅ Include images
        }
        
        message = await db.create_chat_message(new_message)
        
        print(f"Message created: {message['id']} with {len(images)} images")
        
        return message
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create message: {str(e)}"
        )