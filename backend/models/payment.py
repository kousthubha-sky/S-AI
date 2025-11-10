# backend/models/payment.py - UPDATED MODELS

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ==================== ORDER MODELS ====================
class OrderCreate(BaseModel):
    plan_type: str  # "basic_monthly" or "pro_monthly"
    user_id: Optional[str] = None

class OrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str
    plan_type: str
    plan_name: str

class OrderVerify(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

# ==================== SUBSCRIPTION MODELS (For future use) ====================
class SubscriptionCreate(BaseModel):
    plan_type: str
    total_count: Optional[int] = 12
    user_id: Optional[str] = None

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

# ==================== USAGE MODELS ====================
class UserUsage(BaseModel):
    user_id: str
    prompt_count: int
    daily_message_count: int = 0
    last_reset_date: Optional[datetime] = None
    last_payment_date: Optional[datetime] = None
    is_paid: bool = False
    subscription_tier: Optional[str] = None
    subscription_end_date: Optional[datetime] = None

# ==================== PAYMENT MODELS ====================
class PaymentVerify(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_subscription_id: Optional[str] = None
    razorpay_signature: str

class RefundCreate(BaseModel):
    payment_id: str
    amount: Optional[int] = None  # If None, full refund
    reason: Optional[str] = None