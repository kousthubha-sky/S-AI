# backend/models/chat.py - ALTERNATIVE APPROACH

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = "tngtech/deepseek-r1t2-chimera:free"
    max_tokens: Optional[int] = 50000  # ✅ Increased from 1000 to support longer responses
    temperature: Optional[float] = 0.7
    system_prompt: Optional[str] = None
    thinking: Optional[bool] = False  # ✅ Enable extended thinking mode
    
    class Config:
        # ✅ Allow larger payloads
        json_schema_extra = {
            "example": {
                "messages": [{"role": "user", "content": "large code block..."}],
                "model": "anthropic/claude-3.5-sonnet",
                "max_tokens": 200000
            }
        }

class ImageData(BaseModel):
    """Represents a generated image"""
    url: str
    type: str = "generated"
    width: Optional[int] = None
    height: Optional[int] = None
    alt_text: Optional[str] = None

class ChatResponse(BaseModel):
    # ✅ Accept either 'message' or 'content' field
    message: Optional[str] = None
    content: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    error: Optional[str] = None
    images: Optional[List[ImageData]] = None
    
    @field_validator('message', mode='before')
    @classmethod
    def ensure_message(cls, v, info):
        """Ensure message field is populated from either message or content"""
        if v is None and 'content' in info.data:
            return info.data.get('content')
        return v
    
    @field_validator('content', mode='before')
    @classmethod
    def ensure_content(cls, v, info):
        """Ensure content field is populated from either content or message"""
        if v is None and 'message' in info.data:
            return info.data.get('message')
        return v

class Document(BaseModel):
    id: str
    filename: str
    file_type: str
    text_length: int
    created_at: str
    metadata: Dict[str, Any]