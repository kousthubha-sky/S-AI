# auth/payment.py
import os
import razorpay
import json
from fastapi import HTTPException, status
from models.payment import SubscriptionCreate, SubscriptionVerify
from typing import Optional, Dict, Any

class PaymentManager:
    def __init__(self):
        key_id = os.getenv("RAZORPAY_KEY_ID")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        if not key_id or not key_secret:
            raise ValueError("Razorpay credentials not configured")
        self.client = razorpay.Client(auth=(key_id, key_secret))
        self.SUBSCRIPTION_PLANS = {
            "basic": os.getenv("RAZORPAY_BASIC_PLAN_ID"),
            "pro": os.getenv("RAZORPAY_PREMIUM_PLAN_ID")
        }

    async def create_subscription(self, subscription: SubscriptionCreate) -> Dict[str, Any]:
        try:
            # Validate required fields
            if not subscription.plan_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Plan ID is required"
                )
            if not subscription.user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User ID is required"
                )

            # Create subscription with proper parameters
            subscription_data = {
                'plan_id': subscription.plan_type,
                'total_count': subscription.total_count,
                'quantity': 1,
                'customer_notify': 1,
                'notes': {
                    'user_id': subscription.user_id
                }
            }

            # Create subscription
            razorpay_subscription = self.client.subscription.create(subscription_data)
            
            return {
                "subscription_id": razorpay_subscription['id'],
                "status": razorpay_subscription['status'],
                "plan_type": subscription.plan_type,
                "razorpay_subscription_id": razorpay_subscription['id'],
                "short_url": razorpay_subscription.get('short_url')
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create subscription: {str(e)}"
            )

    async def verify_subscription_payment(self, verification: SubscriptionVerify) -> bool:
        try:
            # Verify payment signature for subscription
            params_dict = {
                'razorpay_payment_id': verification.razorpay_payment_id,
                'razorpay_subscription_id': verification.razorpay_subscription_id,
                'razorpay_signature': verification.razorpay_signature
            }
            
            # Verify the signature
            self.client.utility.verify_subscription_payment_signature(params_dict)
            
            # Check if payment is captured
            payment = self.client.payment.fetch(verification.razorpay_payment_id)
            if payment['status'] == 'captured':
                return True
                
            return False
            
        except razorpay.errors.SignatureVerificationError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Subscription verification failed: {str(e)}"
            )

    async def get_subscription_details(self, subscription_id: str) -> Dict[str, Any]:
        try:
            subscription = self.client.subscription.fetch(subscription_id)
            return subscription
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch subscription details: {str(e)}"
            )

    async def cancel_subscription(self, subscription_id: str) -> bool:
        try:
            self.client.subscription.cancel(subscription_id)
            return True
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to cancel subscription: {str(e)}"
            )