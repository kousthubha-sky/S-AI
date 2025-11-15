# backend/auth/payment.py - MULTI-TIER VERSION

import os
import razorpay
import hmac
import hashlib
import uuid
from fastapi import HTTPException, status
from models.payment import OrderCreate, OrderVerify
from typing import Optional, Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PaymentManager:
    def __init__(self):
        key_id = os.getenv("RAZORPAY_KEY_ID")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        
        if not key_id or not key_secret:
            raise ValueError("Razorpay credentials not configured")
        
        if len(key_id) < 10 or len(key_secret) < 10:
            raise ValueError("Invalid Razorpay credentials format")
        
        self.client = razorpay.Client(auth=(key_id, key_secret))
        self.key_secret = key_secret
        
        # ✅ UPDATED: All 3 paid plans with Razorpay plan IDs
        self.PLANS = {
            # Student Starter Pack
            "plan_RWzEUovz8FVbX4": {
                "amount": 19900,  # ₹199 in paise
                "currency": "INR",
                "name": "Student Starter Pack",
                "tier": "starter",
                "requests_per_month": 500,
                "tokens_per_month": 500000  # 500K
            },
            # Student Pro Pack
            "plan_RWzF9BaZU7q9jw": {
                "amount": 29900,  # ₹299 in paise
                "currency": "INR",
                "name": "Student Pro Pack",
                "tier": "pro",
                "requests_per_month": 2000,
                "tokens_per_month": 2000000  # 2M
            },
            # Student Pro Plus Pack
            "plan_RWzFoX6NgEM6MX": {
                "amount": 59900,  # ₹599 in paise
                "currency": "INR",
                "name": "Student Pro Plus Pack",
                "tier": "pro_plus",
                "requests_per_month": -1,  # Unlimited
                "tokens_per_month": -1  # Unlimited
            }
        }

    async def create_order(self, plan_type: str, user_id: str) -> Dict[str, Any]:
        """
        Create a Razorpay Order (required before payment)
        """
        try:
            if plan_type not in self.PLANS:
                logger.error(f"Invalid plan type: {plan_type}")
                logger.error(f"Available plans: {list(self.PLANS.keys())}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid plan type. Available plans: {list(self.PLANS.keys())}"
                )
            
            plan = self.PLANS[plan_type]
            
            # ✅ Create very short receipt (max 40 chars)
            short_uuid = str(uuid.uuid4())[:8]
            receipt = f"ord_{short_uuid}"
            
            # Create order data
            order_data = {
                "amount": plan["amount"],
                "currency": plan["currency"],
                "receipt": receipt,
                "notes": {
                    "user_id": user_id,
                    "plan_type": plan_type,
                    "plan_name": plan["name"],
                    "tier": plan["tier"]
                }
            }
            
            logger.info(f"Creating order for user {user_id[:8]}... plan: {plan_type}")
            logger.info(f"Receipt: {receipt} (length: {len(receipt)})")
            
            # Create order via Razorpay
            order = self.client.order.create(data=order_data)
            
            if not order or not order.get('id'):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create order"
                )
            
            logger.info(f"✅ Order created: {order['id']}")
            
            return {
                "order_id": order['id'],
                "amount": order['amount'],
                "currency": order['currency'],
                "key_id": os.getenv("RAZORPAY_KEY_ID"),
                "plan_type": plan_type,
                "plan_name": plan["name"],
                "tier": plan["tier"]
            }
            
        except razorpay.errors.BadRequestError as e:
            logger.error(f"Razorpay bad request: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order parameters: {str(e)}"
            )
        except razorpay.errors.GatewayError as e:
            logger.error(f"Razorpay gateway error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment gateway unavailable"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Order creation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create order: {str(e)}"
            )

    async def verify_payment(self, verification: OrderVerify) -> bool:
        """Verify payment signature after successful payment"""
        try:
            if not all([
                verification.razorpay_payment_id,
                verification.razorpay_order_id,
                verification.razorpay_signature
            ]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required verification parameters"
                )
            
            # Verify signature
            message = f"{verification.razorpay_order_id}|{verification.razorpay_payment_id}"
            expected_signature = hmac.new(
                self.key_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(expected_signature, verification.razorpay_signature):
                logger.warning(f"Invalid signature for payment {verification.razorpay_payment_id[:8]}...")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid payment signature"
                )
            
            # Verify payment status
            payment = self.client.payment.fetch(verification.razorpay_payment_id)
            
            if payment['status'] != 'captured':
                logger.warning(f"Payment {verification.razorpay_payment_id[:8]}... not captured: {payment['status']}")
                return False
            
            # Verify order exists
            order = self.client.order.fetch(verification.razorpay_order_id)
            if order['status'] != 'paid':
                logger.warning(f"Order {verification.razorpay_order_id[:8]}... not paid: {order['status']}")
                return False
            
            logger.info(f"✅ Payment verified successfully: {verification.razorpay_payment_id[:8]}...")
            return True
            
        except razorpay.errors.SignatureVerificationError as e:
            logger.error(f"Signature verification failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Payment verification failed"
            )

    async def get_payment_details(self, payment_id: str) -> Dict[str, Any]:
        """Get payment details"""
        try:
            payment = self.client.payment.fetch(payment_id)
            
            return {
                'id': payment['id'],
                'status': payment['status'],
                'amount': payment['amount'],
                'currency': payment['currency'],
                'method': payment.get('method'),
                'email': payment.get('email'),
                'contact': payment.get('contact'),
                'created_at': payment.get('created_at')
            }
            
        except razorpay.errors.BadRequestError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        except Exception as e:
            logger.error(f"Error fetching payment: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch payment details"
            )

    async def create_refund(self, payment_id: str, amount: Optional[int] = None) -> Dict[str, Any]:
        """Create a refund for a payment"""
        try:
            refund_data = {"payment_id": payment_id}
            if amount:
                refund_data["amount"] = amount
            
            refund = self.client.payment.refund(payment_id, refund_data)
            
            logger.info(f"✅ Refund created: {refund['id']}")
            
            return {
                'id': refund['id'],
                'status': refund['status'],
                'amount': refund['amount'],
                'payment_id': refund['payment_id']
            }
            
        except Exception as e:
            logger.error(f"Refund error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create refund"
            )
    
    def get_plan_tier(self, plan_type: str) -> str:
        """Get subscription tier from plan type"""
        if plan_type in self.PLANS:
            return self.PLANS[plan_type]["tier"]
        return "free"
    
    def get_plan_limits(self, tier: str) -> Dict[str, int]:
        """Get usage limits for a tier"""
        limits = {
            "free": {
                "requests_per_day": 50,
                "tokens_per_day": 50000,
                "requests_per_month": -1,  # Not applicable
                "tokens_per_month": -1
            },
            "starter": {
                "requests_per_day": -1,  # No daily limit
                "tokens_per_day": -1,
                "requests_per_month": 500,
                "tokens_per_month": 500000
            },
            "pro": {
                "requests_per_day": -1,
                "tokens_per_day": -1,
                "requests_per_month": 2000,
                "tokens_per_month": 2000000
            },
            "pro_plus": {
                "requests_per_day": -1,
                "tokens_per_day": -1,
                "requests_per_month": -1,  # Unlimited
                "tokens_per_month": -1
            }
        }
        return limits.get(tier, limits["free"])