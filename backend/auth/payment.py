# ✅ ENHANCED payment.py with security improvements

import os
import razorpay
import hmac
import hashlib
from fastapi import HTTPException, status
from models.payment import SubscriptionCreate, SubscriptionVerify
from typing import Optional, Dict, Any
import logging
from datetime import datetime
# Set up logging
logger = logging.getLogger(__name__)

class PaymentManager:
    def __init__(self):
        key_id = os.getenv("RAZORPAY_KEY_ID")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        
        # ✅ Validate credentials
        if not key_id or not key_secret:
            raise ValueError("Razorpay credentials not configured")
        
        # ✅ Validate format
        if len(key_id) < 10 or len(key_secret) < 10:
            raise ValueError("Invalid Razorpay credentials format")
        
        self.client = razorpay.Client(auth=(key_id, key_secret))
        self.key_secret = key_secret  # Store for webhook verification
        
        self.SUBSCRIPTION_PLANS = {
            "basic": os.getenv("RAZORPAY_BASIC_PLAN_ID"),
            "pro": os.getenv("RAZORPAY_PREMIUM_PLAN_ID")
        }
        
        # ✅ Validate plan IDs
        for plan_type, plan_id in self.SUBSCRIPTION_PLANS.items():
            if not plan_id:
                logger.warning(f"Plan ID not configured for {plan_type}")

    async def create_subscription(self, subscription: SubscriptionCreate) -> Dict[str, Any]:
        """Create a subscription with enhanced validation"""
        try:
               
            # ✅ Validate required fields
            if not subscription.plan_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Plan type is required"
                )
            
            if not subscription.user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User ID is required"
                )
            
            # ✅ Validate plan exists
            if subscription.plan_type not in self.SUBSCRIPTION_PLANS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid plan type"
                )
            
            plan_id = self.SUBSCRIPTION_PLANS[subscription.plan_type]
            if not plan_id:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Plan not configured"
                )
            
            # ✅ Validate total_count
            if subscription.total_count and (subscription.total_count < 1 or subscription.total_count > 100):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid subscription duration"
                )
            
            # Create subscription with proper parameters
            subscription_data = {
                'plan_id': plan_id,
                'total_count': subscription.total_count or 12,
                'quantity': 1,
                'customer_notify': 1,
                'notes': {
                    'user_id': subscription.user_id,
                    'plan_type': subscription.plan_type,
                    'created_at': str(datetime.now())
                }
            }
            
            # ✅ Log subscription creation (without sensitive data)
            logger.info(f"Creating subscription for user {subscription.user_id[:8]}... plan: {subscription.plan_type}")
            
            # Create subscription
            razorpay_subscription = self.client.subscription.create(subscription_data)
            
            # ✅ Validate response
            if not razorpay_subscription or not razorpay_subscription.get('id'):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create subscription"
                )
            
            return {
                "subscription_id": razorpay_subscription['id'],
                "status": razorpay_subscription['status'],
                "plan_type": subscription.plan_type,
                "razorpay_subscription_id": razorpay_subscription['id'],
                "short_url": razorpay_subscription.get('short_url')
            }
            
        except razorpay.errors.BadRequestError as e:
            logger.error(f"Razorpay bad request: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid subscription parameters"
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
            logger.error(f"Subscription creation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create subscription"
            )

    async def verify_subscription_payment(self, verification: SubscriptionVerify) -> bool:
        """Verify payment with enhanced security"""
        try:
            # ✅ Validate input
            if not all([
                verification.razorpay_payment_id,
                verification.razorpay_subscription_id,
                verification.razorpay_signature
            ]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required verification parameters"
                )
            
            # ✅ Verify signature manually for extra security
            message = f"{verification.razorpay_payment_id}|{verification.razorpay_subscription_id}"
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
            
            # ✅ Also use Razorpay's verification
            params_dict = {
                'razorpay_payment_id': verification.razorpay_payment_id,
                'razorpay_subscription_id': verification.razorpay_subscription_id,
                'razorpay_signature': verification.razorpay_signature
            }
            
            self.client.utility.verify_subscription_payment_signature(params_dict)
            
            # ✅ Verify payment status
            payment = self.client.payment.fetch(verification.razorpay_payment_id)
            
            if payment['status'] != 'captured':
                logger.warning(f"Payment {verification.razorpay_payment_id[:8]}... not captured: {payment['status']}")
                return False
            
            # ✅ Verify subscription is active
            subscription = self.client.subscription.fetch(verification.razorpay_subscription_id)
            if subscription['status'] not in ['active', 'authenticated']:
                logger.warning(f"Subscription {verification.razorpay_subscription_id[:8]}... not active: {subscription['status']}")
                return False
            
            logger.info(f"Payment verified successfully for {verification.razorpay_payment_id[:8]}...")
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

    async def get_subscription_details(self, subscription_id: str) -> Dict[str, Any]:
        """Get subscription details with validation"""
        try:
            # ✅ Validate subscription ID format
            if not subscription_id or len(subscription_id) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid subscription ID"
                )
            
            subscription = self.client.subscription.fetch(subscription_id)
            
            # ✅ Return only necessary fields
            return {
                'id': subscription['id'],
                'status': subscription['status'],
                'plan_id': subscription['plan_id'],
                'current_start': subscription.get('current_start'),
                'current_end': subscription.get('current_end'),
                'charge_at': subscription.get('charge_at'),
                'total_count': subscription.get('total_count'),
                'paid_count': subscription.get('paid_count'),
                'remaining_count': subscription.get('remaining_count')
            }
            
        except razorpay.errors.BadRequestError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        except Exception as e:
            logger.error(f"Error fetching subscription: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch subscription details"
            )

    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel subscription with validation"""
        try:
            # ✅ Validate subscription ID
            if not subscription_id or len(subscription_id) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid subscription ID"
                )
            
            # ✅ Verify subscription exists and is cancellable
            subscription = self.client.subscription.fetch(subscription_id)
            if subscription['status'] in ['cancelled', 'completed', 'expired']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot cancel subscription with status: {subscription['status']}"
                )
            
            self.client.subscription.cancel(subscription_id)
            logger.info(f"Subscription {subscription_id[:8]}... cancelled successfully")
            return True
            
        except razorpay.errors.BadRequestError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling subscription: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel subscription"
            )