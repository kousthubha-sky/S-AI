# Create new file: backend/utils/validators.py

import re
from fastapi import HTTPException, status
from typing import Optional
import bleach

class InputValidator:
    """Validate and sanitize user inputs"""
    
    # ✅ Email validation
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # ✅ Blocked email domains
    BLOCKED_DOMAINS = [
        'tempmail.com', 'guerrillamail.com', '10minutemail.com',
        'throwaway.email', 'mailinator.com', 'temp-mail.org'
    ]
    
    # ✅ SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
        r"(--|\;|\/\*|\*\/|xp_|sp_)",
        r"(\bOR\b.*=.*|UNION.*SELECT)",
    ]
    
    # ✅ XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
    ]
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format and domain"""
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        email = email.lower().strip()
        
        # Check format
        if not InputValidator.EMAIL_REGEX.match(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Check blocked domains
        domain = email.split('@')[1]
        if domain in InputValidator.BLOCKED_DOMAINS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email domain not allowed"
            )
        
        return email
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = 1000) -> str:
        """Sanitize text input"""
        if not text:
            return ""
        
        # Truncate
        text = text[:max_length]
        
        # Remove HTML tags
        text = bleach.clean(text, tags=[], strip=True)
        
        # Check for SQL injection
        for pattern in InputValidator.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
        
        # Check for XSS
        for pattern in InputValidator.XSS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
        
        return text.strip()
    
    @staticmethod
    def validate_filename(filename: str) -> str:
        """Validate and sanitize filenames"""
        if not filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is required"
            )
        
        # Remove path traversal attempts
        filename = re.sub(r'[/\\]', '', filename)
        
        # Remove dangerous characters
        filename = re.sub(r'[<>:"|?*]', '', filename)
        
        # Limit length
        filename = filename[:255]
        
        # Check for executable extensions
        dangerous_extensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.jar']
        if any(filename.lower().endswith(ext) for ext in dangerous_extensions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type not allowed"
            )
        
        return filename
    
    @staticmethod
    def validate_session_id(session_id: str) -> str:
        """Validate UUID format"""
        uuid_pattern = re.compile(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            re.IGNORECASE
        )
        
        if not uuid_pattern.match(session_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        return session_id

