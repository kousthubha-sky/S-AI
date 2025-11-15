# backend/models/ai_models.py - MULTI-TIER VERSION

from typing import List, Dict

# ==================== MODEL DEFINITIONS ====================

# Free Tier Models (Basic models only)
FREE_MODELS = [
    "openai/gpt-oss-20b:free",
    "tngtech/deepseek-r1t2-chimera:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-4-maverick:free",
    "qwen/qwen3-30b-a3b:free",
    "qwen/qwen3-235b-a22b:free",
]

# Starter Tier Models (Free + Llama 3.3 70B)
STARTER_MODELS = FREE_MODELS + [
    "meta-llama/llama-3.3-70b-instruct:free",
]

# Pro Tier Models (Starter + Premium models + Image generation)
PRO_MODELS = STARTER_MODELS + [
    "x-ai/grok-4-fast",
    "google/gemini-2.5-flash-image",
]

# Pro Plus Tier Models (All models - unlimited access)
PRO_PLUS_MODELS = PRO_MODELS + [
    # Add any additional premium models here
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4-turbo",
]

# ==================== FEATURE ACCESS ====================

TIER_FEATURES = {
    "free": {
        "image_generation": False,
        "custom_prompts": False,
        "export_conversations": False,
        "advanced_analytics": False,
        "api_access": False,
        "document_analysis": False,
        "code_generation": "basic"
    },
    "starter": {
        "image_generation": False,
        "custom_prompts": False,
        "export_conversations": True,
        "advanced_analytics": False,
        "api_access": False,
        "document_analysis": True,
        "code_generation": "advanced"
    },
    "pro": {
        "image_generation": True,
        "custom_prompts": True,
        "export_conversations": True,
        "advanced_analytics": True,
        "api_access": False,
        "document_analysis": True,
        "code_generation": "advanced"
    },
    "pro_plus": {
        "image_generation": True,
        "custom_prompts": True,
        "export_conversations": True,
        "advanced_analytics": True,
        "api_access": True,
        "document_analysis": True,
        "code_generation": "advanced"
    }
}

# ==================== VALIDATION FUNCTIONS ====================

def validate_model_access(model_id: str, tier: str = "free") -> bool:
    """
    Validate if a user has access to a specific model based on their subscription tier.
    
    Args:
        model_id: The ID of the AI model to check
        tier: User's subscription tier ("free", "starter", "pro", "pro_plus")
    
    Returns:
        True if user can access the model, False otherwise
    """
    print(f"🔍 validate_model_access called:")
    print(f"   - model_id: '{model_id}'")
    print(f"   - tier: '{tier}'")
    
    # Normalize tier
    tier = tier.lower() if tier else "free"
    
    # Map tier to allowed models
    tier_models = {
        "free": FREE_MODELS,
        "starter": STARTER_MODELS,
        "pro": PRO_MODELS,
        "pro_plus": PRO_PLUS_MODELS
    }
    
    allowed_models = tier_models.get(tier, FREE_MODELS)
    
    print(f"   - Tier '{tier}' has access to {len(allowed_models)} models")
    
    # Check if model is in allowed list
    has_access = model_id in allowed_models
    
    print(f"   - Access result: {'✅ GRANTED' if has_access else '❌ DENIED'}")
    
    return has_access

def get_available_models(tier: str = "free") -> List[str]:
    """
    Get list of all available models for a tier
    
    Args:
        tier: User's subscription tier
    
    Returns:
        List of model IDs available to the tier
    """
    tier = tier.lower() if tier else "free"
    
    tier_models = {
        "free": FREE_MODELS,
        "starter": STARTER_MODELS,
        "pro": PRO_MODELS,
        "pro_plus": PRO_PLUS_MODELS
    }
    
    return tier_models.get(tier, FREE_MODELS)

def get_tier_features(tier: str = "free") -> Dict[str, any]:
    """
    Get feature access for a tier
    
    Args:
        tier: User's subscription tier
    
    Returns:
        Dictionary of feature access flags
    """
    tier = tier.lower() if tier else "free"
    return TIER_FEATURES.get(tier, TIER_FEATURES["free"])

def has_feature_access(tier: str, feature: str) -> bool:
    """
    Check if a tier has access to a specific feature
    
    Args:
        tier: User's subscription tier
        feature: Feature name to check
    
    Returns:
        True if tier has access to the feature
    """
    tier = tier.lower() if tier else "free"
    features = TIER_FEATURES.get(tier, TIER_FEATURES["free"])
    return features.get(feature, False)

def get_tier_name(tier: str) -> str:
    """Get friendly name for tier"""
    names = {
        "free": "Free",
        "starter": "Student Starter",
        "pro": "Student Pro",
        "pro_plus": "Student Pro Plus"
    }
    return names.get(tier, "Free")

def get_upgrade_message(current_tier: str, required_tier: str) -> str:
    """Get upgrade message for user"""
    messages = {
        "free_to_starter": "Upgrade to Student Starter (₹199/month) to access this model",
        "free_to_pro": "Upgrade to Student Pro (₹299/month) to access premium models and image generation",
        "free_to_pro_plus": "Upgrade to Student Pro Plus (₹599/month) for unlimited access",
        "starter_to_pro": "Upgrade to Student Pro (₹299/month) to access premium models",
        "starter_to_pro_plus": "Upgrade to Student Pro Plus (₹599/month) for unlimited access",
        "pro_to_pro_plus": "Upgrade to Student Pro Plus (₹599/month) for unlimited access and API"
    }
    
    key = f"{current_tier}_to_{required_tier}"
    return messages.get(key, f"Upgrade to {get_tier_name(required_tier)} to access this feature")

# ==================== MODEL CATEGORIZATION ====================

def get_model_info(model_id: str) -> Dict[str, any]:
    """Get information about a model"""
    # You can expand this with more details
    if model_id in FREE_MODELS:
        return {
            "tier": "free",
            "name": model_id.split('/')[-1],
            "category": "Basic"
        }
    elif model_id in STARTER_MODELS:
        return {
            "tier": "starter",
            "name": model_id.split('/')[-1],
            "category": "Starter"
        }
    elif model_id in PRO_MODELS:
        return {
            "tier": "pro",
            "name": model_id.split('/')[-1],
            "category": "Pro"
        }
    elif model_id in PRO_PLUS_MODELS:
        return {
            "tier": "pro_plus",
            "name": model_id.split('/')[-1],
            "category": "Pro Plus"
        }
    else:
        return {
            "tier": "unknown",
            "name": model_id,
            "category": "Unknown"
        }