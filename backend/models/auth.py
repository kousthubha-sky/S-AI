from pydantic import BaseModel
from typing import Optional, List

class UserProfile(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    permissions: List[str] = []

class ErrorResponse(BaseModel):
    detail: str
    status_code: int