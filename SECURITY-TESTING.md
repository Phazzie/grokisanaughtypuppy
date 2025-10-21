# Security Testing Guide

## 🛡️ Security Measures Implemented

### 1. **Helmet Security Headers**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)

### 2. **CORS Protection**
- Whitelist-based origin validation
- Configured via `ALLOWED_ORIGINS` environment variable
- Default: production frontend + localhost for development

### 3. **Rate Limiting**
- Global API limit: 100 requests per 15 minutes
- Chat endpoint limit: 20 requests per minute
- Prevents abuse and DDoS attacks

### 4. **Input Validation**
- Message content validation (string, max 5000 chars)
- Role validation (must be 'user', 'assistant', or 'system')
- Temperature range validation (0-2)
- Array length validation
- XSS prevention via sanitization

### 5. **Request Size Limits**
- Maximum body size: 1MB
- Prevents memory exhaustion attacks

### 6. **Error Handling**
- No stack trace exposure in production
- Generic error messages for security
- Detailed logging for debugging

### 7. **Environment Validation**
- Startup checks for required environment variables
- Fails fast if critical config missing

## 🧪 Testing Commands

### Test 1: Health Check
```bash
curl https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/health
```
**Expected**: `{"status":"ok","timestamp":"..."}`

### Test 2: CORS - Allowed Origin
```bash
curl -H "Origin: https://grokisanaughtypuppy-yn23q.ondigitalocean.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat
```
**Expected**: CORS headers present (Access-Control-Allow-Origin)

### Test 3: CORS - Blocked Origin
```bash
curl -H "Origin: https://evil-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat
```
**Expected**: No CORS headers or error

### Test 4: Input Validation - Invalid Message
```bash
curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "invalid", "content": "test"}], "temperature": 0.7}'
```
**Expected**: 400 Bad Request with validation errors

### Test 5: Input Validation - Missing Required Fields
```bash
curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"temperature": 0.7}'
```
**Expected**: 400 Bad Request (messages required)

### Test 6: Input Validation - Temperature Out of Range
```bash
curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "test"}], "temperature": 3.0}'
```
**Expected**: 400 Bad Request (temperature must be 0-2)

### Test 7: Rate Limiting
```bash
# Run this script to test rate limiting
for i in {1..25}; do
  echo "Request $i"
  curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat \
       -H "Content-Type: application/json" \
       -d '{"messages": [{"role": "user", "content": "test"}], "temperature": 0.7}'
  echo ""
done
```
**Expected**: After 20 requests in 1 minute, receive 429 Too Many Requests

### Test 8: Request Size Limit
```bash
# Generate a large payload (>1MB)
python3 -c "import json; print(json.dumps({'messages': [{'role': 'user', 'content': 'x' * 1100000}], 'temperature': 0.7}))" > large_payload.json

curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat \
     -H "Content-Type: application/json" \
     -d @large_payload.json
```
**Expected**: 413 Payload Too Large

### Test 9: Helmet Security Headers
```bash
curl -I https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/health
```
**Expected Headers**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (modern browsers)
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `Content-Security-Policy: ...`

### Test 10: XSS Prevention
```bash
curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "<script>alert(\"XSS\")</script>"}], "temperature": 0.7}'
```
**Expected**: Script tags should be sanitized or escaped

### Test 11: Evaluate Endpoint Validation
```bash
curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/evaluate \
     -H "Content-Type: application/json" \
     -d '{"outputs": ["response1", "response2"], "criteria": "test criteria"}'
```
**Expected**: Valid evaluation response

### Test 12: Evaluate - Too Many Outputs
```bash
curl -X POST https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api/evaluate \
     -H "Content-Type: application/json" \
     -d '{"outputs": ["1", "2", "3", "4", "5", "6"], "criteria": "test"}'
```
**Expected**: 400 Bad Request (maximum 5 outputs allowed)

## 📊 Security Checklist

- [x] Helmet security headers configured
- [x] CORS with origin whitelist
- [x] Rate limiting implemented
- [x] Input validation with express-validator
- [x] Request size limits
- [x] XSS prevention
- [x] Error handling without info leaks
- [x] Environment variable validation
- [x] HTTPS enforced (via HSTS)
- [x] No sensitive data in logs
- [x] Database credentials secured
- [x] API keys in environment variables
- [x] Security logging implemented

## 🚨 Known Issues

### Moderate: validator.js URL validation bypass
- **CVE**: GHSA-9965-vmph-33xx
- **Status**: No fix available
- **Impact**: Low - we don't use URL validation in our app
- **Mitigation**: We only validate message content, roles, and temperature ranges

## 🔐 Environment Variables Required

### Production
```
XAI_API_KEY=<your_x.ai_api_key>
DATABASE_URL=<postgresql_connection_string>
ALLOWED_ORIGINS=https://grokisanaughtypuppy-yn23q.ondigitalocean.app
NODE_ENV=production
PORT=8080
```

### Development
```
XAI_API_KEY=<your_x.ai_api_key>
DATABASE_URL=postgresql://localhost:5432/grok_chat_dev
ALLOWED_ORIGINS=http://localhost:4200
NODE_ENV=development
PORT=3000
```

## 📝 Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Keep dependencies updated** - Run `npm audit` regularly
3. **Review logs** - Monitor for suspicious activity
4. **Test rate limits** - Ensure they're working as expected
5. **Validate inputs** - Never trust user input
6. **Use HTTPS** - Always in production
7. **Implement monitoring** - Track errors and performance
8. **Regular security audits** - Test all endpoints periodically
9. **Principle of least privilege** - Database users, API permissions
10. **Backup strategy** - Regular database backups

## 🎯 Next Steps

- [ ] Set up monitoring/alerting (e.g., Sentry, LogRocket)
- [ ] Implement API key rotation strategy
- [ ] Add request logging for audit trails
- [ ] Set up automated security scanning in CI/CD
- [ ] Consider adding authentication for future features
- [ ] Implement database connection pooling
- [ ] Add response compression for performance
- [ ] Set up CDN for static assets
