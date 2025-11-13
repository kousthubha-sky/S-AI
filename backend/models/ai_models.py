from typing import List, Dict

PRO_MODELS = [
    "x-ai/grok-4-fast",
    "google/gemini-2.5-flash-image",
    "meta-llama/llama-3.3-70b-instruct:free",
    "anthropic/claude-3.5-sonnet",  # Add Claude as premium option
    "openai/gpt-4-turbo-preview",
]

FREE_MODELS = [
    "openai/gpt-oss-20b:free",
    "tngtech/deepseek-r1t2-chimera:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    # NOTE: meta-llama/llama-4-maverick variants have strict moderation policies
    # They flag common words as "misc" violations and return 403 errors
    # Use alternative free models above instead
    "qwen/qwen3-30b-a3b:free",
    "qwen/qwen3-235b-a22b:free",
]

# Models with known moderation/reliability issues
PROBLEMATIC_MODELS = [
    "meta-llama/llama-4-maverick-17b-128e-instruct:free",  # ← Known to have aggressive moderation
    "meta-llama/llama-4-maverick:free",  # ← Has strict content filtering
]

def get_fallback_models(is_pro: bool = False) -> List[str]:
    """Get fallback models if primary model fails due to moderation/errors"""
    if is_pro:
        return [
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4-turbo-preview",
            "x-ai/grok-4-fast",
        ]
    else:
        return [
            "openai/gpt-oss-20b:free",
            "tngtech/deepseek-r1t2-chimera:free",
            "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        ]

def validate_model_access(model_id: str, is_pro: bool = False) -> bool:
    """
    Validate if a user has access to a specific model based on their subscription tier.
    Returns True if user can access the model, False otherwise.
    """
    print(f"🔍 validate_model_access called:")
    print(f"   - model_id: '{model_id}'")
    print(f"   - is_pro: {is_pro}")
    
    # Check if model is known to have issues
    if model_id in PROBLEMATIC_MODELS:
        print(f"   ⚠️ WARNING: Model '{model_id}' has known moderation/reliability issues")
        print(f"   📋 Recommendation: Use a model from {get_fallback_models(is_pro)}")
        # Still allow access but warn
    
    # Pro users can access all models
    if is_pro:
        print(f"   ✅ Pro user - access to ALL models GRANTED")
        return True

    # Free users can only access free models
    model_in_free = model_id in FREE_MODELS
    print(f"   - Is model in FREE_MODELS? {model_in_free}")
    
    if not model_in_free:
        print(f"   ❌ Model not in FREE_MODELS - access DENIED")
        print(f"   💡 Available free models: {FREE_MODELS}")
        return False
    
    print(f"   ✅ Model in FREE_MODELS - access GRANTED")
    return True