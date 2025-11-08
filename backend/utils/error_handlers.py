# Create new file: backend/utils/error_handlers.py

from fastapi import Request, HTTPException, status,FastAPI,Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import traceback
import uuid
from datetime import datetime
from models.chat import ChatResponse, ChatRequest
import httpx
from auth.dependencies import verify_token, get_user_usage, increment_message_count
import os

logger = logging.getLogger(__name__)

app = FastAPI(
    title="SAAS API",
    description="Backend API for SAAS application with Supabase integration",
    version="2.0.0"
)

class SecureErrorHandler:
    """Handle errors securely without exposing sensitive information"""
    
    @staticmethod
    def log_error(error_id: str, error: Exception, request: Request, user_id: str = None):
        """Log detailed error information for debugging"""
        logger.error(
            f"Error ID: {error_id} | "
            f"User: {user_id or 'anonymous'} | "
            f"Path: {request.url.path} | "
            f"Method: {request.method} | "
            f"Error: {str(error)} | "
            f"Type: {type(error).__name__}",
            exc_info=True
        )
    
    @staticmethod
    def create_error_response(
        status_code: int,
        message: str,
        error_id: str = None,
        include_error_id: bool = True
    ) -> dict:
        """Create standardized error response"""
        response = {
            "detail": message,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if include_error_id and error_id:
            response["error_id"] = error_id
            response["message"] = "If this error persists, please contact support with the error ID"
        
        return response

# Add to main.py:

from utils.error_handlers import SecureErrorHandler

# ✅ HTTP Exception Handler (already exists, UPDATE it)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions securely"""
    # Generate error ID for tracking
    error_id = str(uuid.uuid4())
    
    # Log error details
    SecureErrorHandler.log_error(error_id, exc, request)
    
    # Return safe error message
    return JSONResponse(
        status_code=exc.status_code,
        content=SecureErrorHandler.create_error_response(
            exc.status_code,
            exc.detail,
            error_id,
            include_error_id=exc.status_code >= 500  # Only for server errors
        )
    )

# ✅ Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors securely"""
    error_id = str(uuid.uuid4())
    
    # Log detailed validation errors
    logger.warning(f"Validation error {error_id}: {exc.errors()}")
    
    # Return generic validation error (don't expose field details in production)
    is_production = os.getenv("ENVIRONMENT") == "production"
    
    if is_production:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=SecureErrorHandler.create_error_response(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Invalid request data",
                error_id
            )
        )
    else:
        # In development, show details
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": exc.errors(),
                "error_id": error_id
            }
        )

# ✅ Generic Exception Handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler"""
    error_id = str(uuid.uuid4())
    
    # Log full error details
    SecureErrorHandler.log_error(error_id, exc, request)
    
    # Return generic error message
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=SecureErrorHandler.create_error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "An internal server error occurred",
            error_id,
            include_error_id=True
        )
    )

# ✅ UPDATE existing endpoints to use secure error handling
messages = [{"role": msg.role, "content": msg.content} for msg in Request.messages]

@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest, payload: dict = Depends(verify_token)):
    """Process chat messages - SECURED"""
    user_id = payload.get("sub")
    error_id = str(uuid.uuid4())
    
    try:
        usage = await get_user_usage(user_id)
        
        # ... existing validation code ...
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": request.model or "tngtech/deepseek-r1t2-chimera:free",
                    "messages": messages,
                    "max_tokens": request.max_tokens or 1000,
                    "temperature": request.temperature or 0.7
                }
            )
            
            if response.status_code != 200:
                # ✅ Log detailed error but return generic message
                logger.error(f"OpenRouter error {error_id}: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service temporarily unavailable. Please try again."
                )
                
            data = response.json()
            await increment_message_count(user_id, token_count=data.get("usage", {}).get("total_tokens", 0))
            
            return ChatResponse(
                message=data["choices"][0]["message"]["content"],
                usage=data.get("usage", {}),
                model=data.get("model", "unknown")
            )
            
    except httpx.TimeoutException:
        logger.error(f"OpenRouter timeout {error_id} for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request timed out. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        # ✅ Log error with ID but don't expose details
        SecureErrorHandler.log_error(error_id, e, request, user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed. Error ID: {error_id}"
        )

# ✅ Environment-based configuration
class Config:
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = ENVIRONMENT == "development"
    
    # Security settings
    EXPOSE_ERROR_DETAILS = DEBUG
    LOG_LEVEL = "DEBUG" if DEBUG else "INFO"

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ] if Config.DEBUG else [
        logging.FileHandler('app.log')  # Only file in production
    ]
)