from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from auth.dependencies import verify_token
from services.database import db

router = APIRouter()

@router.post("/api/chat/sessions")
async def create_chat_session(
    data: dict,
    payload: dict = Depends(verify_token)
):
    """Create a new chat session"""
    try:
        user_id = payload.get("sub")
        session_data = {
            "user_id": user_id,
            "title": data.get("title", "New Chat"),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        return await db.create_chat_session(session_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}"
        )

@router.post("/api/chat/sessions/{session_id}/messages")
async def create_chat_message(
    session_id: str,
    data: dict,
    payload: dict = Depends(verify_token)
):
    """Create a new chat message"""
    try:
        message_data = {
            "session_id": session_id,
            "role": data["role"],
            "content": data["content"],
            "model_used": data.get("model_used"),
            "tokens_used": data.get("tokens_used"),
            "created_at": datetime.now().isoformat()
        }
        return await db.create_chat_message(message_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat message: {str(e)}"
        )

@router.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    payload: dict = Depends(verify_token)
):
    """Delete a chat session"""
    try:
        await db.delete_chat_session(session_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chat session: {str(e)}"
        )

@router.patch("/api/chat/sessions/{session_id}")
async def update_chat_session(
    session_id: str,
    data: dict,
    payload: dict = Depends(verify_token)
):
    """Update a chat session"""
    try:
        await db.update_chat_session(session_id, data)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update chat session: {str(e)}"
        )