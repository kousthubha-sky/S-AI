# backend/utils/validators.py - FIXED VERSION

import re
import json
from fastapi import HTTPException, status
from typing import Optional, Dict, Tuple, Any
import bleach
import hashlib

# Import redis_client safely
try:
    from redis_config import redis_client
except ImportError:
    redis_client = None
    print("⚠️ Redis not available, caching disabled")

class InputValidator:
    """Production-grade input validation and sanitization"""
    
    # Email validation
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # Blocked email domains
    BLOCKED_DOMAINS = [
        'tempmail.com', 'guerrillamail.com', '10minutemail.com',
        'throwaway.email', 'mailinator.com', 'temp-mail.org'
    ]
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(?i)\b(?:union\s+select|select\s+union)\b.*?\bfrom\b",
        r"(?i)\b(?:insert\s+into|update\s+.*?\s+set|delete\s+from)\b.*?\bwhere\b",
        r"(?i)\bdrop\s+table\b|\btruncate\s+table\b",
        r"(?i)\b(?:xp_cmdshell|sp_oacreate|sp_executesql)\b",
    ]
    
    # XSS patterns - RELAXED for code contexts
    XSS_PATTERNS = [
        # Only catch ACTUAL executable XSS, not code examples
        r"<script[^>]*>\s*(?:document\.cookie|window\.location|fetch\(|XMLHttpRequest)",
        r"on(?:load|error)=['\"]?\s*(?:document\.|window\.|location\.)",
        r"javascript:\s*(?:document\.|window\.|location\.)\s*\(",
    ]
    
    @staticmethod
    def _is_likely_code_content(text: str, min_code_lines: int = 3) -> Tuple[bool, float]:
        """Determine if text is likely code content"""
        if not text:
            return False, 0.0
        
        lines = text.split('\n')
        if len(lines) < min_code_lines:
            return False, 0.0
        
        indicators = 0
        total_lines = len(lines)
        
        # Check for code patterns
        code_markers = [
            'function ', 'const ', 'let ', 'var ', 'def ', 'class ',
            'import ', 'export ', '<?php', '<!DOCTYPE', '<html', '{', '}',
            '=>', '->', '==', '!=', '&&', '||', '#include', 'using namespace'
        ]
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if any(marker in line for marker in code_markers):
                indicators += 1
        
        confidence = indicators / total_lines if total_lines > 0 else 0.0
        is_code = confidence > 0.2  # 20% threshold
        
        return is_code, confidence
    
    @staticmethod
    def sanitize_string(
        text: str, 
        max_length: int = 500000,
        context: Dict[str, Any] = None
    ) -> str:
        """
        Production-grade sanitization with context awareness.
        
        Args:
            text: The text to sanitize
            max_length: Maximum allowed length
            context: Additional context (e.g., {'is_code_context': True})
        
        Returns:
            Sanitized text
        """
        if not text:
            return ""
        
        # ✅ FIX: Create cache key safely
        context_str = json.dumps(context or {}, sort_keys=True)
        text_sample = text[:1000]  # Only hash first 1KB for performance
        cache_key = f"sanitized:{hashlib.md5((context_str + text_sample).encode()).hexdigest()}"
        
        # ✅ FIX: Check Redis cache properly
        if redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    # ✅ FIX: Handle both bytes and str
                    if isinstance(cached, bytes):
                        return cached.decode('utf-8')
                    return str(cached)
            except Exception as e:
                print(f"⚠️ Cache read error: {e}")
        
        # Apply length limit
        original_length = len(text)
        if original_length > max_length:
            print(f"⚠️ Text truncated: {original_length} -> {max_length}")
            text = text[:max_length]
        
        # Extract context information
        is_code_context = context and context.get('is_code_context', False)
        
        # Determine if this is code content
        if not is_code_context:
            is_code, code_confidence = InputValidator._is_likely_code_content(text)
            if is_code and code_confidence > 0.3:
                is_code_context = True
                print(f"🔍 Auto-detected code: {code_confidence:.2f}")
        
        if is_code_context:
            print(f"✅ Processing as code content (skipping XSS checks)")
            
            # For code content, apply minimal sanitization
            # Only remove truly dangerous executable patterns
            dangerous_patterns = [
                r"<script[^>]*>\s*(?:eval|document\.cookie|window\.location)\s*\(",
                r"javascript:\s*(?:document\.cookie|window\.location|eval)\s*\(",
            ]
            
            for pattern in dangerous_patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Dangerous executable code detected"
                    )
            
            # Don't strip HTML for code - just clean whitespace
            sanitized = text.strip()
            
        else:
            # Non-code content: apply strict sanitization
            print(f"✅ Processing as regular text")
            
            # Check for XSS
            for pattern in InputValidator.XSS_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    print(f"⚠️ XSS pattern detected")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid input detected - potential XSS attempt"
                    )
            
            # Check for SQL injection
            for pattern in InputValidator.SQL_INJECTION_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    print(f"⚠️ SQL injection pattern detected")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid input detected - potential SQL injection"
                    )
            
            # Apply HTML sanitization
            sanitized = bleach.clean(text, tags=[], strip=True).strip()
        
        # ✅ FIX: Cache result safely (only cache strings)
        if redis_client and len(sanitized) < 100000:  # Don't cache huge strings
            try:
                redis_client.setex(cache_key, 3600, sanitized)
            except Exception as e:
                print(f"⚠️ Cache write error: {e}")
        
        print(f"✅ Sanitization complete: {original_length} -> {len(sanitized)} chars")
        return sanitized
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format and domain"""
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        email = email.lower().strip()
        
        if not InputValidator.EMAIL_REGEX.match(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        domain = email.split('@')[1]
        if domain in InputValidator.BLOCKED_DOMAINS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email domain not allowed"
            )
        
        return email
    
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
        dangerous_extensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1']
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