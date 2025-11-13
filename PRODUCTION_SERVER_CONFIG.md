# Production Server Configuration for Large Inputs

## Quick Reference

| Component | Setting | Value | Purpose |
|-----------|---------|-------|---------|
| **Nginx** | `client_max_body_size` | 100M | Allow 100MB requests |
| **FastAPI** | `max_tokens` | 2000 | Support longer responses |
| **Backend** | `max_length` | 500000 | Support 500KB text inputs |
| **Frontend** | `max-height` | 600px | Display large code blocks |

---

## 🌐 Nginx Configuration

### Option 1: Site-Specific (Recommended)
**File**: `/etc/nginx/sites-available/your-saas`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    # ✅ CRITICAL: Allow large request bodies
    client_max_body_size 100M;
    
    # ✅ Disable request buffering for streaming
    proxy_request_buffering off;
    
    location /api/ {
        # ✅ Proxy to backend with proper configuration
        proxy_pass http://backend:8000;
        
        # ✅ Disable buffering for real-time processing
        proxy_buffering off;
        proxy_request_buffering off;
        
        # ✅ Increase timeouts for large payloads
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        
        # ✅ Pass headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        # ✅ Serve frontend
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# ✅ Optional: Compression for API responses
map $request_uri $api_uri {
    default 0;
    ~^/api/ 1;
}

server {
    # ... other config ...
    
    # ✅ Compress JSON responses (except large uploads)
    gzip on;
    gzip_types application/json text/plain;
    gzip_min_length 1000;
    gzip_proxied any;
}
```

### Option 2: Global Configuration
**File**: `/etc/nginx/nginx.conf`

```nginx
http {
    # ✅ Global settings for all servers
    client_max_body_size 100M;
    
    # ✅ Buffer settings for large payloads
    client_body_buffer_size 10M;
    client_header_buffer_size 16k;
    large_client_header_buffers 4 32k;
    
    # ✅ Proxy settings
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    
    # Include other directives...
}
```

---

## 🐍 Python Backend Configuration

### Option 1: Uvicorn (Development)
```bash
# Run with increased limits
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --limit-concurrency 100 \
  --limit-max-requests 10000 \
  --timeout-keep-alive 65
```

### Option 2: Gunicorn + Uvicorn (Production)
**File**: `backend/gunicorn_config.py`

```python
# ✅ Gunicorn configuration for large payloads
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2  # CPU-dependent
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s'

# Process naming
proc_name = 'saas-backend'

# Server hooks
def on_starting(server):
    print("✅ Backend starting - Large input support enabled")

def on_worker_int(worker):
    print(f"✅ Worker {worker.pid} handling large inputs")
```

**Run with**:
```bash
gunicorn -c backend/gunicorn_config.py main:app
```

### Option 3: Docker (Recommended)
**File**: `Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# ✅ Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ✅ Copy application
COPY . .

# ✅ Expose port
EXPOSE 8000

# ✅ Run with Gunicorn configured for large inputs
CMD ["gunicorn", \
     "-c", "backend/gunicorn_config.py", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "65", \
     "main:app"]
```

---

## 🚀 Load Balancer Configuration

### HAProxy (for multiple backend instances)
```haproxy
global
    # ✅ Allow large payloads
    tune.http.maxhdr 16384
    tune.maxconn 4096
    
defaults
    mode http
    timeout connect 5000ms
    timeout client 120000ms      # ✅ Large payload timeout
    timeout server 120000ms      # ✅ Processing timeout
    
backend backend_servers
    balance roundrobin
    
    # ✅ Multiple backend instances for redundancy
    server backend1 backend1:8000 check maxconn 100
    server backend2 backend2:8000 check maxconn 100
    server backend3 backend3:8000 check maxconn 100

frontend http_front
    bind *:80
    
    # ✅ Large request support
    http-reuse safe
    
    default_backend backend_servers
```

---

## 📊 Performance Tuning

### Linux Kernel Settings
**File**: `/etc/sysctl.conf`

```bash
# ✅ Network tuning for large payloads
net.core.rmem_max = 134217728      # 128MB receive buffer
net.core.wmem_max = 134217728      # 128MB send buffer
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# ✅ Connection queue
net.ipv4.tcp_max_syn_backlog = 5000
net.core.somaxconn = 5000

# ✅ File descriptors
fs.file-max = 2097152

# Apply changes
sudo sysctl -p
```

### Connection Pool Limits
**Backend**: `services/database.py`

```python
# ✅ Increase connection pool for concurrent large inputs
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=20,           # Max connections in pool
    max_overflow=40,        # Additional connections if needed
    pool_recycle=3600,      # Recycle connections hourly
    pool_pre_ping=True      # Test connections before use
)
```

---

## 📈 Monitoring & Alerts

### Prometheus Metrics Configuration
**File**: `backend/prometheus_metrics.py`

```python
from prometheus_client import Counter, Histogram, Gauge

# ✅ Track large inputs
large_input_size = Histogram(
    'request_body_size_bytes',
    'Request body size in bytes',
    buckets=[1024, 10*1024, 100*1024, 1024*1024, 10*1024*1024]
)

large_input_processing_time = Histogram(
    'large_input_processing_seconds',
    'Time to process large inputs',
    buckets=[0.5, 1, 2, 5, 10, 30]
)

active_large_inputs = Gauge(
    'active_large_inputs_count',
    'Number of active large input processing tasks'
)
```

### Alert Rules
**File**: `prometheus/alerts.yml`

```yaml
groups:
  - name: large_inputs
    rules:
      # ✅ Alert if processing large input takes > 5 seconds
      - alert: SlowLargeInput
        expr: large_input_processing_seconds_bucket{le="5"} > 0.8
        for: 1m
        annotations:
          summary: "Slow large input processing detected"
          
      # ✅ Alert if max request size exceeded
      - alert: MaxRequestSizeExceeded
        expr: rate(request_body_size_bytes_bucket{le="10485760"}[5m]) > 10
        for: 5m
        annotations:
          summary: "Many requests approaching max size limit"
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Test with 500KB input locally
- [ ] Configure nginx `client_max_body_size = 100M`
- [ ] Set gunicorn `--timeout 120`
- [ ] Configure kernel settings (sysctl)
- [ ] Set up monitoring and alerts

### Deployment
- [ ] Deploy updated backend code
- [ ] Deploy updated frontend code
- [ ] Update web server configuration
- [ ] Reload nginx/gunicorn
- [ ] Verify large input support with test

### Post-Deployment
- [ ] Monitor slow request logs
- [ ] Check error rate for large inputs
- [ ] Monitor memory usage
- [ ] Gather user feedback
- [ ] Adjust timeouts if needed

---

## 🧪 Testing Checklist

```bash
#!/bin/bash

# Test 1: Small input (should be instant)
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer TOKEN" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'

# Test 2: Medium input (50KB)
python3 << 'EOF'
import requests
data = "x" * (50 * 1024)
response = requests.post(
    'http://localhost:8000/api/chat',
    json={'messages': [{'role': 'user', 'content': data}]},
    headers={'Authorization': 'Bearer TOKEN'}
)
print(f"Status: {response.status_code}, Time: {response.elapsed.total_seconds()}s")
EOF

# Test 3: Large input (500KB)
python3 << 'EOF'
import requests
import time
data = "x" * (500 * 1024)
start = time.time()
response = requests.post(
    'http://localhost:8000/api/chat',
    json={'messages': [{'role': 'user', 'content': data}]},
    headers={'Authorization': 'Bearer TOKEN'}
)
elapsed = time.time() - start
print(f"Status: {response.status_code}, Time: {elapsed}s")
print(f"Expected: 1-3s, Actual: {elapsed}s")
EOF
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| `413 Payload Too Large` | Increase nginx `client_max_body_size` |
| `504 Gateway Timeout` | Increase proxy timeouts in nginx/HAProxy |
| `Memory spike with large input` | Check connection pool, add caching |
| `Slow processing` | Profile with Python `cProfile`, optimize hot paths |
| `Connection reset` | Increase keep-alive timeout |

