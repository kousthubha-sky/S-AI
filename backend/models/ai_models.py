from typing import List, Dict

PRO_MODELS = [
    "x-ai/grok-4-fast",
    "google/gemini-2.5-flash-image",
    "meta-llama/llama-3.3-70b-instruct:free",
]

FREE_MODELS = [
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
    """
    # Pro users can access all models
    if is_pro:
        return True

    # Free users can only access free models
    return model_id in FREE_MODELS