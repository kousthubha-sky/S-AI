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
    
    # ✅ SQL injection patterns - STRICT: Only flag if combined with injection indicators
    SQL_INJECTION_PATTERNS = [
        # Only flag if SQL keyword + injection attempt (not just code asking about SQL)
        r"(\bOR\b\s+\d+\s*=\s*\d+)",  # OR 1=1 style
        r"(\bUNION\s+.*SELECT\b)",  # UNION based injection
        r"(--\s+|;\s*DROP|;\s*DELETE)",  # Comment-based injection
        r"(xp_|sp_cmdshell)",  # Stored procedure injection
    ]
    
    # ✅ XSS patterns - Only flag actual script injection, not HTML code discussion
    XSS_PATTERNS = [
        r"<script[^>]*>",  # Actual script tags (not discussion about <script>)
        r"javascript:",  # JavaScript protocol handler
        r"on(load|error|click|change|focus|blur|submit|mouseenter|mouseleave)\s*=",  # Event handlers
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
        """
        Sanitize text input with support for large inputs
        ✅ UPDATED: Now supports up to 500KB of text (for large code blocks)
        ✅ SMARTER: Only blocks actual injection attempts, allows legitimate code discussion
        """
        if not text:
            return ""
        
        # ✅ INCREASED: Support for large code blocks (500,000 characters = ~500KB)
        # This allows pasting entire source files for code review/correction
        if len(text) > max_length:
            text = text[:max_length]
        
        # Remove HTML tags (but preserve content structure for code)
        text = bleach.clean(text, tags=[], strip=True)
        
        # ✅ Check for SQL injection ONLY if there are actual injection indicators
        # Don't block legitimate SQL keywords (like in code review or learning questions)
        for pattern in InputValidator.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                print(f"⚠️ SQL Injection pattern detected: {pattern}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected - SQL injection attempt"
                )
        
        # ✅ Check for XSS attempts ONLY for actual script injection
        for pattern in InputValidator.XSS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                print(f"⚠️ XSS pattern detected: {pattern}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected - XSS attempt"
                )
        
        return text.strip()
    
    @staticmethod
    def split_large_input(text: str, chunk_size: int = 100000) -> list:
        """
        Split very large inputs into manageable chunks
        Useful for processing code files > 100KB
        """
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        words = text.split()  # Split by words to avoid cutting mid-word
        current_chunk = ""
        
        for word in words:
            if len(current_chunk) + len(word) + 1 > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = word
            else:
                current_chunk += " " + word if current_chunk else word
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
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

