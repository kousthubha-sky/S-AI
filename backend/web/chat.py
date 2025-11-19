# web/chat.py - FIXED VERSION (remove all await from db calls)
from fastapi import APIRouter, Depends, HTTPException, status, Request
from auth.dependencies import verify_token
from services.supabase_database import db
from datetime import datetime, timezone
from typing import Dict, Optional
import httpx
import os
import re
import logging
from models.chat import ChatRequest, ChatResponse
from models.supabase_state import get_user_usage, increment_message_count, update_user_subscription
from models.ai_models import validate_model_access, get_tier_name
from utils.validators import InputValidator

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== MAIN CHAT ENDPOINT ====================

@router.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(chat_request: ChatRequest, payload: dict = Depends(verify_token)):
    """Process chat messages through OpenRouter with multi-tier support"""
    user_id = payload.get("sub")
    
    print(f"\n{'='*80}")
    print(f"📨 INCOMING CHAT REQUEST")
    print(f"{'='*80}")
    print(f"User ID: {user_id}")
    print(f"Model: {chat_request.model}")
    print(f"Num Messages: {len(chat_request.messages)}")
    
    for i, msg in enumerate(chat_request.messages):
        preview = msg.content[:100].replace('\n', ' ') if msg.content else ""
        print(f"  Message {i}: role={msg.role}, content_length={len(msg.content) if msg.content else 0}, preview={preview}...")
    print(f"{'='*80}\n")
    
    try:
        # Sanitize chat messages
        sanitized_messages = []
        for msg in chat_request.messages:
            try:
                sanitized_content = InputValidator.sanitize_string(msg.content, max_length=500000)
                sanitized_messages.append({
                    "role": msg.role,
                    "content": sanitized_content
                })
            except Exception as sanitize_error:
                print(f"❌ Error sanitizing message: {sanitize_error}")
                print(f"   Message content (first 200 chars): {msg.content[:200]}")
                raise
        print(f"✅ Messages sanitized")
        
        # Get user usage
        usage = await get_user_usage(user_id)
       
        # Check subscription status
        if usage.subscription_end_date:
            now_aware = datetime.now(timezone.utc)
            
            if usage.subscription_end_date.tzinfo is None:
                subscription_end_date = usage.subscription_end_date.replace(tzinfo=timezone.utc)
            else:
                subscription_end_date = usage.subscription_end_date
            
            if subscription_end_date < now_aware:
                print(f"⚠️ User subscription expired")
                usage.is_paid = False
                usage.subscription_tier = "free"
                await update_user_subscription(user_id, "free", False, datetime.now())
        
        # ✅ Get tier and normalize it
        tier = usage.subscription_tier or "free"
        tier = tier.lower()  # Ensure lowercase
        
        # ✅ Normalize tier format (handle "student_pro" -> "pro", "Student Pro" -> "pro", etc)
        if "pro_plus" in tier or "pro plus" in tier:
            tier = "pro_plus"
        elif "pro" in tier:
            tier = "pro"
        elif "starter" in tier or "student" in tier:
            tier = "starter"
        elif "free" in tier:
            tier = "free"
        
        # ✅ Validate tier is one of the expected values
        valid_tiers = ["free", "starter", "pro", "pro_plus"]
        if tier not in valid_tiers:
            print(f"⚠️ Invalid tier '{tier}', defaulting to 'free'")
            tier = "free"
        
        # Debug logging
        print(f"🔍 Chat request validation:")
        print(f"   - Model ID: {chat_request.model}")
        print(f"   - User tier (raw): {usage.subscription_tier}")
        print(f"   - User tier (sanitized): {tier}")
        print(f"   - Is paid: {usage.is_paid}")
        print(f"   - User ID: {user_id}")
        
        # ✅ Validate model access with new tier system
        has_access = validate_model_access(chat_request.model, tier)
        print(f"   - Has access: {has_access}")
        
        if not has_access:
            print(f"❌ Model access denied for {chat_request.model}")
            
            # Determine required tier for this model
            from models.ai_models import FREE_MODELS, STARTER_MODELS, PRO_MODELS, PRO_PLUS_MODELS
            
            # Check from most restrictive to least restrictive
            if chat_request.model in PRO_PLUS_MODELS and chat_request.model not in PRO_MODELS:
                required_tier = "pro_plus"
            elif chat_request.model in PRO_MODELS and chat_request.model not in STARTER_MODELS:
                required_tier = "pro"
            elif chat_request.model in STARTER_MODELS and chat_request.model not in FREE_MODELS:
                required_tier = "starter"
            else:
                required_tier = "free"
            
            # Get upgrade message
            from models.ai_models import get_upgrade_message
            message = get_upgrade_message(tier, required_tier)
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{message} (Model: {chat_request.model}, Your tier: {tier})"
            )
        
        print(f"✅ Model access granted")
        
        # ✅ Check if model requires image generation feature
        from models.ai_models import TIER_FEATURES
        if "image" in chat_request.model.lower() or "gemini" in chat_request.model.lower():
            if not TIER_FEATURES.get(tier, {}).get("image_generation", False):
                from models.ai_models import get_tier_name
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Image generation is not available on your {get_tier_name(tier)} plan. Upgrade to Student Pro to access image generation models."
                )
            print(f"✅ Image generation feature enabled for {tier} tier")
        
        # ✅ Check usage limits based on tier (with approaching warnings)
        if tier == "free":
            # Free tier: 50 requests per day
            FREE_TIER_DAILY_LIMIT = 50
            usage_percent = (usage.daily_message_count / FREE_TIER_DAILY_LIMIT) * 100
            
            if usage.daily_message_count >= FREE_TIER_DAILY_LIMIT:
                print(f"❌ Daily limit reached")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Daily limit reached (50 requests/day). Upgrade to continue."
                )
            elif usage_percent >= 90:
                # Log warning but allow request
                print(f"⚠️ Approaching daily limit: {usage.daily_message_count}/{FREE_TIER_DAILY_LIMIT} ({usage_percent:.0f}%)")
        
        elif tier == "starter":
            # Starter tier: 500 requests per month
            STARTER_MONTHLY_LIMIT = 500
            usage_percent = (usage.prompt_count / STARTER_MONTHLY_LIMIT) * 100
            
            if usage.prompt_count >= STARTER_MONTHLY_LIMIT:
                print(f"❌ Monthly limit reached")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Monthly limit reached (500 requests/month). Upgrade to Pro for 2000 requests."
                )
            elif usage_percent >= 90:
                # Log warning but allow request
                print(f"⚠️ Approaching monthly limit: {usage.prompt_count}/{STARTER_MONTHLY_LIMIT} ({usage_percent:.0f}%)")
        
        elif tier == "pro":
            # Pro tier: 2000 requests per month
            PRO_MONTHLY_LIMIT = 2000
            usage_percent = (usage.prompt_count / PRO_MONTHLY_LIMIT) * 100
            
            if usage.prompt_count >= PRO_MONTHLY_LIMIT:
                print(f"❌ Monthly limit reached")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Monthly limit reached (2000 requests/month). Upgrade to Pro Plus for unlimited."
                )
            elif usage_percent >= 90:
                # Log warning but allow request
                print(f"⚠️ Approaching monthly limit: {usage.prompt_count}/{PRO_MONTHLY_LIMIT} ({usage_percent:.0f}%)")
        # pro_plus tier: unlimited, no check needed
        
        # Check for API key
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            print(f"❌ OpenRouter API key not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenRouter API key not configured"
            )
        print(f"✅ API key present")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": os.getenv('FRONTEND_URL', 'http://localhost:5173'),
            "X-Title": "SAAS Chat Application",
            "Content-Type": "application/json"
        }
        
        messages = sanitized_messages
        
        # Add system message if provided
        if chat_request.system_prompt:
            messages.insert(0, {"role": "system", "content": chat_request.system_prompt})
        
        # Prepare request body
        request_body = {
            "model": chat_request.model or "tngtech/deepseek-r1t2-chimera:free",
            "messages": messages,
            "max_tokens": chat_request.max_tokens or 10000,
            "temperature": chat_request.temperature or 0.7
        }
        
        # ✅ Add thinking parameter if enabled
        if chat_request.thinking:
            request_body["thinking"] = {
                "type": "enabled",
                "budget_tokens": 8000
            }
            print(f"💭 Thinking mode enabled with 8000 token budget")
        
        # ✅ Validate request body before sending
        print(f"📋 Validating OpenRouter request body...")
        print(f"   - Model: {request_body['model']}")
        print(f"   - Messages count: {len(request_body['messages'])}")
        print(f"   - Max tokens: {request_body['max_tokens']}")
        print(f"   - Temperature: {request_body['temperature']}")
        
        # Validate model name is not empty
        if not request_body['model'] or not isinstance(request_body['model'], str):
            print(f"❌ Invalid model: {request_body['model']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid model specified: {request_body['model']}"
            )
        
        # Validate messages structure
        if not request_body['messages'] or len(request_body['messages']) == 0:
            print(f"❌ No messages in request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No messages provided"
            )
        
        # Validate each message
        for i, msg in enumerate(request_body['messages']):
            if not isinstance(msg, dict):
                print(f"❌ Message {i} is not a dict: {type(msg)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Message {i} has invalid format"
                )
            if 'role' not in msg or 'content' not in msg:
                print(f"❌ Message {i} missing role or content: {msg.keys()}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Message {i} missing role or content field"
                )
            if not isinstance(msg['content'], str):
                print(f"❌ Message {i} content is not string: {type(msg['content'])}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Message {i} content must be a string"
                )
        
        # Validate numeric parameters
        if not isinstance(request_body['max_tokens'], (int, float)) or request_body['max_tokens'] < 1:
            print(f"❌ Invalid max_tokens: {request_body['max_tokens']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid max_tokens: must be > 0, got {request_body['max_tokens']}"
            )
        
        if not isinstance(request_body['temperature'], (int, float)) or request_body['temperature'] < 0 or request_body['temperature'] > 2:
            print(f"❌ Invalid temperature: {request_body['temperature']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid temperature: must be between 0 and 2, got {request_body['temperature']}"
            )
        
        print(f"✅ Request body validated successfully")
        
        # ✅ For image generation models, ensure we request JSON format
        if "image" in chat_request.model.lower() or "gemini" in chat_request.model.lower():
            # Some models like Gemini support JSON output for structured image descriptions
            pass  # OpenRouter will handle image models appropriately
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            print(f"🚀 Sending request to OpenRouter...")
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=request_body
            )
            
            if response.status_code != 200:
                error_detail = f"OpenRouter API error: {response.status_code}"
                try:
                    error_data = response.json()
                    error_detail = error_data.get('error', {}).get('message', error_detail)
                    print(f"❌ OpenRouter error response: {error_data}")
                    
                    # Log the full request for debugging
                    print(f"📤 Request body sent to OpenRouter:")
                    print(f"   - Model: {request_body.get('model')}")
                    print(f"   - Messages: {len(request_body.get('messages', []))} items")
                    print(f"   - Max tokens: {request_body.get('max_tokens')}")
                    print(f"   - Temperature: {request_body.get('temperature')}")
                    
                    # Provide more specific error messages
                    if response.status_code == 400:
                        if "model" in error_detail.lower():
                            print(f"⚠️ Invalid model specified")
                        elif "message" in error_detail.lower():
                            print(f"⚠️ Invalid message format")
                except Exception as json_error:
                    print(f"⚠️ Could not parse error response: {json_error}")
                    print(f"Response text: {response.text[:500]}")
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
                
            data = response.json()
            print(f"✅ Got response from OpenRouter")
            
            # Check if we got a valid response
            if not data.get("choices") or len(data["choices"]) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No response from AI model"
                )
            
            choice = data["choices"][0]
            message_content = choice["message"]["content"]
            images = []

            # Handle different response formats
            if isinstance(message_content, list):
                # Multimodal response (text + images)
                text_parts = []
                for part in message_content:
                    if isinstance(part, dict):
                        if part.get("type") == "text":
                            text_parts.append(part.get("text", ""))
                        elif part.get("type") == "image_url":
                            image_data = part.get("image_url", {})
                            url = image_data.get("url", "")
                            if url:
                                images.append({
                                    "url": url,
                                    "type": "image/png",
                                    "alt_text": image_data.get("detail", "AI generated image"),
                                    "width": None,
                                    "height": None
                                })
                message_content = "\n".join(text_parts)

            elif isinstance(message_content, str):
                # Plain text response - check for embedded image references
                
                # Extract markdown images: ![alt](url)
                markdown_images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', message_content)
                for alt_text, url in markdown_images:
                    if url.startswith(('http://', 'https://', 'data:image/')):
                        images.append({
                            "url": url,
                            "type": "image/png",
                            "alt_text": alt_text or "AI generated image",
                            "width": None,
                            "height": None
                        })
                
                # Extract HTML images: <img src="url">
                html_images = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', message_content)
                for url in html_images:
                    if url.startswith(('http://', 'https://', 'data:image/')):
                        # Avoid duplicates
                        if not any(img["url"] == url for img in images):
                            images.append({
                                "url": url,
                                "type": "image/png",
                                "alt_text": "AI generated image",
                                "width": None,
                                "height": None
                            })

            # Check for images in separate field (some APIs)
            if data.get("images"):
                for img in data["images"]:
                    if isinstance(img, dict) and img.get("url"):
                        images.append({
                            "url": img["url"],
                            "type": img.get("type", "image/png"),
                            "alt_text": img.get("alt_text", "AI generated image"),
                            "width": img.get("width"),
                            "height": img.get("height")
                        })

            print(f"📊 Extracted content: {len(message_content)} chars, {len(images)} images")
            
            # ✅ NEW: If using an image generation model and we got text (not images), 
            # generate images using Pollinations API
            if ("image" in chat_request.model.lower() or "gemini" in chat_request.model.lower()) and len(images) == 0:
                # Extract the user's image generation prompt from the last user message
                user_prompt = sanitized_messages[-1]['content'] if sanitized_messages else message_content
                image_prompt = user_prompt[:200] if user_prompt else "abstract art"
                
                print(f"🎨 Generating image from prompt: {image_prompt}")
                
                # Generate image URL using Pollinations API (free, no auth required)
                try:
                    # URL encode the prompt
                    import urllib.parse
                    encoded_prompt = urllib.parse.quote(image_prompt)
                    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
                    
                    images.append({
                        "url": image_url,
                        "type": "image/jpeg",
                        "alt_text": f"AI generated image: {image_prompt[:50]}",
                        "width": None,
                        "height": None
                    })
                    
                    print(f"✅ Generated image URL: {image_url}")
                    
                    # Update message content to include image reference
                    message_content = f"{message_content}\n\n![Generated Image]({image_url})"
                    
                except Exception as e:
                    print(f"⚠️ Failed to generate image: {e}")
                    # Continue without image, don't fail the entire request

            # ✅ Increment usage counter (important!)
            token_count = data.get("usage", {}).get("total_tokens", 0)
            await increment_message_count(user_id, token_count)

            # Return response with properly formatted images
            return ChatResponse(
                message=message_content,
                usage=data.get("usage", {}),
                model=data.get("model", "unknown"),
                images=images if images else None
            )
            
    except HTTPException:
        raise
    except httpx.TimeoutException:
        print(f"❌ Request timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to OpenRouter timed out"
        )
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing error: {str(e)}"
        )

# ==================== CHAT SESSIONS ENDPOINTS ====================

@router.post("/api/chat/sessions")
async def create_chat_session(
    session_data: Dict,
    payload: dict = Depends(verify_token)
):
    """Create a new chat session"""
    try:
        user_id = payload.get("sub")
        
        # ✅ NO AWAIT - db methods are synchronous
        user = db.get_user_by_auth0_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        new_session = {
            'user_id': user['id'],
            'title': session_data.get('title', 'New Chat'),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"Creating chat session: {new_session}")
        
        # ✅ NO AWAIT
        session = db.create_chat_session(new_session)
        
        print(f"Chat session created: {session}")
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}"
        )

@router.get("/api/chat/sessions")
async def get_chat_sessions(payload: dict = Depends(verify_token)):
    """Get user's chat sessions"""
    try:
        user_id = payload.get("sub")
        
        # ✅ NO AWAIT
        user = db.get_user_by_auth0_id(user_id)
        if not user:
            return []
        
        print(f"Fetching chat sessions for user: {user['id']}")
        
        # ✅ NO AWAIT
        sessions = db.get_chat_sessions(user['id'])
        
        print(f"Found {len(sessions)} chat sessions")
        
        return sessions
        
    except Exception as e:
        print(f"Error fetching chat sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chat sessions: {str(e)}"
        )

@router.get("/api/chat/sessions/{session_id}/messages")
async def get_chat_messages(
    session_id: str,
    payload: dict = Depends(verify_token)
):
    """Get messages for a specific chat session"""
    try:
        print(f"Fetching messages for session: {session_id}")
        
        # ✅ NO AWAIT
        messages = db.get_chat_messages(session_id)
        
        print(f"Found {len(messages)} messages")
        
        return messages
        
    except Exception as e:
        print(f"Error fetching chat messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chat messages: {str(e)}"
        )

@router.post("/api/chat/sessions/{session_id}/messages")
async def create_chat_message(
    session_id: str,
    message_data: Dict,
    payload: dict = Depends(verify_token)
):
    """Create a new chat message with optional images"""
    try:
        print(f"Creating message for session {session_id}: {message_data}")
        
        # Extract and validate images
        images = message_data.get('images', [])
        if images and not isinstance(images, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Images must be an array"
            )
        
        for img in images:
            if not isinstance(img, dict) or 'url' not in img or 'type' not in img:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each image must have 'url' and 'type' fields"
                )
        
        new_message = {
            'session_id': session_id,
            'role': message_data.get('role'),
            'content': message_data.get('content'),
            'model_used': message_data.get('model_used'),
            'tokens_used': message_data.get('tokens_used'),
            'created_at': datetime.now().isoformat(),
            'images': images
        }
        
        # ✅ NO AWAIT
        message = db.create_chat_message(new_message)
        
        print(f"Message created: {message['id']} with {len(images)} images")
        
        return message
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create message: {str(e)}"
        )

@router.patch("/api/chat/sessions/{session_id}")
async def update_chat_session(
    session_id: str,
    update_data: Dict,
    payload: dict = Depends(verify_token)
):
    """Update a chat session (e.g., title)"""
    try:
        print(f"Updating session {session_id}: {update_data}")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        # ✅ NO AWAIT
        db.update_chat_session(session_id, update_data)
        
        return {"status": "success", "message": "Session updated"}
        
    except Exception as e:
        print(f"Error updating chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update session: {str(e)}"
        )

@router.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    payload: dict = Depends(verify_token)
):
    """Delete a chat session"""
    try:
        print(f"Deleting session {session_id}")
        
        # ✅ NO AWAIT
        db.delete_chat_session(session_id)
        
        return {"status": "success", "message": "Session deleted"}
        
    except Exception as e:
        print(f"Error deleting session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )