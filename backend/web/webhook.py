from fastapi import APIRouter, Request, HTTPException
import hashlib, hmac, json, os, time
from ipaddress import ip_address, ip_network
from datetime import datetime, timedelta
from services.supabase_database import db  # ✅ Use DB, not in-memory
from redis_config import redis_client  # ✅ Import Redis
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

RAZORPAY_IPS = ['52.66.224.0/24', '52.66.224.1/24']

def is_valid_razorpay_ip(client_ip: str) -> bool:
    try:
        ip = ip_address(client_ip)
        for network in RAZORPAY_IPS:
            if ip in ip_network(network):
                return True
        return False
    except ValueError:
        return False

@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    try:
        # 1. Verify IP
        client_ip = request.client.host
        if not is_valid_razorpay_ip(client_ip):
            logger.warning(f"Invalid Razorpay IP: {client_ip}")
            raise HTTPException(status_code=403, detail="Invalid source IP")
        
        # 2. Verify signature
        body = await request.body()
        signature = request.headers.get('X-Razorpay-Signature', '')
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
        
        expected_signature = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, signature):
            logger.warning("Invalid Razorpay signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # 3. Parse payload
        payload = json.loads(body)
        event = payload.get('event')
        
        # 4. Route to handler
        if event == 'subscription.activated':
            await handle_subscription_activated(payload)
        elif event == 'subscription.charged':
            await handle_subscription_charged(payload)
        elif event == 'subscription.cancelled':
            await handle_subscription_cancelled(payload)
        else:
            logger.info(f"Unhandled event: {event}")
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


async def handle_subscription_activated(payload: dict):
    """Handle subscription.activated event"""
    try:
        subscription = payload.get('payload', {}).get('subscription', {})
        user_id = subscription.get('notes', {}).get('user_id')
        plan_id = subscription.get('plan_id')
        subscription_id = subscription.get('id')
        
        if not user_id or not plan_id:
            logger.error(f"Missing user_id or plan_id in payload: {payload}")
            return
        
        # 1. ✅ UPDATE SUPABASE (source of truth)
        response = db.client.table('subscriptions').update({
            'tier': map_plan_id_to_tier(plan_id),  # 'pro', 'starter', etc.
            'subscription_id': subscription_id,
            'status': 'active',
            'valid_until': (datetime.now() + timedelta(days=30)).isoformat(),
            'last_charged': datetime.now().isoformat(),
        }).eq('user_id', user_id).execute()
        
        if not response.data:
            logger.error(f"Failed to update subscription for user {user_id}")
            raise Exception("DB update failed")
        
        logger.info(f"✅ Subscription activated for user {user_id}, tier: {plan_id}")
        
        # 2. ✅ INVALIDATE REDIS CACHE (T+0-2ms, not T+300s)
        await invalidate_user_cache(user_id)
        
        # 3. (Optional) Notify frontend via event
        await notify_subscription_updated(user_id, plan_id)
        
    except Exception as e:
        logger.error(f"Error handling subscription.activated: {e}", exc_info=True)
        raise


async def handle_subscription_charged(payload: dict):
    """Handle subscription.charged event (recurring renewal)"""
    try:
        subscription = payload.get('payload', {}).get('subscription', {})
        user_id = subscription.get('notes', {}).get('user_id')
        plan_id = subscription.get('plan_id')
        
        if not user_id:
            return
        
        # 1. ✅ UPDATE SUPABASE
        response = db.client.table('subscriptions').update({
            'tier': map_plan_id_to_tier(plan_id),
            'status': 'active',
            'valid_until': (datetime.now() + timedelta(days=30)).isoformat(),
            'last_charged': datetime.now().isoformat(),
        }).eq('user_id', user_id).execute()
        
        if not response.data:
            raise Exception("DB update failed")
        
        logger.info(f"✅ Subscription charged for user {user_id}")
        
        # 2. ✅ INVALIDATE REDIS CACHE
        await invalidate_user_cache(user_id)
        
    except Exception as e:
        logger.error(f"Error handling subscription.charged: {e}", exc_info=True)
        raise


async def handle_subscription_cancelled(payload: dict):
    """Handle subscription.cancelled event"""
    try:
        subscription = payload.get('payload', {}).get('subscription', {})
        user_id = subscription.get('notes', {}).get('user_id')
        
        if not user_id:
            return
        
        # 1. ✅ UPDATE SUPABASE
        response = db.client.table('subscriptions').update({
            'tier': 'free',
            'status': 'cancelled',
            'valid_until': datetime.now().isoformat(),
        }).eq('user_id', user_id).execute()
        
        if not response.data:
            raise Exception("DB update failed")
        
        logger.info(f"✅ Subscription cancelled for user {user_id}")
        
        # 2. ✅ INVALIDATE REDIS CACHE
        await invalidate_user_cache(user_id)
        
    except Exception as e:
        logger.error(f"Error handling subscription.cancelled: {e}", exc_info=True)
        raise


async def invalidate_user_cache(user_id: str):
    """
    ✅ CRITICAL: Delete all user cache keys immediately.
    This ensures next API request sees fresh tier from DB, not stale Redis.
    Delegates to redis_cache service for consistency.
    """
    from services.redis_cache import redis_cache
    await redis_cache.invalidate_user_tier_cache(user_id)


def map_plan_id_to_tier(plan_id: str) -> str:
    """Map Razorpay plan IDs to tier names"""
    mapping = {
        'plan_starter_monthly': 'starter',
        'plan_pro_monthly': 'pro',
        'plan_enterprise_monthly': 'enterprise',
    }
    return mapping.get(plan_id, 'free')


async def notify_subscription_updated(user_id: str, tier: str):
    """
    (Optional) Publish Redis event for real-time subscribers
    Useful if frontend is listening for subscription updates
    """
    try:
        redis_client.publish(
            f"user:{user_id}:subscription_updated",
            json.dumps({'tier': tier, 'timestamp': datetime.now().isoformat()})
        )
    except Exception as e:
        logger.warning(f"Failed to publish subscription event: {e}")