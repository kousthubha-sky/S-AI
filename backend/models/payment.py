# models/payment.py
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SubscriptionCreate(BaseModel):
    plan_type: str  # This will be the Razorpay plan ID
    user_id: str
    total_count: Optional[int] = 12  # Default 12 months

class SubscriptionVerify(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str

class SubscriptionResponse(BaseModel):
    subscription_id: str
    status: str
    plan_type: str
    razorpay_subscription_id: str
    short_url: Optional[str] = None

# Update existing models
class PaymentVerify(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_subscription_id: Optional[str] = None
    razorpay_signature: str

class UserUsage(BaseModel):
    user_id: str
    prompt_count: int
    daily_message_count: int = 0
    last_reset_date: Optional[datetime] = None
    last_payment_date: Optional[datetime] = None
    is_paid: bool = False
    subscription_tier: Optional[str] = None
    subscription_end_date: Optional[datetime] = None