from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserProfile(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    permissions: List[str] = []

class ErrorResponse(BaseModel):
    detail: str
    status_code: int
    
class SecurityEvent(BaseModel):
    user_id: str
    event_type: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Dict[str, Any] = {}
    timestamp: datetime

class UserActivity(BaseModel):
    user_id: str
    last_login: Optional[datetime] = None
    last_ip: Optional[str] = None
    last_user_agent: Optional[str] = None