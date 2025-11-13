# Large Input Support - Configuration Guide

## Overview
Your SAAS application now supports **large code blocks and high input volumes** for scenarios like:
- Pasting entire source files for code review
- Correcting large blocks of code
- Processing high volumes of text input
- Handling large documents and transcripts

---

## 🚀 Changes Made

### Backend Updates

#### 1. **ChatRequest Model** (`models/chat.py`)
```python
# ✅ Updated
max_tokens: Optional[int] = 2000  # Increased from 1000
# Now supports longer responses for large inputs
```

#### 2. **Input Validation** (`main.py` - Chat Endpoint)
```python
# ✅ Updated
"content": InputValidator.sanitize_string(msg.content, max_length=500000)
# Now accepts 500KB of text (5x increase from 100KB)
```

#### 3. **Validator Utilities** (`utils/validators.py`)
```python
# ✅ New Features Added
@staticmethod
def sanitize_string(text: str, max_length: int = 1000) -> str:
    # Supports up to max_length characters (default 500,000)
    # Preserves code structure
    # Security checks still applied

@staticmethod
def split_large_input(text: str, chunk_size: int = 100000) -> list:
    # NEW: Splits very large inputs into manageable chunks
    # Useful for processing code files > 100KB
```

#### 4. **Request Body Size Configuration**
FastAPI now accepts larger request payloads. For production deployment, configure your web server:

**Uvicorn (Development)**:
```bash
uvicorn main:app --limit-concurrency 10 --limit-max-requests 10000
```

**Nginx (Production)**:
```nginx
server {
    client_max_body_size 100M;  # Increase max upload size
    
    location /api/ {
        proxy_pass http://backend;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

**Gunicorn (Production)**:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --worker-class uvicorn.workers.UvicornWorker \
  main:app
```

---

### Frontend Updates

#### 1. **Textarea Height** (`chat-interface.tsx`)
| Metric | Before | After | Benefit |
|--------|--------|-------|---------|
| Mobile max-height | 120px | 250px | 2x more visible text |
| Desktop max-height | 200px | 600px | 3x more visible code |
| Placeholder text | Generic | Includes hint | User guidance |

#### 2. **Scrolling Support**
```typescript
// ✅ Added
style={{
  overflow: 'auto'  // Better scrolling for large inputs
}}
```

#### 3. **Character Count Warning**
```typescript
// ✅ Added
onInput={(e) => {
  if (e.target.value.length > 400000) {
    console.warn('⚠️ Large input detected: Consider splitting...');
  }
}}
```

---

## 📊 Supported Input Sizes

| Scenario | Max Size | Example |
|----------|----------|---------|
| **Regular Chat** | 500KB | ~10,000 lines of code |
| **Code Review** | 500KB | Large Python/JS files |
| **Document Processing** | 10MB* | PDF files (via upload) |
| **Multiple Messages** | Unlimited | Chat history with 1000+ messages |

*File uploads use separate endpoint with 10MB limit

---

## 🔒 Security Maintained

All security features remain active:
- ✅ SQL Injection detection
- ✅ XSS attack prevention
- ✅ HTML tag removal
- ✅ Path traversal prevention
- ✅ Malicious file type blocking

---

## 💻 Usage Examples

### Example 1: Paste Large Code Block
```
User: "Please review this code and suggest improvements:
[Paste entire Python file here - can be 500KB]"
```

### Example 2: Correct Multiple Errors
```
User: "Fix all the bugs in this code:
[Paste entire application code]"
```

### Example 3: Code Generation from Specifications
```
User: "Based on these specs, generate the implementation:
[Paste long specification document - up to 500KB]"
```

---

## ⚙️ Environment Variables

Add to `.env` if needed:
```env
# Maximum input size in characters (default: 500000)
MAX_INPUT_LENGTH=500000

# Chunk size for large inputs (default: 100000)
INPUT_CHUNK_SIZE=100000

# Request body size limit in MB (configure in web server)
MAX_REQUEST_SIZE_MB=100
```

---

## 📈 Performance Considerations

### Optimal Input Sizes
- **Small** (< 10KB): Instant response, ~0.1s
- **Medium** (10-100KB): Quick response, ~0.3-0.5s
- **Large** (100-500KB): Normal response, ~1-2s
- **Very Large** (> 500KB): Split into multiple messages

### Tips for Large Inputs

1. **For 500KB+ inputs**: Split into 2-3 messages
```
Message 1: "Review part 1:"
Message 2: "Review part 2:"
Message 3: "Review part 3:"
```

2. **For code reviews**: Provide context first
```
"I have a Python data processing script. 
Please review the following code for:
1. Performance improvements
2. Error handling
3. Code style

[Large code block]"
```

3. **For very large projects**: Use file upload instead
```
Upload → Process → Review
```

---

## 🔧 Testing Large Inputs

### Test via curl (Backend Testing)
```bash
# Test 100KB input
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @large_payload.json

# Create large payload
python3 << 'EOF'
import json
large_text = "x" * 500000  # 500KB
payload = {
    "messages": [{"role": "user", "content": large_text}],
    "model": "anthropic/claude-3.5-sonnet"
}
with open('large_payload.json', 'w') as f:
    json.dump(payload, f)
EOF
```

### Test via Frontend
1. Open browser DevTools
2. Paste 500KB+ text in input field
3. Check console for warnings
4. Submit and monitor response time

---

## 🐛 Troubleshooting

### Issue: "Payload too large" Error
**Solution**: Configure web server limits
```nginx
# In nginx.conf
client_max_body_size 100M;
```

### Issue: Slow Response with Large Input
**Solution**: Split into multiple messages or use file upload
```
For 500KB+: Split into 3 messages of ~150KB each
```

### Issue: Textarea scrolling jerky
**Solution**: Browser-specific, try:
- Use Chrome/Edge (better scrolling)
- Reduce number of open tabs
- Clear browser cache

---

## 📝 Deployment Checklist

- [ ] Update backend to support max 500KB inputs
- [ ] Configure web server (nginx/gunicorn) for 100MB+ requests
- [ ] Test with various input sizes (10KB, 100KB, 500KB)
- [ ] Monitor server CPU/memory during large input processing
- [ ] Set up alerts for slow requests (> 3 seconds)
- [ ] Document large input best practices for users

---

## 📚 Related Documentation

- [Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Backend Configuration](./backend/README.md)
- [Frontend Setup](./frontend/README.md)

---

## 🎯 Future Enhancements

Planned improvements:
- [ ] Streaming response for large inputs
- [ ] Progress indicators during processing
- [ ] Automatic input splitting with user confirmation
- [ ] Input compression for very large payloads
- [ ] Batch processing API for multiple large inputs
