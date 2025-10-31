# webhooks.py
from fastapi import APIRouter, Request, HTTPException
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta
from models.state import get_user_usage, update_user_subscription
from models.payment import UserUsage

router = APIRouter()

@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    try:
        body = await request.body()
        signature = request.headers.get('X-Razorpay-Signature', '')
        
        # Verify webhook signature
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
        expected_signature = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        payload = json.loads(body)
        event = payload.get('event')
        
        # Handle subscription events
        if event in ['subscription.activated', 'subscription.charged']:
            await handle_subscription_event(payload)
        elif event == 'subscription.cancelled':
            await handle_subscription_cancellation(payload)
            
        return {"status": "success"}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

async def handle_subscription_event(payload: dict):
    """Handle subscription activation and charge events"""
    subscription = payload.get('payload', {}).get('subscription', {})
    user_id = subscription.get('notes', {}).get('user_id')
    plan_id = subscription.get('plan_id')
    
    if user_id:
        # Calculate subscription end date (1 month from now)
        end_date = datetime.now() + timedelta(days=30)
        
        get_user_usage[user_id] = UserUsage(
            user_id=user_id,
            prompt_count=0,
            last_payment_date=datetime.now(),
            is_paid=True,
            subscription_tier=plan_id,
            subscription_end_date=end_date
        )

async def handle_subscription_cancellation(payload: dict):
    """Handle subscription cancellation"""
    subscription = payload.get('payload', {}).get('subscription', {})
    user_id = subscription.get('notes', {}).get('user_id')
    
    if user_id and user_id in get_user_usage:
        get_user_usage[user_id]['is_paid'] = False
        get_user_usage[user_id]['subscription_tier'] = None