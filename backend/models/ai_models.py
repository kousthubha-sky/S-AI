from typing import List, Dict

PRO_MODELS = [
    "x-ai/grok-4-fast",
    "google/gemini-2.5-flash-image",
    "meta-llama/llama-3.3-70b-instruct:free",
]

FREE_MODELS = [
    "openai/gpt-oss-20b:free",
    "tngtech/deepseek-r1t2-chimera:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-4-maverick:free",
    "qwen/qwen3-30b-a3b:free",
    "qwen/qwen3-235b-a22b:free",
]

def validate_model_access(model_id: str, is_pro: bool = False) -> bool:
    """
    Validate if a user has access to a specific model based on their subscription tier.
    Returns True if user can access the model, False otherwise.
    """
    print(f"🔍 validate_model_access called:")
    print(f"   - model_id: '{model_id}'")
    print(f"   - is_pro: {is_pro}")
    print(f"   - FREE_MODELS: {FREE_MODELS}")
    print(f"   - PRO_MODELS: {PRO_MODELS}")
    
    # Pro users can access all models
    if is_pro:
        print(f"   ✅ Pro user - access to ALL models GRANTED")
        return True

    # Free users can only access free models
    model_in_free = model_id in FREE_MODELS
    print(f"   - Is model in FREE_MODELS? {model_in_free}")
    
    if not model_in_free:
        print(f"   ❌ Model not in FREE_MODELS - access DENIED")
        return False
    
    print(f"   ✅ Model in FREE_MODELS - access GRANTED")
    return True