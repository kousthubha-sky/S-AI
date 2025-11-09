# backend/models/chat.py - UPDATE with image support

from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = "tngtech/deepseek-r1t2-chimera:free"
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7
    system_prompt: Optional[str] = None

class ImageData(BaseModel):
    """Represents a generated image"""
    url: str
    type: str = "generated"  # Can be "generated", "uploaded", etc.
    width: Optional[int] = None
    height: Optional[int] = None
    alt_text: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    usage: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    error: Optional[str] = None
    images: Optional[List[ImageData]] = None  # ✅ NEW: Support for images

class Document(BaseModel):
    id: str
    filename: str
    file_type: str
    text_length: int
    created_at: str
    metadata: Dict[str, Any]